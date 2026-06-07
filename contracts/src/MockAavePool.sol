// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockAUsdc
 * @notice Minimal aUSDC token for mock Aave pool.
 */
contract MockAUsdc is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Mock aUSDC", "aUSDC") Ownable(initialOwner) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}

/**
 * @title MockAavePool
 * @notice Simulates Aave V3 supply/withdraw for local testing and demo.
 *         Admin can call accrue() to add yield to the pool without external deposits.
 */
contract MockAavePool is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    MockAUsdc public immutable aUsdc;

    // Simulated APY in basis points (e.g. 420 = 4.20%)
    uint256 public apyBps = 420;

    event Supplied(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event YieldAccrued(uint256 amount);
    event ApySet(uint256 newApyBps);

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        aUsdc = new MockAUsdc(address(this));
    }

    /**
     * @notice Mimic Aave supply: pull USDC from caller, mint aUSDC 1:1.
     */
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 /*referralCode*/
    ) external {
        require(asset == address(usdc), "unsupported asset");
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        aUsdc.mint(onBehalfOf, amount);
        emit Supplied(onBehalfOf, amount);
    }

    /**
     * @notice Mimic Aave withdraw: burn aUSDC from vault, send USDC.
     * @param amount Pass type(uint256).max to withdraw all.
     */
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        require(asset == address(usdc), "unsupported asset");
        uint256 bal = aUsdc.balanceOf(msg.sender);
        uint256 withdrawAmt = (amount == type(uint256).max) ? bal : amount;
        require(withdrawAmt <= bal, "insufficient aUSDC");
        aUsdc.burn(msg.sender, withdrawAmt);
        usdc.safeTransfer(to, withdrawAmt);
        emit Withdrawn(to, withdrawAmt);
        return withdrawAmt;
    }

    /**
     * @notice Admin: inject yield into the pool (simulates Aave interest accrual).
     *         Mints extra aUSDC to the vault without taking USDC — represents earned interest.
     * @param vaultAddress The ShaleVault address that should receive the extra aUSDC balance.
     * @param yieldAmount  USDC amount of yield to accrue.
     */
    function accrue(address vaultAddress, uint256 yieldAmount) external onlyOwner {
        // We just mint more aUSDC to the vault. The vault's aUSDC balance grows.
        // The underlying USDC to back this is "virtual" for demo — in prod Aave does real accrual.
        aUsdc.mint(vaultAddress, yieldAmount);
        // Also mint real USDC backing so withdrawals don't fail
        // (In test env, we fund MockAavePool with extra USDC separately via fundPool)
        emit YieldAccrued(yieldAmount);
    }

    /**
     * @notice Admin: fund the pool with USDC so it can honour withdrawals after accrue().
     */
    function fundPool(uint256 amount) external onlyOwner {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice Admin: set simulated APY for agent to read.
     */
    function setApyBps(uint256 _apyBps) external onlyOwner {
        apyBps = _apyBps;
        emit ApySet(_apyBps);
    }
}
