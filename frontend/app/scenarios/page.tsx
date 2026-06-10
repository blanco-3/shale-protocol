"use client";
import { useState } from "react";

// ── Pool setup (matches live vault — Arbitrum Sepolia demo) ──────────────────
const TOTAL_TVL  = 750_000;
const CORE_TVL   = 375_000;  // 50%
const SEAM_TVL   = 200_000;  // 26.7%
const APEX_TVL   = 175_000;  // 23.3%
const CORE_TARGET_PCT = 2.5;  // guaranteed min APY
const SEAM_TARGET_PCT = 5.0;  // guaranteed min APY

// ── Preset scenarios ──────────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id: "bull",
    label: "🚀 Bull Market",
    tag: "12% strategy",
    desc: "Strategy significantly outperforms. APEX captures amplified residual.",
    strategyApyPct: 12,
    capitalLossUsd: 0,
  },
  {
    id: "normal",
    label: "✅ Normal DeFi",
    tag: "6% strategy",
    desc: "Healthy DeFi conditions. All tiers paid, APEX earns meaningful premium.",
    strategyApyPct: 6,
    capitalLossUsd: 0,
  },
  {
    id: "breakeven",
    label: "⚖️ Near Breakeven",
    tag: "3.2% strategy",
    desc: "Strategy just covers CORE+SEAM. APEX earns minimal yield — APY reversal zone.",
    strategyApyPct: 3.2,
    capitalLossUsd: 0,
  },
  {
    id: "low",
    label: "📉 Low Yield",
    tag: "1% strategy",
    desc: "Strategy can't cover SEAM. APEX receives zero yield, absorbs shortfall from principal.",
    strategyApyPct: 1,
    capitalLossUsd: 0,
  },
  {
    id: "small_loss",
    label: "💥 Capital Loss",
    tag: "–5% strategy",
    desc: "Strategy loses principal. APEX absorbs loss first. CORE and SEAM unaffected.",
    strategyApyPct: -5,
    capitalLossUsd: 500,
  },
  {
    id: "large_loss",
    label: "🔥 APEX Depleted",
    tag: "–20% strategy",
    desc: "Loss exceeds APEX buffer. SEAM begins absorbing remainder. CORE still protected.",
    strategyApyPct: -20,
    capitalLossUsd: 2_100,
  },
] as const;

// ── Simulation logic ──────────────────────────────────────────────────────────
type SimResult = {
  coreYield: number;
  seamYield: number;
  apexYield: number;
  coreApyPct: number;
  seamApyPct: number;
  apexApyPct: number;
  coreLoss: number;
  seamLoss: number;
  apexLoss: number;
  coreFinalTvl: number;
  seamFinalTvl: number;
  apexFinalTvl: number;
  status: "healthy" | "apex_deficit" | "seam_hit" | "core_hit";
  note: string;
};

function simulate(strategyApyPct: number, capitalLossUsd: number): SimResult {
  // Annual yield from strategy
  const totalStrategyYield = TOTAL_TVL * strategyApyPct / 100;

  // Guaranteed yield due to CORE and SEAM
  const coreDue = CORE_TVL * CORE_TARGET_PCT / 100;
  const seamDue = SEAM_TVL * SEAM_TARGET_PCT / 100;

  // --- Capital loss absorption (APEX → SEAM → CORE) ---
  let apexLoss = 0, seamLoss = 0, coreLoss = 0;
  let remainingLoss = Math.max(0, capitalLossUsd);

  const apexAbsorb = Math.min(remainingLoss, APEX_TVL);
  apexLoss = apexAbsorb;
  remainingLoss -= apexAbsorb;

  const seamAbsorb = Math.min(remainingLoss, SEAM_TVL);
  seamLoss = seamAbsorb;
  remainingLoss -= seamAbsorb;

  coreLoss = Math.min(remainingLoss, CORE_TVL);

  // --- Yield distribution ---
  let availableYield = totalStrategyYield;
  let coreYield = 0, seamYield = 0, apexYield = 0;

  // CORE gets its due first (from yield, then deficit absorbed by APEX principal)
  if (availableYield >= coreDue) {
    coreYield = coreDue;
    availableYield -= coreDue;
  } else {
    // Yield deficit — APEX absorbs difference from principal
    const coreDeficit = coreDue - availableYield;
    coreYield = coreDue; // CORE still gets its full target (absorbed by APEX)
    apexLoss += coreDeficit;
    availableYield = 0;
  }

  // SEAM gets its due next
  if (availableYield >= seamDue) {
    seamYield = seamDue;
    availableYield -= seamDue;
  } else {
    const seamDeficit = seamDue - availableYield;
    seamYield = Math.max(0, availableYield);
    // Deficit: first drain APEX principal, then SEAM absorbs
    const apexCanAbsorb = Math.max(0, APEX_TVL - apexLoss);
    const apexDeficitAbsorb = Math.min(seamDeficit, apexCanAbsorb);
    apexLoss += apexDeficitAbsorb;
    const remaining = seamDeficit - apexDeficitAbsorb;
    if (remaining > 0) {
      seamLoss += remaining;
      seamYield = seamDue - remaining;
    } else {
      seamYield = seamDue;
    }
    availableYield = 0;
  }

  // APEX gets whatever is left (can be negative if principal was tapped)
  apexYield = Math.max(0, availableYield);

  // Final TVL after losses
  const coreFinalTvl  = CORE_TVL  - coreLoss;
  const seamFinalTvl  = SEAM_TVL  - seamLoss;
  const apexFinalTvl  = Math.max(0, APEX_TVL - apexLoss);

  // APY per tier
  const coreApyPct = CORE_TVL > 0 ? (coreYield / CORE_TVL) * 100 : 0;
  const seamApyPct = SEAM_TVL > 0 ? (seamYield / SEAM_TVL) * 100 : 0;
  const apexApyPct = APEX_TVL > 0 ? (apexYield / APEX_TVL) * 100 : 0;

  // Status
  let status: SimResult["status"] = "healthy";
  let note = "All tiers fully paid. APEX earns leveraged residual.";

  if (coreLoss > 0) {
    status = "core_hit";
    note = "⚠️ APEX and SEAM depleted. CORE principal absorbing losses — extreme scenario.";
  } else if (seamLoss > 0) {
    status = "seam_hit";
    note = "APEX buffer depleted. SEAM principal absorbing remaining shortfall.";
  } else if (apexLoss > 0 && capitalLossUsd === 0) {
    status = "apex_deficit";
    note = "Yield too low to cover CORE+SEAM targets. APEX principal absorbs deficit. CORE and SEAM fully protected.";
  } else if (apexLoss > 0) {
    status = "apex_deficit";
    note = "Capital loss absorbed by APEX. CORE and SEAM principal unaffected.";
  }

  return {
    coreYield, seamYield, apexYield,
    coreApyPct, seamApyPct, apexApyPct,
    coreLoss, seamLoss, apexLoss,
    coreFinalTvl, seamFinalTvl, apexFinalTvl,
    status, note,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function pct(n: number) {
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

function TierResult({
  name, principal, yield: yld, apy, loss, finalTvl, lossColor, apyColor,
}: {
  name: string; principal: number; yield: number; apy: number; loss: number;
  finalTvl: number; lossColor: string; apyColor: string;
}) {
  const lossPct = principal > 0 ? (loss / principal) * 100 : 0;
  return (
    <div className="border border-gray-200 p-4">
      <p className="text-xs text-gray-400 uppercase mb-3">{name}</p>

      {/* APY — big number */}
      <div className="mb-4">
        <p className="text-xs text-gray-500">Effective APY</p>
        <p className={`text-3xl font-bold font-mono ${apyColor}`}>{pct(apy)}</p>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Starting TVL</span>
          <span className="font-mono">{fmt(principal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Yield earned</span>
          <span className="font-mono text-green-700">+{fmt(yld)}</span>
        </div>
        {loss > 0 && (
          <div className="flex justify-between">
            <span className={lossColor}>Principal absorbed</span>
            <span className={`font-mono ${lossColor}`}>−{fmt(loss)} ({lossPct.toFixed(1)}%)</span>
          </div>
        )}
        <div className="flex justify-between border-t border-gray-100 pt-2 font-bold">
          <span className="text-gray-600">Final balance</span>
          <span className={`font-mono ${loss > 0 ? lossColor : "text-black"}`}>{fmt(finalTvl + yld)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ScenariosPage() {
  const [activeScenario, setActiveScenario] = useState<string>("normal");
  const [customApy, setCustomApy]   = useState(6);
  const [customLoss, setCustomLoss] = useState(0);
  const [isCustom, setIsCustom]     = useState(false);

  const scenario = SCENARIOS.find((s) => s.id === activeScenario)!;
  const stratApy = isCustom ? customApy : scenario.strategyApyPct;
  const lossUsd  = isCustom ? customLoss : scenario.capitalLossUsd;

  const result = simulate(stratApy, lossUsd);

  const statusBg: Record<SimResult["status"], string> = {
    healthy:      "bg-green-50 border-green-200",
    apex_deficit: "bg-yellow-50 border-yellow-200",
    seam_hit:     "bg-orange-50 border-orange-200",
    core_hit:     "bg-red-50 border-red-200",
  };

  const apexApyColor =
    result.apexApyPct > result.seamApyPct ? "text-red-700" :
    result.apexApyPct > 0                ? "text-orange-600" :
                                           "text-gray-400";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Tranche Scenarios</h1>
      <p className="text-sm text-gray-400 mb-6">
        How the CDO waterfall distributes yield and absorbs losses across different market conditions
      </p>

      {/* Pool setup reference */}
      <div className="border border-gray-200 p-4 mb-6 text-xs">
        <p className="font-bold mb-2 text-sm">Simulation Setup</p>
        <div className="grid grid-cols-4 gap-4 font-mono">
          <div>
            <p className="text-gray-400">Total TVL</p>
            <p className="font-bold">{fmt(TOTAL_TVL)}</p>
          </div>
          <div>
            <p className="text-green-700">CORE (42.5%)</p>
            <p className="font-bold">{fmt(CORE_TVL)} · {CORE_TARGET_PCT}% guaranteed</p>
          </div>
          <div>
            <p className="text-yellow-700">SEAM (42.5%)</p>
            <p className="font-bold">{fmt(SEAM_TVL)} · {SEAM_TARGET_PCT}% guaranteed</p>
          </div>
          <div>
            <p className="text-red-700">APEX (15%)</p>
            <p className="font-bold">{fmt(APEX_TVL)} · first-loss buffer</p>
          </div>
        </div>
      </div>

      {/* Scenario selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => { setActiveScenario(s.id); setIsCustom(false); }}
            className={`text-left p-3 border text-xs transition-colors ${
              !isCustom && activeScenario === s.id
                ? "border-black bg-black text-white"
                : "border-gray-200 hover:border-gray-400"
            }`}
          >
            <p className="font-bold">{s.label}</p>
            <p className={`font-mono mt-0.5 ${!isCustom && activeScenario === s.id ? "text-gray-300" : "text-gray-500"}`}>
              {s.tag}
            </p>
          </button>
        ))}
        <button
          onClick={() => setIsCustom(true)}
          className={`text-left p-3 border text-xs transition-colors ${
            isCustom
              ? "border-black bg-black text-white"
              : "border-dashed border-gray-300 hover:border-gray-400"
          }`}
        >
          <p className="font-bold">🔧 Custom</p>
          <p className={`font-mono mt-0.5 ${isCustom ? "text-gray-300" : "text-gray-500"}`}>
            set your own
          </p>
        </button>
      </div>

      {/* Scenario description / custom inputs */}
      <div className="mb-6">
        {isCustom ? (
          <div className="border border-dashed border-gray-300 p-4 grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <label className="block text-xs text-gray-500 mb-2">
                Strategy APY: <span className="font-mono font-bold text-black">{customApy}%</span>
              </label>
              <input
                type="range" min={-25} max={25} step={0.5}
                value={customApy}
                onChange={(e) => setCustomApy(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>−25%</span><span>0%</span><span>+25%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-2">
                Capital loss: <span className="font-mono font-bold text-black">{fmt(customLoss)}</span>
              </label>
              <input
                type="range" min={0} max={3000} step={100}
                value={customLoss}
                onChange={(e) => setCustomLoss(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>$0</span><span>$1,500 (APEX)</span><span>$3,000</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            {scenario.desc}
          </div>
        )}
      </div>

      {/* Strategy yield bar */}
      <div className="border border-gray-200 p-4 mb-6">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-gray-500">Strategy yield on {fmt(TOTAL_TVL)} TVL</span>
          <span className={`font-mono font-bold ${stratApy >= 0 ? "text-green-700" : "text-red-700"}`}>
            {stratApy >= 0 ? "+" : ""}{(TOTAL_TVL * stratApy / 100).toFixed(0)} USDC/yr
            &nbsp;({stratApy}% APY)
          </span>
        </div>
        <div className="h-3 bg-gray-100 w-full">
          {stratApy >= 0 ? (
            <div
              className="h-3 bg-green-500 transition-all"
              style={{ width: `${Math.min(stratApy / 25 * 100, 100)}%` }}
            />
          ) : (
            <div
              className="h-3 bg-red-500 transition-all ml-auto"
              style={{ width: `${Math.min(Math.abs(stratApy) / 25 * 100, 100)}%` }}
            />
          )}
        </div>
        <div className="flex justify-between text-xs text-gray-300 mt-1">
          <span>−25%</span>
          <span className="text-gray-500">
            CORE+SEAM floor: {((CORE_TVL * CORE_TARGET_PCT / 100 + SEAM_TVL * SEAM_TARGET_PCT / 100) / TOTAL_TVL * 100).toFixed(2)}%
          </span>
          <span>+25%</span>
        </div>
      </div>

      {/* Outcome status */}
      <div className={`border px-4 py-3 mb-6 text-sm ${statusBg[result.status]}`}>
        <p>{result.note}</p>
      </div>

      {/* Tier results */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <TierResult
          name="CORE — Last-loss ③"
          principal={CORE_TVL}
          yield={result.coreYield}
          apy={result.coreApyPct}
          loss={result.coreLoss}
          finalTvl={result.coreFinalTvl}
          lossColor="text-red-700"
          apyColor="text-green-700"
        />
        <TierResult
          name="SEAM — Second-loss ②"
          principal={SEAM_TVL}
          yield={result.seamYield}
          apy={result.seamApyPct}
          loss={result.seamLoss}
          finalTvl={result.seamFinalTvl}
          lossColor="text-orange-600"
          apyColor="text-yellow-700"
        />
        <TierResult
          name="APEX — First-loss ①"
          principal={APEX_TVL}
          yield={result.apexYield}
          apy={result.apexApyPct}
          loss={result.apexLoss}
          finalTvl={result.apexFinalTvl}
          lossColor="text-red-700"
          apyColor={apexApyColor}
        />
      </div>

      {/* Waterfall breakdown */}
      <div className="border border-gray-200 mb-8">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-bold">Waterfall Breakdown</p>
        </div>
        <div className="p-4 space-y-3 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-gray-500">Strategy yield ({stratApy}% × {fmt(TOTAL_TVL)})</span>
            <span className={stratApy >= 0 ? "text-green-700" : "text-red-700"}>
              {stratApy >= 0 ? "+" : ""}{(TOTAL_TVL * stratApy / 100).toFixed(0)} USDC
            </span>
          </div>
          <div className="flex justify-between pl-4">
            <span className="text-green-700">→ CORE receives ({CORE_TARGET_PCT}% × {fmt(CORE_TVL)})</span>
            <span>−{result.coreYield.toFixed(0)} USDC</span>
          </div>
          <div className="flex justify-between pl-4">
            <span className="text-yellow-700">→ SEAM receives ({SEAM_TARGET_PCT}% × {fmt(SEAM_TVL)})</span>
            <span>−{result.seamYield.toFixed(0)} USDC</span>
          </div>
          <div className="flex justify-between pl-4 border-t border-gray-100 pt-2">
            <span className="text-red-700">→ APEX residual</span>
            <span className={result.apexYield > 0 ? "text-red-700" : "text-gray-400"}>
              {result.apexYield > 0 ? "+" : ""}{result.apexYield.toFixed(0)} USDC
            </span>
          </div>
          {(result.apexLoss > 0 || result.seamLoss > 0 || result.coreLoss > 0) && (
            <>
              <div className="border-t border-gray-200 pt-2">
                <p className="text-gray-500 mb-2">Loss absorption:</p>
              </div>
              {result.apexLoss > 0 && (
                <div className="flex justify-between pl-4">
                  <span className="text-red-700">APEX principal absorbed</span>
                  <span className="text-red-700">−{result.apexLoss.toFixed(0)} USDC</span>
                </div>
              )}
              {result.seamLoss > 0 && (
                <div className="flex justify-between pl-4">
                  <span className="text-orange-600">SEAM principal absorbed</span>
                  <span className="text-orange-600">−{result.seamLoss.toFixed(0)} USDC</span>
                </div>
              )}
              {result.coreLoss > 0 && (
                <div className="flex justify-between pl-4">
                  <span className="text-red-900">CORE principal absorbed</span>
                  <span className="text-red-900">−{result.coreLoss.toFixed(0)} USDC</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* APY comparison bar chart */}
      <div className="border border-gray-200 p-4">
        <p className="text-sm font-bold mb-4">APY Comparison</p>
        {[
          { label: "CORE", apy: result.coreApyPct, color: "bg-green-500", textColor: "text-green-700" },
          { label: "SEAM", apy: result.seamApyPct, color: "bg-yellow-400", textColor: "text-yellow-700" },
          { label: "APEX", apy: result.apexApyPct, color: "bg-red-500",   textColor: "text-red-700"   },
        ].map(({ label, apy, color, textColor }) => {
          const maxApy = Math.max(result.coreApyPct, result.seamApyPct, result.apexApyPct, 0.1);
          return (
            <div key={label} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className={`font-bold ${textColor}`}>{label}</span>
                <span className={`font-mono font-bold ${textColor}`}>{pct(apy)}</span>
              </div>
              <div className="h-4 bg-gray-100 w-full">
                <div
                  className={`h-4 ${color} transition-all`}
                  style={{ width: `${Math.max(apy / maxApy * 100, 0)}%` }}
                />
              </div>
            </div>
          );
        })}
        <p className="text-xs text-gray-400 mt-3">
          {result.apexApyPct > result.seamApyPct
            ? `APEX earns ${(result.apexApyPct / Math.max(result.coreApyPct, 0.01)).toFixed(1)}× CORE — leverage at work.`
            : result.apexApyPct === 0
            ? "APEX earns 0% — absorbing losses instead."
            : "APY reversal: low strategy yield means APEX earns less than CORE despite first-loss risk."}
        </p>
      </div>
    </div>
  );
}
