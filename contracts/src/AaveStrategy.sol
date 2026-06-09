// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IVaultStrategy.sol";
import "./interfaces/IAaveV3Pool.sol";
import "./interfaces/IAaveV3RewardsController.sol";
import "./interfaces/IUniswapV3SwapRouter.sol";

/// @dev Minimal Chainlink feed interface (sequencer uptime + price feeds)
interface IChainlinkFeed {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

/**
 * @title AaveStrategy
 * @notice Production yield strategy that supplies USDC to Aave v3 and harvests
 *         base interest + protocol reward tokens (e.g. ARB incentives on mainnet).
 *
 * Arbitrum Sepolia addresses
 * ──────────────────────────
 *   USDC             : 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
 *   aUSDC            : 0x460b97BD498E1157530AEb3086301d5225b91216
 *   Aave v3 Pool     : 0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff
 *   RewardsController: 0x3A203B14CF8749a1e3b7314c6c49004B77Ee667A
 *   UniV3 SwapRouter : 0x101F443B4d1b059569D643917553c771E1b9663E
 *
 * Access control
 * ──────────────
 *   owner (= StrategyRouter) — deposit / withdraw / harvest / emergency
 *   owner                    — configure reward tokens, pause
 */
contract AaveStrategy is IVaultStrategy, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Immutables ───────────────────────────────────────────────────────────

    IERC20                     public immutable usdc;
    IERC20                     public immutable aUsdc;
    IAaveV3Pool                public immutable aavePool;
    IAaveV3RewardsController   public immutable rewardsController;
    IUniswapV3SwapRouter       public immutable swapRouter;

    // ─── Arbitrum Sequencer Uptime ────────────────────────────────────────────
    //
    // Chainlink recommends checking sequencer uptime before trusting L2 state.
    // If the sequencer is down, price/rate data may be stale and deposits should
    // be blocked until liveness is restored.
    //
    // Arbitrum Sepolia Sequencer Feed: 0x4da69F028a5790fE6402C1c2f41dab1Ec95f0d11
    // Arbitrum One    Sequencer Feed: 0xFdB631F5EE196F0ed6FAa767959853A9F217697D
    //
    // Set via setSequencerFeed(). If address(0), check is skipped (pre-config / testnets
    // where the feed is unavailable).
    //
    IChainlinkFeed public sequencerFeed;

    /// @notice Grace period after sequencer restart before deposits re-open.
    ///         Prevents stale-price exploitation in the first minutes after recovery.
    uint256 public constant SEQUENCER_GRACE_PERIOD = 1 hours;

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice USDC currently deployed in Aave (does not include accrued interest)
    uint256 public deployedPrincipal;

    /// @notice Soft circuit-breaker — blocks new deposits without affecting withdrawals
    bool public paused;

    /// @notice Reward tokens eligible for auto-swap → USDC on harvest
    address[] public rewardTokens;

    /// @notice Uniswap v3 fee tier to use when swapping a reward token to USDC (0 = skip)
    mapping(address => uint24) public rewardPoolFee;

    // ─── Events ───────────────────────────────────────────────────────────────

    event Deposited(uint256 amount, uint256 newPrincipal);
    event Withdrawn(uint256 amount, uint256 newPrincipal);
    event Harvested(uint256 baseYield, uint256 rewardYield, uint256 totalYield);
    event RewardClaimed(address indexed rewardToken, uint256 rewardAmount, uint256 usdcReceived);
    event RewardSwapFailed(address indexed rewardToken, uint256 amount);
    event RewardTokenConfigured(address indexed token, uint24 poolFee);
    event EmergencyWithdraw(uint256 amount, address indexed to);
    event PausedChanged(bool paused);
    event SequencerFeedSet(address indexed feed);

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param _usdc              USDC token address (vault's base asset)
     * @param _aUsdc             Aave interest-bearing USDC (aUSDC) address
     * @param _aavePool          Aave v3 Pool address
     * @param _rewardsController Aave RewardsController address
     * @param _swapRouter        Uniswap v3 SwapRouter02 address
     * @param _owner             Initial owner — transfer to StrategyRouter after deploy
     */
    constructor(
        address _usdc,
        address _aUsdc,
        address _aavePool,
        address _rewardsController,
        address _swapRouter,
        address _owner
    ) Ownable(_owner) {
        require(_usdc             != address(0), "AS: zero usdc");
        require(_aUsdc            != address(0), "AS: zero aUsdc");
        require(_aavePool         != address(0), "AS: zero pool");
        require(_rewardsController != address(0), "AS: zero rewards");
        require(_swapRouter       != address(0), "AS: zero router");

        usdc              = IERC20(_usdc);
        aUsdc             = IERC20(_aUsdc);
        aavePool          = IAaveV3Pool(_aavePool);
        rewardsController = IAaveV3RewardsController(_rewardsController);
        swapRouter        = IUniswapV3SwapRouter(_swapRouter);
    }

    // ─── IVaultStrategy ───────────────────────────────────────────────────────

    /**
     * @notice Pull USDC from caller (StrategyRouter) and supply to Aave.
     *         Caller must approve this contract before calling.
     */
    function deposit(uint256 amount) external override onlyOwner nonReentrant {
        require(!paused, "AS: paused");
        require(amount > 0, "AS: zero amount");
        _checkSequencer();

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        usdc.forceApprove(address(aavePool), amount);
        aavePool.supply(address(usdc), amount, address(this), 0);

        deployedPrincipal += amount;
        emit Deposited(amount, deployedPrincipal);
    }

    /**
     * @notice Withdraw `amount` USDC from Aave and send directly to caller (StrategyRouter).
     */
    function withdraw(uint256 amount) external override onlyOwner nonReentrant {
        require(amount > 0, "AS: zero amount");

        uint256 withdrawn = aavePool.withdraw(address(usdc), amount, msg.sender);

        if (deployedPrincipal >= withdrawn) {
            deployedPrincipal -= withdrawn;
        } else {
            deployedPrincipal = 0;
        }

        emit Withdrawn(withdrawn, deployedPrincipal);
    }

    /**
     * @notice Harvest yield:
     *   1. Aave base interest  = aUSDC balance above deployedPrincipal → withdrawn to caller
     *   2. Protocol rewards    = claimAllRewards() → swap each to USDC → transfer to caller
     *
     * @return totalYield Total USDC sent to caller (StrategyRouter)
     */
    function harvest() external override onlyOwner nonReentrant returns (uint256 totalYield) {
        // ── 1. Base yield ──────────────────────────────────────────────────────
        uint256 aBalance  = aUsdc.balanceOf(address(this));
        uint256 baseYield;

        if (aBalance > deployedPrincipal) {
            baseYield = aBalance - deployedPrincipal;
            // Withdraw yield from Aave directly to router (msg.sender)
            aavePool.withdraw(address(usdc), baseYield, msg.sender);
        }

        // ── 2. Protocol reward tokens (ARB, OP, etc.) ──────────────────────────
        uint256 rewardYield = _claimAndConvertRewards();
        if (rewardYield > 0) {
            usdc.safeTransfer(msg.sender, rewardYield);
        }

        totalYield = baseYield + rewardYield;
        emit Harvested(baseYield, rewardYield, totalYield);
    }

    /**
     * @notice Current value of strategy = aUSDC balance (includes accrued interest).
     */
    function totalAssets() external view override returns (uint256) {
        return aUsdc.balanceOf(address(this));
    }

    function asset() external view override returns (address) {
        return address(usdc);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /**
     * @notice Register a reward token for automatic swap to USDC during harvest.
     * @param token   Reward token address (e.g. ARB on mainnet)
     * @param poolFee Uniswap v3 fee tier for the token/USDC pool (e.g. 3000 = 0.3%)
     *                Pass 0 to remove / disable swapping for this token.
     */
    function configureRewardToken(address token, uint24 poolFee) external onlyOwner {
        require(token != address(0), "AS: zero token");

        bool found;
        for (uint256 i; i < rewardTokens.length; ++i) {
            if (rewardTokens[i] == token) { found = true; break; }
        }
        if (!found) rewardTokens.push(token);

        rewardPoolFee[token] = poolFee;
        emit RewardTokenConfigured(token, poolFee);
    }

    /**
     * @notice Emergency: immediately withdraw ALL assets from Aave to `to`.
     *         Bypasses normal vault flow — use only when Aave is compromised.
     */
    function emergencyWithdraw(address to) external onlyOwner {
        require(to != address(0), "AS: zero recipient");

        uint256 aBalance = aUsdc.balanceOf(address(this));
        if (aBalance == 0) return;

        // type(uint256).max = withdraw full balance
        uint256 out = aavePool.withdraw(address(usdc), type(uint256).max, to);
        deployedPrincipal = 0;

        emit EmergencyWithdraw(out, to);
    }

    /**
     * @notice Pause new deposits without blocking withdrawals or harvests.
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedChanged(_paused);
    }

    /**
     * @notice Set the Chainlink L2 sequencer uptime feed.
     *         Arbitrum Sepolia: 0x4da69F028a5790fE6402C1c2f41dab1Ec95f0d11
     *         Arbitrum One:     0xFdB631F5EE196F0ed6FAa767959853A9F217697D
     *         Pass address(0) to disable the check (e.g. during initial setup).
     */
    function setSequencerFeed(address feed) external onlyOwner {
        sequencerFeed = IChainlinkFeed(feed);
        emit SequencerFeedSet(feed);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    /**
     * @dev Revert if the Arbitrum sequencer is down or recently restarted.
     *      No-op when sequencerFeed is not configured (address(0)).
     *
     *      answer == 0 → sequencer is UP
     *      answer == 1 → sequencer is DOWN
     *
     *      Even when UP, we require startedAt + SEQUENCER_GRACE_PERIOD to have
     *      elapsed to guard against stale Aave rate data immediately after recovery.
     */
    function _checkSequencer() internal view {
        if (address(sequencerFeed) == address(0)) return;

        (, int256 answer, uint256 startedAt,,) = sequencerFeed.latestRoundData();

        require(answer == 0,                                     "AS: sequencer down");
        require(block.timestamp >= startedAt + SEQUENCER_GRACE_PERIOD, "AS: sequencer grace period");
    }

    /**
     * @dev Claim all Aave rewards for our aUSDC position and swap each reward
     *      token to USDC via Uniswap v3.
     *      Returns total USDC received from reward conversions.
     *      Silently skips unconfigured or swap-failed reward tokens.
     */
    function _claimAndConvertRewards() internal returns (uint256 usdcEarned) {
        if (rewardTokens.length == 0) return 0;

        address[] memory assets = new address[](1);
        assets[0] = address(aUsdc);

        // claimAllRewards returns only rewards with non-zero balances
        try rewardsController.claimAllRewards(assets, address(this))
            returns (address[] memory tokens, uint256[] memory amounts)
        {
            uint256 len = tokens.length;
            for (uint256 i; i < len; ++i) {
                if (amounts[i] == 0) continue;

                uint24 fee = rewardPoolFee[tokens[i]];
                if (fee == 0) {
                    // Not configured for swap — transfer raw token to owner instead
                    IERC20(tokens[i]).safeTransfer(owner(), amounts[i]);
                    continue;
                }

                uint256 received = _swapToUsdc(tokens[i], amounts[i], fee);
                emit RewardClaimed(tokens[i], amounts[i], received);
                usdcEarned += received;
            }
        } catch {
            // RewardsController call failed — not fatal, just no rewards this cycle
        }
    }

    /**
     * @dev Swap `amountIn` of `tokenIn` to USDC via a single Uniswap v3 pool.
     *      On swap failure, transfers the unconverted token to owner and returns 0.
     *
     * NOTE: `amountOutMinimum` is set to 0 for testnet simplicity.
     *       On mainnet, replace with a Chainlink TWAP-based floor to prevent MEV sandwich attacks.
     */
    function _swapToUsdc(
        address tokenIn,
        uint256 amountIn,
        uint24  fee
    ) internal returns (uint256 amountOut) {
        IERC20(tokenIn).forceApprove(address(swapRouter), amountIn);

        try swapRouter.exactInputSingle(
            IUniswapV3SwapRouter.ExactInputSingleParams({
                tokenIn:           tokenIn,
                tokenOut:          address(usdc),
                fee:               fee,
                recipient:         address(this),
                amountIn:          amountIn,
                amountOutMinimum:  0,        // TODO(mainnet): set to TWAP-derived minimum
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 out) {
            amountOut = out;
        } catch {
            // Swap failed (no pool, insufficient liquidity, etc.)
            // Rescue the reward token to owner rather than leaving it stranded
            IERC20(tokenIn).forceApprove(address(swapRouter), 0);
            IERC20(tokenIn).safeTransfer(owner(), amountIn);
            emit RewardSwapFailed(tokenIn, amountIn);
        }
    }
}
