"use client";
import { useState, useEffect } from "react";
import { useReadContracts } from "wagmi";
import { VAULT_ADDRESS, VAULT_ABI } from "../../lib/contracts";
import { formatUsdc, formatUsdcCompact } from "../../lib/utils";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { StatTile } from "../../components/ui/StatTile";
import { StrataBar } from "../../components/ui/StrataBar";

type SafetyLevel = "HEALTHY" | "CAUTION" | "WARNING" | "DANGER" | "CRITICAL" | "EMPTY";
type BarTone = "positive" | "warning" | "danger" | "seam" | "core" | "apex" | "ink" | "accent";

function getSafetyLevel(apexRatio: number, totalPrincipal: bigint): SafetyLevel {
  if (totalPrincipal === 0n) return "EMPTY";
  if (apexRatio >= 20) return "HEALTHY";
  if (apexRatio >= 15) return "CAUTION";
  if (apexRatio >= 10) return "WARNING";
  if (apexRatio >= 5)  return "DANGER";
  return "CRITICAL";
}

const LEVEL_CONFIG: Record<SafetyLevel, {
  label: string; tone: BarTone; toneVar: string; toneBg: string;
  coreDeposits: boolean; apexDeposits: boolean; seniorAPY: string; desc: string;
}> = {
  HEALTHY:  { label: "Healthy",  tone: "positive", toneVar: "var(--positive)",  toneBg: "var(--positive-bg)", coreDeposits: true,  apexDeposits: true,  seniorAPY: "4–6%",  desc: "Optimal protocol health with strong APEX buffer." },
  CAUTION:  { label: "Caution",  tone: "seam",     toneVar: "var(--seam-600)", toneBg: "var(--seam-50)",    coreDeposits: true,  apexDeposits: true,  seniorAPY: "4–6%",  desc: "Protocol operating normally with adequate buffer." },
  WARNING:  { label: "Warning",  tone: "warning",  toneVar: "var(--warning)",   toneBg: "var(--warning-bg)", coreDeposits: true,  apexDeposits: true,  seniorAPY: "4–5%",  desc: "APEX buffer approaching critical levels." },
  DANGER:   { label: "Danger",   tone: "danger",   toneVar: "var(--danger)",    toneBg: "var(--danger-bg)",  coreDeposits: false, apexDeposits: true,  seniorAPY: "3–4%",  desc: "Critical buffer — CORE deposits restricted." },
  CRITICAL: { label: "Critical", tone: "danger",   toneVar: "var(--danger)",    toneBg: "var(--danger-bg)",  coreDeposits: false, apexDeposits: false, seniorAPY: "2–3%",  desc: "Emergency state. All deposits should be paused." },
  EMPTY:    { label: "—",        tone: "ink",      toneVar: "var(--text-muted)", toneBg: "var(--surface-sunken)", coreDeposits: true, apexDeposits: true, seniorAPY: "4–6%", desc: "No TVL yet." },
};

const LEVEL_TABLE = [
  { level: "HEALTHY",  threshold: "≥ 20%",  coreAPY: "4–6%", desc: "All deposits enabled",                      tone: "positive" as const },
  { level: "CAUTION",  threshold: "15–20%", coreAPY: "4–6%", desc: "All deposits enabled",                      tone: "seam"     as const },
  { level: "WARNING",  threshold: "10–15%", coreAPY: "4–5%", desc: "Monitoring closely",                        tone: "warning"  as const },
  { level: "DANGER",   threshold: "5–10%",  coreAPY: "3–4%", desc: "CORE deposits restricted",                  tone: "danger"   as const },
  { level: "CRITICAL", threshold: "< 5%",   coreAPY: "2–3%", desc: "Emergency — all deposits should be paused", tone: "danger"   as const },
];

const TABLE_TONE_VAR: Record<string, string> = {
  positive: "var(--positive)",
  seam:     "var(--seam-700)",
  warning:  "var(--warning)",
  danger:   "var(--danger)",
};

function useLastUpdated(dataUpdatedAt: number) {
  const [label, setLabel] = useState("—");
  useEffect(() => {
    if (!dataUpdatedAt) return;
    const tick = () => {
      const seconds = Math.floor((Date.now() - dataUpdatedAt) / 1000);
      if (seconds < 5) setLabel("just now");
      else if (seconds < 60) setLabel(`${seconds}s ago`);
      else setLabel(`${Math.floor(seconds / 60)}m ago`);
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [dataUpdatedAt]);
  return label;
}

export default function SafetyPage() {
  const { data, dataUpdatedAt } = useReadContracts({
    contracts: [
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "corePrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamPrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexPrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreTargetMinBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreTargetMaxBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "minApexBufferBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexBufferGateActive" },
    ],
    query: { refetchInterval: 30_000 },
  });

  const r = (i: number) => data?.[i]?.status === "success" ? (data[i].result as bigint) : 0n;
  const corePrincipal = r(0), seamPrincipal = r(1), apexPrincipal = r(2);
  const coreMin = r(3), coreMax = r(4);
  const minApexBufferBps = data?.[5]?.status === "success" ? Number(data[5].result as bigint) : 1500;
  const gateActive       = data?.[6]?.status === "success" ? (data[6].result as boolean) : false;
  const minApexPct       = (minApexBufferBps / 100).toFixed(1);

  const totalPrincipal = corePrincipal + seamPrincipal + apexPrincipal;
  const apexRatioPct = totalPrincipal > 0n
    ? Number((apexPrincipal * 10000n) / totalPrincipal) / 100
    : 0;

  const level = getSafetyLevel(apexRatioPct, totalPrincipal);
  const cfg = LEVEL_CONFIG[level];
  const lastUpdated = useLastUpdated(dataUpdatedAt);

  const pct = (n: bigint) =>
    totalPrincipal > 0n ? Number((n * 10000n) / totalPrincipal) / 100 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "40px 0 60px" }}>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ font: "var(--fw-bold) 34px/1 var(--font-serif)", color: "var(--text-strong)", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
            Safety Monitor
          </h1>
          <p style={{ font: "400 14px/1 var(--font-sans)", color: "var(--text-muted)", margin: 0 }}>
            Real-time protocol health and the APEX buffer system.
          </p>
        </div>
        <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>
          Auto-refreshes every 30s · updated {lastUpdated}
        </span>
      </div>

      {/* Current status hero */}
      <Card pad="lg" style={{ background: cfg.toneBg, border: `1px solid ${cfg.toneVar}33` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <span style={{ font: "var(--fw-semibold) var(--text-2xs)/1 var(--font-sans)", letterSpacing: "var(--ls-wider)", textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "10px" }}>
              Current Safety Level
            </span>
            <div style={{ font: "var(--fw-bold) 42px/1 var(--font-serif)", color: cfg.toneVar, letterSpacing: "-0.02em" }}>
              {cfg.label}
            </div>
            <p style={{ font: "400 14px/1.5 var(--font-sans)", color: "var(--text-body)", marginTop: "8px", maxWidth: "420px" }}>
              {cfg.desc}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ font: "var(--fw-semibold) var(--text-2xs)/1 var(--font-sans)", letterSpacing: "var(--ls-wider)", textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "10px" }}>
              APEX Buffer Ratio
            </span>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: "42px", color: cfg.toneVar, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
              {totalPrincipal > 0n ? `${apexRatioPct.toFixed(2)}%` : "—"}
            </div>
            <div style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)", marginTop: "6px" }}>
              Gate threshold: {minApexPct}%
            </div>
          </div>
        </div>
        <StrataBar value={Math.min(apexRatioPct, 100)} tone={cfg.tone} height={10} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "7px" }}>
          {["0%", "5%", "10%", "20%", "100%"].map((t) => (
            <span key={t} style={{ font: "400 11px/1 var(--font-mono)", color: "var(--text-faint)" }}>{t}</span>
          ))}
        </div>
      </Card>

      {/* Deposit status */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        <Card pad="md">
          <StatTile
            label="CORE APY Target"
            value={data ? `${(Number(coreMin) / 100).toFixed(1)}–${(Number(coreMax) / 100).toFixed(1)}%` : "—"}
            sub="senior guaranteed"
          />
        </Card>
        <Card pad="md" style={{ background: gateActive ? "var(--warning-bg)" : undefined }}>
          <div style={{ font: "var(--fw-semibold) var(--text-2xs)/1 var(--font-sans)", letterSpacing: "var(--ls-wider)", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px" }}>
            CORE / SEAM Deposits
          </div>
          <Badge tone={gateActive ? "warning" : "positive"} dot>
            {gateActive ? "Gated — deposit APEX first" : "Enabled"}
          </Badge>
          {gateActive && (
            <p style={{ font: "400 11px/1.4 var(--font-sans)", color: "var(--warning)", marginTop: "10px" }}>
              APEX buffer below {minApexPct}% minimum
            </p>
          )}
        </Card>
        <Card pad="md">
          <div style={{ font: "var(--fw-semibold) var(--text-2xs)/1 var(--font-sans)", letterSpacing: "var(--ls-wider)", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px" }}>
            APEX Deposits
          </div>
          <Badge tone="positive" dot>Always open</Badge>
          <p style={{ font: "400 11px/1.4 var(--font-sans)", color: "var(--text-faint)", marginTop: "10px" }}>
            Replenishes the first-loss buffer.
          </p>
        </Card>
      </div>

      {/* Principal breakdown */}
      <Card pad="lg">
        <h3 style={{ font: "var(--fw-semibold) 16px/1 var(--font-serif)", color: "var(--text-strong)", margin: "0 0 18px" }}>
          Principal Breakdown
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
          {([
            { k: "CORE",          v: corePrincipal,  tone: "core"  as const },
            { k: "SEAM",          v: seamPrincipal,  tone: "seam"  as const },
            { k: "APEX (buffer)", v: apexPrincipal,  tone: "apex"  as const },
          ] as const).map((row) => {
            const p = pct(row.v);
            return (
              <div key={row.k}>
                <div style={{ font: "var(--fw-semibold) var(--text-2xs)/1 var(--font-sans)", letterSpacing: "var(--ls-wider)", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "7px" }}>
                  {row.k}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: "20px", color: "var(--text-strong)", marginBottom: "10px", fontVariantNumeric: "tabular-nums" }}>
                  {formatUsdcCompact(row.v)}
                </div>
                <StrataBar value={p} tone={row.tone} valueLabel={`${p.toFixed(1)}%`} height={8} />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Safety level table */}
      <Card pad="none">
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ font: "var(--fw-semibold) 16px/1 var(--font-serif)", color: "var(--text-strong)", margin: 0 }}>
            Safety Level System
          </h3>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Level", "APEX Ratio", "CORE APY", "Status"].map((h) => (
                <th key={h} style={{
                  textAlign: "left", padding: "10px 22px",
                  font: "var(--fw-semibold) 10px/1 var(--font-sans)",
                  letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-faint)",
                  borderBottom: "1px solid var(--border-soft)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LEVEL_TABLE.map((row) => {
              const on = row.level === level;
              const rc = TABLE_TONE_VAR[row.tone];
              return (
                <tr key={row.level} style={{ background: on ? "var(--surface-sunken)" : "transparent" }}>
                  <td style={{ padding: "14px 22px", font: `${on ? 700 : 600} 13px/1 var(--font-sans)`, color: rc, borderBottom: "1px solid var(--border-soft)" }}>
                    {row.level}{on && <span style={{ marginLeft: "8px", color: "var(--text-muted)" }}>←</span>}
                  </td>
                  <td style={{ padding: "14px 22px", font: "400 12px/1 var(--font-mono)", color: "var(--text-body)", borderBottom: "1px solid var(--border-soft)" }}>{row.threshold}</td>
                  <td style={{ padding: "14px 22px", font: "400 12px/1 var(--font-mono)", color: "var(--text-body)", borderBottom: "1px solid var(--border-soft)" }}>{row.coreAPY}</td>
                  <td style={{ padding: "14px 22px", font: "400 12px/1 var(--font-sans)", color: "var(--text-muted)", borderBottom: "1px solid var(--border-soft)" }}>{row.desc}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
