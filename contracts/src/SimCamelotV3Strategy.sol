// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IVaultStrategy.sol";

/**
 * @title SimCamelotV3Strategy
 * @notice Simulates a Camelot V3 / Uniswap V3 concentrated liquidity LP position
 *         on Arbitrum for a USDC/USDT stable pool.
 *
 * ── LP fee APY model ──────────────────────────────────────────────────────
 * In real Uniswap V3 / Camelot V3 concentrated liquidity:
 *
 *   dailyFeeRate = (dailyVolume / TVL) × feeTier
 *   APY          = dailyFeeRate × 365
 *
 * This contract exposes those two parameters directly, making it easy to
 * demonstrate how changing market conditions (volume spikes, low liquidity)
 * affect LP yield — and why the AI agent should shift weights accordingly.
 *
 * Default parameters (USDC/USDT 0.05% pool, Camelot V3 Arbitrum):
 *   dailyVolumeRatioBps = 6000  (60% of TVL traded daily — typical stablecoin pair)
 *   feeTierBps          =    5  (0.05% fee tier, same as Uniswap V3 stable pool)
 *   → dailyFee = 6000 × 5 / 10000 = 3 bps/day
 *   → APY      = 3 × 365           = 1095 bps ≈ 10.95%
 *
 * Volume scenario examples
 * ─────────────────────────
 *   Low traffic:   dailyVolumeRatioBps =  2000  → APY  3.65%
 *   Normal:        dailyVolumeRatioBps =  6000  → APY 10.95%  (default)
 *   High volume:   dailyVolumeRatioBps = 12000  → APY 21.90%
 *   Volume spike:  dailyVolumeRatioBps = 20000  → APY 36.50%
 *
 * Fee tier options (set at pool creation, immutable in real protocol):
 *   1 bps  — ultra-stable pair (USDC/USDT)
 *   5 bps  — stable pair                                  (default)
 *  30 bps  — correlated pair (USDC/ETH)
 * 100 bps  — volatile pair
 *
 * ── Yield generation ──────────────────────────────────────────────────────
 * Yield is minted via MockUSDC.mint() — models LP fee income flowing to
 * position holders without requiring a reserve. On mainnet this would be
 * replaced by real Camelot V3 fee collection via NonfungiblePositionManager.
 *
 * ── Access control ────────────────────────────────────────────────────────
 *   owner (= StrategyRouter) — deposit / withdraw / harvest
 *   marketAdmin              — setVolumeRatio / setFeeTier (simulate market)
 */
contract SimCamelotV3Strategy is IVaultStrategy, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Market parameters ────────────────────────────────────────────────────

    /// @notice Daily volume as a fraction of TVL, in bps. 10000 = 1.0x TVL per day.
    uint256 public dailyVolumeRatioBps = 6000;

    /// @notice LP fee tier in bps. 5 = 0.05% (Uniswap V3 stable pool default).
    uint256 public feeTierBps = 5;

    /// @notice Address that can update market parameters.
    address public marketAdmin;

    // ─── Accounting ───────────────────────────────────────────────────────────

    IERC20  public immutable usdc;
    uint256 public deployedPrincipal;
    uint256 public lastAccrualTime;
    uint256 public accruedYield;
    bool    public paused;

    // ─── Events ───────────────────────────────────────────────────────────────

    event VolumeRatioUpdated(uint256 oldBps, uint256 newBps, uint256 impliedApyBps);
    event FeeTierUpdated(uint256 oldBps, uint256 newBps);
    event Deposited(uint256 amount, uint256 newPrincipal);
    event Withdrawn(uint256 amount, uint256 newPrincipal);
    event Harvested(uint256 yieldAmount, uint256 apyBps_);
    event YieldAccrued(uint256 amount, uint256 elapsed);
    event MarketAdminChanged(address indexed oldAdmin, address indexed newAdmin);

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param _usdc        MockUSDC address (must implement mint())
     * @param _marketAdmin Address that can update market parameters (deployer)
     * @param _owner       Initial owner — transfer to StrategyRouter after deploy
     */
    constructor(address _usdc, address _marketAdmin, address _owner) Ownable(_owner) {
        require(_usdc != address(0),        "SC3: zero usdc");
        require(_marketAdmin != address(0), "SC3: zero admin");
        usdc          = IERC20(_usdc);
        marketAdmin   = _marketAdmin;
        lastAccrualTime = block.timestamp;
    }

    // ─── IVaultStrategy ───────────────────────────────────────────────────────

    function asset() external view override returns (address) {
        return address(usdc);
    }

    function deposit(uint256 amount) external override onlyOwner nonReentrant {
        require(!paused,    "SC3: paused");
        require(amount > 0, "SC3: zero amount");
        _accrueYield();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        deployedPrincipal += amount;
        emit Deposited(amount, deployedPrincipal);
    }

    function withdraw(uint256 amount) external override onlyOwner nonReentrant {
        require(amount > 0,                   "SC3: zero amount");
        require(deployedPrincipal >= amount,  "SC3: insufficient principal");
        _accrueYield();
        deployedPrincipal -= amount;
        usdc.safeTransfer(msg.sender, amount);
        emit Withdrawn(amount, deployedPrincipal);
    }

    /**
     * @notice Harvest LP fees accrued since last harvest.
     *         Mints USDC directly (models Camelot V3 fee collection), no reserve needed.
     */
    function harvest() external override onlyOwner nonReentrant returns (uint256 yieldAmount) {
        _accrueYield();
        yieldAmount  = accruedYield;
        if (yieldAmount == 0) return 0;
        accruedYield = 0;
        IMintableToken(address(usdc)).mint(msg.sender, yieldAmount);
        emit Harvested(yieldAmount, apyBps());
    }

    /// @notice Principal + pending accrued LP fees.
    function totalAssets() external view override returns (uint256) {
        return deployedPrincipal + accruedYield + _pendingYield();
    }

    // ─── APY model ────────────────────────────────────────────────────────────

    /**
     * @notice Current LP fee APY derived from volume and fee tier.
     *
     *   dailyFeeRateBps = dailyVolumeRatioBps × feeTierBps / 10_000
     *   annualApyBps    = dailyFeeRateBps × 365
     *
     * This is the standard Uniswap V3 LP APY formula used by analytics platforms
     * (Revert Finance, Uniswap Analytics, Camelot analytics).
     */
    function apyBps() public view returns (uint256) {
        uint256 dailyFeeRateBps = (dailyVolumeRatioBps * feeTierBps) / 10_000;
        return dailyFeeRateBps * 365;
    }

    // ─── Market simulation ────────────────────────────────────────────────────

    /**
     * @notice Update daily volume ratio to simulate trading activity changes.
     *
     * Use-case: demonstrate AI agent reacting to LP yield opportunities
     *   — volume spike (e.g. volatility event) → APY jumps → agent increases weight
     *   — volume crash (e.g. competitor pool) → APY drops → agent reduces weight
     *
     * Only callable by marketAdmin.
     */
    function setVolumeRatio(uint256 _bps) external {
        require(msg.sender == marketAdmin, "SC3: not market admin");
        _accrueYield(); // lock in yield at old rate
        emit VolumeRatioUpdated(dailyVolumeRatioBps, _bps, apyBps());
        dailyVolumeRatioBps = _bps;
    }

    /**
     * @notice Update the LP fee tier.
     *         In real V3 pools this is set at pool creation; here it's settable for demos.
     */
    function setFeeTier(uint256 _bps) external {
        require(msg.sender == marketAdmin, "SC3: not market admin");
        require(_bps <= 10_000,            "SC3: fee too high");
        _accrueYield();
        emit FeeTierUpdated(feeTierBps, _bps);
        feeTierBps = _bps;
    }

    function setMarketAdmin(address _admin) external {
        require(msg.sender == marketAdmin, "SC3: not market admin");
        emit MarketAdminChanged(marketAdmin, _admin);
        marketAdmin = _admin;
    }

    // ─── Owner admin ──────────────────────────────────────────────────────────

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function simulateLoss(uint256 lossAmount) external onlyOwner {
        require(lossAmount > 0,                  "SC3: zero loss");
        require(lossAmount <= deployedPrincipal, "SC3: exceeds principal");
        deployedPrincipal -= lossAmount;
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /// @notice Human-readable market state for frontend / agent scanner.
    function marketState() external view returns (
        uint256 volumeRatio,
        uint256 feeTier,
        uint256 dailyFeeRate,
        uint256 lpApy,
        uint256 principal,
        uint256 pending
    ) {
        uint256 daily = (dailyVolumeRatioBps * feeTierBps) / 10_000;
        return (
            dailyVolumeRatioBps,
            feeTierBps,
            daily,
            daily * 365,
            deployedPrincipal,
            _pendingYield()
        );
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _accrueYield() internal {
        uint256 pending = _pendingYield();
        if (pending > 0) {
            accruedYield += pending;
            emit YieldAccrued(pending, block.timestamp - lastAccrualTime);
        }
        lastAccrualTime = block.timestamp;
    }

    function _pendingYield() internal view returns (uint256) {
        if (deployedPrincipal == 0) return 0;
        uint256 elapsed = block.timestamp - lastAccrualTime;
        if (elapsed == 0) return 0;
        return (deployedPrincipal * apyBps() * elapsed) / (365 days * 10_000);
    }
}
