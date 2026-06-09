// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IVaultStrategy.sol";

/**
 * @title MockStrategy
 * @notice Test strategy — holds USDC in-contract and lets an admin inject
 *         yield via addYield(). No external protocol needed.
 *
 * harvest() returns any injected yield and transfers it to the vault.
 */
contract MockStrategy is IVaultStrategy, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    uint256 public deployedPrincipal;
    uint256 public pendingYield;

    /// @notice Annual yield rate in bps — read by the agent scanner for rebalancing decisions.
    ///         Set via setAnnualYieldBps() before transferring ownership to router.
    uint256 public annualYieldBps;

    event YieldAdded(uint256 amount);
    event AnnualRateChanged(uint256 oldBps, uint256 newBps);

    constructor(address _usdc, address _vault) Ownable(_vault) {
        usdc = IERC20(_usdc);
    }

    // ─── IVaultStrategy ───────────────────────────────────────────────────

    function deposit(uint256 amount) external override onlyOwner {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        deployedPrincipal += amount;
    }

    function withdraw(uint256 amount) external override onlyOwner {
        require(deployedPrincipal >= amount, "insufficient principal");
        deployedPrincipal -= amount;
        usdc.safeTransfer(msg.sender, amount);
    }

    function harvest() external override onlyOwner returns (uint256 yieldAmount) {
        yieldAmount = pendingYield;
        pendingYield = 0;
        if (yieldAmount > 0) {
            usdc.safeTransfer(msg.sender, yieldAmount);
        }
    }

    function totalAssets() external view override returns (uint256) {
        return deployedPrincipal + pendingYield;
    }

    function asset() external view override returns (address) {
        return address(usdc);
    }

    // ─── Admin ────────────────────────────────────────────────────────────

    /// @notice Set the advertised annual yield rate (bps). Call before transferring ownership to router.
    function setAnnualYieldBps(uint256 newBps) external onlyOwner {
        emit AnnualRateChanged(annualYieldBps, newBps);
        annualYieldBps = newBps;
    }

    // ─── Views ────────────────────────────────────────────────────────────

    /// @notice Returns the configured annual yield rate — used by agent scanner.
    function apyBps() external view returns (uint256) {
        return annualYieldBps;
    }

    // ─── Testnet helpers ──────────────────────────────────────────────────

    /// @notice Simulate yield accrual (anyone can fund — testnet only)
    function addYield(uint256 amount) external {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        pendingYield += amount;
        emit YieldAdded(amount);
    }

    /// @notice Simulate a capital loss by reducing deployedPrincipal without moving USDC.
    ///         The tracking diverges from balance — vault detects a capital loss at next epoch.
    ///         Callable by anyone in tests for convenience.
    function simulateLoss(uint256 lossAmount) external {
        require(lossAmount <= deployedPrincipal, "MockStrategy: exceeds principal");
        deployedPrincipal -= lossAmount;
    }
}
