// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IVaultStrategy.sol";

/**
 * @title SimMorphoStrategy
 * @notice Simulates Morpho Blue USDC lending market on Arbitrum.
 *
 * ── Morpho P2P rate model ─────────────────────────────────────────────────
 * Morpho Blue matches suppliers directly with borrowers, eliminating the
 * interest rate spread that AMM-style lending protocols (Aave, Compound) charge.
 * When matched P2P, suppliers earn between the Aave supply rate and borrow rate:
 *
 *   p2pRate = supplyRate + (borrowRate − supplyRate) × p2pIndexCursor
 *
 * Where p2pIndexCursor ∈ [0, 1] splits the spread between suppliers and borrowers.
 * Morpho defaults to cursor = 0.5 (equal split).
 *
 * Representative values (Arbitrum USDC, early 2025):
 *   Aave supply rate:  ~5.7%
 *   Aave borrow rate:  ~8.5%
 *   Morpho P2P rate:   ~7.1%  (cursor = 0.5 → midpoint)
 *
 * Idle (unmatched) supply falls back to the Aave supply rate (5.7%).
 * Blended rate depends on matching ratio (typically 60–100% matched).
 *
 * This contract exposes p2pApyBps directly — the deployer sets it to reflect
 * the current Morpho market conditions, which the agent scanner reads via apyBps().
 *
 * Default: 620 bps = 6.2% (midpoint spread at default Aave market rates)
 *
 * ── Yield generation ──────────────────────────────────────────────────────
 * Yield is minted via MockUSDC.mint() — models Morpho borrower interest paid
 * to matched suppliers. No reserve needed. On mainnet, Morpho accumulates
 * interest in morphoToken/supplyShares and redeems via withdrawShares().
 *
 * ── Access control ────────────────────────────────────────────────────────
 *   owner (= StrategyRouter) — deposit / withdraw / harvest
 *   marketAdmin              — setP2PRate / setMatchingRatio (simulate conditions)
 */
contract SimMorphoStrategy is IVaultStrategy, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Market parameters ────────────────────────────────────────────────────

    /// @notice Aave V3 supply APY (floor when unmatched), in bps.
    uint256 public aaveSupplyBps  = 570;  // 5.7%

    /// @notice Aave V3 borrow APY (ceiling when 100% matched), in bps.
    uint256 public aaveBorrowBps  = 850;  // 8.5%

    /// @notice Fraction of supply that is P2P-matched, in bps. 10000 = fully matched.
    uint256 public matchingRatioBps = 7000; // 70% matched (typical Morpho Blue market)

    /// @notice Address that can update market parameters.
    address public marketAdmin;

    // ─── Accounting ───────────────────────────────────────────────────────────

    IERC20  public immutable usdc;
    uint256 public deployedPrincipal;
    uint256 public lastAccrualTime;
    uint256 public accruedYield;
    bool    public paused;

    // ─── Events ───────────────────────────────────────────────────────────────

    event RatesUpdated(uint256 supplyBps, uint256 borrowBps, uint256 matchingBps);
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
        require(_usdc != address(0),        "SM: zero usdc");
        require(_marketAdmin != address(0), "SM: zero admin");
        usdc          = IERC20(_usdc);
        marketAdmin   = _marketAdmin;
        lastAccrualTime = block.timestamp;
    }

    // ─── IVaultStrategy ───────────────────────────────────────────────────────

    function asset() external view override returns (address) {
        return address(usdc);
    }

    function deposit(uint256 amount) external override onlyOwner nonReentrant {
        require(!paused,    "SM: paused");
        require(amount > 0, "SM: zero amount");
        _accrueYield();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        deployedPrincipal += amount;
        emit Deposited(amount, deployedPrincipal);
    }

    function withdraw(uint256 amount) external override onlyOwner nonReentrant {
        require(amount > 0,                  "SM: zero amount");
        require(deployedPrincipal >= amount, "SM: insufficient principal");
        _accrueYield();
        deployedPrincipal -= amount;
        usdc.safeTransfer(msg.sender, amount);
        emit Withdrawn(amount, deployedPrincipal);
    }

    /**
     * @notice Harvest Morpho P2P interest accrued since last harvest.
     *         Mints USDC directly (models borrower interest paid to supplier).
     */
    function harvest() external override onlyOwner nonReentrant returns (uint256 yieldAmount) {
        _accrueYield();
        yieldAmount  = accruedYield;
        if (yieldAmount == 0) return 0;
        accruedYield = 0;
        IMintableToken(address(usdc)).mint(msg.sender, yieldAmount);
        emit Harvested(yieldAmount, apyBps());
    }

    /// @notice Principal + pending accrued Morpho interest.
    function totalAssets() external view override returns (uint256) {
        return deployedPrincipal + accruedYield + _pendingYield();
    }

    // ─── APY model ────────────────────────────────────────────────────────────

    /**
     * @notice Blended APY across matched and unmatched supply.
     *
     *   p2pRate  = aaveSupply + (aaveBorrow − aaveSupply) / 2   [50% cursor]
     *   blended  = matchingRatio × p2pRate + (1 − matchingRatio) × aaveSupply
     *
     * This is the exact formula used by Morpho's APY calculator.
     */
    function apyBps() public view returns (uint256) {
        // P2P rate: midpoint between supply and borrow (cursor = 0.5)
        uint256 p2pRate = aaveSupplyBps + (aaveBorrowBps - aaveSupplyBps) / 2;

        // Blended = matched% × p2p + (1 - matched%) × supply
        uint256 matched   = (matchingRatioBps * p2pRate)    / 10_000;
        uint256 unmatched = ((10_000 - matchingRatioBps) * aaveSupplyBps) / 10_000;
        return matched + unmatched;
    }

    // ─── Market simulation ────────────────────────────────────────────────────

    /**
     * @notice Update Aave reference rates and matching ratio to simulate market state.
     *
     * Example scenarios:
     *   Low demand:     setRates(350, 600, 4000) → P2P ~4.8%, blended ~3.9%
     *   Normal market:  setRates(570, 850, 7000) → P2P ~7.1%, blended ~6.6%  (default)
     *   High demand:    setRates(700, 1200, 9000) → P2P ~9.5%, blended ~9.2%
     *   Full match:     setRates(570, 850, 10000) → blended = P2P ~7.1%
     */
    function setRates(
        uint256 _supplyBps,
        uint256 _borrowBps,
        uint256 _matchingBps
    ) external {
        require(msg.sender == marketAdmin,   "SM: not market admin");
        require(_borrowBps >= _supplyBps,    "SM: borrow < supply");
        require(_matchingBps <= 10_000,      "SM: invalid matching ratio");
        _accrueYield();
        aaveSupplyBps    = _supplyBps;
        aaveBorrowBps    = _borrowBps;
        matchingRatioBps = _matchingBps;
        emit RatesUpdated(_supplyBps, _borrowBps, _matchingBps);
    }

    function setMarketAdmin(address _admin) external {
        require(msg.sender == marketAdmin, "SM: not market admin");
        emit MarketAdminChanged(marketAdmin, _admin);
        marketAdmin = _admin;
    }

    // ─── Owner admin ──────────────────────────────────────────────────────────

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function simulateLoss(uint256 lossAmount) external onlyOwner {
        require(lossAmount > 0,                  "SM: zero loss");
        require(lossAmount <= deployedPrincipal, "SM: exceeds principal");
        deployedPrincipal -= lossAmount;
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /// @notice Full market state for frontend / agent scanner.
    function marketState() external view returns (
        uint256 supplyApy,
        uint256 borrowApy,
        uint256 matchingRatio,
        uint256 p2pRate,
        uint256 blendedApy,
        uint256 principal,
        uint256 pending
    ) {
        uint256 p2p = aaveSupplyBps + (aaveBorrowBps - aaveSupplyBps) / 2;
        return (
            aaveSupplyBps,
            aaveBorrowBps,
            matchingRatioBps,
            p2p,
            apyBps(),
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
