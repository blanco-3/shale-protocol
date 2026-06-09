// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAaveV3RewardsController
 * @notice Minimal interface for Aave v3 incentives / rewards controller.
 *
 * Mainnet / testnet address (Arbitrum Sepolia):
 *   0x3A203B14CF8749a1e3b7314c6c49004B77Ee667A
 */
interface IAaveV3RewardsController {
    /**
     * @notice Claim all pending rewards for the given aToken `assets` list and
     *         transfer them to `to`.
     * @param assets  List of aToken addresses to scan for rewards (e.g. [aUSDC])
     * @param to      Recipient of claimed reward tokens
     * @return rewardsList    Reward token addresses
     * @return claimedAmounts Amount claimed per reward token (parallel array)
     */
    function claimAllRewards(
        address[] calldata assets,
        address to
    ) external returns (address[] memory rewardsList, uint256[] memory claimedAmounts);

    /**
     * @notice Pending rewards for `user` on `assets` denominated in `reward` token.
     */
    function getUserRewards(
        address[] calldata assets,
        address user,
        address reward
    ) external view returns (uint256);

    /**
     * @notice All configured reward tokens for the given aToken list.
     */
    function getRewardsList() external view returns (address[] memory);
}
