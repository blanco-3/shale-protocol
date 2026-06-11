import React from "react";

const SURFACES = {
  paper:  { background: "var(--surface-card)", color: "var(--text-body)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" },
  raised: { background: "var(--surface-raised)", color: "var(--text-body)", border: "1px solid var(--border-soft)", boxShadow: "var(--shadow-md)" },
  sunken: { background: "var(--surface-sunken)", color: "var(--text-body)", border: "1px solid var(--border-soft)", boxShadow: "none" },
  ink:    { background: "var(--surface-ink)", color: "var(--text-inverse)", border: "1px solid var(--border-ink)", boxShadow: "var(--shadow-lg)" },
};

const ACCENTS = { core: "var(--core-500)", seam: "var(--seam-500)", apex: "var(--apex-500)", accent: "var(--accent-500)" };

const PADS = { none: "0", sm: "16px", md: "22px", lg: "28px" };

/**
 * Surface container. Optional sedimentary top-edge accent (a thin
 * strata band) keyed to a tier, and optional hover lift.
 */
export function Card({ children, surface = "paper", accent, pad = "md", strataEdge = false, interactive = false, style, ...rest }) {
  const s = SURFACES[surface] || SURFACES.paper;
  const [hover, setHover] = React.useState(false);
  const accentColor = accent ? (ACCENTS[accent] || accent) : null;

  return (
    <div
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
      style={{
        position: "relative",
        borderRadius: "var(--r-lg)",
        padding: PADS[pad] ?? PADS.md,
        overflow: "hidden",
        transition: "transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)",
        transform: hover ? "translateY(-3px)" : "none",
        boxShadow: hover ? "var(--shadow-lg)" : s.boxShadow,
        cursor: interactive ? "pointer" : "default",
        ...s,
        ...style,
      }}
      {...rest}
    >
      {accentColor && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: strataEdge ? "6px" : "3px",
            background: strataEdge
              ? `repeating-linear-gradient(118deg, ${accentColor} 0 10px, var(--rock-900) 10px 11px)`
              : accentColor,
          }}
        />
      )}
      {children}
    </div>
  );
}
