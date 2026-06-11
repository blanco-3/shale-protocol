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
import { formatUsdc, formatUsdcCompact, bpsToPercent } from "../../lib/utils";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { StatTile } from "../../components/ui/StatTile";
import { StrataBar } from "../../components/ui/StrataBar";

// ── Market rates hook ─────────────────────────────────────────────────────────

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
    fetch("/api/market-rates").then((r) => r.json()).then((d) => { if (!d.error) setRates(d); }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  return { rates, loading };
}

// ── Strategy metadata ─────────────────────────────────────────────────────────

type StrategyMeta = { protocol: string; asset: string; accentColor: string; description: string; model: string };

const STRATEGY_META: StrategyMeta[] = [
  { protocol: "Aave V3",      asset: "USDC/USDT", accentColor: "var(--seam-600)",  description: "Variable-rate USDC supply. APY derived from pool utilization via two-slope interest rate model.", model: "aave" },
  { protocol: "Camelot V3 LP",asset: "USDC/USDT", accentColor: "var(--apex-500)",  description: "Concentrated liquidity LP fees. APY = daily trading volume / TVL × fee tier × 365.", model: "camelot" },
  { protocol: "Morpho Blue",  asset: "USDC",       accentColor: "var(--accent-500)",description: "P2P lending market. Matched suppliers earn above Aave supply rate, blended with unmatched idle.", model: "morpho" },
];

function getMeta(name: string): StrategyMeta {
  if (name.toLowerCase().includes("aave"))    return STRATEGY_META[0];
  if (name.toLowerCase().includes("camelot")) return STRATEGY_META[1];
  if (name.toLowerCase().includes("morpho"))  return STRATEGY_META[2];
  return { protocol: name, asset: "USDC", accentColor: "var(--text-muted)", description: "", model: "" };
}

// ── Types ─────────────────────────────────────────────────────────────────────

type RebalanceEvent = { timestamp: bigint; initiator: `0x${string}`; totalAssets: bigint; blockNumber: bigint };
type EpochEvent = { epochId: bigint; totalYield: bigint; coreShare: bigint; seamShare: bigint; apexShare: bigint; blockNumber: bigint };
type AaveState    = { utilization: bigint; supplyApy: bigint; principal: bigint; pending: bigint };
type CamelotState = { volumeRatio: bigint; feeTier: bigint; dailyFeeRate: bigint; lpApy: bigint; principal: bigint; pending: bigint };
type MorphoState  = { supplyApy: bigint; borrowApy: bigint; matchingRatio: bigint; p2pRate: bigint; blendedApy: bigint; principal: bigint; pending: bigint };
type StrategyInfo = { addr: string; weight: number; name: string; active: boolean; deployed: bigint };

// ── Hooks ─────────────────────────────────────────────────────────────────────

const REBALANCED_ABI = parseAbiItem("event Rebalanced(uint256 timestamp, address indexed initiator, uint256 totalAssets)");
const EPOCH_SETTLED_ABI = parseAbiItem("event EpochSettled(uint256 indexed epochId, uint256 totalYield, uint256 coreShare, uint256 seamShare, uint256 apexShare)");

function useRebalanceHistory() {
  const [events, setEvents] = useState<RebalanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const publicClient = usePublicClient();
  useEffect(() => {
    if (!publicClient || !STRATEGY_ROUTER_ADDRESS) return;
    setLoading(true);
    publicClient.getLogs({ address: STRATEGY_ROUTER_ADDRESS, event: REBALANCED_ABI, fromBlock: 0n, toBlock: "latest" })
      .then((logs) => setEvents(logs.map((l) => ({ timestamp: l.args.timestamp ?? 0n, initiator: (l.args.initiator ?? "0x0") as `0x${string}`, totalAssets: l.args.totalAssets ?? 0n, blockNumber: l.blockNumber ?? 0n })).sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber))))
      .catch(() => {}).finally(() => setLoading(false));
  }, [publicClient]);
  return { events, loading };
}

function useEpochHistory() {
  const [epochs, setEpochs] = useState<EpochEvent[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histError, setHistError] = useState<string | null>(null);
  const publicClient = usePublicClient();
  useEffect(() => {
    if (!publicClient || !VAULT_ADDRESS) return;
    setHistLoading(true); setHistError(null);
    publicClient.getLogs({ address: VAULT_ADDRESS, event: EPOCH_SETTLED_ABI, fromBlock: 0n, toBlock: "latest" })
      .then((logs) => setEpochs(logs.filter((l) => l.args.epochId !== undefined).map((l) => ({ epochId: l.args.epochId!, totalYield: l.args.totalYield ?? 0n, coreShare: l.args.coreShare ?? 0n, seamShare: l.args.seamShare ?? 0n, apexShare: l.args.apexShare ?? 0n, blockNumber: l.blockNumber ?? 0n })).sort((a, b) => Number(a.epochId) - Number(b.epochId))))
      .catch((err) => { console.error(err); setHistError("History unavailable — RPC block-range limit exceeded."); })
      .finally(() => setHistLoading(false));
  }, [publicClient]);
  return { epochs, histLoading, histError };
}

function useSimStrategies() {
  const { data } = useReadContracts({
    contracts: [
      { address: AAVE_STRATEGY_ADDRESS,    abi: SIM_AAVE_ABI,    functionName: "apyBps" },
      { address: CAMELOT_STRATEGY_ADDRESS, abi: SIM_CAMELOT_ABI, functionName: "apyBps" },
      { address: MORPHO_STRATEGY_ADDRESS,  abi: SIM_MORPHO_ABI,  functionName: "apyBps" },
      { address: AAVE_STRATEGY_ADDRESS,    abi: SIM_AAVE_ABI,    functionName: "marketState" },
      { address: CAMELOT_STRATEGY_ADDRESS, abi: SIM_CAMELOT_ABI, functionName: "marketState" },
      { address: MORPHO_STRATEGY_ADDRESS,  abi: SIM_MORPHO_ABI,  functionName: "marketState" },
    ],
  });
  const apyByAddr: Record<string, number> = {};
  if (data?.[0]?.status === "success") apyByAddr[AAVE_STRATEGY_ADDRESS.toLowerCase()]    = Number(data[0].result as bigint);
  if (data?.[1]?.status === "success") apyByAddr[CAMELOT_STRATEGY_ADDRESS.toLowerCase()] = Number(data[1].result as bigint);
  if (data?.[2]?.status === "success") apyByAddr[MORPHO_STRATEGY_ADDRESS.toLowerCase()]  = Number(data[2].result as bigint);
  const aaveState    = data?.[3]?.status === "success" ? (data[3].result as unknown as AaveState) : null;
  const camelotState = data?.[4]?.status === "success" ? (data[4].result as unknown as CamelotState) : null;
  const morphoState  = data?.[5]?.status === "success" ? (data[5].result as unknown as MorphoState)  : null;
  return { apyByAddr, aaveState, camelotState, morphoState };
}

function useStrategyAllocations() {
  const { data: countData } = useReadContracts({
    contracts: [
      { address: STRATEGY_ROUTER_ADDRESS, abi: STRATEGY_ROUTER_ABI, functionName: "strategyCount" },
      { address: STRATEGY_ROUTER_ADDRESS, abi: STRATEGY_ROUTER_ABI, functionName: "totalAssets"   },
    ],
  });
  const count = countData?.[0]?.status === "success" ? Number(countData[0].result as bigint) : 0;
  const routerTotal = countData?.[1]?.status === "success" ? (countData[1].result as bigint) : 0n;
  const slotContracts = Array.from({ length: count }, (_, i) => ({ address: STRATEGY_ROUTER_ADDRESS, abi: STRATEGY_ROUTER_ABI, functionName: "getStrategy" as const, args: [BigInt(i)] }));
  const { data: slotData } = useReadContracts({ contracts: slotContracts, query: { enabled: count > 0 } });
  const strategies: StrategyInfo[] = (slotData ?? []).filter((d) => d.status === "success").map((d) => { const [addr, weight, name, active, deployed] = d.result as [string, number, string, boolean, bigint]; return { addr, weight, name, active, deployed }; });
  return { strategies, routerTotal };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTs(ts: bigint): string {
  if (ts === 0n) return "—";
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + "  " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function shortAddr(addr: string): string { return addr.slice(0, 6) + "…" + addr.slice(-4); }

const eyebrow: React.CSSProperties = {
  font: "var(--fw-semibold) var(--text-2xs)/1 var(--font-sans)",
  letterSpacing: "var(--ls-wider)", textTransform: "uppercase", color: "var(--text-muted)",
};

const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "10px 22px",
  font: "var(--fw-semibold) 10px/1 var(--font-sans)",
  letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-faint)",
  borderBottom: "1px solid var(--border-soft)",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data } = useReadContracts({
    contracts: [
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "corePrincipal" },           // 0
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamPrincipal" },           // 1
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexPrincipal" },           // 2
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreAccumulatedYield" },    // 3
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamAccumulatedYield" },    // 4
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexAccumulatedYield" },    // 5
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreTargetMinBps" },        // 6
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreTargetMaxBps" },        // 7
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamTargetMinBps" },        // 8
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamTargetMaxBps" },        // 9
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "epochCount" },              // 10
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "pendingPenalties" },        // 11
      { address: STRATEGY_ROUTER_ADDRESS, abi: STRATEGY_ROUTER_ABI, functionName: "totalAssets" }, // 12
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
  const apexRatioPct = totalPrincipal > 0n ? Number((apexPrincipal * 10000n) / totalPrincipal) / 100 : 0;
  const apexLeverage = (corePrincipal > 0n && apexPrincipal > 0n && coreYield > 0n)
    ? ((Number(apexYield) / Number(apexPrincipal)) / (Number(coreYield) / Number(corePrincipal))).toFixed(2)
    : "—";
  const loading = data === undefined;

  const { epochs, histLoading, histError } = useEpochHistory();
  const { strategies: routerStrategies, routerTotal } = useStrategyAllocations();
  const { apyByAddr, aaveState, camelotState, morphoState } = useSimStrategies();
  const { rates: marketRates, loading: ratesLoading } = useMarketRates();
  const { events: rebalanceEvents, loading: rebalanceLoading } = useRebalanceHistory();

  const blendedBps = routerStrategies.length > 0 && Object.keys(apyByAddr).length > 0
    ? Math.round(routerStrategies.reduce((sum, s) => { const apyB = apyByAddr[s.addr.toLowerCase()] ?? null; return sum + (apyB !== null ? apyB * s.weight : 0); }, 0) / 10_000)
    : null;

  function epochAPY(epochYield: bigint): string {
    if (totalPrincipal === 0n) return "—";
    return ((Number(epochYield) / Number(totalPrincipal)) * (365 / 7) * 100).toFixed(2) + "%";
  }

  const historicTotalYield = epochs.reduce((sum, e) => sum + e.totalYield, 0n);

  const tierPct = (v: bigint) => totalPrincipal > 0n ? Number((v * 10000n) / totalPrincipal) / 100 : 0;

  const bufferTone = apexRatioPct >= 20 ? "positive" : apexRatioPct >= 10 ? "warning" : "danger";
  const bufferLabel = apexRatioPct >= 20 ? "HEALTHY" : apexRatioPct >= 10 ? "CAUTION" : apexRatioPct >= 5 ? "WARNING" : totalPrincipal === 0n ? "—" : "CRITICAL";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "40px 0 60px" }}>
      <div>
        <h1 style={{ font: "var(--fw-bold) 34px/1 var(--font-serif)", color: "var(--text-strong)", letterSpacing: "-0.02em", margin: "0 0 8px" }}>Analytics</h1>
        <p style={{ font: "400 14px/1 var(--font-sans)", color: "var(--text-muted)", margin: 0 }}>Real-time protocol metrics</p>
      </div>

      {/* Production Yield Reference */}
      <Card pad="none">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <h3 style={{ font: "var(--fw-semibold) 16px/1 var(--font-serif)", color: "var(--text-strong)", margin: "0 0 4px" }}>Production Yield Reference</h3>
            <p style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)", margin: 0 }}>Live rates from Arbitrum One mainnet — what this protocol earns in production</p>
          </div>
          {!ratesLoading && marketRates && (
            <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>fetched {new Date(marketRates.fetchedAt).toLocaleTimeString()}</span>
          )}
        </div>
        {ratesLoading ? (
          <p style={{ padding: "16px 22px", font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>Fetching live mainnet rates…</p>
        ) : marketRates ? (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid var(--border-soft)" }}>
              {[
                { label: "Aave V3 · USDC · Arbitrum", apy: marketRates.aave.apyPct, color: "var(--seam-600)", sub: "supply APY · live on-chain" },
                { label: "Compound V3 · USDC · Arbitrum", apy: marketRates.compound.apyPct, color: "var(--accent-500)", sub: "supply APY · live on-chain" },
                { label: "Blended (60% Aave · 40% Compound)", apy: marketRates.blended.apyPct, color: "var(--text-strong)", sub: "production strategy yield" },
              ].map((col, i) => (
                <div key={col.label} style={{ padding: "16px 22px", borderRight: i < 2 ? "1px solid var(--border-soft)" : "none", background: i === 2 ? "var(--surface-sunken)" : undefined }}>
                  <div style={{ ...eyebrow, marginBottom: "8px" }}>{col.label}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "24px", color: col.color, fontVariantNumeric: "tabular-nums" }}>{col.apy}%</div>
                  <div style={{ font: "400 11px/1 var(--font-sans)", color: "var(--text-faint)", marginTop: "5px" }}>{col.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: "14px 22px", background: "var(--surface-sunken)", borderTop: "1px solid var(--border-soft)" }}>
              <p style={{ font: "var(--fw-medium) 12px/1 var(--font-sans)", color: "var(--text-muted)", margin: "0 0 8px" }}>Realistic APY targets at {marketRates.blended.apyPct}% blended yield · 15% APEX buffer</p>
              <div style={{ display: "flex", gap: "24px", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                <span><span style={{ color: "var(--core-600)", fontWeight: 700 }}>CORE</span> {(marketRates.suggestedTargets.coreMinBps / 100).toFixed(2)}%–{(marketRates.suggestedTargets.coreMaxBps / 100).toFixed(2)}% <span style={{ color: "var(--text-faint)" }}>(guaranteed)</span></span>
                <span><span style={{ color: "var(--seam-600)", fontWeight: 700 }}>SEAM</span> {(marketRates.suggestedTargets.seamMinBps / 100).toFixed(2)}%–{(marketRates.suggestedTargets.seamMaxBps / 100).toFixed(2)}% <span style={{ color: "var(--text-faint)" }}>(guaranteed)</span></span>
                <span><span style={{ color: "var(--apex-600)", fontWeight: 700 }}>APEX</span> {((marketRates.blended.apyBps - marketRates.suggestedTargets.coreMaxBps * 0.425 - marketRates.suggestedTargets.seamMaxBps * 0.425) / 15 / 100).toFixed(1)}%+ <span style={{ color: "var(--text-faint)" }}>(leveraged residual)</span></span>
              </div>
            </div>
          </div>
        ) : (
          <p style={{ padding: "16px 22px", font: "400 12px/1 var(--font-sans)", color: "var(--danger)" }}>Failed to fetch mainnet rates.</p>
        )}
      </Card>

      {/* Top stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        <Card pad="md"><StatTile label="Total TVL"       value={loading ? "—" : formatUsdcCompact(totalTVL)}               sub="principal + yield" /></Card>
        <Card pad="md"><StatTile label="Total Principal" value={loading ? "—" : formatUsdcCompact(totalPrincipal)} /></Card>
        <Card pad="md"><StatTile label="Accrued Yield"   value={loading ? "—" : formatUsdcCompact(totalYield)}             sub={`Epoch #${epochCount.toString()}`} /></Card>
        <Card pad="md"><StatTile label="APEX Buffer"     value={loading ? "—" : `${apexRatioPct.toFixed(1)}%`}      sub="of total principal" /></Card>
      </div>

      {/* TVL Breakdown + APY Targets */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Card pad="lg">
          <h3 style={{ font: "var(--fw-semibold) 16px/1 var(--font-serif)", color: "var(--text-strong)", margin: "0 0 18px" }}>TVL Breakdown</h3>
          {([
            { label: "CORE", value: corePrincipal, tone: "core" as const },
            { label: "SEAM", value: seamPrincipal, tone: "seam" as const },
            { label: "APEX", value: apexPrincipal, tone: "apex" as const },
          ] as const).map((row) => {
            const p = tierPct(row.value);
            return (
              <div key={row.label} style={{ marginBottom: "14px" }}>
                <StrataBar label={row.label} valueLabel={`${formatUsdc(row.value)} (${p.toFixed(1)}%)`} value={p} tone={row.tone} height={10} />
              </div>
            );
          })}
          <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: "12px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>Total</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "13px", fontVariantNumeric: "tabular-nums" }}>{formatUsdc(totalPrincipal)}</span>
          </div>
        </Card>

        <Card pad="lg">
          <h3 style={{ font: "var(--fw-semibold) 16px/1 var(--font-serif)", color: "var(--text-strong)", margin: "0 0 18px" }}>APY Targets</h3>
          {[
            { name: "CORE", sub: "Stable",     min: coreMin, max: coreMax, tone: "core" as const },
            { name: "SEAM", sub: "Balanced",   min: seamMin, max: seamMax, tone: "seam" as const },
          ].map((row) => (
            <div key={row.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Badge tone={row.tone}>{row.name}</Badge>
                <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>{row.sub}</span>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{bpsToPercent(row.min)} – {bpsToPercent(row.max)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Badge tone="apex">APEX</Badge>
              <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>Aggressive</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-faint)" }}>Residual</span>
              {apexLeverage !== "—" && (
                <div style={{ font: "400 11px/1 var(--font-sans)", color: "var(--text-faint)", marginTop: "3px" }}>{apexLeverage}× CORE rate</div>
              )}
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: "12px" }}>
            <p style={{ font: "400 11px/1.4 var(--font-sans)", color: "var(--text-faint)", margin: 0 }}>Targets updated by AI agent via governance proposals.</p>
          </div>
        </Card>
      </div>

      {/* Yield + Strategy */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Card pad="lg">
          <h3 style={{ font: "var(--fw-semibold) 16px/1 var(--font-serif)", color: "var(--text-strong)", margin: "0 0 18px" }}>Accrued Yield by Tier</h3>
          {([
            { label: "CORE", v: coreYield },
            { label: "SEAM", v: seamYield },
            { label: "APEX", v: apexYield },
          ] as const).map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ font: "400 13px/1 var(--font-sans)", color: "var(--text-muted)" }}>{row.label}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--positive)", fontVariantNumeric: "tabular-nums" }}>+{formatUsdc(row.v)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-soft)", paddingTop: "10px", marginTop: "4px" }}>
            <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>Total (current epoch)</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 700, color: "var(--positive)", fontVariantNumeric: "tabular-nums" }}>+{formatUsdc(totalYield)}</span>
          </div>
          {epochs.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-soft)", paddingTop: "10px", marginTop: "6px" }}>
              <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>All-time settled</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--positive)", fontVariantNumeric: "tabular-nums" }}>+{formatUsdc(historicTotalYield)}</span>
            </div>
          )}
          {pendingPenalties > 0n && (
            <div style={{ marginTop: "12px", padding: "8px 12px", background: "var(--surface-sunken)", borderRadius: "var(--r-md)", font: "400 12px/1 var(--font-sans)", color: "var(--accent-600)" }}>
              {formatUsdc(pendingPenalties)} early-withdraw penalties pending redistribution
            </div>
          )}
        </Card>

        <Card pad="lg">
          <h3 style={{ font: "var(--fw-semibold) 16px/1 var(--font-serif)", color: "var(--text-strong)", margin: "0 0 18px" }}>Strategy Overview</h3>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ font: "400 13px/1 var(--font-sans)", color: "var(--text-muted)" }}>Total Deployed</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontVariantNumeric: "tabular-nums" }}>{formatUsdc(strategyTotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ font: "400 13px/1 var(--font-sans)", color: "var(--text-muted)" }}>Epochs Settled</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>{epochCount.toString()}</span>
          </div>
          <div style={{ borderTop: "1px solid var(--border-soft)", marginTop: "16px", paddingTop: "12px" }}>
            <p style={{ font: "400 11px/1.4 var(--font-sans)", color: "var(--text-faint)", margin: 0 }}>SimAave + SimCamelot + SimMorpho strategies active on Arbitrum Sepolia.</p>
          </div>
        </Card>
      </div>

      {/* APEX Buffer gauge */}
      <Card pad="lg">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h3 style={{ font: "var(--fw-semibold) 16px/1 var(--font-serif)", color: "var(--text-strong)", margin: 0 }}>APEX Buffer Ratio</h3>
          <Badge tone={bufferTone}>{bufferLabel}</Badge>
        </div>
        <StrataBar value={Math.min(apexRatioPct, 100)} tone={bufferTone} height={12} valueLabel={`${apexRatioPct.toFixed(2)}%`} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
          <span style={{ font: "400 11px/1 var(--font-mono)", color: "var(--text-faint)" }}>0%</span>
          <span style={{ font: "400 11px/1 var(--font-mono)", color: "var(--text-faint)" }}>100%</span>
        </div>
        <p style={{ font: "400 12px/1.4 var(--font-sans)", color: "var(--text-faint)", marginTop: "10px" }}>
          APEX principal acts as a first-loss buffer for CORE and SEAM depositors. Below 10% triggers caution.
        </p>
      </Card>

      {/* Live Strategy Farming */}
      <Card pad="none">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <h3 style={{ font: "var(--fw-semibold) 16px/1 var(--font-serif)", color: "var(--text-strong)", margin: "0 0 2px" }}>Live Strategy Farming</h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
            {blendedBps !== null && <span style={{ color: "var(--positive)", fontWeight: 700 }}>Blended: {(blendedBps / 100).toFixed(2)}%</span>}
            <span style={{ color: "var(--text-faint)" }}>Total: {formatUsdc(routerTotal)}</span>
          </div>
        </div>
        {routerStrategies.length === 0 ? (
          <p style={{ padding: "24px 22px", font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>Loading strategy data…</p>
        ) : (
          <div>
            {routerStrategies.map((s) => {
              const meta = getMeta(s.name);
              const stratApy = apyByAddr[s.addr.toLowerCase()] ?? null;
              const actualPct = routerTotal > 0n ? Number((s.deployed * 10000n) / routerTotal) / 100 : 0;
              const targetPct = s.weight / 100;
              const drift = Math.abs(actualPct - targetPct).toFixed(1);
              return (
                <div key={s.addr} style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-soft)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "var(--r-pill)", background: meta.accentColor, display: "inline-block", flexShrink: 0 }} />
                      <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: "14px", color: "var(--text-strong)" }}>{meta.protocol}</span>
                      <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>· {meta.asset} · Arbitrum Sepolia</span>
                      {!s.active && <Badge tone="neutral">inactive</Badge>}
                    </div>
                    <div>
                      {stratApy !== null ? (
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "14px", color: "var(--positive)", fontVariantNumeric: "tabular-nums" }}>
                          {(stratApy / 100).toFixed(2)}% <span style={{ fontSize: "11px", color: "var(--positive)", opacity: 0.7 }}>live</span>
                        </span>
                      ) : <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>—</span>}
                    </div>
                  </div>
                  <p style={{ font: "400 12px/1.4 var(--font-sans)", color: "var(--text-faint)", margin: "0 0 10px 16px" }}>{meta.description}</p>
                  <div style={{ paddingLeft: "16px" }}>
                    <StrataBar
                      label={`${formatUsdc(s.deployed)} deployed`}
                      valueLabel={`${actualPct.toFixed(1)}% actual / ${targetPct.toFixed(0)}% target${parseFloat(drift) > 1 ? ` (±${drift}%)` : ""}`}
                      value={Math.min(actualPct, 100)}
                      target={Math.min(targetPct, 100)}
                      tone={parseFloat(drift) > 5 ? "warning" : "core"}
                      height={8}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ padding: "12px 22px", background: "var(--surface-sunken)", borderTop: "1px solid var(--border-soft)" }}>
          <p style={{ font: "400 11px/1.4 var(--font-sans)", color: "var(--text-faint)", margin: 0 }}>
            AI agent monitors allocation drift and triggers rebalancing when actual weight diverges from target by more than the configured threshold.
          </p>
        </div>
      </Card>

      {/* Protocol Market Mechanics */}
      <Card pad="none">
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ font: "var(--fw-semibold) 16px/1 var(--font-serif)", color: "var(--text-strong)", margin: "0 0 2px" }}>Protocol Market Mechanics</h3>
          <p style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)", margin: 0 }}>APY derived from real DeFi protocol models — not fixed rates</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
          {/* Aave */}
          <div style={{ padding: "18px 22px", borderRight: "1px solid var(--border-soft)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "14px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "var(--r-pill)", background: "var(--seam-600)", display: "inline-block" }} />
              <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: "12px", color: "var(--seam-700)" }}>Aave V3 Interest Rate Model</span>
            </div>
            {aaveState ? (
              <>
                <StrataBar label="Pool Utilization" valueLabel={`${(Number(aaveState.utilization) / 100).toFixed(1)}%`} value={Number(aaveState.utilization) / 100} target={80} height={10} tone="seam" style={{ marginBottom: "12px" }} />
                <div style={{ display: "flex", justifyContent: "space-between", font: "400 11px/1 var(--font-mono)", color: "var(--text-faint)", marginBottom: "5px" }}><span>slope1 (below kink)</span><span>7.00%</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", font: "400 11px/1 var(--font-mono)", color: "var(--text-faint)", marginBottom: "8px" }}><span>slope2 (above kink)</span><span>75.00%</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-soft)", paddingTop: "8px", fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 700 }}>
                  <span style={{ color: "var(--text-body)" }}>Supply APY</span>
                  <span style={{ color: "var(--seam-600)", fontVariantNumeric: "tabular-nums" }}>{(Number(aaveState.supplyApy) / 100).toFixed(2)}%</span>
                </div>
              </>
            ) : <p style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>Loading…</p>}
          </div>

          {/* Camelot */}
          <div style={{ padding: "18px 22px", borderRight: "1px solid var(--border-soft)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "14px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "var(--r-pill)", background: "var(--apex-500)", display: "inline-block" }} />
              <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: "12px", color: "var(--apex-600)" }}>Camelot V3 LP Fee Model</span>
            </div>
            {camelotState ? (
              <>
                <StrataBar label="Daily Volume / TVL" valueLabel={`${(Number(camelotState.volumeRatio) / 100).toFixed(1)}%`} value={Math.min(Number(camelotState.volumeRatio) / 200, 100)} height={10} tone="apex" style={{ marginBottom: "12px" }} />
                <div style={{ display: "flex", justifyContent: "space-between", font: "400 11px/1 var(--font-mono)", color: "var(--text-faint)", marginBottom: "5px" }}><span>fee tier</span><span>{(Number(camelotState.feeTier) / 100).toFixed(2)}%</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", font: "400 11px/1 var(--font-mono)", color: "var(--text-faint)", marginBottom: "8px" }}><span>daily fee rate</span><span>{(Number(camelotState.dailyFeeRate) / 100).toFixed(3)}% / day</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-soft)", paddingTop: "8px", fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 700 }}>
                  <span style={{ color: "var(--text-body)" }}>LP APY</span>
                  <span style={{ color: "var(--apex-600)", fontVariantNumeric: "tabular-nums" }}>{(Number(camelotState.lpApy) / 100).toFixed(2)}%</span>
                </div>
                <p style={{ font: "400 11px/1.4 var(--font-sans)", color: "var(--text-faint)", marginTop: "8px" }}>APY = vol/TVL × feeTier × 365 — standard Uniswap V3 analytics formula</p>
              </>
            ) : <p style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>Loading…</p>}
          </div>

          {/* Morpho */}
          <div style={{ padding: "18px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "14px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "var(--r-pill)", background: "var(--accent-500)", display: "inline-block" }} />
              <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: "12px", color: "var(--accent-600)" }}>Morpho Blue P2P Model</span>
            </div>
            {morphoState ? (
              <>
                <StrataBar label="Matching Ratio (P2P)" valueLabel={`${(Number(morphoState.matchingRatio) / 100).toFixed(1)}%`} value={Number(morphoState.matchingRatio) / 100} height={10} tone="accent" style={{ marginBottom: "12px" }} />
                <div style={{ display: "flex", justifyContent: "space-between", font: "400 11px/1 var(--font-mono)", color: "var(--text-faint)", marginBottom: "5px" }}><span>Aave supply rate</span><span>{(Number(morphoState.supplyApy) / 100).toFixed(2)}%</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", font: "400 11px/1 var(--font-mono)", color: "var(--text-faint)", marginBottom: "5px" }}><span>Aave borrow rate</span><span>{(Number(morphoState.borrowApy) / 100).toFixed(2)}%</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", font: "400 11px/1 var(--font-mono)", color: "var(--text-faint)", marginBottom: "8px" }}><span>P2P rate (midpoint)</span><span>{(Number(morphoState.p2pRate) / 100).toFixed(2)}%</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-soft)", paddingTop: "8px", fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 700 }}>
                  <span style={{ color: "var(--text-body)" }}>Blended APY</span>
                  <span style={{ color: "var(--accent-600)", fontVariantNumeric: "tabular-nums" }}>{(Number(morphoState.blendedApy) / 100).toFixed(2)}%</span>
                </div>
                <p style={{ font: "400 11px/1.4 var(--font-sans)", color: "var(--text-faint)", marginTop: "8px" }}>Blended = matched% × P2P + unmatched% × supply</p>
              </>
            ) : <p style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>Loading…</p>}
          </div>
        </div>
      </Card>

      {/* Rebalancing History */}
      <Card pad="none">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <h3 style={{ font: "var(--fw-semibold) 16px/1 var(--font-serif)", color: "var(--text-strong)", margin: "0 0 2px" }}>Rebalancing History</h3>
            <p style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)", margin: 0 }}>On-chain rebalance events triggered by the AI agent</p>
          </div>
          {rebalanceLoading && <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>Loading…</span>}
          {!rebalanceLoading && rebalanceEvents.length === 0 && <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>No rebalances yet</span>}
        </div>
        {rebalanceEvents.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["#", "Timestamp", "Initiator", "Total Assets", "Block"].map((h, i) => (
                  <th key={h} style={{ ...thStyle, textAlign: i >= 3 ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rebalanceEvents.map((e, i) => (
                <tr key={e.blockNumber.toString()} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                  <td style={{ padding: "12px 22px", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-faint)" }}>#{rebalanceEvents.length - i}</td>
                  <td style={{ padding: "12px 22px", fontFamily: "var(--font-mono)", fontSize: "12px" }}>{formatTs(e.timestamp)}</td>
                  <td style={{ padding: "12px 22px" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-body)" }}>{shortAddr(e.initiator)}</span>
                    {e.initiator.toLowerCase() === "0x22a90658cdcdbdf89841ca2d37efc489de9bb71a" && (
                      <Badge tone="core" mono style={{ marginLeft: "8px" }}>AI Agent</Badge>
                    )}
                  </td>
                  <td style={{ padding: "12px 22px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--positive)", fontVariantNumeric: "tabular-nums" }}>{formatUsdc(e.totalAssets)}</td>
                  <td style={{ padding: "12px 22px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-faint)" }}>{e.blockNumber.toString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !rebalanceLoading && (
            <div style={{ padding: "24px 22px" }}>
              <p style={{ font: "400 12px/1.4 var(--font-sans)", color: "var(--text-faint)", margin: "0 0 8px" }}>No rebalancing events found. The AI agent will rebalance when:</p>
              <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {["Strategy weight drift exceeds threshold", "Governance proposal changes target weights", "Epoch settles with significant yield discrepancy"].map((t) => (
                  <li key={t} style={{ font: "400 12px/1.4 var(--font-sans)", color: "var(--text-faint)" }}>{t}</li>
                ))}
              </ul>
            </div>
          )
        )}
      </Card>

      {/* Epoch History */}
      <Card pad="none">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ font: "var(--fw-semibold) 16px/1 var(--font-serif)", color: "var(--text-strong)", margin: 0 }}>Epoch History</h3>
          {histLoading && <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>Loading…</span>}
          {!histLoading && !histError && epochs.length === 0 && <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>No epochs settled yet</span>}
          {histError && <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--danger)" }}>{histError}</span>}
        </div>
        {epochs.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Epoch", "Total Yield", "CORE", "SEAM", "APEX", "Implied APY"].map((h, i) => (
                  <th key={h} style={{ ...thStyle, textAlign: i === 0 ? "left" : "right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...epochs].reverse().map((e) => (
                <tr key={e.epochId.toString()} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                  <td style={{ padding: "12px 22px", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-faint)" }}>#{e.epochId.toString()}</td>
                  <td style={{ padding: "12px 22px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--positive)", fontVariantNumeric: "tabular-nums" }}>+{formatUsdc(e.totalYield)}</td>
                  <td style={{ padding: "12px 22px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "12px", fontVariantNumeric: "tabular-nums" }}>{formatUsdc(e.coreShare)}</td>
                  <td style={{ padding: "12px 22px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "12px", fontVariantNumeric: "tabular-nums" }}>{formatUsdc(e.seamShare)}</td>
                  <td style={{ padding: "12px 22px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "12px", fontVariantNumeric: "tabular-nums" }}>{formatUsdc(e.apexShare)}</td>
                  <td style={{ padding: "12px 22px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)" }}>{epochAPY(e.totalYield)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "var(--surface-sunken)" }}>
                <td style={{ padding: "10px 22px", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: "12px", color: "var(--text-body)" }}>Total</td>
                <td style={{ padding: "10px 22px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 700, color: "var(--positive)", fontVariantNumeric: "tabular-nums" }}>+{formatUsdc(historicTotalYield)}</td>
                <td colSpan={4} style={{ padding: "10px 22px", textAlign: "right", font: "400 11px/1 var(--font-sans)", color: "var(--text-faint)" }}>Implied APY uses current principal as denominator (approximation)</td>
              </tr>
            </tfoot>
          </table>
        )}
      </Card>
    </div>
  );
}
