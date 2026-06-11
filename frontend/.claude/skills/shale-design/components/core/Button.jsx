import React from "react";

const SIZES = {
  sm: { fontSize: "12px", padding: "7px 13px", height: "32px", radius: "var(--r-sm)", gap: "6px" },
  md: { fontSize: "13px", padding: "9px 17px", height: "40px", radius: "var(--r-md)", gap: "8px" },
  lg: { fontSize: "15px", padding: "13px 24px", height: "50px", radius: "var(--r-md)", gap: "10px" },
};

const TONES = {
  default: "var(--rock-900)",
  core: "var(--core-600)",
  seam: "var(--seam-600)",
  apex: "var(--apex-600)",
  accent: "var(--accent-600)",
};

/**
 * SHALE primary action button. Square-ish, weighted, no bounce.
 * variant: solid (ink fill) · outline (hairline) · ghost (text)
 * tone: default · core · seam · apex · accent
 */
export function Button({
  children,
  variant = "solid",
  tone = "default",
  size = "md",
  fullWidth = false,
  disabled = false,
  iconRight,
  iconLeft,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const c = TONES[tone] || TONES.default;
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);

  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: s.gap,
    fontFamily: "var(--font-sans)",
    fontWeight: 600,
    fontSize: s.fontSize,
    letterSpacing: "0.01em",
    lineHeight: 1,
    height: s.height,
    padding: s.padding,
    width: fullWidth ? "100%" : undefined,
    borderRadius: s.radius,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    transition: "background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)",
    transform: active && !disabled ? "translateY(1px)" : "none",
    whiteSpace: "nowrap",
    userSelect: "none",
  };

  let look;
  if (variant === "solid") {
    look = {
      background: hover && !disabled ? "var(--rock-800)" : c,
      color: "var(--sand-50)",
      border: "1.5px solid transparent",
      boxShadow: hover && !disabled ? "var(--shadow-md)" : "var(--shadow-xs)",
    };
    if (tone !== "default" && hover && !disabled) {
      look.background = c;
      look.filter = "brightness(1.08)";
    }
  } else if (variant === "outline") {
    look = {
      background: hover && !disabled ? c : "transparent",
      color: hover && !disabled ? "var(--sand-50)" : c,
      border: `1.5px solid ${c}`,
    };
  } else {
    look = {
      background: hover && !disabled ? "var(--surface-sunken)" : "transparent",
      color: c,
      border: "1.5px solid transparent",
    };
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{ ...base, ...look, ...style }}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
