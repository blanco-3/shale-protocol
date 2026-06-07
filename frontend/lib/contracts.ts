export const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}`;
export const GOVERNOR_ADDRESS = process.env.NEXT_PUBLIC_GOVERNOR_ADDRESS as `0x${string}`;
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "0x7e798cBfCEFb5E36341020e17137fd5CA00BEf01") as `0x${string}`;

export const VAULT_ABI = [
  { name: "corePrincipal", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "seamPrincipal", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "apexPrincipal", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "coreTargetMinBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "coreTargetMaxBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "seamTargetMinBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "seamTargetMaxBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    name: "pendingYield",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }, { name: "tier", type: "uint8" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }, { name: "tier", type: "uint8" }],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "shares", type: "uint256" }, { name: "tier", type: "uint8" }],
    outputs: [],
  },
  { name: "settleEpoch", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
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
        { name: "id", type: "uint256" },
        { name: "proposer", type: "address" },
        { name: "newCoreMin", type: "uint256" },
        { name: "newCoreMax", type: "uint256" },
        { name: "newSeamMin", type: "uint256" },
        { name: "newSeamMax", type: "uint256" },
        { name: "reason", type: "string" },
        { name: "proposedAt", type: "uint256" },
        { name: "executed", type: "bool" },
        { name: "rejected", type: "bool" },
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
