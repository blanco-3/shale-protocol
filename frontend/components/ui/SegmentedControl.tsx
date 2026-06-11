"use client";
import type { HTMLAttributes } from "react";

type Tone = "core" | "seam" | "apex" | "default";
type Size = "sm" | "md" | "lg";

const TONE: Record<Tone, string> = {
  core: "var(--core-600)",
  seam: "var(--seam-600)",
  apex: "var(--apex-600)",
  default: "var(--rock-900)",
};

export interface SegmentOption {
  value: string;
  label: string;
  sub?: string;
  tone?: Tone;
}

interface SegmentedControlProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: SegmentOption[];
  value: string;
  onChange?: (value: string) => void;
  size?: Size;
}

export function SegmentedControl({ options, value, onChange, size = "md", style, ...rest }: SegmentedControlProps) {
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
        const tone = TONE[opt.tone ?? "default"];
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange?.(opt.value)}
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
