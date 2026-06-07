"use client";
import { useReadContracts } from "wagmi";
import { VAULT_ADDRESS, VAULT_ABI } from "../../lib/contracts";
import { formatUsdc } from "../../lib/utils";

type SafetyLevel = "HEALTHY" | "CAUTION" | "WARNING" | "DANGER" | "CRITICAL" | "EMPTY";

function getSafetyLevel(apexRatio: number, totalPrincipal: bigint): SafetyLevel {
  if (totalPrincipal === 0n) return "EMPTY";
  if (apexRatio >= 20) return "HEALTHY";
  if (apexRatio >= 15) return "CAUTION";
  if (apexRatio >= 10) return "WARNING";
  if (apexRatio >= 5)  return "DANGER";
  return "CRITICAL";
}

const LEVEL_CONFIG: Record<SafetyLevel, {
  label: string; color: string; bg: string; border: string;
  coreDeposits: boolean; apexDeposits: boolean; seniorAPY: string; desc: string;
}> = {
  HEALTHY:  { label: "Healthy",  color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200", coreDeposits: true,  apexDeposits: true,  seniorAPY: "4–6%",  desc: "Optimal protocol health with strong APEX buffer." },
  CAUTION:  { label: "Caution",  color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200",coreDeposits: true,  apexDeposits: true,  seniorAPY: "4–6%",  desc: "Protocol operating normally with adequate buffer." },
  WARNING:  { label: "Warning",  color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200",coreDeposits: true,  apexDeposits: true,  seniorAPY: "4–5%",  desc: "APEX buffer approaching critical levels." },
  DANGER:   { label: "Danger",   color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",   coreDeposits: false, apexDeposits: true,  seniorAPY: "3–4%",  desc: "Critical buffer — CORE deposits restricted." },
  CRITICAL: { label: "Critical", color: "text-red-900",    bg: "bg-red-100",   border: "border-red-400",   coreDeposits: false, apexDeposits: false, seniorAPY: "2–3%",  desc: "Emergency state. All deposits should be paused." },
  EMPTY:    { label: "—",        color: "text-gray-400",   bg: "bg-gray-50",   border: "border-gray-200",  coreDeposits: true,  apexDeposits: true,  seniorAPY: "4–6%",  desc: "No TVL yet." },
};

const LEVEL_TABLE = [
  { level: "HEALTHY",  threshold: "≥ 20%", coreAPY: "4–6%",  desc: "All deposits enabled",                     color: "text-green-700" },
  { level: "CAUTION",  threshold: "15–20%",coreAPY: "4–6%",  desc: "All deposits enabled",                     color: "text-yellow-700" },
  { level: "WARNING",  threshold: "10–15%",coreAPY: "4–5%",  desc: "Monitoring closely",                       color: "text-orange-700" },
  { level: "DANGER",   threshold: "5–10%", coreAPY: "3–4%",  desc: "CORE deposits restricted",                 color: "text-red-700" },
  { level: "CRITICAL", threshold: "< 5%",  coreAPY: "2–3%",  desc: "Emergency — all deposits should be paused",color: "text-red-900" },
];

export default function SafetyPage() {
  const { data } = useReadContracts({
    contracts: [
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "corePrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamPrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexPrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreTargetMinBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreTargetMaxBps" },
    ],
  });

  const r = (i: number) => data?.[i]?.status === "success" ? (data[i].result as bigint) : 0n;
  const corePrincipal = r(0), seamPrincipal = r(1), apexPrincipal = r(2);
  const coreMin = r(3), coreMax = r(4);

  const totalPrincipal = corePrincipal + seamPrincipal + apexPrincipal;
  const apexRatioPct = totalPrincipal > 0n
    ? Number((apexPrincipal * 10000n) / totalPrincipal) / 100
    : 0;

  const level = getSafetyLevel(apexRatioPct, totalPrincipal);
  const cfg = LEVEL_CONFIG[level];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Safety Monitor</h1>
      <p className="text-sm text-gray-400 mb-6">Real-time protocol health and APEX buffer system</p>

      {/* Current status */}
      <div className={`border ${cfg.border} ${cfg.bg} p-5 mb-6`}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-gray-500 mb-1">Current Safety Level</p>
            <p className={`text-3xl font-bold ${cfg.color}`}>{cfg.label}</p>
            <p className="text-sm text-gray-500 mt-1">{cfg.desc}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-1">APEX Buffer Ratio</p>
            <p className={`text-3xl font-bold font-mono ${cfg.color}`}>{totalPrincipal > 0n ? `${apexRatioPct.toFixed(2)}%` : "—"}</p>
            <p className="text-xs text-gray-400 mt-1">Min: 10.0%</p>
          </div>
        </div>

        {/* Gauge */}
        <div className="mt-4">
          <div className="h-2 bg-white/60 w-full">
            <div
              className={`h-2 transition-all ${
                level === "HEALTHY"  ? "bg-green-500" :
                level === "CAUTION"  ? "bg-yellow-400" :
                level === "WARNING"  ? "bg-orange-400" :
                level === "DANGER"   ? "bg-red-400" :
                level === "CRITICAL" ? "bg-red-700" : "bg-gray-300"
              }`}
              style={{ width: `${Math.min(apexRatioPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0%</span><span>5%</span><span>10%</span><span>20%</span><span>100%</span>
          </div>
        </div>
      </div>

      {/* Deposit status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">CORE APY Target</p>
          <p className="text-xl font-bold font-mono">
            {data ? `${(Number(coreMin) / 100).toFixed(1)}–${(Number(coreMax) / 100).toFixed(1)}%` : "—"}
          </p>
        </div>
        <div className={`border p-4 ${cfg.coreDeposits ? "border-gray-200" : "border-orange-200 bg-orange-50"}`}>
          <p className="text-xs text-gray-400 mb-1">CORE Deposits</p>
          <p className={`text-sm font-bold ${cfg.coreDeposits ? "text-green-700" : "text-orange-700"}`}>
            {cfg.coreDeposits ? "✓ Enabled" : "⚠ Restricted"}
          </p>
        </div>
        <div className={`border p-4 ${cfg.apexDeposits ? "border-gray-200" : "border-red-200 bg-red-50"}`}>
          <p className="text-xs text-gray-400 mb-1">APEX Deposits</p>
          <p className={`text-sm font-bold ${cfg.apexDeposits ? "text-green-700" : "text-red-700"}`}>
            {cfg.apexDeposits ? "✓ Enabled" : "✗ Disabled"}
          </p>
        </div>
      </div>

      {/* Principal breakdown */}
      <div className="border border-gray-200 p-4 mb-6">
        <p className="text-sm font-bold mb-3">Principal Breakdown</p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400">CORE</p>
            <p className="font-mono font-bold">{formatUsdc(corePrincipal)}</p>
            <p className="text-xs text-gray-400">
              {totalPrincipal > 0n ? `${(Number((corePrincipal * 10000n) / totalPrincipal) / 100).toFixed(1)}%` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">SEAM</p>
            <p className="font-mono font-bold">{formatUsdc(seamPrincipal)}</p>
            <p className="text-xs text-gray-400">
              {totalPrincipal > 0n ? `${(Number((seamPrincipal * 10000n) / totalPrincipal) / 100).toFixed(1)}%` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">APEX (buffer)</p>
            <p className="font-mono font-bold">{formatUsdc(apexPrincipal)}</p>
            <p className={`text-xs font-bold ${cfg.color}`}>
              {totalPrincipal > 0n ? `${apexRatioPct.toFixed(1)}%` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Safety level table */}
      <div className="border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-bold">Safety Level System</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400">
              <th className="text-left px-4 py-2">Level</th>
              <th className="text-left px-4 py-2">APEX Ratio</th>
              <th className="text-left px-4 py-2">CORE APY</th>
              <th className="text-left px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {LEVEL_TABLE.map((row) => (
              <tr
                key={row.level}
                className={`border-b border-gray-100 ${level === row.level ? "bg-gray-50 font-bold" : ""}`}
              >
                <td className={`px-4 py-3 ${row.color}`}>{row.level} {level === row.level && "←"}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.threshold}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.coreAPY}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{row.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
