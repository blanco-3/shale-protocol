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
 * @title ShaleVault (v3)
 * @notice AI-managed adaptive yield vault with three risk tiers and genuine CDO-style
 *         loss absorption.
 *
 * Tranche structure
 * ─────────────────
 *   CORE  (senior)    — protected APY, last to absorb losses
 *   SEAM  (mezzanine) — higher APY, absorbs losses after APEX is exhausted
 *   APEX  (junior)    — highest APY (residual), first-loss tranche
 *
 * Risk / reward ordering (always enforced):
 *   APY:  APEX residual  >  SEAM target  >  CORE target
 *   Loss: APEX absorbs first → SEAM → CORE (last resort)
 *
 * APEX buffer gate
 * ────────────────
 *   New CORE and SEAM deposits are blocked when APEX/totalTVL < minApexBufferBps.
 *   This guarantees a minimum "first-loss cushion" for senior depositors at all times.
 *   To unlock CORE/SEAM capacity, someone must deposit into APEX first.
 *
 * Capital loss absorption
 * ───────────────────────
 *   At each epoch settlement the vault compares:
 *     strategy.totalAssets()  vs  (corePrincipal + seamPrincipal + apexPrincipal)
 *   Any shortfall (e.g. protocol hack, bad debt) is written off in tranche order.
 *
 * Penalty distribution
 * ────────────────────
 *   APEX takes 60% of early-withdrawal penalties (insurance premium for first-loss risk).
 *   CORE and SEAM split the remaining 40% pro-rata by principal.
 */
contract ShaleVault is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Roles ────────────────────────────────────────────────────────────
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant KEEPER_ROLE   = keccak256("KEEPER_ROLE");

    // ─── Constants ────────────────────────────────────────────────────────
    uint256 public constant BASIS_POINTS               = 10_000;
    uint256 public constant EARLY_WITHDRAW_PENALTY_BPS = 100;   // 1%
    uint256 public constant EPOCH_DURATION             = 2 minutes; // demo: 2min (mainnet: 7 days)

    // Fraction of penalties forwarded to APEX as insurance premium (60%)
    uint256 public constant APEX_PENALTY_SHARE_BPS     = 6_000;

    // Minimum time between deposit and earlyWithdraw to prevent epoch timing attacks
    uint256 public constant MIN_DEPOSIT_LOCK = 1 days;

    // ─── External Contracts ───────────────────────────────────────────────
    IERC20         public immutable usdc;
    IVaultStrategy public strategy;

    // ─── Tier Share Tokens ────────────────────────────────────────────────
    ShaleShare public immutable coreToken;
    ShaleShare public immutable seamToken;
    ShaleShare public immutable apexToken;

    // ─── Per-tier accounting ──────────────────────────────────────────────
    uint256 public corePrincipal;
    uint256 public seamPrincipal;
    uint256 public apexPrincipal;

    uint256 public coreAccumulatedYield;
    uint256 public seamAccumulatedYield;
    uint256 public apexAccumulatedYield;

    // ─── APY Target Ranges (bps, annualised) ─────────────────────────────
    //
    // Risk ordering enforced on update: seamMin > coreMax (always)
    //
    //   CORE:  2.50% – 3.50%   (stable, protected senior tranche)
    //   SEAM:  5.00% – 7.00%   (mezzanine, materially above CORE)
    //   APEX:  residual yield  (junior, captures upside of well-performing strategies)
    //
    uint256 public coreTargetMinBps =  250;
    uint256 public coreTargetMaxBps =  350;
    uint256 public seamTargetMinBps =  500;
    uint256 public seamTargetMaxBps =  700;

    // ─── APEX Buffer Gate ─────────────────────────────────────────────────
    //
    // Default: 15%. If APEX / totalTVL falls below this, new CORE and SEAM
    // deposits are blocked until APEX is replenished.
    //
    uint256 public minApexBufferBps = 1_500; // 15%

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

    /// @notice Index of the next unprocessed entry in withdrawQueue.
    ///         Advances by up to maxWithdrawalsPerEpoch each epoch.
    ///         Reset to 0 when the queue is fully drained.
    uint256 public queueHead;

    /// @notice Max queue entries processed per epoch. GOVERNOR_ROLE can adjust (10–500).
    ///         Default 100. Prevents OOG when queue is very long.
    uint256 public maxWithdrawalsPerEpoch = 100;

    uint256 public pendingPenalties;

    /// @notice Tracks the last deposit timestamp per user per tier.
    ///         Used to enforce MIN_DEPOSIT_LOCK before earlyWithdraw.
    mapping(address => mapping(uint8 => uint256)) public lastDepositTime;

    // ─── Events ───────────────────────────────────────────────────────────
    event Deposited(address indexed user, uint8 indexed tier, uint256 amount, uint256 shares);
    event WithdrawRequested(address indexed user, uint8 indexed tier, uint256 shares);
    event EarlyWithdraw(address indexed user, uint8 indexed tier, uint256 shares, uint256 received, uint256 penalty);
    event WithdrawProcessed(address indexed user, uint8 indexed tier, uint256 shares, uint256 amount);
    event EpochSettled(uint256 indexed epochId, uint256 totalYield, uint256 coreShare, uint256 seamShare, uint256 apexShare);
    event LossAbsorbed(uint256 indexed epochId, uint256 lossAmount, uint256 apexAbsorbed, uint256 seamAbsorbed, uint256 coreAbsorbed);
    event TargetsUpdated(uint256 coreMin, uint256 coreMax, uint256 seamMin, uint256 seamMax);
    event MinApexBufferUpdated(uint256 oldBps, uint256 newBps);
    event MaxWithdrawalsPerEpochUpdated(uint256 oldVal, uint256 newVal);
    event StrategyUpdated(address indexed newStrategy);
    event PenaltyDistributed(uint256 total, uint256 apexBonus, uint256 coreShare, uint256 seamShare);
    event ApexBufferGated(address indexed depositor, uint8 tier, uint256 currentBufferBps);

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
     *
     * APEX buffer gate:
     *   CORE and SEAM deposits are blocked if APEX/totalTVL < minApexBufferBps.
     *   APEX deposits are always accepted (they replenish the buffer).
     */
    function deposit(uint256 amount, Tier tier) external nonReentrant whenNotPaused {
        require(amount > 0, "SV: zero amount");

        // ── APEX buffer gate ───────────────────────────────────────────────
        // Gate uses total vault TVL including accumulated yield — not principal-only.
        // Yield-inclusive ratio is the true economic exposure of the buffer:
        // once yield has accrued, apexPrincipal alone understates APEX's protection.
        if (tier != Tier.APEX) {
            uint256 apexValue = apexPrincipal + apexAccumulatedYield;
            uint256 totalValue = corePrincipal + seamPrincipal + apexPrincipal
                               + coreAccumulatedYield + seamAccumulatedYield + apexAccumulatedYield;
            if (totalValue > 0) {
                uint256 apexRatioBps = (apexValue * BASIS_POINTS) / totalValue;
                if (apexRatioBps < minApexBufferBps) {
                    emit ApexBufferGated(msg.sender, uint8(tier), apexRatioBps);
                    revert("SV: apex buffer too low, deposit into APEX first");
                }
            }
        }

        // ── Compute shares at current exchange rate BEFORE updating principal ──
        //
        // Exchange rate = (principal + accumulatedYield) / totalSupply
        // New shares    = amount * totalSupply / (principal + accumulatedYield)
        //
        // First depositor (totalSupply == 0) always receives shares 1:1 to bootstrap.
        // This prevents yield dilution: a depositor joining after yield has accrued
        // receives fewer shares proportional to their contribution, so they cannot
        // immediately claim yield they did not earn.
        uint256 sharesToMint;
        {
            uint256 existingShares = _tokenFor(tier).totalSupply();
            (uint256 p, uint256 y) = _tierBuckets(tier);
            sharesToMint = (existingShares == 0 || p + y == 0)
                ? amount
                : (amount * existingShares) / (p + y);
        }

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        usdc.forceApprove(address(strategy), amount);
        strategy.deposit(amount);

        lastDepositTime[msg.sender][uint8(tier)] = block.timestamp;

        if (tier == Tier.CORE) {
            corePrincipal += amount;
            coreToken.mint(msg.sender, sharesToMint);
            emit Deposited(msg.sender, 0, amount, sharesToMint);
        } else if (tier == Tier.SEAM) {
            seamPrincipal += amount;
            seamToken.mint(msg.sender, sharesToMint);
            emit Deposited(msg.sender, 1, amount, sharesToMint);
        } else {
            apexPrincipal += amount;
            apexToken.mint(msg.sender, sharesToMint);
            emit Deposited(msg.sender, 2, amount, sharesToMint);
        }
    }

    // ─── Queued Withdraw ──────────────────────────────────────────────────

    function requestWithdraw(uint256 shares, Tier tier) external nonReentrant whenNotPaused {
        require(shares > 0, "SV: zero shares");
        require(_tokenFor(tier).balanceOf(msg.sender) >= shares, "SV: insufficient shares");
        require(
            block.timestamp >= lastDepositTime[msg.sender][uint8(tier)] + MIN_DEPOSIT_LOCK,
            "SV: deposit too recent, wait 1 day before withdraw"
        );

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
     * @notice Withdraw immediately with a 1% penalty.
     *         60% of the penalty goes to APEX as insurance premium.
     *         40% is distributed pro-rata to CORE and SEAM at next epoch.
     */
    function earlyWithdraw(uint256 shares, Tier tier) external nonReentrant whenNotPaused {
        require(shares > 0, "SV: zero shares");
        require(_tokenFor(tier).balanceOf(msg.sender) >= shares, "SV: insufficient shares");
        require(
            block.timestamp >= lastDepositTime[msg.sender][uint8(tier)] + MIN_DEPOSIT_LOCK,
            "SV: deposit too recent, wait 1 day before early withdraw"
        );

        uint256 usdcValue = previewRedeem(shares, tier);
        uint256 penalty   = (usdcValue * EARLY_WITHDRAW_PENALTY_BPS) / BASIS_POINTS;
        uint256 payout    = usdcValue - penalty;

        _burnShares(msg.sender, tier, shares);
        _reducePrincipalAndYield(tier, usdcValue);

        strategy.withdraw(usdcValue);

        pendingPenalties += penalty;
        usdc.safeTransfer(msg.sender, payout);

        emit EarlyWithdraw(msg.sender, uint8(tier), shares, payout, penalty);
    }

    // ─── Epoch Settlement ─────────────────────────────────────────────────

    /**
     * @notice Settle the epoch:
     *   1. Harvest yield from strategy
     *   2. Capital loss check — absorb any shortfall (APEX → SEAM → CORE)
     *   3. Waterfall yield distribution
     *   4. Distribute early-withdraw penalties (60% to APEX, 40% CORE+SEAM pro-rata)
     *   5. Process queued withdrawals
     */
    function settleEpoch() external nonReentrant {
        require(block.timestamp >= lastEpochTimestamp + EPOCH_DURATION, "SV: epoch not finished");

        uint256 totalPrincipal_ = corePrincipal + seamPrincipal + apexPrincipal;

        if (totalPrincipal_ == 0) {
            lastEpochTimestamp = block.timestamp;
            epochCount++;
            return;
        }

        // 1. Harvest — collect yield from strategy to this vault
        uint256 totalYield = strategy.harvest();

        // 2. Capital loss detection
        //    After harvest, strategy.totalAssets() should equal deployed principal.
        //    Any shortfall means the underlying protocol suffered a loss.
        uint256 strategyValue = strategy.totalAssets();
        uint256 trackedPrincipal = corePrincipal + seamPrincipal + apexPrincipal;

        if (strategyValue < trackedPrincipal) {
            uint256 capitalLoss = trackedPrincipal - strategyValue;
            (uint256 apexAbs, uint256 seamAbs, uint256 coreAbs) = _absorbCapitalLoss(capitalLoss);
            emit LossAbsorbed(epochCount, capitalLoss, apexAbs, seamAbs, coreAbs);
        }

        // 3. Waterfall yield distribution
        uint256 epochSeconds = block.timestamp - lastEpochTimestamp;
        uint256 coreDue = (corePrincipal * coreTargetMinBps * epochSeconds) / (BASIS_POINTS * 365 days);
        uint256 seamDue = (seamPrincipal * seamTargetMinBps * epochSeconds) / (BASIS_POINTS * 365 days);

        uint256 coreAlloc;
        uint256 seamAlloc;
        uint256 apexAlloc;

        if (totalYield >= coreDue + seamDue) {
            // Normal: both CORE and SEAM fully paid, APEX gets remainder
            coreAlloc = coreDue;
            seamAlloc = seamDue;
            apexAlloc = totalYield - coreDue - seamDue;
        } else if (totalYield >= coreDue) {
            // Partial: CORE fully paid, SEAM partially paid, APEX zero
            coreAlloc = coreDue;
            seamAlloc = totalYield - coreDue;
            apexAlloc = 0;
        } else {
            // Stress: CORE fully paid from yield, SEAM and APEX zero
            // CORE deficit covered by slashing APEX first, then SEAM
            coreAlloc = totalYield;
            uint256 yieldDeficit = coreDue - totalYield;
            _absorbYieldDeficit(yieldDeficit);
            seamAlloc = 0;
            apexAlloc = 0;
        }

        coreAccumulatedYield += coreAlloc;
        seamAccumulatedYield += seamAlloc;
        apexAccumulatedYield += apexAlloc;

        // 4. Distribute penalties
        if (pendingPenalties > 0) {
            _distributePenalties();
        }

        // 5. Process queued withdrawals
        _processWithdrawQueue();

        lastEpochTimestamp = block.timestamp;
        epochCount++;

        emit EpochSettled(epochCount, totalYield, coreAlloc, seamAlloc, apexAlloc);
    }

    // ─── Governor ─────────────────────────────────────────────────────────

    /**
     * @notice Update APY target ranges.
     *         Enforces: seamMin > coreMax (mezzanine must always out-yield senior).
     */
    function updateTargets(
        uint256 _coreMin, uint256 _coreMax,
        uint256 _seamMin, uint256 _seamMax
    ) external onlyRole(GOVERNOR_ROLE) {
        require(_coreMin  <= _coreMax,     "SV: invalid core range");
        require(_seamMin  <= _seamMax,     "SV: invalid seam range");
        require(_seamMin  >  _coreMax,     "SV: seam must exceed core (risk ordering violated)");
        require(_coreMax  <= 2_000,        "SV: core max capped at 20%");
        require(_seamMax  <= 5_000,        "SV: seam max capped at 50%");

        coreTargetMinBps = _coreMin;
        coreTargetMaxBps = _coreMax;
        seamTargetMinBps = _seamMin;
        seamTargetMaxBps = _seamMax;

        emit TargetsUpdated(_coreMin, _coreMax, _seamMin, _seamMax);
    }

    /**
     * @notice Adjust the minimum APEX buffer required before CORE/SEAM deposits are accepted.
     *         Range: 500 bps (5%) to 4000 bps (40%).
     */
    function setMinApexBuffer(uint256 newBps) external onlyRole(GOVERNOR_ROLE) {
        require(newBps >= 500 && newBps <= 4_000, "SV: buffer bps out of range");
        emit MinApexBufferUpdated(minApexBufferBps, newBps);
        minApexBufferBps = newBps;
    }

    /**
     * @notice Adjust the maximum number of withdrawal queue entries processed per epoch.
     *         Raising this value reduces wait time for users deep in the queue,
     *         but increases settleEpoch() gas cost proportionally.
     *         Range: 10–500.
     */
    function setMaxWithdrawalsPerEpoch(uint256 newVal) external onlyRole(GOVERNOR_ROLE) {
        require(newVal >= 10 && newVal <= 500, "SV: value out of range");
        emit MaxWithdrawalsPerEpochUpdated(maxWithdrawalsPerEpoch, newVal);
        maxWithdrawalsPerEpoch = newVal;
    }

    function setStrategy(address newStrategy) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newStrategy != address(0), "SV: zero address");
        strategy = IVaultStrategy(newStrategy);
        emit StrategyUpdated(newStrategy);
    }

    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    // ─── Views ────────────────────────────────────────────────────────────

    /**
     * @notice Current USDC value of `shares` for the given tier.
     *         As yield accumulates, 1 share redeems for > 1 USDC.
     */
    function previewRedeem(uint256 shares, Tier tier) public view returns (uint256) {
        ShaleShare token = _tokenFor(tier);
        uint256 totalShares = token.totalSupply();
        if (totalShares == 0) return shares;

        (uint256 principal, uint256 yieldBucket) = _tierBuckets(tier);
        return (shares * (principal + yieldBucket)) / totalShares;
    }

    /**
     * @notice APEX buffer as a fraction of total TVL, in basis points.
     *         Should stay above minApexBufferBps for new deposits to be accepted.
     */
    function apexBufferBps() external view returns (uint256) {
        uint256 apexValue  = apexPrincipal + apexAccumulatedYield;
        uint256 totalValue = corePrincipal + seamPrincipal + apexPrincipal
                           + coreAccumulatedYield + seamAccumulatedYield + apexAccumulatedYield;
        if (totalValue == 0) return 0;
        return (apexValue * BASIS_POINTS) / totalValue;
    }

    /**
     * @notice Whether CORE or SEAM deposits are currently gated by the APEX buffer.
     */
    function apexBufferGateActive() external view returns (bool) {
        uint256 apexValue  = apexPrincipal + apexAccumulatedYield;
        uint256 totalValue = corePrincipal + seamPrincipal + apexPrincipal
                           + coreAccumulatedYield + seamAccumulatedYield + apexAccumulatedYield;
        if (totalValue == 0) return false;
        return (apexValue * BASIS_POINTS) / totalValue < minApexBufferBps;
    }

    function totalPrincipal() external view returns (uint256) {
        return corePrincipal + seamPrincipal + apexPrincipal;
    }

    function withdrawQueueLength() external view returns (uint256) {
        return withdrawQueue.length;
    }

    function pendingYield(address user, Tier tier) external view returns (uint256) {
        uint256 shares = _tokenFor(tier).balanceOf(user);
        if (shares == 0) return 0;
        uint256 value = previewRedeem(shares, tier);
        return value > shares ? value - shares : 0;
    }

    // ─── Internal ─────────────────────────────────────────────────────────

    /**
     * @dev Absorb a capital loss (from a strategy hack / bad debt) in tranche order.
     *      APEX absorbs first (junior/first-loss tranche), SEAM next, CORE last.
     *
     *      Within each tranche, principal is consumed before accumulated yield.
     *      This preserves the invariant:
     *        sum(principal_i + yieldBucket_i) <= strategy.totalAssets()
     *
     *      Without this, yield buckets would represent claims against assets that
     *      no longer exist, making previewRedeem() return values the strategy cannot pay.
     *
     *      Returns the total amount absorbed from each tranche (principal + yield combined).
     */
    function _absorbCapitalLoss(uint256 loss)
        internal
        returns (uint256 apexAbsorbed, uint256 seamAbsorbed, uint256 coreAbsorbed)
    {
        // ── APEX first ────────────────────────────────────────────────────
        uint256 apexTotal = apexPrincipal + apexAccumulatedYield;
        if (loss <= apexTotal) {
            // Loss fits within APEX — consume principal first, then yield
            if (loss <= apexPrincipal) {
                apexPrincipal -= loss;
            } else {
                uint256 fromYield  = loss - apexPrincipal;
                apexPrincipal      = 0;
                apexAccumulatedYield -= fromYield; // safe: fromYield <= apexAccumulatedYield
            }
            return (loss, 0, 0);
        }
        apexAbsorbed         = apexTotal;
        loss                -= apexTotal;
        apexPrincipal        = 0;
        apexAccumulatedYield = 0;

        // ── SEAM next ─────────────────────────────────────────────────────
        uint256 seamTotal = seamPrincipal + seamAccumulatedYield;
        if (loss <= seamTotal) {
            if (loss <= seamPrincipal) {
                seamPrincipal -= loss;
            } else {
                uint256 fromYield  = loss - seamPrincipal;
                seamPrincipal      = 0;
                seamAccumulatedYield -= fromYield;
            }
            return (apexAbsorbed, loss, 0);
        }
        seamAbsorbed         = seamTotal;
        loss                -= seamTotal;
        seamPrincipal        = 0;
        seamAccumulatedYield = 0;

        // ── CORE last (protected senior tranche) ──────────────────────────
        uint256 coreTotal = corePrincipal + coreAccumulatedYield;
        coreAbsorbed = loss <= coreTotal ? loss : coreTotal;
        if (coreAbsorbed <= corePrincipal) {
            corePrincipal -= coreAbsorbed;
        } else {
            uint256 fromYield  = coreAbsorbed - corePrincipal;
            corePrincipal      = 0;
            coreAccumulatedYield = coreAccumulatedYield > fromYield
                ? coreAccumulatedYield - fromYield : 0;
        }
    }

    /**
     * @dev When yield is insufficient to meet CORE target, cover the deficit by
     *      slashing APEX principal first, then SEAM.
     *      This is the "yield shortfall absorption" — separate from capital loss.
     */
    function _absorbYieldDeficit(uint256 deficit) internal {
        if (deficit == 0) return;

        if (deficit <= apexPrincipal) {
            apexPrincipal -= deficit;
            return;
        }
        deficit      -= apexPrincipal;
        apexPrincipal = 0;

        if (deficit <= seamPrincipal) {
            seamPrincipal -= deficit;
            return;
        }
        seamPrincipal = 0;
        // If even that's not enough, CORE absorbs — extreme edge case
    }

    /**
     * @dev Distribute early-withdrawal penalties.
     *      APEX receives 60% (insurance premium for first-loss risk).
     *      CORE and SEAM split 40% pro-rata by principal.
     */
    function _distributePenalties() internal {
        uint256 total = pendingPenalties;
        pendingPenalties = 0;

        uint256 apexBonus   = (total * APEX_PENALTY_SHARE_BPS) / BASIS_POINTS;
        uint256 remainder   = total - apexBonus;

        uint256 nonApexPrin = corePrincipal + seamPrincipal;
        uint256 coreShare;
        uint256 seamShare;

        if (nonApexPrin > 0) {
            coreShare = (remainder * corePrincipal) / nonApexPrin;
            seamShare = remainder - coreShare;
        } else {
            // No senior depositors — all to APEX
            apexBonus += remainder;
        }

        apexAccumulatedYield += apexBonus;
        coreAccumulatedYield += coreShare;
        seamAccumulatedYield += seamShare;

        emit PenaltyDistributed(total, apexBonus, coreShare, seamShare);
    }

    /**
     * @dev Process up to MAX_WITHDRAWALS_PER_EPOCH entries starting from queueHead.
     *      Uses a cursor so a large queue is processed across multiple epochs without OOG.
     *      When the queue is fully drained it is deleted and queueHead resets to 0.
     */
    function _processWithdrawQueue() internal {
        uint256 len = withdrawQueue.length;
        if (len == 0 || queueHead >= len) return;

        uint256 end = queueHead + maxWithdrawalsPerEpoch;
        if (end > len) end = len;

        for (uint256 i = queueHead; i < end; i++) {
            WithdrawRequest storage req = withdrawQueue[i];
            if (req.processed) continue;

            uint256 userBalance    = _tokenFor(req.tier).balanceOf(req.user);
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

        queueHead = end;

        // If the entire queue has been processed, free storage and reset cursor
        if (queueHead >= len) {
            delete withdrawQueue;
            queueHead = 0;
        }
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
                coreAccumulatedYield  = 0;
                corePrincipal = corePrincipal > fromPrincipal ? corePrincipal - fromPrincipal : 0;
            }
        } else if (tier == Tier.SEAM) {
            if (seamAccumulatedYield >= usdcValue) {
                seamAccumulatedYield -= usdcValue;
            } else {
                uint256 fromPrincipal = usdcValue - seamAccumulatedYield;
                seamAccumulatedYield  = 0;
                seamPrincipal = seamPrincipal > fromPrincipal ? seamPrincipal - fromPrincipal : 0;
            }
        } else {
            if (apexAccumulatedYield >= usdcValue) {
                apexAccumulatedYield -= usdcValue;
            } else {
                uint256 fromPrincipal = usdcValue - apexAccumulatedYield;
                apexAccumulatedYield  = 0;
                apexPrincipal = apexPrincipal > fromPrincipal ? apexPrincipal - fromPrincipal : 0;
            }
        }
    }

    function _tierBuckets(Tier tier) internal view returns (uint256 principal, uint256 yieldBucket) {
        if (tier == Tier.CORE) return (corePrincipal, coreAccumulatedYield);
        if (tier == Tier.SEAM) return (seamPrincipal, seamAccumulatedYield);
        return (apexPrincipal, apexAccumulatedYield);
    }
}
