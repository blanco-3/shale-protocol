// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Freely-mintable USDC for testnet demo. Anyone can call mint().
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {
        // Mint 1,000,000 USDC to deployer for demo
        _mint(msg.sender, 1_000_000 * 1e6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Free mint — anyone can get testnet USDC
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
