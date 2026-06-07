import { ethers } from "ethers";
import { agentWallet, ADDRESSES, REBALANCE_THRESHOLD_BPS } from "./config";
import { VaultState, MarketCondition } from "./types";

const GOVERNOR_ABI = [
  "function proposeRebalance(uint256 newCoreMin, uint256 newCoreMax, uint256 newSeamMin, uint256 newSeamMax, string reason) returns (uint256)",
  "function proposalCount() view returns (uint256)",
];

/**
 * Assess market conditions and decide if a rebalance proposal is warranted.
 *
 * Decision rules:
 *   - Ideal CORE min = floor(aaveAPY * 0.65)
 *   - If |ideal - current| > REBALANCE_THRESHOLD_BPS → act
 *   - SEAM targets = 30-40% of Aave APY
 */
export function assessMarket(vault: VaultState, aaveAPYBps: number): MarketCondition {
  const currentCoreMin = Number(vault.coreTargetMinBps);
  const idealCoreMin = Math.floor(aaveAPYBps * 0.65);
  const diff = Math.abs(idealCoreMin - currentCoreMin);
  const shouldAct = diff > REBALANCE_THRESHOLD_BPS;
  const direction = idealCoreMin > currentCoreMin ? "RAISE" : "LOWER";

  const suggestedCoreMin = Math.max(0, Math.floor(aaveAPYBps * 0.65));
  const suggestedCoreMax = Math.max(0, Math.floor(aaveAPYBps * 0.75));
  const suggestedSeamMin = Math.max(0, Math.floor(aaveAPYBps * 0.30));
  const suggestedSeamMax = Math.max(0, Math.floor(aaveAPYBps * 0.40));

  const reason = shouldAct
    ? `Aave USDC supply APY: ${(aaveAPYBps / 100).toFixed(2)}%. ` +
      `Current CORE target: ${(currentCoreMin / 100).toFixed(2)}%. ` +
      `Ideal CORE target: ${(idealCoreMin / 100).toFixed(2)}% (65% of Aave APY). ` +
      `Diff: ${(diff / 100).toFixed(2)}% > threshold ${(REBALANCE_THRESHOLD_BPS / 100).toFixed(2)}%. ` +
      `Proposing ${direction}: CORE ${(suggestedCoreMin / 100).toFixed(2)}%-${(suggestedCoreMax / 100).toFixed(2)}%, ` +
      `SEAM ${(suggestedSeamMin / 100).toFixed(2)}%-${(suggestedSeamMax / 100).toFixed(2)}%. ` +
      `Timestamp: ${new Date().toISOString()}`
    : `HOLD. Aave APY: ${(aaveAPYBps / 100).toFixed(2)}%. ` +
      `Current CORE target ${(currentCoreMin / 100).toFixed(2)}% is within ${(REBALANCE_THRESHOLD_BPS / 100).toFixed(2)}% of ideal. No action needed.`;

  return {
    aaveAPYBps,
    timestamp: Date.now(),
    recommendation: shouldAct ? direction : "HOLD",
    suggestedCoreMin,
    suggestedCoreMax,
    suggestedSeamMin,
    suggestedSeamMax,
    reason,
  };
}

export async function submitProposal(market: MarketCondition): Promise<string> {
  const governor = new ethers.Contract(ADDRESSES.governor, GOVERNOR_ABI, agentWallet);

  // Fetch on-chain nonce to avoid stale nonce errors from multiple rapid submits
  const nonce = await agentWallet.getNonce("latest");

  console.log(`[proposer] Submitting (nonce=${nonce}): ${market.reason}`);

  const tx = await governor.proposeRebalance(
    market.suggestedCoreMin,
    market.suggestedCoreMax,
    market.suggestedSeamMin,
    market.suggestedSeamMax,
    market.reason,
    { nonce }
  );

  const receipt = await tx.wait();
  console.log(`[proposer] Proposal submitted. Tx: ${receipt.hash}`);
  return receipt.hash;
}
