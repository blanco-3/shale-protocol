import { ethers } from "ethers";
import { provider, ADDRESSES } from "./config";
import { VaultState } from "./types";

const VAULT_ABI = [
  "function corePrincipal() view returns (uint256)",
  "function seamPrincipal() view returns (uint256)",
  "function apexPrincipal() view returns (uint256)",
  "function coreTargetMinBps() view returns (uint256)",
  "function coreTargetMaxBps() view returns (uint256)",
  "function seamTargetMinBps() view returns (uint256)",
  "function seamTargetMaxBps() view returns (uint256)",
  "function lastEpochTimestamp() view returns (uint256)",
];

export async function readVaultState(): Promise<VaultState> {
  const vault = new ethers.Contract(ADDRESSES.vault, VAULT_ABI, provider);

  const [
    corePrincipal,
    seamPrincipal,
    apexPrincipal,
    coreTargetMinBps,
    coreTargetMaxBps,
    seamTargetMinBps,
    seamTargetMaxBps,
    lastEpochTimestamp,
  ] = await Promise.all([
    vault.corePrincipal(),
    vault.seamPrincipal(),
    vault.apexPrincipal(),
    vault.coreTargetMinBps(),
    vault.coreTargetMaxBps(),
    vault.seamTargetMinBps(),
    vault.seamTargetMaxBps(),
    vault.lastEpochTimestamp(),
  ]);

  return {
    corePrincipal,
    seamPrincipal,
    apexPrincipal,
    coreTargetMinBps,
    coreTargetMaxBps,
    seamTargetMinBps,
    seamTargetMaxBps,
    lastEpochTimestamp,
  };
}
