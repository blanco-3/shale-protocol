// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IVaultStrategy.sol";

/**
 * @title CamelotStrategy
 * @notice Simulated yield strategy representing a Camelot DEX liquidity position on Arbitrum.
 *
 * Production design (mainnet)
 * ────────────────────────────
 *   In production this contract would:
 *   1. Supply USDC into a Camelot V3 concentrated liquidity pool (USDC/ARB or USDC/ETH)
 *   2. Earn swap fees + GRAIL/xGRAIL incentive rewards
 *   3. Auto-compound rewards via Camelot's nitro pools or a harvest→deposit loop
 *   4. Expose the standard IVaultStrategy interface so StrategyRouter routes seamlessly
 *
 *   Camelot V3 USDC pools on Arbitrum One have historically yielded 7–12% APY from
 *   swap fees alone, making this a higher-yield counterpart to the AaveV3 base rate.
 *
 * Testnet implementation
 * ──────────────────────
 *   Deposited USDC is held in this contract (not deployed to real Camelot).
 *   Yield accrues continuously from a pre-funded reserve at `annualYieldBps`.
 *   The deployer calls fundYieldReserve() to seed the reserve — mirroring real swap fee income.
 *
 * Arbitrum relevance
 * ──────────────────
 *   Camelot is an Arbitrum-native DEX with no deployments on other L2s.
 *   Integrating Camelot as a second strategy creates meaningful APY divergence from Aave
 *   (variable lending ~4% vs Camelot LP ~9%), giving the AI agent a real optimisation problem.
 *
 * Access control
 * ──────────────
 *   owner (= StrategyRouter) — deposit / withdraw / harvest
 *   anyone                   — fundYieldReserve
 */
contract CamelotStrategy is IVaultStrategy, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── State ────────────────────────────────────────────────────────────────

    IERC20  public immutable usdc;

    /// @notice USDC currently held as user principal
    uint256 public deployedPrincipal;

    /// @notice Annual yield rate in basis points (900 = 9.00% APY default)
    uint256 public annualYieldBps;

    /// @notice Last time _accrueYield() ran (unix timestamp)
    uint256 public lastAccrualTime;

    /// @notice Yield earned but not yet harvested (USDC, 6 decimals)
    uint256 public accruedYield;

    /// @notice Circuit-breaker: blocks new deposits without affecting withdrawals
    bool public paused;

    // ─── Events ───────────────────────────────────────────────────────────────

    event Deposited(uint256 amount, uint256 newPrincipal);
    event Withdrawn(uint256 amount, uint256 newPrincipal);
    event Harvested(uint256 yieldAmount);
    event YieldAccrued(uint256 amount, uint256 elapsed);
    event YieldReserveFunded(address indexed funder, uint256 amount);
    event AnnualRateChanged(uint256 oldBps, uint256 newBps);
    event EmergencyWithdraw(uint256 amount, address indexed to);
    event PausedChanged(bool paused);

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param _usdc           USDC token address
     * @param _annualYieldBps Starting annual yield rate in bps (e.g. 900 = 9%)
     * @param _owner          Initial owner — transfer to StrategyRouter after deploy
     */
    constructor(
        address _usdc,
        uint256 _annualYieldBps,
        address _owner
    ) Ownable(_owner) {
        require(_usdc != address(0),         "CS: zero usdc");
        require(_annualYieldBps <= 50_000,   "CS: rate too high"); // max 500%

        usdc            = IERC20(_usdc);
        annualYieldBps  = _annualYieldBps;
        lastAccrualTime = block.timestamp;
    }

    // ─── IVaultStrategy ───────────────────────────────────────────────────────

    function deposit(uint256 amount) external override onlyOwner nonReentrant {
        require(!paused,    "CS: paused");
        require(amount > 0, "CS: zero amount");

        _accrueYield();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        deployedPrincipal += amount;

        emit Deposited(amount, deployedPrincipal);
    }

    function withdraw(uint256 amount) external override onlyOwner nonReentrant {
        require(amount > 0,                    "CS: zero amount");
        require(deployedPrincipal >= amount,   "CS: insufficient principal");

        _accrueYield();
        deployedPrincipal -= amount;
        usdc.safeTransfer(msg.sender, amount);

        emit Withdrawn(amount, deployedPrincipal);
    }

    /**
     * @notice Harvest accrued yield (swap fees + incentive rewards simulation).
     *         Capped by available reserve (balance minus principal).
     */
    function harvest() external override onlyOwner nonReentrant returns (uint256 yieldAmount) {
        _accrueYield();

        if (accruedYield == 0) return 0;

        uint256 balance = usdc.balanceOf(address(this));
        uint256 reserve = balance > deployedPrincipal ? balance - deployedPrincipal : 0;

        yieldAmount  = accruedYield < reserve ? accruedYield : reserve;
        accruedYield = accruedYield - yieldAmount;

        if (yieldAmount > 0) {
            usdc.safeTransfer(msg.sender, yieldAmount);
        }

        emit Harvested(yieldAmount);
    }

    /// @notice Total value = principal + accrued (not-yet-harvested) yield.
    function totalAssets() external view override returns (uint256) {
        return deployedPrincipal + accruedYield + _pendingYield();
    }

    function asset() external view override returns (address) {
        return address(usdc);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setAnnualYieldBps(uint256 newBps) external onlyOwner {
        require(newBps <= 50_000, "CS: rate too high");
        _accrueYield();
        emit AnnualRateChanged(annualYieldBps, newBps);
        annualYieldBps = newBps;
    }

    function emergencyWithdraw(address to) external onlyOwner {
        require(to != address(0), "CS: zero recipient");

        uint256 balance = usdc.balanceOf(address(this));
        if (balance == 0) return;

        deployedPrincipal = 0;
        accruedYield      = 0;
        lastAccrualTime   = block.timestamp;

        usdc.safeTransfer(to, balance);
        emit EmergencyWithdraw(balance, to);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedChanged(_paused);
    }

    // ─── Permissionless ───────────────────────────────────────────────────────

    /**
     * @notice Seed the yield reserve so harvest() has USDC to pay out.
     *         On mainnet this is replaced by real Camelot swap fees flowing in.
     */
    function fundYieldReserve(uint256 amount) external nonReentrant {
        require(amount > 0, "CS: zero amount");
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit YieldReserveFunded(msg.sender, amount);
    }

    /// @notice Returns the configured annual yield rate — used by agent scanner.
    function apyBps() external view returns (uint256) {
        return annualYieldBps;
    }

    /// @notice USDC available to back future yield payouts.
    function yieldReserve() external view returns (uint256) {
        uint256 balance = usdc.balanceOf(address(this));
        return balance > deployedPrincipal ? balance - deployedPrincipal : 0;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _accrueYield() internal {
        uint256 pending = _pendingYield();
        if (pending > 0) {
            uint256 elapsed = block.timestamp - lastAccrualTime;
            accruedYield += pending;
            emit YieldAccrued(pending, elapsed);
        }
        lastAccrualTime = block.timestamp;
    }

    function _pendingYield() internal view returns (uint256) {
        if (deployedPrincipal == 0 || annualYieldBps == 0) return 0;
        uint256 elapsed = block.timestamp - lastAccrualTime;
        return (deployedPrincipal * annualYieldBps * elapsed) / (365 days * 10_000);
    }
}
