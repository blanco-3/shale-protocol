// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ShaleShare.sol";
import "./interfaces/IVaultStrategy.sol";

/**
 * @title ShaleVault  (v2)
 * @notice AI-managed adaptive yield vault with three risk tiers.
 *
 * Changes from v1
 * ───────────────────
 * 1. Strategy abstraction — yield source is an IVaultStrategy plugin.
 *    Swap Aave for anything without touching this contract.
 *
 * 2. Withdrawal queue (inspired by Door Protocol)
 *    - requestWithdraw(shares, tier)  → queue for next epoch settlement
 *    - earlyWithdraw(shares, tier)    → immediate, 1% penalty taken
 *    - Penalty redistributed pro-rata to remaining depositors at epoch
 *
 * 3. ERC-4626-style share accounting
 *    Each tier tracks (principal + accumulatedYield).
 *    previewRedeem(shares, tier) returns current USDC value.
 *    As yield accumulates, 1 share redeems for >1 USDC.
 *
 * Waterfall (unchanged)
 * ─────────────────────
 *   1. CORE gets min(totalYield, coreDue)
 *   2. SEAM gets min(remainder, seamDue)
 *   3. APEX gets everything left
 *   If yield < coreDue: APEX principal slashed first, then SEAM.
 */
contract ShaleVault is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Roles ────────────────────────────────────────────────────────────
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant KEEPER_ROLE   = keccak256("KEEPER_ROLE");

    // ─── Constants ────────────────────────────────────────────────────────
    uint256 public constant BASIS_POINTS               = 10_000;
    uint256 public constant EARLY_WITHDRAW_PENALTY_BPS = 100;   // 1%
    uint256 public constant EPOCH_DURATION             = 7 days;

    // ─── External Contracts ───────────────────────────────────────────────
    IERC20         public immutable usdc;
    IVaultStrategy public strategy;

    // ─── Tier Share Tokens ────────────────────────────────────────────────
    ShaleShare public immutable coreToken;
    ShaleShare public immutable seamToken;
    ShaleShare public immutable apexToken;

    // ─── Per-tier accounting ──────────────────────────────────────────────
    // principal: deposited USDC (shrinks on slash, grows on deposit)
    // accumulatedYield: undistributed yield credited to this tier
    uint256 public corePrincipal;
    uint256 public seamPrincipal;
    uint256 public apexPrincipal;

    uint256 public coreAccumulatedYield;
    uint256 public seamAccumulatedYield;
    uint256 public apexAccumulatedYield;

    // ─── Target Ranges (bps, annualised) ─────────────────────────────────
    uint256 public coreTargetMinBps = 400;
    uint256 public coreTargetMaxBps = 600;
    uint256 public seamTargetMinBps = 200;
    uint256 public seamTargetMaxBps = 400;

    // ─── Epoch Tracking ───────────────────────────────────────────────────
    uint256 public lastEpochTimestamp;
    uint256 public epochCount;

    // ─── Withdrawal Queue ─────────────────────────────────────────────────
    enum Tier { CORE, SEAM, APEX }

    struct WithdrawRequest {
        address user;
        Tier    tier;
        uint256 shares;
        bool    processed;
    }

    WithdrawRequest[] public withdrawQueue;

    /// @notice Penalties from earlyWithdraw, held until epoch settlement
    uint256 public pendingPenalties;

    // ─── Events ───────────────────────────────────────────────────────────
    event Deposited(address indexed user, uint8 indexed tier, uint256 amount, uint256 shares);
    event WithdrawRequested(address indexed user, uint8 indexed tier, uint256 shares);
    event EarlyWithdraw(address indexed user, uint8 indexed tier, uint256 shares, uint256 received, uint256 penalty);
    event WithdrawProcessed(address indexed user, uint8 indexed tier, uint256 shares, uint256 amount);
    event EpochSettled(uint256 indexed epochId, uint256 totalYield, uint256 coreShare, uint256 seamShare, uint256 apexShare);
    event TargetsUpdated(uint256 coreMin, uint256 coreMax, uint256 seamMin, uint256 seamMax);
    event StrategyUpdated(address indexed newStrategy);
    event PenaltyDistributed(uint256 amount);

    // ─── Constructor ──────────────────────────────────────────────────────
    constructor(
        address _usdc,
        address _strategy,
        address _coreToken,
        address _seamToken,
        address _apexToken,
        address _admin
    ) {
        usdc      = IERC20(_usdc);
        strategy  = IVaultStrategy(_strategy);
        coreToken = ShaleShare(_coreToken);
        seamToken = ShaleShare(_seamToken);
        apexToken = ShaleShare(_apexToken);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(KEEPER_ROLE, _admin);
        lastEpochTimestamp = block.timestamp;
    }

    // ─── Deposit ──────────────────────────────────────────────────────────

    /**
     * @notice Deposit USDC into a tier and receive share tokens 1:1.
     *         Over time, yield accumulates and previewRedeem(shares) > deposit.
     */
    function deposit(uint256 amount, Tier tier) external nonReentrant whenNotPaused {
        require(amount > 0, "amount must be > 0");

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        usdc.approve(address(strategy), amount);
        strategy.deposit(amount);

        if (tier == Tier.CORE) {
            corePrincipal += amount;
            coreToken.mint(msg.sender, amount);
            emit Deposited(msg.sender, 0, amount, amount);
        } else if (tier == Tier.SEAM) {
            seamPrincipal += amount;
            seamToken.mint(msg.sender, amount);
            emit Deposited(msg.sender, 1, amount, amount);
        } else {
            apexPrincipal += amount;
            apexToken.mint(msg.sender, amount);
            emit Deposited(msg.sender, 2, amount, amount);
        }
    }

    // ─── Queued Withdraw ──────────────────────────────────────────────────

    /**
     * @notice Queue a withdrawal to be processed at next epoch settlement.
     *         No penalty. Shares stay in user wallet until processed.
     */
    function requestWithdraw(uint256 shares, Tier tier) external nonReentrant whenNotPaused {
        require(shares > 0, "shares must be > 0");
        require(_tokenFor(tier).balanceOf(msg.sender) >= shares, "insufficient shares");

        withdrawQueue.push(WithdrawRequest({
            user:      msg.sender,
            tier:      tier,
            shares:    shares,
            processed: false
        }));

        emit WithdrawRequested(msg.sender, uint8(tier), shares);
    }

    // ─── Early Withdraw ───────────────────────────────────────────────────

    /**
     * @notice Withdraw immediately, paying a 1% penalty.
     *         Penalty is held in pendingPenalties and distributed to
     *         remaining depositors at the next epoch settlement.
     */
    function earlyWithdraw(uint256 shares, Tier tier) external nonReentrant whenNotPaused {
        require(shares > 0, "shares must be > 0");
        require(_tokenFor(tier).balanceOf(msg.sender) >= shares, "insufficient shares");

        uint256 usdcValue = previewRedeem(shares, tier);
        uint256 penalty   = (usdcValue * EARLY_WITHDRAW_PENALTY_BPS) / BASIS_POINTS;
        uint256 payout    = usdcValue - penalty;

        _burnShares(msg.sender, tier, shares);
        _reducePrincipalAndYield(tier, usdcValue);

        strategy.withdraw(usdcValue);

        // Penalty stays in vault (not sent to strategy) for redistribution
        // strategy returned usdcValue to this contract; keep penalty here
        pendingPenalties += penalty;

        usdc.safeTransfer(msg.sender, payout);

        emit EarlyWithdraw(msg.sender, uint8(tier), shares, payout, penalty);
    }

    // ─── Epoch Settlement ─────────────────────────────────────────────────

    /**
     * @notice Settle the epoch:
     *   1. Harvest yield from strategy
     *   2. Waterfall distribution → credit per-tier yield buckets
     *   3. Distribute early-withdraw penalties pro-rata
     *   4. Process queued withdrawals
     */
    function settleEpoch() external nonReentrant {
        require(block.timestamp >= lastEpochTimestamp + EPOCH_DURATION, "epoch not finished");

        uint256 totalPrincipal_ = corePrincipal + seamPrincipal + apexPrincipal;

        if (totalPrincipal_ == 0) {
            lastEpochTimestamp = block.timestamp;
            epochCount++;
            return;
        }

        // 1. Harvest
        uint256 totalYield = strategy.harvest();

        uint256 epochSeconds = block.timestamp - lastEpochTimestamp;

        // 2. Waterfall
        uint256 coreDue = (corePrincipal * coreTargetMinBps * epochSeconds) / (BASIS_POINTS * 365 days);
        uint256 seamDue = (seamPrincipal * seamTargetMinBps * epochSeconds) / (BASIS_POINTS * 365 days);

        uint256 coreAlloc;
        uint256 seamAlloc;
        uint256 apexAlloc;

        if (totalYield >= coreDue + seamDue) {
            coreAlloc = coreDue;
            seamAlloc = seamDue;
            apexAlloc = totalYield - coreDue - seamDue;
        } else if (totalYield >= coreDue) {
            coreAlloc = coreDue;
            seamAlloc = totalYield - coreDue;
            apexAlloc = 0;
        } else {
            coreAlloc = totalYield;
            uint256 deficit = coreDue - totalYield;
            if (apexPrincipal >= deficit) {
                apexPrincipal -= deficit;
            } else {
                uint256 remaining = deficit - apexPrincipal;
                apexPrincipal = 0;
                seamPrincipal = seamPrincipal > remaining ? seamPrincipal - remaining : 0;
            }
            seamAlloc = 0;
            apexAlloc = 0;
        }

        coreAccumulatedYield += coreAlloc;
        seamAccumulatedYield += seamAlloc;
        apexAccumulatedYield += apexAlloc;

        // 3. Penalties
        if (pendingPenalties > 0) {
            _distributePenalties(corePrincipal + seamPrincipal + apexPrincipal);
        }

        // 4. Process queue
        _processWithdrawQueue();

        lastEpochTimestamp = block.timestamp;
        epochCount++;

        emit EpochSettled(epochCount, totalYield, coreAlloc, seamAlloc, apexAlloc);
    }

    // ─── Internal ─────────────────────────────────────────────────────────

    function _distributePenalties(uint256 totalPrincipal_) internal {
        if (totalPrincipal_ == 0) { pendingPenalties = 0; return; }

        uint256 total = pendingPenalties;
        pendingPenalties = 0;

        uint256 coreShare = (total * corePrincipal) / totalPrincipal_;
        uint256 seamShare = (total * seamPrincipal) / totalPrincipal_;
        uint256 apexShare = total - coreShare - seamShare;

        coreAccumulatedYield += coreShare;
        seamAccumulatedYield += seamShare;
        apexAccumulatedYield += apexShare;

        emit PenaltyDistributed(total);
    }

    function _processWithdrawQueue() internal {
        uint256 len = withdrawQueue.length;
        for (uint256 i = 0; i < len; i++) {
            WithdrawRequest storage req = withdrawQueue[i];
            if (req.processed) continue;

            uint256 userBalance = _tokenFor(req.tier).balanceOf(req.user);
            uint256 sharesToRedeem = req.shares > userBalance ? userBalance : req.shares;

            if (sharesToRedeem == 0) { req.processed = true; continue; }

            uint256 usdcValue = previewRedeem(sharesToRedeem, req.tier);

            _burnShares(req.user, req.tier, sharesToRedeem);
            _reducePrincipalAndYield(req.tier, usdcValue);

            strategy.withdraw(usdcValue);
            usdc.safeTransfer(req.user, usdcValue);

            req.processed = true;
            emit WithdrawProcessed(req.user, uint8(req.tier), sharesToRedeem, usdcValue);
        }
        delete withdrawQueue;
    }

    function _tokenFor(Tier tier) internal view returns (ShaleShare) {
        if (tier == Tier.CORE) return coreToken;
        if (tier == Tier.SEAM) return seamToken;
        return apexToken;
    }

    function _burnShares(address user, Tier tier, uint256 shares) internal {
        _tokenFor(tier).burn(user, shares);
    }

    function _reducePrincipalAndYield(Tier tier, uint256 usdcValue) internal {
        if (tier == Tier.CORE) {
            if (coreAccumulatedYield >= usdcValue) {
                coreAccumulatedYield -= usdcValue;
            } else {
                uint256 fromPrincipal = usdcValue - coreAccumulatedYield;
                coreAccumulatedYield = 0;
                corePrincipal = corePrincipal > fromPrincipal ? corePrincipal - fromPrincipal : 0;
            }
        } else if (tier == Tier.SEAM) {
            if (seamAccumulatedYield >= usdcValue) {
                seamAccumulatedYield -= usdcValue;
            } else {
                uint256 fromPrincipal = usdcValue - seamAccumulatedYield;
                seamAccumulatedYield = 0;
                seamPrincipal = seamPrincipal > fromPrincipal ? seamPrincipal - fromPrincipal : 0;
            }
        } else {
            if (apexAccumulatedYield >= usdcValue) {
                apexAccumulatedYield -= usdcValue;
            } else {
                uint256 fromPrincipal = usdcValue - apexAccumulatedYield;
                apexAccumulatedYield = 0;
                apexPrincipal = apexPrincipal > fromPrincipal ? apexPrincipal - fromPrincipal : 0;
            }
        }
    }

    // ─── ERC-4626-style View ──────────────────────────────────────────────

    /**
     * @notice Current USDC value of `shares` for the given tier.
     *         exchangeRate = (principal + accumulatedYield) / totalShares
     */
    function previewRedeem(uint256 shares, Tier tier) public view returns (uint256) {
        ShaleShare token = _tokenFor(tier);
        uint256 totalShares = token.totalSupply();
        if (totalShares == 0) return shares;

        (uint256 principal, uint256 yieldBucket) = _tierBuckets(tier);
        return (shares * (principal + yieldBucket)) / totalShares;
    }

    function _tierBuckets(Tier tier) internal view returns (uint256 principal, uint256 yieldBucket) {
        if (tier == Tier.CORE) return (corePrincipal, coreAccumulatedYield);
        if (tier == Tier.SEAM) return (seamPrincipal, seamAccumulatedYield);
        return (apexPrincipal, apexAccumulatedYield);
    }

    // ─── Legacy views (agent / frontend) ─────────────────────────────────

    function pendingYield(address user, Tier tier) external view returns (uint256) {
        uint256 shares = _tokenFor(tier).balanceOf(user);
        if (shares == 0) return 0;
        uint256 value = previewRedeem(shares, tier);
        return value > shares ? value - shares : 0;
    }

    function totalPrincipal() external view returns (uint256) {
        return corePrincipal + seamPrincipal + apexPrincipal;
    }

    function withdrawQueueLength() external view returns (uint256) {
        return withdrawQueue.length;
    }

    // ─── Governor: Update Targets ─────────────────────────────────────────

    function updateTargets(
        uint256 _coreMin, uint256 _coreMax,
        uint256 _seamMin, uint256 _seamMax
    ) external onlyRole(GOVERNOR_ROLE) {
        require(_coreMin <= _coreMax, "invalid core range");
        require(_seamMin <= _seamMax, "invalid seam range");
        require(_coreMax <= 2000, "core max capped at 20%");
        coreTargetMinBps = _coreMin;
        coreTargetMaxBps = _coreMax;
        seamTargetMinBps = _seamMin;
        seamTargetMaxBps = _seamMax;
        emit TargetsUpdated(_coreMin, _coreMax, _seamMin, _seamMax);
    }

    // ─── Admin ────────────────────────────────────────────────────────────

    function setStrategy(address newStrategy) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newStrategy != address(0), "zero address");
        strategy = IVaultStrategy(newStrategy);
        emit StrategyUpdated(newStrategy);
    }

    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}
