// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IVaultStrategy.sol";

/**
 * @title MockHighYieldStrategy
 * @notice Test strategy simulating a higher-yield source (e.g. Morpho Blue: 6-8% APY).
 *         Identical mechanics to MockStrategy — only addYield() makes it different in tests.
 *         The strategy name is stored for off-chain display.
 */
contract MockHighYieldStrategy is IVaultStrategy, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    uint256 public deployedPrincipal;
    uint256 public pendingYield;
    string  public strategyName;

    event YieldAdded(uint256 amount);

    constructor(address _usdc, address _owner, string memory _name) Ownable(_owner) {
        usdc         = IERC20(_usdc);
        strategyName = _name;
    }

    // ─── IVaultStrategy ───────────────────────────────────────────────────

    function deposit(uint256 amount) external override onlyOwner {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        deployedPrincipal += amount;
    }

    function withdraw(uint256 amount) external override onlyOwner {
        require(deployedPrincipal >= amount, "HY: insufficient principal");
        deployedPrincipal -= amount;
        usdc.safeTransfer(msg.sender, amount);
    }

    function harvest() external override onlyOwner returns (uint256 yieldAmount) {
        yieldAmount  = pendingYield;
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

    // ─── Yield injection (testnet only) ───────────────────────────────────

    /// @notice Inject yield to simulate protocol earnings. Open on testnet.
    function addYield(uint256 amount) external {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        pendingYield += amount;
        emit YieldAdded(amount);
    }
}
