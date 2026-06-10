// Hardcoded fallbacks ensure addresses survive Cloud Build (where .env.production is
// excluded by .gitignore and never reaches the build step).
export const VAULT_ADDRESS           = (process.env.NEXT_PUBLIC_VAULT_ADDRESS            ?? "0x3989a0E6450903f60Aa42A82fF1C9c44C24622DC") as `0x${string}`;
export const GOVERNOR_ADDRESS        = (process.env.NEXT_PUBLIC_GOVERNOR_ADDRESS         ?? "0xc21DAf89edAeBb9B6def2F71b4d5bd71e9AC23F1") as `0x${string}`;
export const USDC_ADDRESS            = (process.env.NEXT_PUBLIC_USDC_ADDRESS             ?? "0x91BD5E4E9fE9953051A815a6a9A8Fe92E9e7A8d7") as `0x${string}`;
export const STRATEGY_ROUTER_ADDRESS = (process.env.NEXT_PUBLIC_STRATEGY_ROUTER_ADDRESS  ?? "0x27d0f024c1aE225aFA4366319a9F9F9e63B4610b") as `0x${string}`;
export const AAVE_STRATEGY_ADDRESS   = (process.env.NEXT_PUBLIC_AAVE_STRATEGY_ADDRESS    ?? "0x29e312Ae6Fe409599D37E6DF3D742869E14BfdBE") as `0x${string}`;
export const CAMELOT_STRATEGY_ADDRESS = (process.env.NEXT_PUBLIC_SIM_CAMELOT_ADDRESS     ?? "0x4BDe068D9DaDDB364Ff7f896AdA0Aa1433b7a8ef") as `0x${string}`;
export const MORPHO_STRATEGY_ADDRESS  = (process.env.NEXT_PUBLIC_SIM_MORPHO_ADDRESS      ?? "0x7000eB5469D424b09Cd68AB3D9d634506E51FCEf") as `0x${string}`;
export const FIXED_YIELD_ADDRESS      = CAMELOT_STRATEGY_ADDRESS; // legacy alias
export const AAVE_POOL_ADDRESS        = "0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff" as `0x${string}`;

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
  { name: "withdrawQueueLength",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "queueHead",              type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "minApexBufferBps",       type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "apexBufferBps",          type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "apexBufferGateActive",   type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bool"    }] },
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

// Aave V3 Pool — getReserveData returns currentLiquidityRate in RAY (1e27 = 100% APY)
export const AAVE_POOL_ABI = [
  {
    name: "getReserveData",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [{
      type: "tuple",
      components: [
        { name: "configuration",               type: "tuple", components: [{ name: "data", type: "uint256" }] },
        { name: "liquidityIndex",              type: "uint128" },
        { name: "currentLiquidityRate",        type: "uint128" },
        { name: "variableBorrowIndex",         type: "uint128" },
        { name: "currentVariableBorrowRate",   type: "uint128" },
        { name: "currentStableBorrowRate",     type: "uint128" },
        { name: "lastUpdateTimestamp",         type: "uint40"  },
        { name: "id",                          type: "uint16"  },
        { name: "aTokenAddress",               type: "address" },
        { name: "stableDebtTokenAddress",      type: "address" },
        { name: "variableDebtTokenAddress",    type: "address" },
        { name: "interestRateStrategyAddress", type: "address" },
        { name: "accruedToTreasury",           type: "uint128" },
        { name: "unbacked",                    type: "uint128" },
        { name: "isolationModeTotalDebt",      type: "uint128" },
      ],
    }],
  },
] as const;

// ─── Sim strategy ABIs ────────────────────────────────────────────────────────

/** SimAaveV3Strategy — Aave V3 two-slope interest rate model */
export const SIM_AAVE_ABI = [
  { name: "apyBps",         type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "utilizationBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "deployedPrincipal", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    name: "marketState",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "utilization", type: "uint256" },
      { name: "supplyApy",   type: "uint256" },
      { name: "principal",   type: "uint256" },
      { name: "pending",     type: "uint256" },
    ],
  },
  {
    name: "setUtilization",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_bps", type: "uint256" }],
    outputs: [],
  },
] as const;

/** SimCamelotV3Strategy — Uniswap V3 / Camelot LP fee model */
export const SIM_CAMELOT_ABI = [
  { name: "apyBps",               type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "dailyVolumeRatioBps",  type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "feeTierBps",           type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "deployedPrincipal",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    name: "marketState",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "volumeRatio",   type: "uint256" },
      { name: "feeTier",       type: "uint256" },
      { name: "dailyFeeRate",  type: "uint256" },
      { name: "lpApy",         type: "uint256" },
      { name: "principal",     type: "uint256" },
      { name: "pending",       type: "uint256" },
    ],
  },
  {
    name: "setVolumeRatio",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_bps", type: "uint256" }],
    outputs: [],
  },
] as const;

/** SimMorphoStrategy — Morpho Blue P2P lending model */
export const SIM_MORPHO_ABI = [
  { name: "apyBps",           type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "aaveSupplyBps",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "aaveBorrowBps",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "matchingRatioBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "deployedPrincipal",type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    name: "marketState",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "supplyApy",     type: "uint256" },
      { name: "borrowApy",     type: "uint256" },
      { name: "matchingRatio", type: "uint256" },
      { name: "p2pRate",       type: "uint256" },
      { name: "blendedApy",    type: "uint256" },
      { name: "principal",     type: "uint256" },
      { name: "pending",       type: "uint256" },
    ],
  },
  {
    name: "setRates",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_supplyBps",   type: "uint256" },
      { name: "_borrowBps",   type: "uint256" },
      { name: "_matchingBps", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

// Legacy alias
export const FIXED_YIELD_STRATEGY_ABI = [
  { name: "annualYieldBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export const STRATEGY_ROUTER_ABI = [
  { name: "strategyCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalAssets",   type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    name: "getStrategy",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "i", type: "uint256" }],
    outputs: [
      { name: "addr",     type: "address" },
      { name: "weight",   type: "uint16"  },
      { name: "name",     type: "string"  },
      { name: "active",   type: "bool"    },
      { name: "deployed", type: "uint256" },
    ],
  },
  {
    name: "setWeights",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "weights", type: "uint16[]" }],
    outputs: [],
  },
  { name: "rebalance", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    name: "Rebalanced",
    type: "event",
    inputs: [
      { name: "timestamp",   type: "uint256", indexed: false },
      { name: "initiator",   type: "address", indexed: true  },
      { name: "totalAssets", type: "uint256", indexed: false },
    ],
  },
] as const;
