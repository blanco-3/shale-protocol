import type { HTMLAttributes } from "react";

type Tone = "core" | "seam" | "apex" | "positive" | "warning" | "danger" | "ink" | "accent";

const TONE: Record<Tone, string> = {
  core:     "var(--core-500)",
  seam:     "var(--seam-500)",
  apex:     "var(--apex-500)",
  positive: "var(--positive)",
  warning:  "var(--warning)",
  danger:   "var(--danger)",
  ink:      "var(--rock-700)",
  accent:   "var(--accent-500)",
};

interface StrataBarProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  tone?: Tone;
  target?: number;
  height?: number;
  label?: string;
  valueLabel?: string;
}

export function StrataBar({ value = 0, max = 100, tone = "ink", target, height = 10, label, valueLabel, style, ...rest }: StrataBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill = TONE[tone] || tone;
  const targetPct = target != null ? Math.max(0, Math.min(100, (target / max) * 100)) : null;

  return (
    <div style={{ ...style }} {...rest}>
      {(label || valueLabel) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "7px" }}>
          {label && <span style={{ font: "var(--fw-medium) var(--text-xs)/1 var(--font-sans)", color: "var(--text-muted)" }}>{label}</span>}
          {valueLabel && <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "12px", color: "var(--text-strong)", fontVariantNumeric: "tabular-nums" }}>{valueLabel}</span>}
        </div>
      )}
      <div style={{
        position: "relative", height: `${height}px`, width: "100%",
        background: "var(--surface-sunken)", borderRadius: "var(--r-pill)",
        boxShadow: "inset 0 1px 2px rgba(26,23,20,0.10)", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0, width: `${pct}%`,
          background: fill,
          backgroundImage: "repeating-linear-gradient(118deg, rgba(255,255,255,0.10) 0 6px, rgba(0,0,0,0.04) 6px 12px)",
          borderRadius: "var(--r-pill)",
          transition: "width var(--dur-slow) var(--ease-out)",
        }} />
        {targetPct != null && (
          <div aria-hidden style={{
            position: "absolute", top: "-2px", bottom: "-2px", left: `${targetPct}%`,
            width: "2px", background: "var(--rock-900)", borderRadius: "1px",
          }} />
        )}
      </div>
    </div>
  );
}
