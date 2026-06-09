import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

export const CHAIN_ID = 421614; // Arbitrum Sepolia

export const provider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_RPC!
);

export const agentWallet = new ethers.Wallet(
  process.env.AGENT_PRIVATE_KEY!,
  provider
);

export const ADDRESSES = {
  vault:            process.env.SHALE_VAULT_ADDRESS!,
  governor:         process.env.SHALE_GOVERNOR_ADDRESS!,
  router:           process.env.STRATEGY_ROUTER_ADDRESS ?? "",
  mockAavePool:     process.env.MOCK_AAVE_POOL_ADDRESS ?? "",
  usdc:             process.env.USDC_ADDRESS ?? "0x90d1969d0f64FDA70b5330b20A61e68491c9221d",
  aavePool:         process.env.AAVE_POOL_ADDRESS ?? "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
  aaveDataProvider: process.env.AAVE_DATA_PROVIDER_ADDRESS ?? "",
};

export const USE_MOCK_AAVE = process.env.USE_MOCK_AAVE === "true";

export const REBALANCE_THRESHOLD_BPS = 50;

export const CRON_SCHEDULE = process.env.CRON_SCHEDULE ?? "*/15 * * * *";
