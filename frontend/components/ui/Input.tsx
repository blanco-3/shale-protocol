"use client";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  mono?: boolean;
  inputStyle?: React.CSSProperties;
}

export function Input({
  label, hint, error, prefix, suffix, mono = true,
  type = "text", disabled = false, id, style, inputStyle, ...rest
}: InputProps) {
  const [focus, setFocus] = useState(false);
  const borderColor = error ? "var(--danger)" : focus ? "var(--rock-900)" : "var(--border)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "7px", ...style }}>
      {label && (
        <label htmlFor={id} style={{
          font: "var(--fw-semibold) var(--text-xs)/1 var(--font-sans)",
          letterSpacing: "0.02em", color: "var(--text-muted)",
        }}>{label}</label>
      )}
      <div style={{
        display: "flex", alignItems: "center",
        background: disabled ? "var(--surface-sunken)" : "var(--surface-raised)",
        border: `1.5px solid ${borderColor}`,
        borderRadius: "var(--r-md)",
        padding: "0 14px", height: "46px",
        transition: "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
        boxShadow: focus ? "0 0 0 4px rgba(26,23,20,0.06)" : "none",
        opacity: disabled ? 0.6 : 1,
      }}>
        {prefix && <span style={{ fontFamily: "var(--font-mono)", fontSize: "15px", color: "var(--text-muted)", marginRight: "8px" }}>{prefix}</span>}
        <input
          id={id}
          type={type}
          disabled={disabled}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent",
            fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
            fontSize: "16px", color: "var(--text-strong)",
            fontVariantNumeric: "tabular-nums",
            ...inputStyle,
          }}
          {...rest}
        />
        {suffix && <span style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: "13px", color: "var(--text-faint)", marginLeft: "8px" }}>{suffix}</span>}
      </div>
      {(hint || error) && (
        <span style={{ font: "400 var(--text-xs)/1.4 var(--font-sans)", color: error ? "var(--danger)" : "var(--text-faint)" }}>
          {error || hint}
        </span>
      )}
    </div>
  );
}
