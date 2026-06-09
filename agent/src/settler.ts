import { ethers } from "ethers";
import { agentWallet, ADDRESSES } from "./config";

const VAULT_ABI = [
  "function lastEpochTimestamp() view returns (uint256)",
  "function EPOCH_DURATION() view returns (uint256)",
  "function settleEpoch() external",
  "function totalPrincipal() view returns (uint256)",
];

/**
 * Check if the epoch is ready to settle. If so, call settleEpoch().
 * Skips if no TVL (nothing to settle).
 */
export async function maybeSettleEpoch(): Promise<void> {
  const vault = new ethers.Contract(ADDRESSES.vault, VAULT_ABI, agentWallet);

  const [lastEpochTimestamp, epochDuration, totalPrincipal]: [bigint, bigint, bigint] = await Promise.all([
    vault.lastEpochTimestamp(),
    vault.EPOCH_DURATION(),
    vault.totalPrincipal(),
  ]);

  if (totalPrincipal === 0n) {
    console.log("[settler] No TVL — skipping epoch check.");
    return;
  }

  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const nextEpochAt = lastEpochTimestamp + epochDuration;

  if (nowSec < nextEpochAt) {
    const remaining = nextEpochAt - nowSec;
    const days = Number(remaining / 86400n);
    const hours = Number((remaining % 86400n) / 3600n);
    console.log(`[settler] Epoch not ready. ${days}d ${hours}h remaining.`);
    return;
  }

  console.log("[settler] Epoch ready. Calling settleEpoch()...");
  try {
    const tx = await vault.settleEpoch();
    const receipt = await tx.wait();
    console.log(`[settler] settleEpoch() confirmed. Tx: ${receipt.hash}`);
  } catch (err) {
    console.error("[settler] settleEpoch() failed:", err);
  }
}
