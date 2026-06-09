// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal interface for MockUSDC's public mint function.
///         Sim-strategies use this to generate yield without a pre-funded reserve.
interface IMintableToken {
    function mint(address to, uint256 amount) external;
}

/**
 * @title IVaultStrategy
 * @notice Strategy interface — abstracts the yield source from the vault.
 *         Swap Aave for Compound, Morpho, or anything else by deploying a
 *         new strategy and calling ShaleVault.setStrategy().
 */
interface IVaultStrategy {
    /// @notice Deploy assets into the yield source
    function deposit(uint256 amount) external;

    /// @notice Withdraw assets from the yield source back to the vault
    function withdraw(uint256 amount) external;

    /// @notice Harvest accrued yield and return the amount collected
    function harvest() external returns (uint256 yieldAmount);

    /// @notice Total assets currently managed by the strategy (principal + unrealised yield)
    function totalAssets() external view returns (uint256);

    /// @notice Underlying asset address (e.g. USDC)
    function asset() external view returns (address);
}
