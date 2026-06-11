import type { ReactNode, HTMLAttributes } from "react";

type Tone = "neutral" | "ink" | "core" | "seam" | "apex" | "positive" | "warning" | "danger";

const TONES: Record<Tone, { bg: string; fg: string; bd: string }> = {
  neutral:  { bg: "var(--surface-sunken)", fg: "var(--text-muted)",   bd: "var(--border)" },
  ink:      { bg: "var(--rock-900)",        fg: "var(--sand-50)",      bd: "transparent" },
  core:     { bg: "var(--core-100)",        fg: "var(--core-700)",     bd: "transparent" },
  seam:     { bg: "var(--seam-100)",        fg: "var(--seam-700)",     bd: "transparent" },
  apex:     { bg: "var(--apex-100)",        fg: "var(--apex-700)",     bd: "transparent" },
  positive: { bg: "var(--positive-bg)",     fg: "var(--positive)",     bd: "transparent" },
  warning:  { bg: "var(--warning-bg)",      fg: "var(--warning)",      bd: "transparent" },
  danger:   { bg: "var(--danger-bg)",       fg: "var(--danger)",       bd: "transparent" },
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  outline?: boolean;
  mono?: boolean;
}

export function Badge({ children, tone = "neutral", dot = false, outline = false, mono = false, style, ...rest }: BadgeProps) {
  const t = TONES[tone];
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
        fontWeight: 600, fontSize: "11px",
        letterSpacing: mono ? "0.02em" : "0.06em",
        textTransform: mono ? "none" : "uppercase",
        lineHeight: 1, padding: "5px 10px",
        borderRadius: "var(--r-pill)",
        background: outline ? "transparent" : t.bg,
        color: t.fg,
        border: `1px solid ${outline ? t.fg : t.bd}`,
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {dot && <span style={{ width: 7, height: 7, borderRadius: "var(--r-pill)", background: "currentColor", flex: "none" }} />}
      {children}
    </span>
  );
}
