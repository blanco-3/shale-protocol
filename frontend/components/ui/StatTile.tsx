import type { HTMLAttributes, ReactNode } from "react";

type DeltaTone = "positive" | "danger" | "warning" | "neutral";
type TileSize = "sm" | "md" | "lg";

const VALUE_SIZE: Record<TileSize, string> = {
  sm: "var(--text-lg)",   // 20px — compact stat bars
  md: "var(--text-xl)",   // 25px — standard
  lg: "var(--text-2xl)",  // 32px — hero KPI
};

interface StatTileProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: ReactNode;
  sub?: string;
  delta?: string;
  deltaTone?: DeltaTone;
  align?: "left" | "center" | "right";
  size?: TileSize;
}

const DELTA_COLORS: Record<DeltaTone, string> = {
  positive: "var(--positive)",
  danger:   "var(--danger)",
  warning:  "var(--warning)",
  neutral:  "var(--text-muted)",
};

export function StatTile({ label, value, sub, delta, deltaTone = "positive", align = "left", size = "md", style, ...rest }: StatTileProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", textAlign: align, minWidth: 0, ...style }} {...rest}>
      <span style={{
        font: "var(--fw-semibold) var(--text-2xs)/1 var(--font-sans)",
        letterSpacing: "var(--ls-wider)", textTransform: "uppercase", color: "var(--text-muted)",
      }}>{label}</span>
      <span style={{
        fontFamily: "var(--font-mono)", fontWeight: 500,
        fontSize: VALUE_SIZE[size], lineHeight: 1,
        letterSpacing: "-0.02em", color: "var(--text-strong)",
        fontVariantNumeric: "tabular-nums",
        overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
      }}>{value}</span>
      {(sub || delta) && (
        <span style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "1px" }}>
          {delta && (
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "var(--text-xs)", color: DELTA_COLORS[deltaTone] }}>
              {delta}
            </span>
          )}
          {sub && (
            <span style={{ font: "400 var(--text-xs)/1.3 var(--font-sans)", color: "var(--text-faint)" }}>{sub}</span>
          )}
        </span>
      )}
    </div>
  );
}
