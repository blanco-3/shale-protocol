import { ethers } from "ethers";
import { agentWallet, provider, ADDRESSES, REBALANCE_THRESHOLD_BPS } from "./config";
import { VaultState, MarketCondition } from "./types";
import { chat, parseJSON } from "./llm";

const GOVERNOR_ABI = [
  "function proposeRebalance(uint256 newCoreMin, uint256 newCoreMax, uint256 newSeamMin, uint256 newSeamMax, string reason) returns (uint256)",
  "function proposalCount() view returns (uint256)",
];

const EPOCH_SETTLED_TOPIC = ethers.id(
  "EpochSettled(uint256,uint256,uint256,uint256,uint256)"
);

/** Read EPOCH_DURATION from vault (seconds). Cached after first call. */
let epochDurationCache: number | null = null;
async function getEpochDurationDays(): Promise<number> {
  if (epochDurationCache !== null) return epochDurationCache;
  try {
    const vault = new ethers.Contract(
      ADDRESSES.vault,
      ["function EPOCH_DURATION() view returns (uint256)"],
      logProvider
    );
    const dur: bigint = await vault.EPOCH_DURATION();
    epochDurationCache = Number(dur) / 86400; // seconds → days
    return epochDurationCache;
  } catch {
    return 7; // safe fallback: 7-day epoch
  }
}

type EpochSnapshot = {
  epochId:    number;
  totalYield: number; // USDC, 6 decimals → converted to float $
  apyBps:     number; // annualised from epoch yield / principal
};

/**
 * Fetch the last N EpochSettled events from the vault.
 * Returns them oldest-first so the LLM sees a time-ordered sequence.
 */
// Fallback log provider — official Arbitrum Sepolia RPC has no eth_getLogs block range limit.
// Alchemy free tier caps at 10 blocks, so we use this for event queries only.
const LOG_RPC = "https://sepolia-rollup.arbitrum.io/rpc";
const logProvider = new ethers.JsonRpcProvider(LOG_RPC);

async function fetchRecentEpochs(n: number): Promise<EpochSnapshot[]> {
  const vault = new ethers.Contract(
    ADDRESSES.vault,
    [
      "event EpochSettled(uint256 indexed epochId, uint256 totalYield, uint256 coreShare, uint256 seamShare, uint256 apexShare)",
      "function totalPrincipal() view returns (uint256)",
    ],
    logProvider
  );

  try {
    const filter   = vault.filters.EpochSettled();
    const logs     = await vault.queryFilter(filter, -50_000); // last ~50k blocks
    const recent   = logs.slice(-n);
    const principal = Number(await vault.totalPrincipal()) / 1e6;

    // Annualise using actual epoch length — NOT a hardcoded 7-day assumption
    const epochDays = await getEpochDurationDays();

    return recent.map((log) => {
      const e = log as ethers.EventLog;
      const yield_usdc = Number(e.args.totalYield) / 1e6;
      const apyBps = principal > 0
        ? Math.round((yield_usdc / principal) * (365 / epochDays) * 10_000)
        : 0;
      return {
        epochId:    Number(e.args.epochId),
        totalYield: yield_usdc,
        apyBps,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Summarise epoch trend as a plain-language string for the LLM.
 * Returns empty string if no history available.
 */
function summariseEpochTrend(epochs: EpochSnapshot[]): string {
  if (epochs.length === 0) return "";

  const lines = epochs.map(
    (e) => `  Epoch #${e.epochId}: yield=$${e.totalYield.toFixed(2)}, implied APY=${(e.apyBps / 100).toFixed(2)}%`
  );

  const apys = epochs.map((e) => e.apyBps);
  const first = apys[0], last = apys[apys.length - 1];
  const trend =
    apys.length < 2     ? "insufficient history" :
    last > first + 20   ? "RISING (+>" + ((last - first) / 100).toFixed(2) + "% over " + apys.length + " epochs)" :
    last < first - 20   ? "FALLING (->" + ((first - last) / 100).toFixed(2) + "% over " + apys.length + " epochs)" :
                          "STABLE (< 0.20% drift)";

  return `\nRecent epoch history (oldest → newest):\n${lines.join("\n")}\nYield trend: ${trend}`;
}

/** Rule-based fallback when LLM is unavailable. */
function assessMarketRuleBased(vault: VaultState, aaveAPYBps: number): MarketCondition {
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
      `CORE target: ${(currentCoreMin / 100).toFixed(2)}% → ideal ${(idealCoreMin / 100).toFixed(2)}% (65% of Aave). ` +
      `Proposing ${direction}: CORE ${(suggestedCoreMin / 100).toFixed(2)}%-${(suggestedCoreMax / 100).toFixed(2)}%, ` +
      `SEAM ${(suggestedSeamMin / 100).toFixed(2)}%-${(suggestedSeamMax / 100).toFixed(2)}%.`
    : `HOLD. Aave APY ${(aaveAPYBps / 100).toFixed(2)}%. CORE target within threshold.`;

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

/**
 * Assess market conditions using Groq LLM with rule-based fallback.
 *
 * The LLM considers real market context beyond simple multipliers:
 *   - Whether APY spread justifies a change
 *   - Risk balance between CORE (stable) and SEAM (higher risk/reward)
 *   - Current epoch state and TVL distribution
 */
export async function assessMarket(vault: VaultState, aaveAPYBps: number): Promise<MarketCondition> {
  // Fetch epoch history for trend-aware LLM reasoning
  const recentEpochs  = await fetchRecentEpochs(3);
  const epochTrend    = summariseEpochTrend(recentEpochs);
  const hasTrendData  = recentEpochs.length >= 2;

  const systemPrompt = `You are an AI yield strategy manager for SHALE Protocol, a multi-tier DeFi yield vault on Arbitrum.
The vault has three tiers: CORE (lowest risk, stable yield), SEAM (medium risk, higher yield), APEX (highest risk, residual yield).
All APY values are in basis points (bps). 100 bps = 1%.

Your job: given current market data AND epoch yield history, decide whether to RAISE, LOWER, or HOLD the APY targets.
Rules:
- CORE is the most conservative tier — its APY target should be 55-70% of the Aave base supply APY
- SEAM is riskier — its APY target should be 80-110% of Aave APY (slightly above market, funded by leverage strategies)
- APEX gets residual yield — no fixed target
- Only propose a change if the current targets deviate materially (>50 bps) from ideal
- The SEAM min must always be > CORE max to preserve risk/reward ordering
- IMPORTANT: If epoch yield shows a multi-epoch FALLING trend, proactively LOWER targets even if
  current Aave spot rate is still in-range. Conversely, a sustained RISING trend warrants a RAISE
  even if single-epoch data looks stable. Do not blindly follow the spot rate — use trend data.

Respond ONLY with a valid JSON object (no markdown), matching this schema:
{
  "recommendation": "RAISE" | "LOWER" | "HOLD",
  "suggestedCoreMin": <number in bps>,
  "suggestedCoreMax": <number in bps>,
  "suggestedSeamMin": <number in bps>,
  "suggestedSeamMax": <number in bps>,
  "reason": "<concise one-sentence explanation referencing the trend>"
}`;

  const userMessage = `Current market data:
- Aave USDC base supply APY: ${(aaveAPYBps / 100).toFixed(2)}% (${aaveAPYBps} bps)
- Current CORE target: ${(Number(vault.coreTargetMinBps) / 100).toFixed(2)}% – ${(Number(vault.coreTargetMaxBps) / 100).toFixed(2)}%
- Current SEAM target: ${(Number(vault.seamTargetMinBps) / 100).toFixed(2)}% – ${(Number(vault.seamTargetMaxBps) / 100).toFixed(2)}%
- CORE principal: $${(Number(vault.corePrincipal) / 1e6).toFixed(2)}
- SEAM principal: $${(Number(vault.seamPrincipal) / 1e6).toFixed(2)}
- APEX principal: $${(Number(vault.apexPrincipal) / 1e6).toFixed(2)}
- Last epoch: ${new Date(Number(vault.lastEpochTimestamp) * 1000).toISOString()}
${epochTrend}
${hasTrendData
  ? "Trend data available — please factor the multi-epoch yield direction into your recommendation."
  : "No epoch history yet — base decision on current spot rate only."}

Should we update the APY targets?`;

  try {
    const text = await chat(systemPrompt, userMessage);
    console.log(`[proposer] LLM raw: ${text.trim()}`);

    const parsed = parseJSON<{
      recommendation: "RAISE" | "LOWER" | "HOLD";
      suggestedCoreMin: number;
      suggestedCoreMax: number;
      suggestedSeamMin: number;
      suggestedSeamMax: number;
      reason: string;
    }>(text);

    if (
      parsed &&
      (parsed.recommendation === "RAISE" || parsed.recommendation === "LOWER" || parsed.recommendation === "HOLD") &&
      typeof parsed.suggestedCoreMin === "number" &&
      typeof parsed.suggestedCoreMax === "number" &&
      typeof parsed.suggestedSeamMin === "number" &&
      typeof parsed.suggestedSeamMax === "number" &&
      typeof parsed.reason === "string"
    ) {
      console.log(`[proposer] LLM decision: ${parsed.recommendation} — ${parsed.reason}`);
      return {
        aaveAPYBps,
        timestamp: Date.now(),
        recommendation: parsed.recommendation,
        suggestedCoreMin: parsed.suggestedCoreMin,
        suggestedCoreMax: parsed.suggestedCoreMax,
        suggestedSeamMin: parsed.suggestedSeamMin,
        suggestedSeamMax: parsed.suggestedSeamMax,
        reason: parsed.reason,
      };
    }

    console.warn("[proposer] LLM returned invalid shape — falling back to rule-based.");
  } catch (err) {
    console.warn("[proposer] LLM call failed — falling back to rule-based:", (err as Error).message);
  }

  return assessMarketRuleBased(vault, aaveAPYBps);
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
