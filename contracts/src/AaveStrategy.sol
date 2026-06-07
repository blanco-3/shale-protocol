// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IVaultStrategy.sol";
import "./interfaces/IAaveV3Pool.sol";

/**
 * @title AaveStrategy
 * @notice Yield strategy that supplies all vault assets to Aave V3.
 *
 * Flow:
 *   deposit()  → approve + aavePool.supply()   → aUSDC minted to this contract
 *   withdraw() → aavePool.withdraw()            → USDC sent back to vault
 *   harvest()  → aUSDC balance - tracked principal = yield
 *                withdraw(yield) and return to vault
 *
 * The vault is the only caller (Ownable).
 */
contract AaveStrategy is IVaultStrategy, Ownable {
    using SafeERC20 for IERC20;

    IERC20  public immutable usdc;
    IERC20  public immutable aUsdc;
    IAaveV3Pool public immutable aavePool;

    /// @notice Total USDC deployed to Aave (does NOT include yield)
    uint256 public deployedPrincipal;

    constructor(
        address _usdc,
        address _aUsdc,
        address _aavePool,
        address _vault
    ) Ownable(_vault) {
        usdc     = IERC20(_usdc);
        aUsdc    = IERC20(_aUsdc);
        aavePool = IAaveV3Pool(_aavePool);
    }

    // ─── IVaultStrategy ───────────────────────────────────────────────────

    function deposit(uint256 amount) external override onlyOwner {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        usdc.approve(address(aavePool), amount);
        aavePool.supply(address(usdc), amount, address(this), 0);
        deployedPrincipal += amount;
    }

    function withdraw(uint256 amount) external override onlyOwner {
        aavePool.withdraw(address(usdc), amount, msg.sender);
        if (deployedPrincipal >= amount) {
            deployedPrincipal -= amount;
        } else {
            deployedPrincipal = 0;
        }
    }

    /**
     * @notice Harvest yield: the excess aUSDC above deployedPrincipal.
     *         Withdraws that excess from Aave and transfers it to the vault.
     * @return yieldAmount USDC sent to vault
     */
    function harvest() external override onlyOwner returns (uint256 yieldAmount) {
        uint256 aBalance = aUsdc.balanceOf(address(this));
        if (aBalance <= deployedPrincipal) return 0;

        yieldAmount = aBalance - deployedPrincipal;
        aavePool.withdraw(address(usdc), yieldAmount, msg.sender);
    }

    function totalAssets() external view override returns (uint256) {
        return aUsdc.balanceOf(address(this));
    }

    function asset() external view override returns (address) {
        return address(usdc);
    }
}
