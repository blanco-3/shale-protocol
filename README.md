# SHALE Protocol

AI-managed, adaptive, multi-strategy yield vault on Arbitrum Sepolia.

Users deposit USDC into one of three risk tiers — **CORE**, **SEAM**, or **APEX** — and receive tokenized shares. An off-chain AI agent (Groq / Llama-3.3-70b) continuously monitors yield conditions across three simulated DeFi strategies (Aave V3, Camelot V3, Morpho) and rebalances capital allocation autonomously. A CDO-style waterfall distributes earned yield: CORE receives first, SEAM second, APEX collects all residual — giving APEX holders leveraged upside at the cost of first-loss exposure.

---

## Live Demo

**Frontend:** [https://shale-frontend-971342541474.us-central1.run.app](https://shale-frontend-971342541474.us-central1.run.app)
*(Arbitrum Sepolia — use the in-app faucet to get test USDC)*

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        AI Agent (Cloud Run)                       │
│  Groq/Llama-3.3-70b — reads APY trend → rebalances weights       │
│  Falls back to rule-based algorithm if LLM unavailable           │
└───────────────────┬──────────────────────┬───────────────────────┘
                    │ proposeRebalance()    │ setWeights() + rebalance()
                    ▼                      ▼
┌──────────────────────────┐   ┌───────────────────────────────────┐
│      ShaleGovernor        │   │          StrategyRouter            │
│  Stores proposals on-chain│   │  Routes USDC to sub-strategies     │
│  5-min timelock (demo)    │   │  by weight (bps, sum=10000)        │
│  executeProposal() calls  │   │  harvest() mints MockUSDC yield    │
│  vault.updateTargets()    │   └──────────┬────────────────────────┘
└──────────────────────────┘              │
                    │                     │ deposit/harvest/withdraw
                    ▼                     ▼
┌──────────────────────────────────────────────────────────────────┐
│                         ShaleVault                                │
│  deposit(amount, tier) → mint shlCORE / shlSEAM / shlAPEX        │
│  settleEpoch() → waterfall: CORE first, SEAM second, APEX rest    │
│  APEX buffer gate: CORE/SEAM deposits blocked if APEX < 15% TVL  │
│  Loss absorption: APEX absorbs first → SEAM → CORE               │
└──────────────────────────────────────────────────────────────────┘
              │                    │                   │
              ▼                    ▼                   ▼
   SimAaveV3Strategy     SimCamelotV3Strategy    SimMorphoStrategy
   Two-slope IR model    LP fee APY model        P2P blended rate
   util → supply APY     volume × feeTier        matched + unmatched
   ~5.7% APY (demo)      ~7.3% APY (demo)        ~3.4% APY (demo)
   weight: 30%           weight: 50%             weight: 20%
```

### CDO Waterfall

```
Epoch yield from strategies:
  1. CORE tier receives its APY target first  (e.g. 3.0–4.5%)
  2. SEAM tier receives its target second     (e.g. 5.0–7.0%)
  3. APEX collects all remainder              → leveraged residual (~10%+ demo)

If total yield < CORE + SEAM combined targets:
  → APEX principal absorbs the shortfall first (first-loss buffer)
  → Then SEAM principal, then CORE last
```

---

## Key Features

| Feature | Description |
|---|---|
| **Three-tier CDO** | CORE (senior), SEAM (mezzanine), APEX (junior/first-loss). Loss absorption is real — APEX NAV drops before other tiers. |
| **AI rebalancer** | Groq/Llama assesses blended APY trend across 3 strategies. Falls back to APY-proportional algorithm if LLM fails. |
| **On-chain transparency** | Every agent decision recorded on-chain via `proposeRebalance()` with a human-readable reason string. |
| **APEX buffer gate** | CORE/SEAM deposits automatically blocked when `apexTVL / totalTVL < 15%`. Enforced in the contract. |
| **Social login** | Reown AppKit — Google, X, GitHub, Discord, Farcaster, or any EVM wallet. |
| **In-app faucet** | `/api/faucet` mints 1,000 test USDC to any connected wallet. No Etherscan needed. |
| **Permissionless settlement** | `settleEpoch()` callable by anyone after epoch duration. Agent calls it automatically. |
| **Analytics page** | Live gauges showing Aave utilization curve, Camelot volume/fee, Morpho P2P spread. |
| **Safety page** | APEX buffer monitor, real-time health indicator, auto-polls every 30 seconds. |
| **Scenario modeling** | What-if simulator for APEX APY under different TVL splits and blended APY assumptions. |

---

## Deployed Contracts — Arbitrum Sepolia

| Contract | Address | Note |
|---|---|---|
| MockUSDC | `0x91BD5E4E9fE9953051A815a6a9A8Fe92E9e7A8d7` | Freely mintable test USDC (6 decimals) |
| ShaleVault | `0x3989a0E6450903f60Aa42A82fF1C9c44C24622DC` | Main vault (CDO + epoch settlement) |
| ShaleGovernor | `0xc21DAf89edAeBb9B6def2F71b4d5bd71e9AC23F1` | AI proposals + timelock |
| StrategyRouter | `0x27d0f024c1aE225aFA4366319a9F9F9e63B4610b` | Weight-based capital router |
| SimAaveV3 | `0x29e312Ae6Fe409599D37E6DF3D742869E14BfdBE` | Two-slope IR model (util 65% → 5.7% APY) |
| SimCamelotV3 | `0x4BDe068D9DaDDB364Ff7f896AdA0Aa1433b7a8ef` | LP fee model (vol 40% → 7.3% APY) |
| SimMorpho | `0x7000eB5469D424b09Cd68AB3D9d634506E51FCEf` | P2P blended (P2P 40% → 3.4% APY) |
| Agent wallet | `0x22a90658cdCDbDf89841ca2d37EfC489dE9Bb71A` | KEEPER_ROLE + PROPOSER_ROLE |

---

## Strategy APY Models

### SimAaveV3 — Two-slope Interest Rate
```
Below kink (util ≤ optimalUtil):
  supplyAPY = slope1 × util / kink

Above kink:
  supplyAPY = slope1 + slope2 × (util - kink) / (1 - kink)

marketAdmin.setUtilization(bps) changes APY in real-time for demos.
```

### SimCamelotV3 — LP Fee APY
```
dailyFeeRate = volumeRatioBps × feeTierBps / 10000
annualAPY    = dailyFeeRate × 365

marketAdmin.setVolumeRatio(bps) simulates trading activity changes.
```

### SimMorpho — P2P Blended Rate
```
p2pMid    = (supplyRate + borrowRate) / 2
blended   = matchedFraction × p2pMid + (1 - matchedFraction) × supplyRate

marketAdmin.setRates(supply, borrow, matching) updates market conditions.
```

Yield is minted via `MockUSDC.mint()` — no external reserve required.

---

## Quick Start

### 1. Contracts (Foundry)

```bash
cd contracts
forge install
forge build
forge test   # 62/62 passing
```

Deploy full suite (SimAave + SimCamelot + SimMorpho + Router + Vault + Governor):

```bash
DEPLOYER_ADDRESS=0x... \
AGENT_WALLET_ADDRESS=0x... \
forge script script/DeployV4.s.sol \
  --rpc-url $ARBITRUM_SEPOLIA_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast
```

### 2. Agent

```bash
cd agent
npm install
cp .env.example .env   # fill in addresses, RPC, keys
npm run dev
```

The agent runs on start then every 2 minutes (configurable via `CRON_SCHEDULE`).

Loop:
1. `maybeSettleEpoch()` — settles if epoch duration has passed
2. Read vault state + Aave APY in parallel
3. `maybeRebalance()` — LLM decides strategy weights, calls `StrategyRouter.setWeights()` + `rebalance()`
4. `assessMarket()` — LLM decides if APY targets need updating, calls `ShaleGovernor.proposeRebalance()` if drift > 50 bps

### 3. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in addresses + API keys
npm run dev
```

All contract addresses have hardcoded fallbacks pointing at the live Arbitrum Sepolia deployment — the frontend works out-of-the-box without `.env.local`.

---

## Demo Flow

1. Visit the live frontend and connect a wallet (or use social login)
2. **Faucet** — click "Get 1,000 USDC" on the Deposit page
3. **Deposit** — select APEX first (to satisfy the buffer gate), then CORE or SEAM
4. **Dashboard** — watch the Agent Panel for the AI's latest rebalance decision and reason
5. **Analytics** — adjust market parameters (utilization, volume, P2P spread) to see APY change live
6. **Safety** — monitor APEX buffer health in real time
7. **Scenarios** — model what-if APY outcomes at different TVL compositions
8. **Portfolio** — view your position and accrued yield per tier

To trigger a manual epoch settlement (normally done by the agent):

```bash
cast send 0x3989a0E6450903f60Aa42A82fF1C9c44C24622DC \
  "settleEpoch()" \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc \
  --private-key $YOUR_KEY
```

---

## Repository Structure

```
shale-protocol/
├── contracts/
│   ├── src/
│   │   ├── ShaleVault.sol           # CDO vault, epoch settlement, loss absorption
│   │   ├── ShaleGovernor.sol        # On-chain AI proposal registry + timelock
│   │   ├── ShaleShare.sol           # ERC-20 tier share token (shlCORE/SEAM/APEX)
│   │   ├── StrategyRouter.sol       # Weight-based capital router
│   │   ├── SimAaveV3Strategy.sol    # Aave two-slope IR simulation
│   │   ├── SimCamelotV3Strategy.sol # Camelot LP fee simulation
│   │   ├── SimMorphoStrategy.sol    # Morpho P2P rate simulation
│   │   └── interfaces/
│   ├── test/
│   │   ├── ShaleVaultTest.t.sol     # 20 vault tests
│   │   ├── StrategyTest.t.sol       # 16 strategy router tests
│   │   └── SimStrategyTest.t.sol    # 26 sim strategy tests
│   └── script/
│       └── DeployV4.s.sol           # Full deployment (active)
│
├── agent/
│   └── src/
│       ├── index.ts      # Entry + cron loop + EpochSettled listener
│       ├── config.ts     # Addresses, provider, wallet
│       ├── rebalancer.ts # LLM → setWeights() + rebalance()
│       ├── proposer.ts   # LLM → proposeRebalance() (APY targets)
│       ├── settler.ts    # maybeSettleEpoch()
│       ├── llm.ts        # Groq client + JSON parser
│       ├── scanner.ts    # On-chain event reader
│       ├── vault.ts      # readVaultState()
│       └── aave.ts       # fetchAaveAPYBps()
│
└── frontend/
    ├── app/
    │   ├── page.tsx           # Dashboard: TVL, tier stats, blended APY, agent panel
    │   ├── deposit/page.tsx   # Deposit flow: approve → deposit (single UX, two sigs)
    │   ├── portfolio/page.tsx # User positions + tier breakdown
    │   ├── analytics/page.tsx # Protocol Market Mechanics (live gauges)
    │   ├── safety/page.tsx    # APEX buffer monitor
    │   └── scenarios/page.tsx # What-if APY scenario modeling
    ├── components/
    │   └── TierCard.tsx
    └── lib/
        ├── contracts.ts  # ABIs + addresses (hardcoded fallbacks)
        ├── wagmi.ts      # Reown AppKit + wagmi config
        └── utils.ts
```

---

## Test Results

```
forge test --summary

ShaleVaultTest   (20/20)  deposit, withdraw, epoch settlement, loss absorption,
                           APEX buffer gate, withdrawal queue, role access control
StrategyTest     (16/16)  router weights, rebalance flow, keeper auth, multi-strategy
SimStrategyTest  (26/26)  APY formula correctness, market event scenarios,
                           cross-strategy ordering, deposit/harvest mint flow,
                           access control, utilization bounds

Total: 62/62 passing
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Contracts | Solidity 0.8.20, Foundry, OpenZeppelin v5 |
| Agent | Node.js 20, TypeScript, ethers v6, Groq SDK, node-cron |
| LLM | Groq — `llama-3.3-70b-versatile` (falls back to rule-based) |
| Frontend | Next.js (App Router), wagmi v2, viem, Tailwind CSS |
| Wallet | Reown AppKit — social login + any EVM wallet |
| Network | Arbitrum Sepolia (chainId 421614) |
| Infrastructure | Google Cloud Run (frontend + agent) |

---

## Security Notes

- The AI agent never moves user funds directly. All capital movements go through `StrategyRouter` which is only callable by the vault (for deposits/withdrawals) or KEEPER_ROLE (for rebalance within the vault's deposited capital).
- `ShaleGovernor` has a 5-minute timelock (demo; production would be 24–48h). APY target proposals can be rejected by the admin before execution.
- `MIN_DEPOSIT_LOCK = 1 day` prevents same-block deposit-withdraw attacks.
- `minApexBufferBps = 1500` (15%) ensures a minimum first-loss cushion is always present before senior deposits are accepted.
- All yield is minted directly (simulation) — no external oracle dependency for testnet.
