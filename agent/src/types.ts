export interface VaultState {
  corePrincipal: bigint;
  seamPrincipal: bigint;
  apexPrincipal: bigint;
  coreTargetMinBps: bigint;
  coreTargetMaxBps: bigint;
  seamTargetMinBps: bigint;
  seamTargetMaxBps: bigint;
  lastEpochTimestamp: bigint;
}

export interface MarketCondition {
  aaveAPYBps: number;
  timestamp: number;
  recommendation: "RAISE" | "LOWER" | "HOLD";
  suggestedCoreMin: number;
  suggestedCoreMax: number;
  suggestedSeamMin: number;
  suggestedSeamMax: number;
  reason: string;
}
