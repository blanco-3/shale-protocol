// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IVaultStrategy.sol";

/**
 * @title FixedYieldStrategy
 * @notice Simulated high-yield strategy for testnet demonstration.
 *
 * Architecture
 * ────────────
 *   Deposited USDC is held in this contract (not deployed to an external protocol).
 *   Yield accrues continuously based on a configurable annual rate (annualYieldBps).
 *   A separate yield reserve — funded by the deployer via fundYieldReserve() — backs
 *   the simulated payouts.  This mirrors what a real protocol like Morpho would return.
 *
 *   On mainnet this contract would be replaced by a real MorphoStrategy / CompoundStrategy.
 *
 * Yield math
 * ──────────
 *   pendingYield = deployedPrincipal × annualYieldBps × elapsed / (365 days × 10_000)
 *
 * Access control
 * ──────────────
 *   owner (= StrategyRouter) — deposit / withdraw / harvest / emergency / setAnnualYieldBps
 *   anyone                   — fundYieldReserve (add USDC to back future yield)
 */
contract FixedYieldStrategy is IVaultStrategy, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── State ────────────────────────────────────────────────────────────────

    IERC20  public immutable usdc;

    /// @notice USDC currently held as user principal
    uint256 public deployedPrincipal;

    /// @notice Annual yield rate in basis points (700 = 7.00% APY)
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
     * @param _usdc           USDC token address (must match vault's base asset)
     * @param _annualYieldBps Starting annual yield rate in bps (e.g. 700 = 7%)
     * @param _owner          Initial owner — transfer to StrategyRouter after deploy
     */
    constructor(
        address _usdc,
        uint256 _annualYieldBps,
        address _owner
    ) Ownable(_owner) {
        require(_usdc != address(0), "FYS: zero usdc");
        require(_annualYieldBps <= 50_000, "FYS: rate too high"); // max 500%

        usdc            = IERC20(_usdc);
        annualYieldBps  = _annualYieldBps;
        lastAccrualTime = block.timestamp;
    }

    // ─── IVaultStrategy ───────────────────────────────────────────────────────

    /**
     * @notice Accept USDC from StrategyRouter and track as deployedPrincipal.
     *         Caller must approve this contract before calling.
     */
    function deposit(uint256 amount) external override onlyOwner nonReentrant {
        require(!paused, "FYS: paused");
        require(amount > 0, "FYS: zero amount");

        _accrueYield();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        deployedPrincipal += amount;

        emit Deposited(amount, deployedPrincipal);
    }

    /**
     * @notice Return `amount` USDC to StrategyRouter from principal.
     */
    function withdraw(uint256 amount) external override onlyOwner nonReentrant {
        require(amount > 0, "FYS: zero amount");
        require(deployedPrincipal >= amount, "FYS: insufficient principal");

        _accrueYield();
        deployedPrincipal -= amount;
        usdc.safeTransfer(msg.sender, amount);

        emit Withdrawn(amount, deployedPrincipal);
    }

    /**
     * @notice Harvest all accrued yield and transfer to StrategyRouter.
     *         Yield is capped by the available reserve (balance minus principal).
     * @return yieldAmount USDC sent to caller
     */
    function harvest() external override onlyOwner nonReentrant returns (uint256 yieldAmount) {
        _accrueYield();

        if (accruedYield == 0) return 0;

        // Reserve = total USDC balance minus what's owed back as principal
        uint256 balance = usdc.balanceOf(address(this));
        uint256 reserve = balance > deployedPrincipal ? balance - deployedPrincipal : 0;

        yieldAmount  = accruedYield < reserve ? accruedYield : reserve;
        accruedYield = accruedYield - yieldAmount; // carry forward any unpayable remainder

        if (yieldAmount > 0) {
            usdc.safeTransfer(msg.sender, yieldAmount);
        }

        emit Harvested(yieldAmount);
    }

    /**
     * @notice Total value = principal + accrued (not-yet-harvested) yield.
     *         Used by StrategyRouter for rebalancing calculations.
     */
    function totalAssets() external view override returns (uint256) {
        return deployedPrincipal + accruedYield + _pendingYield();
    }

    function asset() external view override returns (address) {
        return address(usdc);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /**
     * @notice Update the simulated annual yield rate.
     *         Accrues pending yield at the old rate before switching.
     */
    function setAnnualYieldBps(uint256 newBps) external onlyOwner {
        require(newBps <= 50_000, "FYS: rate too high");
        _accrueYield();
        emit AnnualRateChanged(annualYieldBps, newBps);
        annualYieldBps = newBps;
    }

    /**
     * @notice Emergency: drain all USDC (principal + reserve) to `to`.
     *         Resets all accounting. Only callable by owner.
     */
    function emergencyWithdraw(address to) external onlyOwner {
        require(to != address(0), "FYS: zero recipient");

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

    /**
     * @notice Testnet demo only: simulate a capital loss (e.g. protocol hack).
     *         Reduces deployedPrincipal without moving USDC — the tracking diverges
     *         from actual balance so the vault detects a capital loss at next epoch.
     *         This lets judges witness the APEX loss-absorption mechanic live.
     *
     *         Only callable by owner (= StrategyRouter, which proxies this for the deployer).
     */
    function simulateLoss(uint256 lossAmount) external onlyOwner {
        require(lossAmount > 0,                    "FYS: zero loss");
        require(lossAmount <= deployedPrincipal,   "FYS: exceeds principal");
        deployedPrincipal -= lossAmount;
        emit EmergencyWithdraw(lossAmount, address(0)); // reuse event; address(0) = simulated drain
    }

    // ─── Permissionless ───────────────────────────────────────────────────────

    /**
     * @notice Fund the yield reserve so harvest() has USDC to pay out.
     *         Anyone can call — intended for the deployer / protocol treasury.
     *         On mainnet this is replaced by real protocol yield flowing in.
     */
    function fundYieldReserve(uint256 amount) external nonReentrant {
        require(amount > 0, "FYS: zero amount");
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit YieldReserveFunded(msg.sender, amount);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

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

    /// @dev Flush pending yield into accruedYield and update timestamp.
    function _accrueYield() internal {
        uint256 pending = _pendingYield();
        if (pending > 0) {
            uint256 elapsed = block.timestamp - lastAccrualTime;
            accruedYield += pending;
            emit YieldAccrued(pending, elapsed);
        }
        lastAccrualTime = block.timestamp;
    }

    /// @dev Yield earned since last accrual (not yet added to accruedYield).
    function _pendingYield() internal view returns (uint256) {
        if (deployedPrincipal == 0 || annualYieldBps == 0) return 0;
        uint256 elapsed = block.timestamp - lastAccrualTime;
        // principal * bps * elapsed / (365d * 10_000)  — integer division truncates, safe
        return (deployedPrincipal * annualYieldBps * elapsed) / (365 days * 10_000);
    }
}
