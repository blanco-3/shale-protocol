export const VAULT_ADDRESS   = process.env.NEXT_PUBLIC_VAULT_ADDRESS   as `0x${string}`;
export const GOVERNOR_ADDRESS = process.env.NEXT_PUBLIC_GOVERNOR_ADDRESS as `0x${string}`;
export const USDC_ADDRESS    = (process.env.NEXT_PUBLIC_USDC_ADDRESS    ?? "0x572A1834ea4783f46aC9069470046B7CdB8dB0fd") as `0x${string}`;
export const MOCK_STRATEGY_ADDRESS = (process.env.NEXT_PUBLIC_MOCK_STRATEGY_ADDRESS ?? "0x7252b361a493827dcA55822EE37772489f3345AA") as `0x${string}`;

export const VAULT_ABI = [
  // ── Principal & yield buckets ───────────────────────────────────────────
  { name: "corePrincipal",        type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "seamPrincipal",        type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "apexPrincipal",        type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "coreAccumulatedYield", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "seamAccumulatedYield", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "apexAccumulatedYield", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalPrincipal",       type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "pendingPenalties",     type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  // ── APY targets ─────────────────────────────────────────────────────────
  { name: "coreTargetMinBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "coreTargetMaxBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "seamTargetMinBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "seamTargetMaxBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  // ── Epoch ───────────────────────────────────────────────────────────────
  { name: "lastEpochTimestamp",  type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "epochCount",          type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "withdrawQueueLength", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  // ── Share tokens ────────────────────────────────────────────────────────
  { name: "coreToken", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { name: "seamToken", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { name: "apexToken", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  // ── ERC-4626 view ───────────────────────────────────────────────────────
  {
    name: "previewRedeem",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }, { name: "tier", type: "uint8" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "pendingYield",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }, { name: "tier", type: "uint8" }],
    outputs: [{ type: "uint256" }],
  },
  // ── Write ───────────────────────────────────────────────────────────────
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }, { name: "tier", type: "uint8" }],
    outputs: [],
  },
  {
    name: "requestWithdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "shares", type: "uint256" }, { name: "tier", type: "uint8" }],
    outputs: [],
  },
  {
    name: "earlyWithdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "shares", type: "uint256" }, { name: "tier", type: "uint8" }],
    outputs: [],
  },
  { name: "settleEpoch", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  // ── Events ──────────────────────────────────────────────────────────────
  {
    name: "Deposited",
    type: "event",
    inputs: [
      { name: "user",   type: "address", indexed: true },
      { name: "tier",   type: "uint8",   indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "shares", type: "uint256", indexed: false },
    ],
  },
  {
    name: "WithdrawRequested",
    type: "event",
    inputs: [
      { name: "user",   type: "address", indexed: true },
      { name: "tier",   type: "uint8",   indexed: true },
      { name: "shares", type: "uint256", indexed: false },
    ],
  },
  {
    name: "EarlyWithdraw",
    type: "event",
    inputs: [
      { name: "user",     type: "address", indexed: true },
      { name: "tier",     type: "uint8",   indexed: true },
      { name: "shares",   type: "uint256", indexed: false },
      { name: "received", type: "uint256", indexed: false },
      { name: "penalty",  type: "uint256", indexed: false },
    ],
  },
  {
    name: "EpochSettled",
    type: "event",
    inputs: [
      { name: "epochId",    type: "uint256", indexed: true },
      { name: "totalYield", type: "uint256", indexed: false },
      { name: "coreShare",  type: "uint256", indexed: false },
      { name: "seamShare",  type: "uint256", indexed: false },
      { name: "apexShare",  type: "uint256", indexed: false },
    ],
  },
] as const;

export const GOVERNOR_ABI = [
  { name: "proposalCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    name: "latestProposal",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{
      type: "tuple",
      components: [
        { name: "id",         type: "uint256" },
        { name: "proposer",   type: "address" },
        { name: "newCoreMin", type: "uint256" },
        { name: "newCoreMax", type: "uint256" },
        { name: "newSeamMin", type: "uint256" },
        { name: "newSeamMax", type: "uint256" },
        { name: "reason",     type: "string"  },
        { name: "proposedAt", type: "uint256" },
        { name: "executed",   type: "bool"    },
        { name: "rejected",   type: "bool"    },
      ],
    }],
  },
  {
    name: "executeProposal",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "rejectProposal",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [],
  },
] as const;

export const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
] as const;

export const MOCK_STRATEGY_ABI = [
  { name: "deployedPrincipal", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "pendingYield",      type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    name: "addYield",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
] as const;
