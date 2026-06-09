"use client";
import { useState, useEffect } from "react";
import { useReadContracts, usePublicClient } from "wagmi";
import { parseAbiItem } from "viem";
import {
  VAULT_ADDRESS, VAULT_ABI,
  STRATEGY_ROUTER_ADDRESS, STRATEGY_ROUTER_ABI,
  AAVE_STRATEGY_ADDRESS, SIM_AAVE_ABI,
  CAMELOT_STRATEGY_ADDRESS, SIM_CAMELOT_ABI,
  MORPHO_STRATEGY_ADDRESS, SIM_MORPHO_ABI,
} from "../../lib/contracts";
import { formatUsdc, bpsToPercent } from "../../lib/utils";

// ── Mainnet market rates hook ─────────────────────────────────────────────────

type MarketRates = {
  aave:     { apyBps: number; apyPct: string; protocol: string };
  compound: { apyBps: number; apyPct: string; protocol: string };
  blended:  { apyBps: number; apyPct: string };
  suggestedTargets: { coreMinBps: number; coreMaxBps: number; seamMinBps: number; seamMaxBps: number };
  fetchedAt: string;
};

function useMarketRates() {
  const [rates, setRates] = useState<MarketRates | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/market-rates")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setRates(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { rates, loading };
}

// ── Strategy metadata ─────────────────────────────────────────────────────────

type StrategyMeta = { protocol: string; asset: string; color: string; description: string; model: string };

const STRATEGY_META: StrategyMeta[] = [
  {
    protocol: "Aave V3",
    asset: "USDC/USDT",
    color: "bg-purple-600",
    description: "Variable-rate USDC supply. APY derived from pool utilization via two-slope interest rate model.",
    model: "aave",
  },
  {
    protocol: "Camelot V3 LP",
    asset: "USDC/USDT",
    color: "bg-orange-500",
    description: "Concentrated liquidity LP fees. APY = daily trading volume / TVL × fee tier × 365.",
    model: "camelot",
  },
  {
    protocol: "Morpho Blue",
    asset: "USDC",
    color: "bg-blue-600",
    description: "P2P lending market. Matched suppliers earn above Aave supply rate, blended with unmatched idle.",
    model: "morpho",
  },
];

function getMeta(name: string): StrategyMeta {
  if (name.toLowerCase().includes("aave"))    return STRATEGY_META[0];
  if (name.toLowerCase().includes("camelot")) return STRATEGY_META[1];
  if (name.toLowerCase().includes("morpho"))  return STRATEGY_META[2];
  return { protocol: name, asset: "USDC", color: "bg-gray-500", description: "", model: "" };
}

// ── Types ────────────────────────────────────────────────────────────────────

type RebalanceEvent = {
  timestamp: bigint;
  initiator: `0x${string}`;
  totalAssets: bigint;
  blockNumber: bigint;
};

type EpochEvent = {
  epochId: bigint;
  totalYield: bigint;
  coreShare: bigint;
  seamShare: bigint;
  apexShare: bigint;
  blockNumber: bigint;
};

// ── Rebalancing history hook ──────────────────────────────────────────────────

const REBALANCED_ABI = parseAbiItem(
  "event Rebalanced(uint256 timestamp, address indexed initiator, uint256 totalAssets)"
);

function useRebalanceHistory() {
  const [events, setEvents] = useState<RebalanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!publicClient || !STRATEGY_ROUTER_ADDRESS) return;
    setLoading(true);
    publicClient
      .getLogs({ address: STRATEGY_ROUTER_ADDRESS, event: REBALANCED_ABI, fromBlock: 0n, toBlock: "latest" })
      .then((logs) => {
        setEvents(
          logs
            .map((l) => ({
              timestamp:   l.args.timestamp   ?? 0n,
              initiator:   (l.args.initiator  ?? "0x0") as `0x${string}`,
              totalAssets: l.args.totalAssets ?? 0n,
              blockNumber: l.blockNumber       ?? 0n,
            }))
            .sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [publicClient]);

  return { events, loading };
}

// ── Sim strategy APY + market state hooks ─────────────────────────────────────

type AaveState    = { utilization: bigint; supplyApy: bigint; principal: bigint; pending: bigint };
type CamelotState = { volumeRatio: bigint; feeTier: bigint; dailyFeeRate: bigint; lpApy: bigint; principal: bigint; pending: bigint };
type MorphoState  = { supplyApy: bigint; borrowApy: bigint; matchingRatio: bigint; p2pRate: bigint; blendedApy: bigint; principal: bigint; pending: bigint };

function useSimStrategies() {
  const { data } = useReadContracts({
    contracts: [
      { address: AAVE_STRATEGY_ADDRESS,    abi: SIM_AAVE_ABI,    functionName: "apyBps"      },
      { address: CAMELOT_STRATEGY_ADDRESS, abi: SIM_CAMELOT_ABI, functionName: "apyBps"      },
      { address: MORPHO_STRATEGY_ADDRESS,  abi: SIM_MORPHO_ABI,  functionName: "apyBps"      },
      { address: AAVE_STRATEGY_ADDRESS,    abi: SIM_AAVE_ABI,    functionName: "marketState" },
      { address: CAMELOT_STRATEGY_ADDRESS, abi: SIM_CAMELOT_ABI, functionName: "marketState" },
      { address: MORPHO_STRATEGY_ADDRESS,  abi: SIM_MORPHO_ABI,  functionName: "marketState" },
    ],
  });

  const apyByAddr: Record<string, number> = {};
  if (data?.[0]?.status === "success") apyByAddr[AAVE_STRATEGY_ADDRESS.toLowerCase()]    = Number(data[0].result as bigint);
  if (data?.[1]?.status === "success") apyByAddr[CAMELOT_STRATEGY_ADDRESS.toLowerCase()] = Number(data[1].result as bigint);
  if (data?.[2]?.status === "success") apyByAddr[MORPHO_STRATEGY_ADDRESS.toLowerCase()]  = Number(data[2].result as bigint);

  const aaveState    = data?.[3]?.status === "success" ? (data[3].result as unknown as AaveState)    : null;
  const camelotState = data?.[4]?.status === "success" ? (data[4].result as unknown as CamelotState) : null;
  const morphoState  = data?.[5]?.status === "success" ? (data[5].result as unknown as MorphoState)  : null;

  return { apyByAddr, aaveState, camelotState, morphoState };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTs(ts: bigint): string {
  if (ts === 0n) return "—";
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    + "  " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function shortAddr(addr: string): string {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-gray-200 p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold font-mono">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function TierBar({ label, value, total, color }: { label: string; value: bigint; total: bigint; color: string }) {
  const pct = total > 0n ? Number((value * 10000n) / total) / 100 : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-mono">{formatUsdc(value)} <span className="text-gray-400">({pct.toFixed(1)}%)</span></span>
      </div>
      <div className="h-2 bg-gray-100 w-full">
        <div className={`h-2 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Epoch history hook ────────────────────────────────────────────────────────
// Fetches all EpochSettled events from the vault contract using viem getLogs.
// fromBlock 0n works fine for a fresh testnet deployment.

const EPOCH_SETTLED_ABI = parseAbiItem(
  "event EpochSettled(uint256 indexed epochId, uint256 totalYield, uint256 coreShare, uint256 seamShare, uint256 apexShare)"
);

function useEpochHistory() {
  const [epochs, setEpochs] = useState<EpochEvent[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histError, setHistError] = useState<string | null>(null);
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!publicClient || !VAULT_ADDRESS) return;
    setHistLoading(true);
    setHistError(null);

    publicClient
      .getLogs({
        address: VAULT_ADDRESS,
        event: EPOCH_SETTLED_ABI,
        fromBlock: 0n,
        toBlock: "latest",
      })
      .then((logs) => {
        const parsed: EpochEvent[] = logs
          .filter((l) => l.args.epochId !== undefined)
          .map((l) => ({
            epochId:    l.args.epochId!,
            totalYield: l.args.totalYield ?? 0n,
            coreShare:  l.args.coreShare  ?? 0n,
            seamShare:  l.args.seamShare  ?? 0n,
            apexShare:  l.args.apexShare  ?? 0n,
            blockNumber: l.blockNumber ?? 0n,
          }))
          .sort((a, b) => Number(a.epochId) - Number(b.epochId));
        setEpochs(parsed);
      })
      .catch((err) => {
        console.error("Failed to fetch epoch history:", err);
        setHistError("History unavailable — RPC block-range limit exceeded.");
      })
      .finally(() => setHistLoading(false));
  }, [publicClient]);

  return { epochs, histLoading, histError };
}

// ── Strategy allocation hook ─────────────────────────────────────────────────
// Reads each sub-strategy slot from StrategyRouter on-chain.

type StrategyInfo = {
  addr: string;
  weight: number;
  name: string;
  active: boolean;
  deployed: bigint;
};

function useStrategyAllocations() {
  const { data: countData } = useReadContracts({
    contracts: [
      { address: STRATEGY_ROUTER_ADDRESS, abi: STRATEGY_ROUTER_ABI, functionName: "strategyCount" },
      { address: STRATEGY_ROUTER_ADDRESS, abi: STRATEGY_ROUTER_ABI, functionName: "totalAssets"   },
    ],
  });

  const count = countData?.[0]?.status === "success" ? Number(countData[0].result as bigint) : 0;
  const routerTotal = countData?.[1]?.status === "success" ? (countData[1].result as bigint) : 0n;

  // Build per-index reads
  const slotContracts = Array.from({ length: count }, (_, i) => ({
    address: STRATEGY_ROUTER_ADDRESS,
    abi: STRATEGY_ROUTER_ABI,
    functionName: "getStrategy" as const,
    args: [BigInt(i)],
  }));

  const { data: slotData } = useReadContracts({
    contracts: slotContracts,
    query: { enabled: count > 0 },
  });

  const strategies: StrategyInfo[] = (slotData ?? [])
    .filter((d) => d.status === "success")
    .map((d) => {
      const [addr, weight, name, active, deployed] = d.result as [string, number, string, boolean, bigint];
      return { addr, weight, name, active, deployed };
    });

  return { strategies, routerTotal };
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data } = useReadContracts({
    contracts: [
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "corePrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamPrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexPrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreAccumulatedYield" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamAccumulatedYield" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexAccumulatedYield" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreTargetMinBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreTargetMaxBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamTargetMinBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamTargetMaxBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "epochCount" },
      { address: VAULT_ADDRESS,           abi: VAULT_ABI,           functionName: "pendingPenalties" }, // 11
      { address: STRATEGY_ROUTER_ADDRESS, abi: STRATEGY_ROUTER_ABI, functionName: "totalAssets"      }, // 12
    ],
  });

  const r = (i: number) => data?.[i]?.status === "success" ? (data[i].result as bigint) : 0n;

  const corePrincipal = r(0), seamPrincipal = r(1), apexPrincipal = r(2);
  const coreYield = r(3), seamYield = r(4), apexYield = r(5);
  const coreMin = r(6), coreMax = r(7), seamMin = r(8), seamMax = r(9);
  const epochCount = r(10);
  const pendingPenalties = r(11);
  const strategyTotal = r(12);

  const totalPrincipal = corePrincipal + seamPrincipal + apexPrincipal;
  const totalYield = coreYield + seamYield + apexYield;
  const totalTVL = totalPrincipal + totalYield;

  // APEX buffer ratio — key risk metric
  const apexRatioPct = totalPrincipal > 0n
    ? Number((apexPrincipal * 10000n) / totalPrincipal) / 100
    : 0;

  // APEX leverage: APEX yield / APEX principal vs CORE yield / CORE principal
  // Shows how much more (or less) APEX earns per unit relative to CORE.
  const apexLeverage = (corePrincipal > 0n && apexPrincipal > 0n && coreYield > 0n)
    ? ((Number(apexYield) / Number(apexPrincipal)) / (Number(coreYield) / Number(corePrincipal))).toFixed(2)
    : "—";

  const loading = data === undefined;

  const { epochs, histLoading, histError } = useEpochHistory();
  const { strategies: routerStrategies, routerTotal } = useStrategyAllocations();
  const { apyByAddr, aaveState, camelotState, morphoState } = useSimStrategies();
  const { rates: marketRates, loading: ratesLoading } = useMarketRates();
  const { events: rebalanceEvents, loading: rebalanceLoading } = useRebalanceHistory();

  // Blended strategy APY weighted by current allocation
  const blendedBps = routerStrategies.length > 0 && Object.keys(apyByAddr).length > 0
    ? Math.round(
        routerStrategies.reduce((sum, s) => {
          const apyB = apyByAddr[s.addr.toLowerCase()] ?? null;
          return sum + (apyB !== null ? apyB * s.weight : 0);
        }, 0) / 10_000
      )
    : null;

  // Effective APY per epoch — uses current principal as denominator (approximation since
  // we don't store historical snapshots on-chain). Annualised from 7-day epoch.
  function epochAPY(epochYield: bigint): string {
    if (totalPrincipal === 0n) return "—";
    const apy = (Number(epochYield) / Number(totalPrincipal)) * (365 / 7) * 100;
    return apy.toFixed(2) + "%";
  }

  // Running total yield across all settled epochs (from events)
  const historicTotalYield = epochs.reduce((sum, e) => sum + e.totalYield, 0n);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Analytics</h1>
      <p className="text-sm text-gray-400 mb-6">Real-time protocol metrics</p>

      {/* Production Yield Reference ─────────────────────────────────────────── */}
      <div className="border border-gray-200 mb-6">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <div>
            <p className="text-sm font-bold">Production Yield Reference</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Live rates from Arbitrum One mainnet — what this protocol earns in production
            </p>
          </div>
          {!ratesLoading && marketRates && (
            <span className="text-xs text-gray-400">
              fetched {new Date(marketRates.fetchedAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        {ratesLoading ? (
          <p className="px-4 py-4 text-xs text-gray-400">Fetching live mainnet rates…</p>
        ) : marketRates ? (
          <div>
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              {/* Aave */}
              <div className="px-4 py-4">
                <p className="text-xs text-gray-400 mb-1">Aave V3 · USDC · Arbitrum</p>
                <p className="text-2xl font-bold font-mono text-purple-700">{marketRates.aave.apyPct}%</p>
                <p className="text-xs text-gray-400 mt-1">supply APY · live on-chain</p>
              </div>
              {/* Compound */}
              <div className="px-4 py-4">
                <p className="text-xs text-gray-400 mb-1">Compound V3 · USDC · Arbitrum</p>
                <p className="text-2xl font-bold font-mono text-blue-700">{marketRates.compound.apyPct}%</p>
                <p className="text-xs text-gray-400 mt-1">supply APY · live on-chain</p>
              </div>
              {/* Blended */}
              <div className="px-4 py-4 bg-gray-50">
                <p className="text-xs text-gray-400 mb-1">Blended (60% Aave · 40% Compound)</p>
                <p className="text-2xl font-bold font-mono">{marketRates.blended.apyPct}%</p>
                <p className="text-xs text-gray-400 mt-1">production strategy yield</p>
              </div>
            </div>

            {/* Realistic tranche targets based on live rates */}
            <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
              <p className="text-xs text-gray-500 mb-2 font-medium">
                Realistic APY targets at {marketRates.blended.apyPct}% blended yield · 15% APEX buffer
              </p>
              <div className="flex gap-6 text-xs font-mono">
                <span>
                  <span className="text-green-700 font-bold">CORE</span>{" "}
                  {(marketRates.suggestedTargets.coreMinBps / 100).toFixed(2)}%
                  –{(marketRates.suggestedTargets.coreMaxBps / 100).toFixed(2)}%
                  <span className="text-gray-400 ml-1">(guaranteed)</span>
                </span>
                <span>
                  <span className="text-yellow-700 font-bold">SEAM</span>{" "}
                  {(marketRates.suggestedTargets.seamMinBps / 100).toFixed(2)}%
                  –{(marketRates.suggestedTargets.seamMaxBps / 100).toFixed(2)}%
                  <span className="text-gray-400 ml-1">(guaranteed)</span>
                </span>
                <span>
                  <span className="text-red-700 font-bold">APEX</span>{" "}
                  {(
                    (marketRates.blended.apyBps
                      - marketRates.suggestedTargets.coreMaxBps * 0.425
                      - marketRates.suggestedTargets.seamMaxBps * 0.425) /
                    15
                    / 100
                  ).toFixed(1)}%+
                  <span className="text-gray-400 ml-1">(leveraged residual)</span>
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Current testnet vault targets (CORE 2.5%, SEAM 5%) exceed blended yield — will be updated via governance to match production rates.
              </p>
            </div>
          </div>
        ) : (
          <p className="px-4 py-4 text-xs text-red-500">Failed to fetch mainnet rates.</p>
        )}
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatBox label="Total TVL"       value={loading ? "—" : formatUsdc(totalTVL)}       sub="principal + yield" />
        <StatBox label="Total Principal" value={loading ? "—" : formatUsdc(totalPrincipal)} />
        <StatBox label="Accrued Yield"   value={loading ? "—" : formatUsdc(totalYield)}     sub={`Epoch #${epochCount.toString()}`} />
        <StatBox label="APEX Buffer"     value={loading ? "—" : `${apexRatioPct.toFixed(1)}%`} sub="of total principal" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {/* TVL Breakdown */}
        <div className="border border-gray-200 p-4">
          <p className="text-sm font-bold mb-4">TVL Breakdown</p>
          <TierBar label="CORE" value={corePrincipal} total={totalPrincipal} color="bg-black" />
          <TierBar label="SEAM" value={seamPrincipal} total={totalPrincipal} color="bg-gray-500" />
          <TierBar label="APEX" value={apexPrincipal} total={totalPrincipal} color="bg-gray-300" />
          <div className="border-t border-gray-100 mt-3 pt-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Total</span>
              <span className="font-mono font-bold">{formatUsdc(totalPrincipal)}</span>
            </div>
          </div>
        </div>

        {/* APY Targets */}
        <div className="border border-gray-200 p-4">
          <p className="text-sm font-bold mb-4">APY Targets</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold">CORE</span>
                <span className="text-xs text-gray-400 ml-2">Stable</span>
              </div>
              <span className="font-mono">{bpsToPercent(coreMin)} – {bpsToPercent(coreMax)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold">SEAM</span>
                <span className="text-xs text-gray-400 ml-2">Balanced</span>
              </div>
              <span className="font-mono">{bpsToPercent(seamMin)} – {bpsToPercent(seamMax)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold">APEX</span>
                <span className="text-xs text-gray-400 ml-2">Aggressive</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-gray-500">Residual</span>
                {apexLeverage !== "—" && (
                  <span className="block text-xs text-gray-400">{apexLeverage}× CORE rate</span>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 mt-4 pt-3 text-xs text-gray-400">
            Targets updated by AI agent via governance proposals.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {/* Yield Breakdown */}
        <div className="border border-gray-200 p-4">
          <p className="text-sm font-bold mb-4">Accrued Yield by Tier</p>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-gray-500">CORE</span>
              <span className="text-green-700">+{formatUsdc(coreYield)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">SEAM</span>
              <span className="text-green-700">+{formatUsdc(seamYield)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">APEX</span>
              <span className="text-green-700">+{formatUsdc(apexYield)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2">
              <span className="text-gray-400">Total (current epoch)</span>
              <span className="text-green-700 font-bold">+{formatUsdc(totalYield)}</span>
            </div>
            {epochs.length > 0 && (
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <span className="text-gray-400">All-time settled</span>
                <span className="text-green-700">+{formatUsdc(historicTotalYield)}</span>
              </div>
            )}
          </div>
          {pendingPenalties > 0n && (
            <div className="mt-3 text-xs text-blue-600 bg-blue-50 p-2">
              {formatUsdc(pendingPenalties)} early-withdraw penalties pending redistribution
            </div>
          )}
        </div>

        {/* Strategy */}
        <div className="border border-gray-200 p-4">
          <p className="text-sm font-bold mb-4">Strategy</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Deployed</span>
              <span className="font-mono">{formatUsdc(strategyTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Epochs Settled</span>
              <span className="font-mono">{epochCount.toString()}</span>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-400 border-t border-gray-100 pt-3">
            AaveV3 + FixedYield strategies active on Arbitrum Sepolia.
          </div>
        </div>
      </div>

      {/* APEX buffer gauge */}
      <div className="border border-gray-200 p-4 mb-8">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-bold">APEX Buffer Ratio</p>
          <span className={`text-xs px-2 py-1 font-bold ${
            apexRatioPct >= 20 ? "bg-green-100 text-green-700" :
            apexRatioPct >= 10 ? "bg-yellow-100 text-yellow-700" :
            apexRatioPct >= 5  ? "bg-orange-100 text-orange-700" :
                                  "bg-red-100 text-red-700"
          }`}>
            {apexRatioPct >= 20 ? "HEALTHY" : apexRatioPct >= 10 ? "CAUTION" : apexRatioPct >= 5 ? "WARNING" : totalPrincipal === 0n ? "—" : "CRITICAL"}
          </span>
        </div>
        <div className="h-3 bg-gray-100 w-full mb-2">
          <div
            className={`h-3 transition-all ${
              apexRatioPct >= 20 ? "bg-green-500" :
              apexRatioPct >= 10 ? "bg-yellow-400" :
              apexRatioPct >= 5  ? "bg-orange-400" : "bg-red-500"
            }`}
            style={{ width: `${Math.min(apexRatioPct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>0%</span>
          <span>Current: <span className="font-mono font-bold text-black">{apexRatioPct.toFixed(2)}%</span></span>
          <span>100%</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          APEX principal acts as a first-loss buffer for CORE and SEAM depositors. Below 10% triggers caution.
        </p>
      </div>

      {/* Live Strategy Farming ─────────────────────────────────────────────── */}
      <div className="border border-gray-200 mb-8">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-bold">Live Strategy Farming</p>
          <div className="text-xs text-gray-400 font-mono flex items-center gap-3">
            {blendedBps !== null && (
              <span className="text-green-700 font-bold">
                Blended yield: {(blendedBps / 100).toFixed(2)}%
              </span>
            )}
            <span>Total: {formatUsdc(routerTotal)}</span>
          </div>
        </div>

        {routerStrategies.length === 0 ? (
          <p className="px-4 py-6 text-xs text-gray-400">Loading strategy data…</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {routerStrategies.map((s) => {
              const meta      = getMeta(s.name);
              const stratApy  = apyByAddr[s.addr.toLowerCase()] ?? null;
              const actualPct = routerTotal > 0n ? Number((s.deployed * 10000n) / routerTotal) / 100 : 0;
              const targetPct = s.weight / 100;
              const drift     = Math.abs(actualPct - targetPct).toFixed(1);

              return (
                <div key={s.addr} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${meta.color} mt-0.5 flex-shrink-0`} />
                      <div>
                        <span className="text-sm font-bold">{meta.protocol}</span>
                        <span className="text-xs text-gray-400 ml-2">· {meta.asset} · Arbitrum Sepolia</span>
                        {!s.active && <span className="text-xs text-gray-400 border border-gray-200 px-1 ml-2">inactive</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      {stratApy !== null ? (
                        <span className="text-sm font-bold font-mono text-green-700">
                          {(stratApy / 100).toFixed(2)}% APY
                          <span className="text-xs text-green-500 ml-1">live</span>
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-3 ml-4">{meta.description}</p>
                  <div className="ml-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span className="font-mono">{formatUsdc(s.deployed)} deployed</span>
                      <span>
                        <span className={`font-mono ${Math.abs(actualPct - targetPct) > 5 ? "text-orange-600" : "text-gray-500"}`}>
                          {actualPct.toFixed(1)}% actual
                        </span>
                        <span className="text-gray-300 mx-1">/</span>
                        <span className="font-mono">{targetPct.toFixed(0)}% target</span>
                        {parseFloat(drift) > 1 && <span className="text-orange-500 ml-1">(±{drift}%)</span>}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 w-full relative">
                      <div className={`h-2 transition-all ${meta.color}`} style={{ width: `${Math.min(actualPct, 100)}%` }} />
                      <div className="absolute top-0 h-2 w-0.5 bg-gray-500" style={{ left: `${Math.min(targetPct, 100)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
          AI agent monitors allocation drift and triggers rebalancing when actual weight diverges from target by more than the configured threshold.
        </div>
      </div>

      {/* Protocol Market Mechanics ───────────────────────────────────────────── */}
      <div className="border border-gray-200 mb-8">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-bold">Protocol Market Mechanics</p>
          <p className="text-xs text-gray-400 mt-0.5">
            APY derived from real DeFi protocol models — not fixed rates
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">

          {/* Aave V3 — utilization curve */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              <span className="text-xs font-bold text-purple-700">Aave V3 Interest Rate Model</span>
            </div>
            {aaveState ? (
              <>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Pool Utilization</span>
                    <span className="font-mono font-bold">{(Number(aaveState.utilization) / 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 w-full relative">
                    <div className="h-3 bg-purple-500 transition-all" style={{ width: `${Number(aaveState.utilization) / 100}%` }} />
                    {/* Kink at 80% */}
                    <div className="absolute top-0 h-3 w-0.5 bg-gray-400" style={{ left: "80%" }} title="Optimal (kink) at 80%" />
                  </div>
                  <div className="flex justify-between text-xs text-gray-300 mt-0.5">
                    <span>0%</span>
                    <span className="text-gray-400">kink 80%</span>
                    <span>100%</span>
                  </div>
                </div>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-400">slope1 (below kink)</span>
                    <span>7.00%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">slope2 (above kink)</span>
                    <span>75.00%</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-1 mt-1">
                    <span className="text-gray-600 font-bold">Supply APY</span>
                    <span className="text-purple-700 font-bold">{(Number(aaveState.supplyApy) / 100).toFixed(2)}%</span>
                  </div>
                </div>
              </>
            ) : <p className="text-xs text-gray-400">Loading…</p>}
          </div>

          {/* Camelot V3 — LP fee model */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-xs font-bold text-orange-600">Camelot V3 LP Fee Model</span>
            </div>
            {camelotState ? (
              <>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Daily Volume / TVL</span>
                    <span className="font-mono font-bold">{(Number(camelotState.volumeRatio) / 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 w-full">
                    <div className="h-3 bg-orange-400 transition-all" style={{ width: `${Math.min(Number(camelotState.volumeRatio) / 200, 100)}%` }} />
                  </div>
                  <p className="text-xs text-gray-300 mt-0.5">bar scaled to 200% TVL max</p>
                </div>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-400">fee tier</span>
                    <span>{(Number(camelotState.feeTier) / 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">daily fee rate</span>
                    <span>{(Number(camelotState.dailyFeeRate) / 100).toFixed(3)}% / day</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-1 mt-1">
                    <span className="text-gray-600 font-bold">LP APY</span>
                    <span className="text-orange-600 font-bold">{(Number(camelotState.lpApy) / 100).toFixed(2)}%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  APY = vol/TVL × feeTier × 365 — standard Uniswap V3 analytics formula
                </p>
              </>
            ) : <p className="text-xs text-gray-400">Loading…</p>}
          </div>

          {/* Morpho — P2P rate model */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="text-xs font-bold text-blue-700">Morpho Blue P2P Model</span>
            </div>
            {morphoState ? (
              <>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Matching Ratio (P2P)</span>
                    <span className="font-mono font-bold">{(Number(morphoState.matchingRatio) / 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 w-full">
                    <div className="h-3 bg-blue-500 transition-all" style={{ width: `${Number(morphoState.matchingRatio) / 100}%` }} />
                  </div>
                </div>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Aave supply rate</span>
                    <span>{(Number(morphoState.supplyApy) / 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Aave borrow rate</span>
                    <span>{(Number(morphoState.borrowApy) / 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">P2P rate (midpoint)</span>
                    <span>{(Number(morphoState.p2pRate) / 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-1 mt-1">
                    <span className="text-gray-600 font-bold">Blended APY</span>
                    <span className="text-blue-700 font-bold">{(Number(morphoState.blendedApy) / 100).toFixed(2)}%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Blended = matched% × P2P + unmatched% × supply
                </p>
              </>
            ) : <p className="text-xs text-gray-400">Loading…</p>}
          </div>
        </div>
      </div>

      {/* Rebalancing History ─────────────────────────────────────────────────── */}
      <div className="border border-gray-200 mb-8">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <div>
            <p className="text-sm font-bold">Rebalancing History</p>
            <p className="text-xs text-gray-400 mt-0.5">On-chain rebalance events triggered by the AI agent</p>
          </div>
          {rebalanceLoading && <span className="text-xs text-gray-400">Loading…</span>}
          {!rebalanceLoading && rebalanceEvents.length === 0 && (
            <span className="text-xs text-gray-400">No rebalances yet</span>
          )}
        </div>

        {rebalanceEvents.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400">
                <th className="text-left px-4 py-2">#</th>
                <th className="text-left px-4 py-2">Timestamp</th>
                <th className="text-left px-4 py-2">Initiator</th>
                <th className="text-right px-4 py-2">Total Assets</th>
                <th className="text-right px-4 py-2">Block</th>
              </tr>
            </thead>
            <tbody>
              {rebalanceEvents.map((e, i) => (
                <tr key={e.blockNumber.toString()} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 font-mono">#{rebalanceEvents.length - i}</td>
                  <td className="px-4 py-3 font-mono">{formatTs(e.timestamp)}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-gray-600">{shortAddr(e.initiator)}</span>
                    {e.initiator.toLowerCase() === "0x22a90658cdcdbdf89841ca2d37efc489de9bb71a" && (
                      <span className="ml-2 text-blue-600 border border-blue-200 px-1">AI Agent</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-green-700">{formatUsdc(e.totalAssets)}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-400">{e.blockNumber.toString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !rebalanceLoading && (
            <div className="px-4 py-6 text-xs text-gray-400">
              <p>No rebalancing events found. The AI agent will rebalance when:</p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Strategy weight drift exceeds threshold</li>
                <li>Governance proposal changes target weights</li>
                <li>Epoch settles with significant yield discrepancy</li>
              </ul>
            </div>
          )
        )}
      </div>

      {/* Epoch History — populated from EpochSettled on-chain events */}
      <div className="border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <p className="text-sm font-bold">Epoch History</p>
          {histLoading && <span className="text-xs text-gray-400">Loading...</span>}
          {!histLoading && !histError && epochs.length === 0 && (
            <span className="text-xs text-gray-400">No epochs settled yet</span>
          )}
          {histError && <span className="text-xs text-red-500">{histError}</span>}
        </div>
        {epochs.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400">
                <th className="text-left px-4 py-2">Epoch</th>
                <th className="text-right px-4 py-2">Total Yield</th>
                <th className="text-right px-4 py-2">CORE</th>
                <th className="text-right px-4 py-2">SEAM</th>
                <th className="text-right px-4 py-2">APEX</th>
                <th className="text-right px-4 py-2">Implied APY</th>
              </tr>
            </thead>
            <tbody>
              {[...epochs].reverse().map((e) => (
                <tr key={e.epochId.toString()} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">#{e.epochId.toString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-green-700 text-xs">+{formatUsdc(e.totalYield)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatUsdc(e.coreShare)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatUsdc(e.seamShare)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatUsdc(e.apexShare)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-gray-600">{epochAPY(e.totalYield)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-xs text-gray-400 bg-gray-50">
                <td className="px-4 py-2 font-bold text-gray-600">Total</td>
                <td className="px-4 py-2 text-right font-mono font-bold text-green-700">+{formatUsdc(historicTotalYield)}</td>
                <td colSpan={4} className="px-4 py-2 text-right text-gray-400">
                  Implied APY uses current principal as denominator (approximation)
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
