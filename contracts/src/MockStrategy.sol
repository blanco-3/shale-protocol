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

    event YieldAdded(uint256 amount);

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

    // ─── Admin: inject yield for testing ─────────────────────────────────

    /// @notice Simulate yield accrual (anyone can fund — testnet only)
    function addYield(uint256 amount) external {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        pendingYield += amount;
        emit YieldAdded(amount);
    }
}
