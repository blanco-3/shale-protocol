export function bpsToPercent(bps: bigint | number): string {
  return (Number(bps) / 100).toFixed(2) + "%";
}

export function formatUsdc(amount: bigint): string {
  return "$" + (Number(amount) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2 });
}

export function parseUsdc(input: string): bigint {
  const n = parseFloat(input);
  if (isNaN(n) || n <= 0) return 0n;
  return BigInt(Math.floor(n * 1e6));
}

export const TIERS = [
  { id: 0, name: "CORE", label: "Stable", description: "First priority yield. CORE depositors receive waterfall yield before other tiers. Lowest risk." },
  { id: 1, name: "SEAM", label: "Balanced", description: "Second priority. Receives yield after CORE is satisfied. Moderate risk and return." },
  { id: 2, name: "APEX", label: "Aggressive", description: "Receives all remaining yield after CORE and SEAM. Highest risk, highest upside. APEX principal absorbs shortfalls." },
] as const;

export type TierId = 0 | 1 | 2;
