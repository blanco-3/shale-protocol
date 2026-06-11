import React from "react";

const CONFIG = {
  1: { lit: 1, color: "var(--core-500)", label: "Low Risk" },
  2: { lit: 2, color: "var(--seam-500)", label: "Med Risk" },
  3: { lit: 3, color: "var(--apex-500)", label: "High Risk" },
};

/**
 * Three-dot risk indicator with label. Lit dots use the tier tone,
 * unlit dots fall back to a faint sand fill. Mirrors the live app's
 * CORE/SEAM/APEX risk dots.
 */
export function RiskMeter({ level = 1, showLabel = true, dotSize = 8, style, ...rest }) {
  const c = CONFIG[level] || CONFIG[1];
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", ...style }} {...rest}>
      <div style={{ display: "flex", gap: "5px" }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            width: dotSize, height: dotSize, borderRadius: "var(--r-pill)",
            background: i < c.lit ? c.color : "var(--rock-100)",
            boxShadow: i < c.lit ? "none" : "inset 0 0 0 1px var(--border)",
          }} />
        ))}
      </div>
      {showLabel && (
        <span style={{ font: "var(--fw-semibold) var(--text-xs)/1 var(--font-sans)", color: c.color }}>{c.label}</span>
      )}
    </div>
  );
}
