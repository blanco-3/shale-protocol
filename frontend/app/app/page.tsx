"use client";
import { useReadContracts } from "wagmi";
import {
  VAULT_ADDRESS, VAULT_ABI,
  AAVE_STRATEGY_ADDRESS, SIM_AAVE_ABI,
  CAMELOT_STRATEGY_ADDRESS, SIM_CAMELOT_ABI,
  MORPHO_STRATEGY_ADDRESS, SIM_MORPHO_ABI,
  STRATEGY_ROUTER_ADDRESS, STRATEGY_ROUTER_ABI,
} from "../../lib/contracts";
import { formatUsdc, formatUsdcCompact, TIERS, bpsToPercent } from "../../lib/utils";
import { TierCard } from "../../components/TierCard";
import { AgentPanel } from "../../components/AgentPanel";
import { Card } from "../../components/ui/Card";
import { StatTile } from "../../components/ui/StatTile";
import { Hero } from "../../components/shale/Hero";

const eyebrow: React.CSSProperties = {
  font: "var(--fw-semibold) var(--text-2xs)/1 var(--font-sans)",
  letterSpacing: "var(--ls-wider)", textTransform: "uppercase", color: "var(--text-muted)",
};

export default function Dashboard() {
  const { data: vaultData } = useReadContracts({
    contracts: [
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "corePrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamPrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexPrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreTargetMinBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreTargetMaxBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamTargetMinBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamTargetMaxBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "epochCount" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "minApexBufferBps" },
    ],
  });

  const { data: stratData } = useReadContracts({
    contracts: [
      { address: AAVE_STRATEGY_ADDRESS,    abi: SIM_AAVE_ABI,    functionName: "apyBps" },
      { address: CAMELOT_STRATEGY_ADDRESS, abi: SIM_CAMELOT_ABI, functionName: "apyBps" },
      { address: MORPHO_STRATEGY_ADDRESS,  abi: SIM_MORPHO_ABI,  functionName: "apyBps" },
      { address: STRATEGY_ROUTER_ADDRESS,  abi: STRATEGY_ROUTER_ABI, functionName: "getStrategy", args: [0n] },
      { address: STRATEGY_ROUTER_ADDRESS,  abi: STRATEGY_ROUTER_ABI, functionName: "getStrategy", args: [1n] },
      { address: STRATEGY_ROUTER_ADDRESS,  abi: STRATEGY_ROUTER_ABI, functionName: "getStrategy", args: [2n] },
    ],
  });

  const r = (i: number) => vaultData?.[i]?.status === "success" ? (vaultData[i].result as bigint) : 0n;
  const corePrincipal = r(0), seamPrincipal = r(1), apexPrincipal = r(2);
  const coreMin = r(3), coreMax = r(4), seamMin = r(5), seamMax = r(6);
  const epochCount = r(7);
  const minApexBufferBps = r(8);

  const totalTVL = corePrincipal + seamPrincipal + apexPrincipal;
  const loading = vaultData === undefined;

  const s = (i: number) => stratData?.[i]?.status === "success" ? Number(stratData[i].result as bigint) : null;
  const aaveApyBps = s(0), camelotApyBps = s(1), morphoApyBps = s(2);

  const getWeight = (i: number) => stratData?.[i]?.status === "success"
    ? Number((stratData[i].result as readonly [string, number, string, boolean, bigint])[1])
    : null;
  const aaveWeight = getWeight(3), camelotWeight = getWeight(4), morphoWeight = getWeight(5);

  const blendedConservativeBps = (aaveApyBps !== null && camelotApyBps !== null && morphoApyBps !== null
    && aaveWeight !== null && camelotWeight !== null && morphoWeight !== null)
    ? Math.round((aaveApyBps * aaveWeight + camelotApyBps * camelotWeight + morphoApyBps * morphoWeight) / 10_000)
    : 850;
  const blendedOptimisticBps = camelotApyBps ?? 1095;

  const coreRealized = null, seamRealized = null, apexRealized = null;

  function projectApexAPY(strategyBps: number): string | null {
    if (apexPrincipal === 0n || totalTVL === 0n) return null;
    const total = Number(totalTVL), apex = Number(apexPrincipal);
    const stratYield = total * strategyBps / 10_000;
    const coreDue = Number(corePrincipal) * Number(coreMin) / 10_000;
    const seamDue = Number(seamPrincipal) * Number(seamMin) / 10_000;
    const apexYield = Math.max(0, stratYield - coreDue - seamDue);
    return (apexYield / apex * 100).toFixed(1) + "%";
  }

  const apexConservative = projectApexAPY(blendedConservativeBps);
  const apexOptimistic   = projectApexAPY(blendedOptimisticBps);
  const apexLeverage     = apexPrincipal > 0n && totalTVL > 0n
    ? (Number(totalTVL) / Number(apexPrincipal)).toFixed(1) + "×"
    : null;

  const apexBufferPct = totalTVL > 0n
    ? (Number((apexPrincipal * 10000n) / totalTVL) / 100).toFixed(1)
    : "—";

  const blendedDisplay = `${(blendedConservativeBps / 100).toFixed(1)}–${(blendedOptimisticBps / 100).toFixed(1)}%`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "48px" }}>
      {/* Hero */}
      <Hero />

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
        <Card pad="sm">
          <StatTile size="sm" label="Total TVL" value={loading ? "—" : formatUsdcCompact(totalTVL)} sub="principal" />
        </Card>
        <Card pad="sm">
          <StatTile size="sm" label="Blended APY" value={blendedDisplay} sub="weighted avg" />
        </Card>
        <Card pad="sm">
          <StatTile size="sm" label="APEX Buffer" value={`${apexBufferPct}%`} sub={`min ${bpsToPercent(minApexBufferBps)}`} />
        </Card>
        <Card pad="sm">
          <StatTile size="sm" label="Epoch" value={loading ? "—" : `#${epochCount.toString()}`} sub="settled" />
        </Card>
        <Card pad="sm">
          <StatTile size="sm" label="Strategies" value="3" sub="Aave · Camelot · Morpho" />
        </Card>
      </div>

      {/* Tier cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        <TierCard tier={TIERS[0]} tvl={corePrincipal} apyMin={coreMin} apyMax={coreMax} />
        <TierCard tier={TIERS[1]} tvl={seamPrincipal} apyMin={seamMin} apyMax={seamMax} />
        <TierCard
          tier={TIERS[2]}
          tvl={apexPrincipal}
          apyMin={undefined}
          apyMax={undefined}
          apyLabel={
            apexRealized
              ? `${apexRealized} realized`
              : apexConservative && apexOptimistic
              ? `${apexConservative}–${apexOptimistic} projected`
              : "Leveraged yield"
          }
        />
      </div>

      {/* Risk–Yield Tradeoff */}
      <Card pad="lg">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
          <h3 style={{ font: "var(--fw-semibold) 18px/1 var(--font-serif)", color: "var(--text-strong)", margin: 0 }}>
            Risk–Yield Tradeoff
          </h3>
          <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>loss absorption order</span>
        </div>
        <p style={{ font: "400 13px/1.5 var(--font-sans)", color: "var(--text-muted)", margin: "0 0 18px" }}>
          Who absorbs the hit first if a strategy underperforms.
        </p>

        <div style={{ display: "flex", alignItems: "stretch", gap: "8px", marginBottom: "16px" }}>
          {([
            { name: "① APEX", note: "First-loss",  sub: "High APY · principal at risk",   bg: "var(--apex-50)",  tone: "var(--apex-500)" },
            { name: "② SEAM", note: "Second-loss", sub: "Mid APY · partial buffer",        bg: "var(--seam-50)", tone: "var(--seam-500)" },
            { name: "③ CORE", note: "Last-loss",   sub: "Safe APY · principal protected",  bg: "var(--core-50)", tone: "var(--core-500)" },
          ] as const).map((step, i) => (
            <div key={step.name} style={{ display: "flex", alignItems: "stretch", flex: 1, gap: "8px" }}>
              <div style={{
                flex: 1, background: step.bg, borderRadius: "var(--r-md)",
                padding: "16px 14px", textAlign: "center",
                border: `1px solid ${step.tone}22`,
              }}>
                <div style={{ font: "var(--fw-bold) 15px/1 var(--font-sans)", color: step.tone, letterSpacing: "0.02em" }}>{step.name}</div>
                <div style={{ font: "var(--fw-semibold) 12px/1 var(--font-sans)", color: step.tone, marginTop: "8px", opacity: 0.85 }}>{step.note}</div>
                <div style={{ font: "400 11px/1.4 var(--font-sans)", color: "var(--text-muted)", marginTop: "8px" }}>{step.sub}</div>
              </div>
              {i < 2 && <div style={{ display: "flex", alignItems: "center", color: "var(--text-faint)", fontSize: "16px" }}>▶</div>}
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-soft)" }}>
              <th style={{ textAlign: "left", padding: "8px 0", ...eyebrow }}></th>
              {(["CORE", "SEAM", "APEX"] as const).map((t, i) => (
                <th key={t} style={{ textAlign: "center", padding: "8px 12px", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: "12px", letterSpacing: "0.06em", color: ["var(--core-600)", "var(--seam-600)", "var(--apex-600)"][i] }}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ fontFamily: "var(--font-mono)" }}>
            {[
              { label: "Target APY",    values: [loading ? "—" : `${bpsToPercent(coreMin)}–${bpsToPercent(coreMax)}`, loading ? "—" : `${bpsToPercent(seamMin)}–${bpsToPercent(seamMax)}`, apexConservative && apexOptimistic ? `${apexConservative}–${apexOptimistic}` : "Leveraged"] },
              { label: "APY floor",     values: ["Guaranteed ✓", "Guaranteed ✓", "None — variable"] },
              { label: "Principal risk",values: ["Protected",    "Partially",    "At risk"] },
              { label: "Loss priority", values: ["③ Last",       "② Second",     "① First"] },
              { label: "Best for",      values: ["Safety first", "Balanced",     "Max yield"] },
            ].map((row) => (
              <tr key={row.label} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                <td style={{ padding: "10px 0", fontFamily: "var(--font-sans)", color: "var(--text-muted)", fontSize: "12px" }}>{row.label}</td>
                {row.values.map((v, i) => (
                  <td key={i} style={{ padding: "10px 12px", textAlign: "center", color: ["var(--core-600)", "var(--seam-600)", "var(--apex-600)"][i], fontSize: "12px", fontVariantNumeric: "tabular-nums" }}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Agent panel */}
      <AgentPanel />
    </div>
  );
}
