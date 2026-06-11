export function bpsToPercent(bps: bigint | number): string {
  return (Number(bps) / 100).toFixed(2) + "%";
}

export function formatUsdc(amount: bigint): string {
  return "$" + (Number(amount) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2 });
}

/** Compact: $750K · $1.2M · $1.5B — for tight stat tiles */
export function formatUsdcCompact(amount: bigint): string {
  const n = Number(amount) / 1e6;
  if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)         return "$" + (n / 1_000).toFixed(1) + "K";
  return "$" + n.toFixed(2);
}

export function parseUsdc(input: string): bigint {
  const n = parseFloat(input);
  if (isNaN(n) || n <= 0) return 0n;
  return BigInt(Math.floor(n * 1e6));
}

export const TIERS = [
  {
    id: 0,
    name: "CORE",
    label: "Stable",
    description: "Receives yield first, every epoch, regardless of strategy performance. Last in line for any capital loss — APEX and SEAM absorb losses before CORE is touched.",
    riskLevel: 1 as const,
    lossPosition: "Last-loss  ③",
    riskColor: "text-green-700",
    riskBg: "bg-green-50",
    profile: "Capital preservation",
  },
  {
    id: 1,
    name: "SEAM",
    label: "Balanced",
    description: "Higher guaranteed APY than CORE. Absorbs losses only after APEX buffer is fully depleted — providing a meaningful safety margin while earning meaningfully more.",
    riskLevel: 2 as const,
    lossPosition: "Second-loss  ②",
    riskColor: "text-yellow-700",
    riskBg: "bg-yellow-50",
    profile: "Balanced yield",
  },
  {
    id: 2,
    name: "APEX",
    label: "Aggressive",
    description: "Captures all residual yield after CORE and SEAM are paid. First to absorb any strategy loss — but with leverage on upside: APEX earns proportionally more when strategies outperform.",
    riskLevel: 3 as const,
    lossPosition: "First-loss  ①",
    riskColor: "text-red-700",
    riskBg: "bg-red-50",
    profile: "Maximum yield",
  },
] as const;

export type TierId = 0 | 1 | 2;
