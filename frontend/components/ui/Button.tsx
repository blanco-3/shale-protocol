"use client";
import { useState, type ReactNode, type ButtonHTMLAttributes } from "react";

type Variant = "solid" | "outline" | "ghost";
type Tone = "default" | "core" | "seam" | "apex" | "accent";
type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { fontSize: string; padding: string; height: string; radius: string; gap: string }> = {
  sm: { fontSize: "12px", padding: "7px 13px",  height: "32px", radius: "var(--r-sm)", gap: "6px" },
  md: { fontSize: "13px", padding: "9px 17px",  height: "40px", radius: "var(--r-md)", gap: "8px" },
  lg: { fontSize: "15px", padding: "13px 24px", height: "50px", radius: "var(--r-md)", gap: "10px" },
};

const TONES: Record<Tone, string> = {
  default: "var(--rock-900)",
  core:    "var(--core-600)",
  seam:    "var(--seam-600)",
  apex:    "var(--apex-600)",
  accent:  "var(--accent-600)",
};

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: Variant;
  tone?: Tone;
  size?: Size;
  fullWidth?: boolean;
  iconRight?: ReactNode;
  iconLeft?: ReactNode;
}

export function Button({
  children, variant = "solid", tone = "default", size = "md",
  fullWidth = false, disabled = false, iconRight, iconLeft, style, ...rest
}: ButtonProps) {
  const s = SIZES[size];
  const c = TONES[tone];
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);

  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: s.gap, fontFamily: "var(--font-sans)", fontWeight: 600,
    fontSize: s.fontSize, letterSpacing: "0.01em", lineHeight: 1,
    height: s.height, padding: s.padding, width: fullWidth ? "100%" : undefined,
    borderRadius: s.radius, cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1, whiteSpace: "nowrap", userSelect: "none",
    border: "none", outline: "none",
    transition: "background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)",
    transform: pressed && !disabled ? "translateY(1px)" : "none",
  };

  let look: React.CSSProperties;
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
      onMouseLeave={() => { setHover(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{ ...base, ...look, ...style }}
      {...rest}
    >
      {iconLeft}{children}{iconRight}
    </button>
  );
}
