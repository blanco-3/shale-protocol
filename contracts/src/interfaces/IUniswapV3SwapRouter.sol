// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IUniswapV3SwapRouter
 * @notice SwapRouter02 interface (no deadline field in params).
 *
 * Arbitrum Sepolia address: 0x101F443B4d1b059569D643917553c771E1b9663E
 * Selector for exactInputSingle: 0x04e45aaf
 */
interface IUniswapV3SwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24  fee;               // pool fee tier: 500 | 3000 | 10000
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;  // slippage floor — revert if output < this
        uint160 sqrtPriceLimitX96; // 0 = no price limit
    }

    /**
     * @notice Swap `amountIn` of `tokenIn` for as much `tokenOut` as possible
     *         using a single Uniswap v3 pool.
     * @return amountOut Actual amount of tokenOut received
     */
    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut);
}
