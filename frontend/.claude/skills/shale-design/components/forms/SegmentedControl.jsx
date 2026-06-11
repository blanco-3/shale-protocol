import React from "react";

const TONE = { core: "var(--core-600)", seam: "var(--seam-600)", apex: "var(--apex-600)", default: "var(--rock-900)" };

/**
 * Segmented control — the SHALE tier selector. Each option is a
 * slab; the selected slab fills with ink (or its tier tone).
 * options: [{ value, label, sub, tone }]
 */
export function SegmentedControl({ options = [], value, onChange, size = "md", style, ...rest }) {
  const pad = size === "lg" ? "12px 14px" : size === "sm" ? "7px 10px" : "10px 12px";
  return (
    <div
      role="tablist"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        gap: "8px",
        ...style,
      }}
      {...rest}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        const tone = TONE[opt.tone] || TONE.default;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange && onChange(opt.value)}
            style={{
              display: "flex", flexDirection: "column", gap: "3px",
              textAlign: "left", padding: pad,
              borderRadius: "var(--r-md)",
              cursor: "pointer",
              background: selected ? tone : "var(--surface-raised)",
              color: selected ? "var(--sand-50)" : "var(--text-body)",
              border: `1.5px solid ${selected ? tone : "var(--border)"}`,
              boxShadow: selected ? "var(--shadow-sm)" : "none",
              transition: "all var(--dur-fast) var(--ease-out)",
            }}
            onMouseEnter={(e) => { if (!selected) e.currentTarget.style.borderColor = "var(--rock-400)"; }}
            onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: size === "sm" ? "12px" : "14px", letterSpacing: "0.02em" }}>{opt.label}</span>
            {opt.sub && (
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "11px", fontWeight: 500, opacity: selected ? 0.8 : 0.65 }}>{opt.sub}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
