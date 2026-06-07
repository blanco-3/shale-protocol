# SHALE Protocol

AI-managed, adaptive, multi-strategy yield vault on Arbitrum Sepolia.

Users deposit USDC into one of three risk tiers — **CORE**, **SEAM**, or **APEX**. An off-chain AI agent continuously monitors yield conditions and proposes on-chain parameter adjustments via a governor contract. A waterfall distribution mechanism ensures CORE receives yield first, then SEAM, then APEX collects the remainder (leverage effect).

**Core principle:** The agent never directly moves user funds. It only calls `proposeRebalance()` on the Governor. A frontend Accept button triggers `executeProposal()`. All agent decisions are recorded permanently on-chain as events with a reason string.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Off-chain Agent                    │
│  Reads APY → Assesses target drift → proposeRebalance│
└──────────────────────┬──────────────────────────────┘
                       │ proposeRebalance()
                       ▼
┌─────────────────────────────────────────────────────┐
│                 ShaleGovernor                        │
│  Stores proposals on-chain with reason string        │
│  executeProposal() → vault.updateTargets()           │
└──────────────────────┬──────────────────────────────┘
                       │ updateTargets() [GOVERNOR_ROLE]
                       ▼
┌─────────────────────────────────────────────────────┐
│                  ShaleVault                          │
│  deposit() → Aave supply → mint shlCORE/SEAM/APEX   │
│  settleEpoch() → waterfall yield distribution        │
│  withdraw() → burn shares → Aave withdraw → USDC     │
└──────────────────────┬──────────────────────────────┘
                       │ supply/withdraw
                       ▼
              MockAavePool (testnet)
              Real Aave V3 (mainnet)
```

### Waterfall Logic

```
Total yield from Aave:
  1. CORE gets its target first  (e.g. 4% annualized pro-rata)
  2. SEAM gets its target second (e.g. 2% annualized pro-rata)
  3. APEX gets all remainder     (leverage effect — variable upside)

If yield < CORE target:
  APEX principal absorbs the deficit first → then SEAM → then CORE
```

### Repository Structure

```
shale-protocol/
├── contracts/          # Foundry — Solidity contracts + tests
│   ├── src/
│   │   ├── ShaleVault.sol
│   │   ├── ShaleGovernor.sol
│   │   ├── ShaleShare.sol
│   │   ├── MockAavePool.sol    # Testnet mock
│   │   ├── MockUSDC.sol        # Freely mintable test USDC
│   │   └── interfaces/
│   ├── test/
│   │   └── ShaleVault.t.sol    # 10 tests
│   └── script/
│       └── Deploy.s.sol
│
├── agent/              # Node.js / TypeScript — off-chain AI agent
│   └── src/
│       ├── index.ts    # Entry + cron loop
│       ├── aave.ts     # Fetch APY
│       ├── vault.ts    # Read vault state
│       └── proposer.ts # Decision logic + submit proposal
│
└── frontend/           # Next.js 16, wagmi v2
    ├── app/
    │   ├── page.tsx            # Dashboard
    │   ├── deposit/page.tsx
    │   └── portfolio/page.tsx
    └── components/
        ├── TierCard.tsx
        ├── AgentPanel.tsx
        └── NavBar.tsx
```

---

## Deployed Contracts — Arbitrum Sepolia

| Contract | Address |
|---|---|
| ShaleVault | `0x2dB82cF07659eA659df82C393bB3dB29C5DB09BC` |
| ShaleGovernor | `0x070a41073D59B71eeCb92cA8ba41AE2a293a72B0` |
| MockUSDC | `0x7e798cBfCEFb5E36341020e17137fd5CA00BEf01` |
| MockAavePool | `0xB150c04A5e4FAB33dD601b0190fbb1beEF711490` |
| shlCORE | `0x57E171AB548ab4C597fe7e4406c66334932D5d0D` |
| shlSEAM | `0x3f90f2C1B8762A8576C434fa7f3C01Fca196742a` |
| shlAPEX | `0x30F473b7A35EB1106F90E22b72F6D0665d7d327C` |

---

## Quick Start

### 1. Contracts

```bash
cd contracts
forge install   # installs forge-std and openzeppelin-contracts
forge build
forge test      # 10 tests, all passing
```

Deploy (MockUSDC + MockAavePool + full protocol):

```bash
DEPLOYER_ADDRESS=0x... \
AGENT_WALLET_ADDRESS=0x... \
forge script script/Deploy.s.sol \
  --rpc-url $ARBITRUM_SEPOLIA_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast
```

### 2. Agent

```bash
cd agent
npm install
cp .env.example .env   # fill in deployed addresses + RPC + private key
npm run dev
```

The agent runs immediately on start, then every 15 minutes via cron.
It reads `MockAavePool.apyBps()`, computes ideal CORE target (65% of APY),
and submits `proposeRebalance()` if drift > 50 bps.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in vault + governor addresses
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Connect MetaMask (Arbitrum Sepolia). Get test USDC by calling `MockUSDC.mint(yourAddress, amount)` or via cast:

```bash
cast send 0x7e798cBfCEFb5E36341020e17137fd5CA00BEf01 \
  "mint(address,uint256)" YOUR_ADDRESS 10000000000 \
  --rpc-url $ARBITRUM_SEPOLIA_RPC --private-key $YOUR_KEY
```

---

## Demo Flow

1. Connect MetaMask → Arbitrum Sepolia
2. **Deposit** page → select CORE → Approve USDC → Deposit $500
3. **Deposit** page → select APEX → Deposit $300
4. Agent submits a `proposeRebalance()` proposal (visible in Agent Panel on Dashboard)
5. **Dashboard** → Agent Panel → click **Accept →** → confirm MetaMask tx
6. Vault targets update on-chain (visible in CORE/SEAM cards)
7. After 7 days (or `vm.warp` on fork), call **Settle Epoch** from Portfolio page
8. **Portfolio** page shows accrued yield split per tier

To trigger an immediate agent decision for demo, change `MockAavePool.apyBps`:

```bash
cast send 0xB150c04A5e4FAB33dD601b0190fbb1beEF711490 \
  "setApyBps(uint256)" 150 \
  --rpc-url $ARBITRUM_SEPOLIA_RPC --private-key $YOUR_KEY
```

This sets APY to 1.5% — well below the current CORE target — and the agent will propose a LOWER on the next cron tick.

---

## Current Implementation State

### Working

| Component | Status |
|---|---|
| ShaleVault — deposit / withdraw / settleEpoch | ✅ |
| ShaleGovernor — propose / execute / reject | ✅ |
| Waterfall epoch distribution | ✅ |
| Yield-per-share accounting (no rebase) | ✅ |
| MockUSDC (free mint) + MockAavePool (configurable APY) | ✅ |
| Foundry tests — 10/10 passing | ✅ |
| Agent — cron loop, APY read, propose on-chain | ✅ |
| Frontend — dashboard, deposit, portfolio pages | ✅ |
| Agent proposals visible + Accept button on frontend | ✅ |

### Limitations / Known Issues

| Item | Detail |
|---|---|
| **Mock APY is static** | `MockAavePool.apyBps()` returns a hardcoded value (4.20%). It must be changed manually via `setApyBps()` to simulate market movement. The agent has no feedback loop to change APY itself. |
| **Agent always proposes LOWER** | Because mock APY (4.20%) × 0.65 = 2.73% < default CORE target (4.00%), the agent will keep proposing LOWER every 15 min until a proposal is accepted and the target drops to ~2.73%. After that, it will HOLD. |
| **Epoch settlement needs 7 days** | `settleEpoch()` reverts unless `block.timestamp >= lastEpochTimestamp + 7 days`. No demo shortcut built into contracts. Use an Anvil fork with `vm.warp` for local demos. |
| **No automated epoch settlement** | The agent only proposes rebalances. It does not call `settleEpoch()` automatically. Users must trigger it manually from the Portfolio page. |
| **No WalletConnect** | RainbowKit removed to avoid needing a WalletConnect Cloud project ID. Only MetaMask (injected connector) works. |
| **No Vercel deployment** | Frontend runs locally only (`localhost:3420`). |
| **No faucet UI** | Users must call `MockUSDC.mint()` via cast or Etherscan to get test USDC. |
| **Real Aave not tested** | `USE_MOCK_AAVE=false` path exists in code but was not tested end-to-end. Aave V3 on Arbitrum Sepolia may have different or outdated addresses. |
| **No access control on settleEpoch** | Anyone can call it after 7 days. This is intentional (permissionless) but noted. |

### Not Implemented

- [ ] Multi-asset support (USDC only)
- [ ] Slippage / max-deposit caps
- [ ] Agent debate / multi-model consensus (referenced in spec)
- [ ] Proposal timelock delay (hardcoded to 0)
- [ ] On-chain APY oracle (Chainlink or Aave data provider)
- [ ] Vercel / production deployment
- [ ] WalletConnect / mobile wallet support
- [ ] Arbiscan contract verification

---

## Contract Roles

| Role | Holder | Can Do |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | Deployer EOA | pause vault, reject proposals |
| `GOVERNOR_ROLE` | ShaleGovernor contract | call `vault.updateTargets()` |
| `PROPOSER_ROLE` | Agent EOA | call `governor.proposeRebalance()` |
| ShaleShare `owner` | ShaleVault contract | mint/burn share tokens |

---

## Tech Stack

- **Contracts:** Solidity 0.8.20, Foundry, OpenZeppelin v5
- **Agent:** Node.js, TypeScript, ethers v6, node-cron
- **Frontend:** Next.js 16 (App Router), wagmi v2, viem, Tailwind CSS
- **Network:** Arbitrum Sepolia (chain 421614)
