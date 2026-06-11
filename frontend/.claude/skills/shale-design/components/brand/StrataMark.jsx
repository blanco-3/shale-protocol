import React from "react";

/**
 * The SHALE strata mark, drawn inline so it scales crisply and can sit
 * on any surface. Three diagonal rock layers on bedrock — the exact
 * geometry of the brand icon. Optionally pairs with the wordmark.
 */
export function StrataMark({ size = 40, wordmark = false, wordmarkStyle = "serif", color, style, ...rest }) {
  const svg = (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", flex: "none" }} aria-label="SHALE">
      <defs>
        <clipPath id="shaleClip"><rect width="512" height="512" rx="72" /></clipPath>
      </defs>
      <rect width="512" height="512" rx="72" fill="#1a1714" />
      <g clipPath="url(#shaleClip)">
        <polygon points="-100,-100 612,-100 612,230 -100,60" fill="#d9a96b" />
        <polygon points="-100,60 612,230 612,450 -100,280" fill="#5c3318" />
        <polygon points="-100,280 612,450 612,612 -100,612" fill="#a06828" />
        <line x1="-100" y1="60" x2="612" y2="230" stroke="#1a1714" strokeWidth="22" />
        <line x1="-100" y1="280" x2="612" y2="450" stroke="#1a1714" strokeWidth="22" />
      </g>
    </svg>
  );

  if (!wordmark) return <span style={{ display: "inline-flex", ...style }} {...rest}>{svg}</span>;

  const isCaps = wordmarkStyle === "caps";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: `${size * 0.32}px`, ...style }} {...rest}>
      {svg}
      <span style={{
        fontFamily: isCaps ? "var(--font-sans)" : "var(--font-serif)",
        fontWeight: isCaps ? 800 : 700,
        fontSize: `${size * (isCaps ? 0.62 : 0.92)}px`,
        letterSpacing: isCaps ? "0.22em" : "-0.02em",
        textTransform: isCaps ? "uppercase" : "none",
        lineHeight: 1,
        color: color || "var(--rock-600)",
      }}>{isCaps ? "SHALE" : "shale"}</span>
    </span>
  );
}
