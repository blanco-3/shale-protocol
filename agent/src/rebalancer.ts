import { ethers } from "ethers";
import { agentWallet, ADDRESSES } from "./config";
import { scanStrategies, StrategyData } from "./scanner";
import { readVaultState } from "./vault";
import { chat, parseJSON } from "./llm";

const ROUTER_ABI = [
  "function setWeights(uint16[] weights) external",
  "function rebalance() external",
  "function strategyCount() view returns (uint256)",
];

// Minimum APY improvement (bps) worth a rebalance
const MIN_APY_DIFF_BPS = 50;

// Safety: don't put more than this share into any single strategy
const MAX_SINGLE_WEIGHT = 8_000; // 80%

// When APEX buffer is low, shift to conservative strategy
const CONSERVATIVE_BUFFER_THRESHOLD = 0.15; // 15%

/**
 * Compute optimal weight array for the router's strategies.
 *
 * Algorithm:
 *   1. Sort strategies by APY descending
 *   2. Allocate proportionally to APY (higher APY → more weight)
 *   3. Cap any single strategy at MAX_SINGLE_WEIGHT
 *   4. If APEX buffer is below threshold → shift extra weight to lowest-APY (most stable)
 *   5. Normalise weights to sum exactly 10_000
 */
export function computeOptimalWeights(
  strategies: StrategyData[],
  apexBufferRatio: number
): number[] {
  const active = strategies.filter((s) => s.active);
  if (active.length === 0) return strategies.map(() => 0);

  // If only one active strategy, it gets 100%
  if (active.length === 1) {
    return strategies.map((s) => (s.active ? 10_000 : 0));
  }

  // Base: allocate proportionally to APY (add 1 to avoid div-by-zero when all apyBps=0)
  const totalAPY = active.reduce((sum, s) => sum + s.apyBps + 1, 0);
  let rawWeights = strategies.map((s) =>
    s.active ? Math.round(((s.apyBps + 1) / totalAPY) * 10_000) : 0
  );

  // Cap maximum
  rawWeights = rawWeights.map((w) => Math.min(w, MAX_SINGLE_WEIGHT));

  // If buffer is low, shift weight toward lowest-APY strategy (safest)
  if (apexBufferRatio < CONSERVATIVE_BUFFER_THRESHOLD) {
    const lowestApyIdx = strategies
      .map((s, i) => ({ apy: s.apyBps, i }))
      .filter((x) => strategies[x.i].active)
      .sort((a, b) => a.apy - b.apy)[0].i;

    // Move up to 20% of weight to safest strategy
    const shift = Math.round(0.2 * 10_000);
    rawWeights = rawWeights.map((w, i) => {
      if (i === lowestApyIdx) return Math.min(w + shift, MAX_SINGLE_WEIGHT);
      return Math.max(0, w - Math.round(shift / (active.length - 1)));
    });

    console.log(
      `[rebalancer] APEX buffer ${(apexBufferRatio * 100).toFixed(1)}% < threshold — shifting weight to ${strategies[lowestApyIdx].name}`
    );
  }

  // Normalise to exactly 10_000
  const sum = rawWeights.reduce((a, b) => a + b, 0);
  if (sum === 0) return strategies.map(() => 0);

  const normalised = rawWeights.map((w) => Math.round((w / sum) * 10_000));

  // Fix rounding remainder on first active strategy
  const total = normalised.reduce((a, b) => a + b, 0);
  const diff  = 10_000 - total;
  const firstActive = normalised.findIndex((_, i) => strategies[i].active);
  if (firstActive >= 0) normalised[firstActive] += diff;

  return normalised;
}

/**
 * Check if rebalancing is worthwhile.
 * Returns false if the weight delta is trivial or APY difference is below threshold.
 */
function shouldRebalance(
  strategies: StrategyData[],
  newWeights: number[]
): boolean {
  const apyValues = strategies.filter((s) => s.active).map((s) => s.apyBps);
  const maxApy = Math.max(...apyValues);
  const minApy = Math.min(...apyValues);

  if (maxApy - minApy < MIN_APY_DIFF_BPS) {
    console.log(
      `[rebalancer] APY spread ${((maxApy - minApy) / 100).toFixed(2)}% < threshold — no rebalance needed.`
    );
    return false;
  }

  const maxDelta = strategies.reduce((max, s, i) => {
    const delta = Math.abs(s.weight - newWeights[i]);
    return Math.max(max, delta);
  }, 0);

  if (maxDelta < 500) {
    // Less than 5% weight shift — not worth the gas
    console.log(`[rebalancer] Max weight delta ${maxDelta} bps < 500 — skipping.`);
    return false;
  }

  return true;
}

/**
 * Ask the LLM for optimal strategy weights, with algorithmic fallback.
 * Returns weight array (bps, sums to 10_000) ordered by strategy index.
 */
async function computeWeightsWithLLM(
  strategies: StrategyData[],
  apexBufferRatio: number
): Promise<number[]> {
  const systemPrompt = `You are an AI yield optimizer for SHALE Protocol, managing a multi-strategy DeFi vault.
You decide how to allocate capital across yield strategies to maximise risk-adjusted returns.

Constraints:
- Weights must be in basis points (bps), where 10000 = 100%
- All weights must sum to exactly 10000
- No single strategy may exceed 8000 bps (80%)
- Prefer diversification unless one strategy is clearly dominant
- If the APEX buffer ratio (fraction of vault that is APEX principal) < 0.15, shift weight toward the most stable (lowest APY) strategy for safety
- Strategies with zero or negative APY should get minimal weight (≤500 bps)

Respond ONLY with valid JSON (no markdown):
{
  "weights": [<bps for strategy 0>, <bps for strategy 1>, ...],
  "reason": "<one sentence explaining the allocation>"
}`;

  const stratLines = strategies
    .map((s, i) =>
      `  Strategy ${i}: name="${s.name}" APY=${(s.apyBps / 100).toFixed(2)}% ` +
      `deployed=$${(Number(s.deployed) / 1e6).toFixed(2)} ` +
      `currentWeight=${(s.weight / 100).toFixed(0)}% active=${s.active}`
    )
    .join("\n");

  const userMessage = `Current strategies:\n${stratLines}\n\nAPEX buffer ratio: ${(apexBufferRatio * 100).toFixed(1)}%\n\nWhat weights should we set?`;

  try {
    const text = await chat(systemPrompt, userMessage);
    console.log(`[rebalancer] LLM raw: ${text.trim()}`);

    const parsed = parseJSON<{ weights: number[]; reason: string }>(text);

    if (
      parsed &&
      Array.isArray(parsed.weights) &&
      parsed.weights.length === strategies.length &&
      parsed.weights.every((w) => typeof w === "number" && w >= 0) &&
      Math.abs(parsed.weights.reduce((a, b) => a + b, 0) - 10_000) <= 20 // allow ±20 bps rounding
    ) {
      // Normalise to exact 10_000
      const sum = parsed.weights.reduce((a, b) => a + b, 0);
      const normalised = parsed.weights.map((w) => Math.round((w / sum) * 10_000));
      const total = normalised.reduce((a, b) => a + b, 0);
      normalised[0] += 10_000 - total; // fix rounding remainder

      console.log(`[rebalancer] LLM weights: ${parsed.reason}`);
      return normalised;
    }

    console.warn("[rebalancer] LLM returned invalid weights — falling back to algorithmic.");
  } catch (err) {
    console.warn("[rebalancer] LLM call failed — falling back to algorithmic:", (err as Error).message);
  }

  return computeOptimalWeights(strategies, apexBufferRatio);
}

/**
 * Main rebalancer entry point. Called every agent loop iteration.
 *
 * Flow:
 *   1. Scan strategy APYs + current weights
 *   2. Compute optimal weights based on APY + buffer ratio
 *   3. If weights changed meaningfully: setWeights() then rebalance()
 */
export async function maybeRebalance(): Promise<void> {
  if (!ADDRESSES.router) {
    console.log("[rebalancer] No router address — skipping.");
    return;
  }

  const [{ strategies, routerTotal }, vaultState] = await Promise.all([
    scanStrategies(),
    readVaultState(),
  ]);

  if (strategies.length === 0) {
    console.log("[rebalancer] No strategies in router.");
    return;
  }

  const totalPrincipal =
    vaultState.corePrincipal + vaultState.seamPrincipal + vaultState.apexPrincipal;

  const apexBufferRatio =
    totalPrincipal > 0n
      ? Number(vaultState.apexPrincipal) / Number(totalPrincipal)
      : 0;

  console.log(
    `[rebalancer] Router total: $${(Number(routerTotal) / 1e6).toFixed(2)} | ` +
    `APEX buffer: ${(apexBufferRatio * 100).toFixed(1)}%`
  );

  strategies.forEach((s) => {
    console.log(
      `[rebalancer]   ${s.name.padEnd(16)} weight=${(s.weight / 100).toFixed(0).padStart(3)}%  ` +
      `deployed=$${(Number(s.deployed) / 1e6).toFixed(2).padStart(10)}  ` +
      `APY=${((s.apyBps) / 100).toFixed(2)}%`
    );
  });

  // Try LLM-based weight decision first, fall back to algorithmic
  const newWeights = await computeWeightsWithLLM(strategies, apexBufferRatio);

  console.log(
    "[rebalancer] Optimal weights: " +
    strategies.map((s, i) => `${s.name}=${(newWeights[i] / 100).toFixed(0)}%`).join(", ")
  );

  if (!shouldRebalance(strategies, newWeights)) return;

  const router = new ethers.Contract(ADDRESSES.router, ROUTER_ABI, agentWallet);

  try {
    console.log("[rebalancer] Calling setWeights()...");
    const tx1 = await router.setWeights(newWeights);
    await tx1.wait();
    console.log(`[rebalancer] setWeights() confirmed. Tx: ${tx1.hash}`);

    console.log("[rebalancer] Calling rebalance()...");
    const tx2 = await router.rebalance();
    await tx2.wait();
    console.log(`[rebalancer] rebalance() confirmed. Tx: ${tx2.hash}`);
  } catch (err) {
    console.error("[rebalancer] Rebalance failed:", err);
  }
}
