# SHALE Protocol — Project Report

> Arbitrum Open House London Buildathon (Deadline: June 11, 2026 12:59 KST)
> Author: master (diveyreadytodive@gmail.com)
> Last updated: 2026-06-09

---

## 1. Project Topic

**SHALE Protocol** — AI-Managed 3-Tier CDO-Style Adaptive Yield Vault on Arbitrum

An on-chain vault that applies the CDO (Collateralized Debt Obligation) waterfall structure to DeFi yield:
CORE (senior/stable) → SEAM (mezzanine) → APEX (junior, first-loss buffer).
An autonomous AI agent (Groq llama-3.3-70b) continuously monitors yield conditions and proposes APY target adjustments through a human-controlled governance system.

---

## 2. Activity Purpose (활동 목적)

- Explore whether CDO-style risk tranching can be implemented safely and transparently on-chain.
- Demonstrate that AI agent governance with human oversight (PROPOSER pattern) is viable in DeFi.
- Build a complete, deployable protocol on Arbitrum with real on-chain transactions for demo purposes.
- Participate in and compete at the Arbitrum Open House London Buildathon (June 2026).

---

## 3. Activity Goals (활동 목표)

- Design and implement a 3-tier vault with provably correct waterfall yield distribution and capital loss absorption.
- Deploy an AI agent that uses LLM reasoning (with on-chain trend data) to propose APY rebalances.
- Achieve >7/10 in judge panel evaluation covering Security, Technical Complexity, Arbitrum Native, and Innovation.
- Complete full deployment to Arbitrum Sepolia with live transaction hashes and a working demo.
- Maintain 20/20 passing Foundry unit tests after all security patches.

---

## 4. Technologies Used (사용 기술)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Blockchain | Arbitrum Sepolia (testnet), Arbitrum One (mainnet target) | L2 EVM, low gas, native ecosystem |
| Smart Contracts | Solidity ^0.8.20, Foundry (forge) | Core vault, governance, strategy contracts |
| Token Standard | ERC-20 (share tokens), ERC-4626-inspired math | Per-tier share minting and redemption |
| Access Control | OpenZeppelin AccessControl, Ownable | Role-based permissioning |
| Safety | OpenZeppelin ReentrancyGuard, Pausable | Reentrancy and circuit-breaker protection |
| Yield Strategy | Aave V3 (USDC supply), Camelot DEX (simulated LP) | Real + stub strategy for APY divergence |
| Oracle | Chainlink L2 Sequencer Uptime Feed | Guard against stale data after Arbitrum restart |
| AI / LLM | Groq API (llama-3.3-70b) | Trend-aware yield target recommendations |
| Agent Runtime | Node.js + ethers.js + node-cron | Scheduled on-chain interaction loop |
| Frontend | Next.js + React + TypeScript + Tailwind | Minimal monochrome dashboard |
| Testing | Foundry forge test (20 tests) | Unit coverage for vault logic and edge cases |

---

## 5. Reason for Technology Choices (기술 선택 이유)

**Arbitrum**: Low gas fees essential for frequent agent transactions (propose/execute every epoch). Arbitrum-native DEX (Camelot) creates a meaningful APY divergence between the two strategies, giving the AI agent a real optimization problem. Chainlink provides a sequencer uptime feed specific to Arbitrum L2.

**CDO waterfall structure**: Enables risk-stratified DeFi participation — conservative users pick CORE, yield-seekers pick SEAM or APEX. The APEX first-loss buffer protects senior tranches exactly as in traditional structured finance.

**AI PROPOSER pattern**: LLM recommendations are sandboxed — the agent cannot execute, only propose. Humans retain veto power via `rejectProposal()`. This balances automation with safety.

**Foundry**: Faster iteration than Hardhat, native fuzzing, clean Solidity test syntax. No JavaScript compilation glue needed for contract tests.

**ERC-4626 share math**: Standard vault exchange-rate formula prevents yield dilution — a late depositor cannot claim yield they did not earn.

---

## 6. Problem Statement & Goals (문제 상황 및 목표)

**Problem**: DeFi yield vaults treat all depositors equally regardless of risk tolerance. When a strategy loses capital, every depositor is hit pro-rata. There is no mechanism for risk-stratified allocation or for an autonomous agent to continuously adapt yield targets to market conditions.

**Goals**:
1. Implement a waterfall: CORE gets paid first, APEX absorbs losses first.
2. Enforce solvency invariant: `sum(principal_i + yieldBucket_i) ≤ strategy.totalAssets()` at all times.
3. Prevent yield dilution: new depositors must not immediately capture yield they did not earn.
4. Allow AI-driven target adaptation while preserving human veto.
5. Protect against L2-specific risks: sequencer downtime, stale oracle data.

---

## 7. Concrete Implementation Process (구체적 해결과정)

### Phase 1 — Architecture Design
Designed the 3-tier CDO structure: CORE (2.5–3.5% target), SEAM (5–7%), APEX (residual).
Defined the waterfall: yield distributed CORE first → SEAM → APEX gets remainder.
Defined capital loss absorption: APEX first → SEAM → CORE last.
Specified the APEX buffer gate: CORE/SEAM deposits blocked if APEX/TVL < 15%.

### Phase 2 — Smart Contract Implementation (ShaleVault.sol, ~620 lines)
- `settleEpoch()`: epoch-based yield distribution, capital loss detection, withdrawal queue processing.
- `earlyWithdraw()`: 1% penalty, MIN_DEPOSIT_LOCK = 1 day enforced on both early and queued withdrawal.
- `maxWithdrawalsPerEpoch`: governance-adjustable (10–500, default 100) — prevents unbounded loop gas.
- APY caps: `coreMax ≤ 2000 bps`, `seamMax ≤ 5000 bps` — protects from mis-configuration.
- `setMinApexBuffer()`: range 500–4000 bps.

### Phase 3 — Strategy Layer (AaveStrategy.sol, CamelotStrategy.sol, StrategyRouter.sol)
- AaveStrategy: real Aave V3 USDC supply + harvest (base yield + ARB reward auto-swap via Uniswap V3).
- Chainlink L2 Sequencer Uptime Feed: `_checkSequencer()` blocks deposits when sequencer is down or in 1-hour grace period.
- CamelotStrategy: Arbitrum-native DEX LP simulation. Holds USDC in-contract, accrues yield at configured rate. Header clearly states testnet-only.
- StrategyRouter: multi-strategy plugin, proportional weight allocation with 80% per-strategy cap.

### Phase 4 — AI Agent (proposer.ts, rebalancer.ts, settler.ts)
- `fetchRecentEpochs(3)`: queries last 3 EpochSettled events via dedicated public Arbitrum RPC (avoids Alchemy 10-block limit).
- `getEpochDurationDays()`: reads `vault.EPOCH_DURATION()` on-chain for correct annualization (no hardcoded factor).
- `summariseEpochTrend()`: RISING/FALLING/STABLE based on >20 bps delta across epochs.
- LLM system prompt: explicitly instructs to "proactively LOWER targets on multi-epoch FALLING trend even if current spot rate is in-range."
- Rule-based fallback (`assessMarketRuleBased`): activates when LLM call fails or returns invalid JSON.
- PROPOSER_ROLE: agent can only propose; `executeProposal()` permissionless after delay; `rejectProposal()` requires DEFAULT_ADMIN_ROLE.

### Phase 5 — Security Hardening (Iterative Judge Panel Evaluation)
Multiple rounds of evaluation with simulated judge panels (6.35 → 6.60 → 7.58 → 4.95 after Opus deep audit → patched):

**Bug 1 — `_absorbCapitalLoss` only reduced principal, not yield buckets (Opus-discovered)**
- Problem: `*AccumulatedYield` remained after `*Principal` was wiped. Junior holders could redeem yield against assets the strategy no longer held.
- Fix: Compute `apexTotal = apexPrincipal + apexAccumulatedYield`, consume principal first then yield, zero both when tranche exhausted before cascade.
- Tests: Test 14 (capital loss exact math), Test 19 (yield bucket absorption, solvency invariant).

**Bug 2 — 1:1 share minting ignores accrued yield (dilution vector, Opus-discovered)**
- Problem: `deposit()` minted `amount` shares 1:1 regardless of accrued yield — late depositors captured yield they didn't earn.
- Fix: ERC-4626-style: `sharesToMint = (existingShares == 0 || p+y == 0) ? amount : (amount * existingShares) / (p + y)`.
- Tests: Test 20 (no yield dilution on deposit).

### Phase 6 — Deployment to Arbitrum Sepolia
- Full deployment with live transaction hashes.
- Agent running against deployed vault.
- CamelotStrategy seeded with yield reserve via `fundYieldReserve()`.

---

## 8. Results / Achievements (결과 / 성과)

### Test Coverage
- **20/20 Foundry tests passing** after all patches.
- Tests cover: deposit/withdraw, epoch settlement, capital loss absorption (exact math + yield buckets), APY waterfall, APEX buffer gate, MIN_DEPOSIT_LOCK on both paths, governor propose/reject/execute, gas bound (100 withdrawals under 30M gas), yield dilution prevention, penalty redistribution.

### Security Patch Verification
- Patch 1 (`_absorbCapitalLoss`): Correctly zeroes both `*Principal` AND `*AccumulatedYield` within each tranche before cascade. Invariant `sum(p_i + y_i) ≤ strategy.totalAssets()` maintained.
- Patch 2 (ERC-4626 share minting): `sharesToMint = amount * existingShares / (p + y)` correctly applied. First depositor still 1:1.

### Architecture Completeness
- Full on-chain CDO waterfall with provably correct absorption order.
- Dual-strategy routing with AI-driven weight optimization.
- Trend-aware LLM using real epoch history, not just spot rate.
- Arbitrum-native: Camelot stub, Chainlink L2 sequencer feed, Arbitrum Sepolia deployment.
- Human oversight preserved: PROPOSER pattern, `rejectProposal()`, configurable `minDelay`.

### Remaining Known Limitations
1. `minDelay` defaults to 0 at deployment — must call `governor.setMinDelay()` in deploy script.
2. `executeProposal()` is permissionless — intended design, but reduces security margin.
3. `sequencerFeed` defaults to `address(0)` — must call `aaveStrategy.setSequencerFeed()` in deploy script.
4. APEX buffer gate uses `apexPrincipal` only, not `apexPrincipal + apexAccumulatedYield`.
5. No Foundry tests for AaveStrategy, CamelotStrategy, StrategyRouter (MockStrategy only).
6. `amountOutMinimum: 0` in reward swap — sandwichable on mainnet (documented TODO).

---

## 9. Lessons Learned (배운점)

**On CDO-style vault design:**
- The yield-bucket invariant (`sum(p_i + y_i) ≤ strategy.totalAssets()`) must be actively maintained, not just assumed. Any function that reduces assets must also zero out corresponding yield claims. Missing this creates a phantom-yield vector where holders can redeem against non-existent assets.
- ERC-4626 share math is non-negotiable for multi-depositor vaults. 1:1 minting is only safe for single-depositor or static-NAV vaults.
- The CDO waterfall must cover two distinct events: (a) capital loss from outside — APEX absorbs first, and (b) yield shortfall from inside — also APEX absorbs first. These need separate code paths (`_absorbCapitalLoss` vs `_absorbYieldDeficit`) because they interact with different accounting buckets.

**On AI agent governance:**
- LLM-only recommendations are fragile in production DeFi. A robust rule-based fallback that activates on any parse failure is mandatory, not optional.
- Feeding epoch trend data (RISING/FALLING/STABLE) produces more stable LLM behavior than relying on spot rate alone. The system prompt instruction "proactively LOWER on multi-epoch FALLING trend" prevents target oscillation.
- Dynamic epoch duration calculation (reading from chain) is critical — hardcoded period assumptions produce wildly wrong annualized APY fed to the LLM.

**On iterative security hardening:**
- Two critical bugs (yield-bucket loss, 1:1 dilution) went undetected until deep audit, despite multiple earlier review rounds. Structured audit frameworks (checking each state variable invariant systematically) catch what casual reviews miss.
- Writing the invariant as a comment adjacent to the fix (`sum(p_i + y_i) ≤ strategy.totalAssets()`) documents the intent and makes future regressions obvious.
- Permissionless `executeProposal()` is a double-edged design: it simplifies the agent (no EXECUTOR_ROLE needed), but removes the second line of defense if the PROPOSER key is compromised. For mainnet, a non-zero `minDelay` + `rejectProposal()` window is the mitigation.

**On Arbitrum-specific considerations:**
- Sequencer uptime feeds are an L2-specific requirement that has no L1 equivalent. Forgetting to set `sequencerFeed` after deployment effectively ships with the check disabled.
- Arbitrum's block gas limit (~30M) is more than sufficient for 100-entry withdrawal queue processing (~few million gas), but the `queueHead` cursor pattern (instead of array deletion) is necessary to prevent O(n) storage shifting.
- Alchemy free tier's 10-block `eth_getLogs` limit breaks event-based epoch queries. Using a fallback to the official Arbitrum Sepolia public RPC (no range limit) is a pragmatic fix.

**On DeFi hackathon development:**
- Starting with a complete spec before writing code prevents major rewrites. The CDO structure was locked before implementation began.
- Mock strategies enable full vault logic testing without needing live protocol connections. Switching from `MockStrategy` to `AaveStrategy` requires no vault changes — only owner transfer.
- The most impactful security fixes often involve the simplest conceptual errors (counting yield in loss absorption). Comprehensive test cases that check exact arithmetic, not just "assertGt", are far more valuable for catching these.

---

*This report is continuously updated throughout the project.*
