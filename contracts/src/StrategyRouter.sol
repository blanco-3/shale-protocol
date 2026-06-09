// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IVaultStrategy.sol";

/**
 * @title StrategyRouter
 * @notice Multi-strategy router that implements IVaultStrategy.
 *         ShaleVault treats this as a single strategy plugin — no vault changes needed.
 *
 * Architecture
 * ────────────
 *   ShaleVault ──(IVaultStrategy)──► StrategyRouter
 *                                         ├── SubStrategy A (e.g. MockAave ~2%)
 *                                         └── SubStrategy B (e.g. MockMorpho ~7%)
 *
 * Roles
 * ─────
 *   vault   — the ShaleVault address; sole caller of deposit / withdraw / harvest
 *   owner   — admin; can add strategies, set keeper addresses
 *   keeper  — AI agent; can call setWeights + rebalance without governance overhead
 *
 * Rebalance flow (agent)
 * ──────────────────────
 *   1. Agent scans per-strategy APY
 *   2. Computes optimal weight array (must sum to 10000)
 *   3. Calls setWeights(newWeights)
 *   4. Calls rebalance() → funds shift to match weights
 */
contract StrategyRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── State ────────────────────────────────────────────────────────────

    IERC20  public immutable usdc;
    address public vault;

    struct StrategySlot {
        IVaultStrategy strategy;
        uint16         targetWeightBps; // sum of active slots must equal 10_000
        string         name;
        bool           active;
    }

    StrategySlot[] public strategies;
    mapping(address => bool) public isKeeper;

    // Minimum USDC move to bother rebalancing into/out-of a strategy
    uint256 public constant MIN_MOVE = 10 * 1e6; // $10

    // ─── Events ───────────────────────────────────────────────────────────

    event StrategyAdded(uint256 indexed idx, address strategy, string name, uint16 weight);
    event WeightsUpdated(uint16[] weights);
    event Rebalanced(uint256 timestamp, address indexed initiator, uint256 totalAssets);
    event KeeperSet(address indexed keeper, bool enabled);
    event VaultSet(address indexed vault);
    event TokenRescued(address indexed token, address indexed to, uint256 amount);

    // ─── Modifiers ────────────────────────────────────────────────────────

    modifier onlyVault() {
        require(msg.sender == vault, "SR: only vault");
        _;
    }

    modifier onlyKeeperOrOwner() {
        require(isKeeper[msg.sender] || msg.sender == owner(), "SR: not keeper");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────

    constructor(address _usdc, address _vault, address _owner) Ownable(_owner) {
        usdc  = IERC20(_usdc);
        vault = _vault;
    }

    // ─── IVaultStrategy interface ─────────────────────────────────────────

    function asset() external view returns (address) {
        return address(usdc);
    }

    /**
     * @notice Vault pulls USDC from itself, router distributes to sub-strategies.
     *         Vault must approve router before calling.
     */
    function deposit(uint256 amount) external onlyVault nonReentrant {
        if (amount == 0) return;
        usdc.safeTransferFrom(vault, address(this), amount);
        _distribute(amount);
    }

    /**
     * @notice Withdraw `amount` from sub-strategies pro-rata and forward to vault.
     */
    function withdraw(uint256 amount) external onlyVault nonReentrant {
        if (amount == 0) return;
        _withdrawProRata(amount);
        usdc.safeTransfer(vault, amount);
    }

    /**
     * @notice Harvest all sub-strategies, aggregate yield, and send to vault.
     */
    function harvest() external onlyVault nonReentrant returns (uint256 totalYield) {
        uint256 len = strategies.length;
        for (uint256 i; i < len; ++i) {
            if (!strategies[i].active) continue;
            try strategies[i].strategy.harvest() returns (uint256 y) {
                totalYield += y;
            } catch {}
        }
        if (totalYield > 0) {
            usdc.safeTransfer(vault, totalYield);
        }
    }

    /**
     * @notice Sum of totalAssets() across all active sub-strategies.
     */
    function totalAssets() external view returns (uint256 total) {
        uint256 len = strategies.length;
        for (uint256 i; i < len; ++i) {
            if (!strategies[i].active) continue;
            try strategies[i].strategy.totalAssets() returns (uint256 a) {
                total += a;
            } catch {}
        }
    }

    // ─── Rebalancing ──────────────────────────────────────────────────────

    /**
     * @notice Shift funds between sub-strategies to match targetWeightBps.
     *         Called by keeper (AI agent) after setWeights().
     *
     * Algorithm:
     *   Pass 1 — withdraw excess from over-allocated strategies (USDC pools in router)
     *   Pass 2 — deposit idle USDC into under-allocated strategies
     */
    function rebalance() external nonReentrant onlyKeeperOrOwner {
        uint256 total = _totalDeployed();
        if (total == 0) return;

        // Pass 1: collect from over-allocated (including weight=0 — full drain)
        uint256 len = strategies.length;
        for (uint256 i; i < len; ++i) {
            if (!strategies[i].active) continue;
            uint256 current = _deployedIn(i);
            if (current == 0) continue;
            uint256 target = (total * strategies[i].targetWeightBps) / 10_000;
            if (current > target + MIN_MOVE) {
                uint256 excess = current - target;
                try strategies[i].strategy.withdraw(excess) {} catch {}
            }
        }

        // Pass 2: push idle USDC into under-allocated strategies
        uint256 idle = usdc.balanceOf(address(this));
        if (idle == 0) {
            emit Rebalanced(block.timestamp, msg.sender, total);
            return;
        }

        for (uint256 i; i < len && idle > 0; ++i) {
            if (!strategies[i].active || strategies[i].targetWeightBps == 0) continue;
            uint256 target  = (total * strategies[i].targetWeightBps) / 10_000;
            uint256 current = _deployedIn(i);
            if (current < target) {
                uint256 needed    = target - current;
                uint256 toDeposit = needed < idle ? needed : idle;
                if (toDeposit < MIN_MOVE) continue;
                usdc.forceApprove(address(strategies[i].strategy), toDeposit);
                strategies[i].strategy.deposit(toDeposit);
                idle -= toDeposit;
            }
        }

        // Dust → first active strategy
        if (idle > 0) {
            for (uint256 i; i < len; ++i) {
                if (!strategies[i].active) continue;
                usdc.forceApprove(address(strategies[i].strategy), idle);
                strategies[i].strategy.deposit(idle);
                break;
            }
        }

        emit Rebalanced(block.timestamp, msg.sender, total);
    }

    /**
     * @notice Update target weights. Must sum to 10_000. Caller: keeper or owner.
     *         Call rebalance() afterwards to move funds.
     */
    function setWeights(uint16[] calldata weights) external onlyKeeperOrOwner {
        require(weights.length == strategies.length, "SR: length mismatch");
        uint256 sum;
        for (uint256 i; i < weights.length; ++i) sum += weights[i];
        require(sum == 10_000, "SR: weights must sum to 10000");
        for (uint256 i; i < weights.length; ++i) {
            strategies[i].targetWeightBps = weights[i];
        }
        emit WeightsUpdated(weights);
    }

    // ─── Admin ────────────────────────────────────────────────────────────

    /**
     * @notice Add a new sub-strategy. Weights of existing strategies must be
     *         manually adjusted afterwards via setWeights().
     */
    function addStrategy(
        address strat,
        uint16  weight,
        string calldata name
    ) external onlyOwner {
        uint256 idx = strategies.length;
        strategies.push(StrategySlot({
            strategy:        IVaultStrategy(strat),
            targetWeightBps: weight,
            name:            name,
            active:          true
        }));
        emit StrategyAdded(idx, strat, name, weight);
    }

    function setKeeper(address keeper, bool enabled) external onlyOwner {
        isKeeper[keeper] = enabled;
        emit KeeperSet(keeper, enabled);
    }

    /**
     * @notice Testnet demo: proxy a simulateLoss() call to a sub-strategy.
     *         The sub-strategy reduces its deployedPrincipal tracking — the vault
     *         detects a capital loss at the next epoch and triggers APEX absorption.
     *
     *         Only callable by owner (deployer / multisig).
     */
    function demoSimulateLoss(uint256 stratIdx, uint256 lossAmount) external onlyOwner {
        require(stratIdx < strategies.length, "SR: invalid index");
        // Low-level call: not all strategies have simulateLoss, fail silently if absent
        (bool ok,) = address(strategies[stratIdx].strategy).call(
            abi.encodeWithSignature("simulateLoss(uint256)", lossAmount)
        );
        require(ok, "SR: simulateLoss failed");
    }

    /**
     * @notice Deactivate a strategy: drain all its funds back to router, mark inactive.
     *         Owner must call setWeights() afterwards to redistribute weight to remaining strategies.
     *         Immediate — no delay. Use for emergency pool replacement.
     */
    function deactivateStrategy(uint256 idx) external onlyOwner nonReentrant {
        require(idx < strategies.length, "SR: invalid index");
        StrategySlot storage slot = strategies[idx];
        require(slot.active, "SR: already inactive");

        // Drain all funds from the strategy
        uint256 deployed = _deployedIn(idx);
        if (deployed > 0) {
            try slot.strategy.withdraw(deployed) {} catch {}
        }

        slot.active           = false;
        slot.targetWeightBps  = 0;
    }

    function setVault(address _vault) external onlyOwner {
        vault = _vault;
        emit VaultSet(_vault);
    }

    /**
     * @notice Recover ERC-20 tokens accidentally sent to this contract or reward tokens
     *         that could not be auto-swapped in _claimAndConvertRewards() (fee=0 path).
     *
     *         USDC cannot be rescued — it may be mid-deployment to sub-strategies.
     *         All other tokens (e.g. ARB incentive rewards) are safe to recover.
     */
    function rescueToken(address token, address to, uint256 amount) external onlyOwner {
        require(token != address(usdc), "SR: cannot rescue USDC");
        require(to != address(0),       "SR: zero recipient");
        IERC20(token).safeTransfer(to, amount);
        emit TokenRescued(token, to, amount);
    }

    // ─── Views ────────────────────────────────────────────────────────────

    function strategyCount() external view returns (uint256) {
        return strategies.length;
    }

    /// @notice Full info for strategy at index i, including current deployed amount.
    function getStrategy(uint256 i) external view returns (
        address addr,
        uint16  weight,
        string memory name,
        bool    active,
        uint256 deployed
    ) {
        StrategySlot storage s = strategies[i];
        return (address(s.strategy), s.targetWeightBps, s.name, s.active, _deployedIn(i));
    }

    // ─── Internal ─────────────────────────────────────────────────────────

    /// @dev Distribute `amount` from router's USDC balance to active strategies by weight.
    function _distribute(uint256 amount) internal {
        uint256 len = strategies.length;
        uint256 totalWeight;
        for (uint256 i; i < len; ++i) {
            if (strategies[i].active) totalWeight += strategies[i].targetWeightBps;
        }
        if (totalWeight == 0) return;

        uint256 distributed;
        uint256 lastActive = type(uint256).max;
        for (uint256 i; i < len; ++i) {
            if (strategies[i].active && strategies[i].targetWeightBps > 0) lastActive = i;
        }

        for (uint256 i; i < len; ++i) {
            if (!strategies[i].active || strategies[i].targetWeightBps == 0) continue;
            uint256 share = (i == lastActive)
                ? amount - distributed
                : (amount * strategies[i].targetWeightBps) / totalWeight;
            if (share == 0) continue;
            usdc.forceApprove(address(strategies[i].strategy), share);
            strategies[i].strategy.deposit(share);
            distributed += share;
        }
    }

    /// @dev Withdraw `amount` from active strategies proportionally by current deployment.
    function _withdrawProRata(uint256 amount) internal {
        uint256 total = _totalDeployed();
        require(total >= amount, "SR: insufficient assets");

        uint256 len       = strategies.length;
        uint256 withdrawn;

        for (uint256 i; i < len; ++i) {
            if (!strategies[i].active) continue;
            uint256 deployed = _deployedIn(i);
            if (deployed == 0) continue;

            bool isLast = true;
            for (uint256 j = i + 1; j < len; ++j) {
                if (strategies[j].active && _deployedIn(j) > 0) { isLast = false; break; }
            }

            uint256 toWithdraw = isLast
                ? amount - withdrawn
                : (amount * deployed) / total;
            if (toWithdraw > deployed) toWithdraw = deployed;
            if (toWithdraw == 0) continue;

            strategies[i].strategy.withdraw(toWithdraw);
            withdrawn += toWithdraw;
            if (withdrawn >= amount) break;
        }
    }

    function _totalDeployed() internal view returns (uint256 total) {
        uint256 len = strategies.length;
        for (uint256 i; i < len; ++i) {
            if (!strategies[i].active) continue;
            try strategies[i].strategy.totalAssets() returns (uint256 a) {
                total += a;
            } catch {}
        }
    }

    function _deployedIn(uint256 i) internal view returns (uint256) {
        try strategies[i].strategy.totalAssets() returns (uint256 a) {
            return a;
        } catch {
            return 0;
        }
    }
}
