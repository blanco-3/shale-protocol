"use client";
import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { StrataBar } from "../../components/ui/StrataBar";

// ── Pool setup ─────────────────────────────────────────────────────────────────
const TOTAL_TVL  = 750_000;
const CORE_TVL   = 375_000;
const SEAM_TVL   = 200_000;
const APEX_TVL   = 175_000;
const CORE_TARGET_PCT = 2.5;
const SEAM_TARGET_PCT = 5.0;

// ── Scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: "bull",       label: "Bull Market",    tag: "12% strategy",  desc: "Strategy significantly outperforms. APEX captures amplified residual.", strategyApyPct: 12,   capitalLossUsd: 0     },
  { id: "normal",     label: "Normal DeFi",    tag: "6% strategy",   desc: "Healthy DeFi conditions. All tiers paid, APEX earns meaningful premium.", strategyApyPct: 6,    capitalLossUsd: 0     },
  { id: "breakeven",  label: "Near Breakeven", tag: "3.2% strategy", desc: "Strategy just covers CORE+SEAM. APEX earns minimal yield — APY reversal zone.", strategyApyPct: 3.2, capitalLossUsd: 0    },
  { id: "low",        label: "Low Yield",      tag: "1% strategy",   desc: "Strategy can't cover SEAM. APEX receives zero yield, absorbs shortfall from principal.", strategyApyPct: 1, capitalLossUsd: 0 },
  { id: "small_loss", label: "Capital Loss",   tag: "–5% strategy",  desc: "Strategy loses principal. APEX absorbs loss first. CORE and SEAM unaffected.", strategyApyPct: -5, capitalLossUsd: 500   },
  { id: "large_loss", label: "APEX Depleted",  tag: "–20% strategy", desc: "Loss exceeds APEX buffer. SEAM begins absorbing remainder. CORE still protected.", strategyApyPct: -20, capitalLossUsd: 2_100 },
] as const;

// ── Simulation ─────────────────────────────────────────────────────────────────
type SimResult = {
  coreYield: number; seamYield: number; apexYield: number;
  coreApyPct: number; seamApyPct: number; apexApyPct: number;
  coreLoss: number; seamLoss: number; apexLoss: number;
  coreFinalTvl: number; seamFinalTvl: number; apexFinalTvl: number;
  status: "healthy" | "apex_deficit" | "seam_hit" | "core_hit";
  note: string;
};

function simulate(strategyApyPct: number, capitalLossUsd: number): SimResult {
  const totalStrategyYield = TOTAL_TVL * strategyApyPct / 100;
  const coreDue = CORE_TVL * CORE_TARGET_PCT / 100;
  const seamDue = SEAM_TVL * SEAM_TARGET_PCT / 100;

  let apexLoss = 0, seamLoss = 0, coreLoss = 0;
  let remainingLoss = Math.max(0, capitalLossUsd);
  const apexAbsorb = Math.min(remainingLoss, APEX_TVL);
  apexLoss = apexAbsorb; remainingLoss -= apexAbsorb;
  const seamAbsorb = Math.min(remainingLoss, SEAM_TVL);
  seamLoss = seamAbsorb; remainingLoss -= seamAbsorb;
  coreLoss = Math.min(remainingLoss, CORE_TVL);

  let availableYield = totalStrategyYield;
  let coreYield = 0, seamYield = 0, apexYield = 0;

  if (availableYield >= coreDue) {
    coreYield = coreDue; availableYield -= coreDue;
  } else {
    const coreDeficit = coreDue - availableYield;
    coreYield = coreDue; apexLoss += coreDeficit; availableYield = 0;
  }

  if (availableYield >= seamDue) {
    seamYield = seamDue; availableYield -= seamDue;
  } else {
    const seamDeficit = seamDue - availableYield;
    seamYield = Math.max(0, availableYield);
    const apexCanAbsorb = Math.max(0, APEX_TVL - apexLoss);
    const apexDeficitAbsorb = Math.min(seamDeficit, apexCanAbsorb);
    apexLoss += apexDeficitAbsorb;
    const remaining = seamDeficit - apexDeficitAbsorb;
    if (remaining > 0) { seamLoss += remaining; seamYield = seamDue - remaining; }
    else { seamYield = seamDue; }
    availableYield = 0;
  }

  apexYield = Math.max(0, availableYield);

  const coreFinalTvl = CORE_TVL - coreLoss;
  const seamFinalTvl = SEAM_TVL - seamLoss;
  const apexFinalTvl = Math.max(0, APEX_TVL - apexLoss);
  const coreApyPct = CORE_TVL > 0 ? (coreYield / CORE_TVL) * 100 : 0;
  const seamApyPct = SEAM_TVL > 0 ? (seamYield / SEAM_TVL) * 100 : 0;
  const apexApyPct = APEX_TVL > 0 ? (apexYield / APEX_TVL) * 100 : 0;

  let status: SimResult["status"] = "healthy";
  let note = "All tiers fully paid. APEX earns leveraged residual.";
  if (coreLoss > 0) { status = "core_hit"; note = "APEX and SEAM depleted. CORE principal absorbing losses — extreme scenario."; }
  else if (seamLoss > 0) { status = "seam_hit"; note = "APEX buffer depleted. SEAM principal absorbing remaining shortfall."; }
  else if (apexLoss > 0 && capitalLossUsd === 0) { status = "apex_deficit"; note = "Yield too low to cover CORE+SEAM targets. APEX principal absorbs deficit. CORE and SEAM fully protected."; }
  else if (apexLoss > 0) { status = "apex_deficit"; note = "Capital loss absorbed by APEX. CORE and SEAM principal unaffected."; }

  return { coreYield, seamYield, apexYield, coreApyPct, seamApyPct, apexApyPct, coreLoss, seamLoss, apexLoss, coreFinalTvl, seamFinalTvl, apexFinalTvl, status, note };
}

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const pct = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";

const eyebrow: React.CSSProperties = {
  font: "var(--fw-semibold) var(--text-2xs)/1 var(--font-sans)",
  letterSpacing: "var(--ls-wider)", textTransform: "uppercase", color: "var(--text-muted)",
};

const STATUS_BG: Record<SimResult["status"], string> = {
  healthy:      "var(--positive-bg)",
  apex_deficit: "var(--warning-bg)",
  seam_hit:     "var(--seam-50)",
  core_hit:     "var(--danger-bg)",
};

function TierResult({
  name, ordinal, principal, yield: yld, apy, loss, finalTvl, apyColor, accent,
}: {
  name: string; ordinal: string; principal: number; yield: number; apy: number;
  loss: number; finalTvl: number; apyColor: string; accent: "core" | "seam" | "apex";
}) {
  const lossPct = principal > 0 ? (loss / principal) * 100 : 0;
  return (
    <Card accent={accent} pad="lg" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ ...eyebrow }}>
        {name} <span style={{ color: `var(--${accent}-500)` }}>{ordinal}</span>
      </div>
      <div>
        <div style={{ font: "400 11px/1 var(--font-sans)", color: "var(--text-faint)", marginBottom: "5px" }}>Effective APY</div>
        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: "30px", color: apyColor, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
          {pct(apy)}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", font: "400 12px/1 var(--font-sans)" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)" }}>Starting TVL</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-body)", fontVariantNumeric: "tabular-nums" }}>{fmt(principal)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)" }}>Yield earned</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--positive)", fontVariantNumeric: "tabular-nums" }}>+{fmt(yld)}</span>
        </div>
        {loss > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--danger)" }}>Principal absorbed</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--danger)", fontVariantNumeric: "tabular-nums" }}>−{fmt(loss)} ({lossPct.toFixed(1)}%)</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-soft)", paddingTop: "9px", fontWeight: 700 }}>
          <span style={{ color: "var(--text-strong)" }}>Final balance</span>
          <span style={{ fontFamily: "var(--font-mono)", color: loss > 0 ? "var(--danger)" : "var(--text-strong)", fontVariantNumeric: "tabular-nums" }}>{fmt(finalTvl + yld)}</span>
        </div>
      </div>
    </Card>
  );
}

export default function ScenariosPage() {
  const [activeScenario, setActiveScenario] = useState<string>("normal");
  const [customApy, setCustomApy]   = useState(6);
  const [customLoss, setCustomLoss] = useState(0);
  const [isCustom, setIsCustom]     = useState(false);

  const scenario = SCENARIOS.find((s) => s.id === activeScenario)!;
  const stratApy = isCustom ? customApy : scenario.strategyApyPct;
  const lossUsd  = isCustom ? customLoss : scenario.capitalLossUsd;
  const result   = simulate(stratApy, lossUsd);

  const apexApyColor =
    result.apexApyPct > result.seamApyPct ? "var(--apex-600)" :
    result.apexApyPct > 0                 ? "var(--seam-600)" :
                                            "var(--text-faint)";

  const maxApy = Math.max(result.coreApyPct, result.seamApyPct, result.apexApyPct, 0.1);
  const floor = ((CORE_TVL * CORE_TARGET_PCT / 100 + SEAM_TVL * SEAM_TARGET_PCT / 100) / TOTAL_TVL * 100).toFixed(2);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "40px 0 60px" }}>
      {/* Header */}
      <div>
        <h1 style={{ font: "var(--fw-bold) 34px/1 var(--font-serif)", color: "var(--text-strong)", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          Tranche Scenarios
        </h1>
        <p style={{ font: "400 14px/1.5 var(--font-sans)", color: "var(--text-muted)", maxWidth: "620px", margin: 0 }}>
          How the CDO waterfall distributes yield and absorbs losses across different market conditions.
        </p>
      </div>

      {/* Setup reference */}
      <Card surface="sunken" pad="md">
        <div style={{ ...eyebrow, marginBottom: "14px" }}>Simulation Setup</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "18px" }}>
          {[
            { label: "Total TVL", value: fmt(TOTAL_TVL), sub: null, color: "var(--text-muted)" },
            { label: "CORE · 50%", value: fmt(CORE_TVL), sub: `${CORE_TARGET_PCT}% guaranteed`, color: "var(--core-600)" },
            { label: "SEAM · 27%", value: fmt(SEAM_TVL), sub: `${SEAM_TARGET_PCT}% guaranteed`, color: "var(--seam-600)" },
            { label: "APEX · 23%", value: fmt(APEX_TVL), sub: "first-loss buffer",              color: "var(--apex-600)" },
          ].map((col) => (
            <div key={col.label}>
              <div style={{ font: "400 11px/1 var(--font-sans)", color: col.color, marginBottom: "5px" }}>{col.label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "15px", color: "var(--text-strong)", fontVariantNumeric: "tabular-nums" }}>{col.value}</div>
              {col.sub && <div style={{ font: "400 10px/1.3 var(--font-mono)", color: "var(--text-faint)", marginTop: "3px" }}>{col.sub}</div>}
            </div>
          ))}
        </div>
      </Card>

      {/* Scenario selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
        {SCENARIOS.map((s) => {
          const on = !isCustom && activeScenario === s.id;
          return (
            <button key={s.id} type="button" onClick={() => { setActiveScenario(s.id); setIsCustom(false); }} style={{
              textAlign: "left", padding: "13px 15px", borderRadius: "var(--r-md)", cursor: "pointer",
              background: on ? "var(--rock-900)" : "var(--surface-raised)",
              border: `1.5px solid ${on ? "var(--rock-900)" : "var(--border)"}`,
              transition: "all var(--dur-fast) var(--ease-out)",
            }}>
              <div style={{ font: "var(--fw-bold) 13px/1.2 var(--font-sans)", color: on ? "var(--sand-50)" : "var(--text-strong)" }}>{s.label}</div>
              <div style={{ font: "400 11px/1 var(--font-mono)", color: on ? "var(--rock-200)" : "var(--text-faint)", marginTop: "5px" }}>{s.tag}</div>
            </button>
          );
        })}
        <button type="button" onClick={() => setIsCustom(true)} style={{
          textAlign: "left", padding: "13px 15px", borderRadius: "var(--r-md)", cursor: "pointer",
          background: isCustom ? "var(--rock-900)" : "transparent",
          border: `1.5px dashed ${isCustom ? "var(--rock-900)" : "var(--rock-300)"}`,
          transition: "all var(--dur-fast) var(--ease-out)",
        }}>
          <div style={{ font: "var(--fw-bold) 13px/1.2 var(--font-sans)", color: isCustom ? "var(--sand-50)" : "var(--text-strong)" }}>Custom</div>
          <div style={{ font: "400 11px/1 var(--font-mono)", color: isCustom ? "var(--rock-200)" : "var(--text-faint)", marginTop: "5px" }}>set your own</div>
        </button>
      </div>

      {/* Description or sliders */}
      {isCustom ? (
        <Card pad="lg" style={{ border: "1.5px dashed var(--rock-300)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px" }}>
            <div>
              <label style={{ display: "block", font: "var(--fw-medium) 12px/1 var(--font-sans)", color: "var(--text-muted)", marginBottom: "12px" }}>
                Strategy APY: <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-strong)" }}>{customApy}%</span>
              </label>
              <input type="range" min={-25} max={25} step={0.5} value={customApy} onChange={(e) => setCustomApy(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--rock-700)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", font: "400 11px/1 var(--font-mono)", color: "var(--text-faint)" }}>
                <span>−25%</span><span>0%</span><span>+25%</span>
              </div>
            </div>
            <div>
              <label style={{ display: "block", font: "var(--fw-medium) 12px/1 var(--font-sans)", color: "var(--text-muted)", marginBottom: "12px" }}>
                Capital loss: <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-strong)" }}>{fmt(customLoss)}</span>
              </label>
              <input type="range" min={0} max={3000} step={100} value={customLoss} onChange={(e) => setCustomLoss(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--apex-600)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", font: "400 11px/1 var(--font-mono)", color: "var(--text-faint)" }}>
                <span>$0</span><span>$1,500 (APEX)</span><span>$3,000</span>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card surface="sunken" pad="md">
          <p style={{ font: "400 13px/1.5 var(--font-sans)", color: "var(--text-body)", margin: 0 }}>{scenario.desc}</p>
        </Card>
      )}

      {/* Strategy yield bar */}
      <Card pad="lg">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
          <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-muted)" }}>
            Strategy yield on {fmt(TOTAL_TVL)} TVL
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "12px", color: stratApy >= 0 ? "var(--positive)" : "var(--danger)", fontVariantNumeric: "tabular-nums" }}>
            {stratApy >= 0 ? "+" : ""}{Math.round(TOTAL_TVL * stratApy / 100).toLocaleString()} USDC/yr ({stratApy}% APY)
          </span>
        </div>
        <div style={{ position: "relative", height: "12px", background: "var(--surface-sunken)", borderRadius: "var(--r-pill)", overflow: "hidden", boxShadow: "inset 0 1px 2px rgba(26,23,20,0.1)" }}>
          <div style={{
            position: "absolute", top: 0, bottom: 0,
            ...(stratApy >= 0 ? { left: 0 } : { right: 0 }),
            width: `${Math.min(Math.abs(stratApy) / 25 * 100, 100)}%`,
            background: stratApy >= 0 ? "var(--positive)" : "var(--danger)",
            borderRadius: "var(--r-pill)",
            transition: "width var(--dur-slow) var(--ease-out)",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", font: "400 11px/1 var(--font-mono)", color: "var(--text-faint)" }}>
          <span>−25%</span>
          <span style={{ color: "var(--text-muted)" }}>CORE+SEAM floor: {floor}%</span>
          <span>+25%</span>
        </div>
      </Card>

      {/* Outcome status */}
      <div style={{ padding: "14px 18px", borderRadius: "var(--r-md)", background: STATUS_BG[result.status] }}>
        <p style={{ font: "var(--fw-medium) 13px/1.5 var(--font-sans)", color: "var(--text-body)", margin: 0 }}>{result.note}</p>
      </div>

      {/* Tier results */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        <TierResult name="CORE — Last-loss" ordinal="③" principal={CORE_TVL} yield={result.coreYield} apy={result.coreApyPct} loss={result.coreLoss} finalTvl={result.coreFinalTvl} apyColor="var(--positive)" accent="core" />
        <TierResult name="SEAM — Second-loss" ordinal="②" principal={SEAM_TVL} yield={result.seamYield} apy={result.seamApyPct} loss={result.seamLoss} finalTvl={result.seamFinalTvl} apyColor="var(--seam-700)" accent="seam" />
        <TierResult name="APEX — First-loss" ordinal="①" principal={APEX_TVL} yield={result.apexYield} apy={result.apexApyPct} loss={result.apexLoss} finalTvl={result.apexFinalTvl} apyColor={apexApyColor} accent="apex" />
      </div>

      {/* APY comparison */}
      <Card pad="lg">
        <h3 style={{ font: "var(--fw-semibold) 16px/1 var(--font-serif)", color: "var(--text-strong)", margin: "0 0 18px" }}>
          APY Comparison
        </h3>
        {([
          { label: "CORE", apy: result.coreApyPct, tone: "core" as const },
          { label: "SEAM", apy: result.seamApyPct, tone: "seam" as const },
          { label: "APEX", apy: result.apexApyPct, tone: "apex" as const },
        ]).map((row) => (
          <div key={row.label} style={{ marginBottom: "12px" }}>
            <StrataBar
              label={row.label}
              valueLabel={pct(row.apy)}
              value={Math.max((row.apy / maxApy) * 100, 0)}
              max={100}
              tone={row.tone}
              height={12}
            />
          </div>
        ))}
        <p style={{ font: "400 12px/1.5 var(--font-sans)", color: "var(--text-faint)", marginTop: "10px" }}>
          {result.apexApyPct > result.seamApyPct
            ? `APEX earns ${(result.apexApyPct / Math.max(result.coreApyPct, 0.01)).toFixed(1)}× CORE — leverage at work.`
            : result.apexApyPct === 0
            ? "APEX earns 0% — absorbing losses instead."
            : "APY reversal: low strategy yield means APEX earns less than CORE despite first-loss risk."}
        </p>
      </Card>

      {/* Waterfall breakdown */}
      <Card pad="none">
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ font: "var(--fw-semibold) 16px/1 var(--font-serif)", color: "var(--text-strong)", margin: 0 }}>
            Waterfall Breakdown
          </h3>
        </div>
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: "10px", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-muted)" }}>Strategy yield ({stratApy}% × {fmt(TOTAL_TVL)})</span>
            <span style={{ color: stratApy >= 0 ? "var(--positive)" : "var(--danger)", fontVariantNumeric: "tabular-nums" }}>
              {stratApy >= 0 ? "+" : ""}{(TOTAL_TVL * stratApy / 100).toFixed(0)} USDC
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "16px" }}>
            <span style={{ color: "var(--core-600)" }}>→ CORE receives ({CORE_TARGET_PCT}% × {fmt(CORE_TVL)})</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>−{result.coreYield.toFixed(0)} USDC</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "16px" }}>
            <span style={{ color: "var(--seam-600)" }}>→ SEAM receives ({SEAM_TARGET_PCT}% × {fmt(SEAM_TVL)})</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>−{result.seamYield.toFixed(0)} USDC</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "16px", borderTop: "1px solid var(--border-soft)", paddingTop: "9px" }}>
            <span style={{ color: "var(--apex-600)" }}>→ APEX residual</span>
            <span style={{ color: result.apexYield > 0 ? "var(--apex-600)" : "var(--text-faint)", fontVariantNumeric: "tabular-nums" }}>
              {result.apexYield > 0 ? "+" : ""}{result.apexYield.toFixed(0)} USDC
            </span>
          </div>
          {(result.apexLoss > 0 || result.seamLoss > 0 || result.coreLoss > 0) && (
            <>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "9px" }}>
                <span style={{ color: "var(--text-muted)" }}>Loss absorption:</span>
              </div>
              {result.apexLoss > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "16px" }}>
                  <span style={{ color: "var(--danger)" }}>APEX principal absorbed</span>
                  <span style={{ color: "var(--danger)", fontVariantNumeric: "tabular-nums" }}>−{result.apexLoss.toFixed(0)} USDC</span>
                </div>
              )}
              {result.seamLoss > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "16px" }}>
                  <span style={{ color: "var(--warning)" }}>SEAM principal absorbed</span>
                  <span style={{ color: "var(--warning)", fontVariantNumeric: "tabular-nums" }}>−{result.seamLoss.toFixed(0)} USDC</span>
                </div>
              )}
              {result.coreLoss > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "16px" }}>
                  <span style={{ color: "var(--danger)" }}>CORE principal absorbed</span>
                  <span style={{ color: "var(--danger)", fontVariantNumeric: "tabular-nums" }}>−{result.coreLoss.toFixed(0)} USDC</span>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
