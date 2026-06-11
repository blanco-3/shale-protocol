import React from "react";

/**
 * Metric tile — eyebrow label, big mono value, optional sub & delta.
 * The workhorse of SHALE dashboards (TVL, APY, epoch, buffer).
 */
export function StatTile({ label, value, sub, delta, deltaTone = "positive", align = "left", style, ...rest }) {
  const deltaColor =
    deltaTone === "positive" ? "var(--positive)" :
    deltaTone === "danger" ? "var(--danger)" :
    deltaTone === "warning" ? "var(--warning)" : "var(--text-muted)";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        textAlign: align,
        ...style,
      }}
      {...rest}
    >
      <span style={{
        font: "var(--fw-semibold) var(--text-2xs)/1 var(--font-sans)",
        letterSpacing: "var(--ls-wider)",
        textTransform: "uppercase",
        color: "var(--text-muted)",
      }}>{label}</span>
      <span style={{
        fontFamily: "var(--font-mono)",
        fontWeight: 500,
        fontSize: "var(--text-2xl)",
        lineHeight: 1,
        letterSpacing: "-0.02em",
        color: "var(--text-strong)",
        fontVariantNumeric: "tabular-nums",
      }}>{value}</span>
      {(sub || delta) && (
        <span style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "1px" }}>
          {delta != null && (
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "var(--text-xs)", color: deltaColor }}>
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
