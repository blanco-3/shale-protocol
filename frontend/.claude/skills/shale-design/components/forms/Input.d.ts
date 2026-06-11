import * as React from "react";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix" | "style"> {
  label?: string;
  hint?: string;
  error?: string;
  /** Leading adornment, e.g. "$". */
  prefix?: React.ReactNode;
  /** Trailing adornment, e.g. "USDC" or a MAX button. */
  suffix?: React.ReactNode;
  /** Render input text in mono (default true — most SHALE inputs are amounts). */
  mono?: boolean;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}

/** Single-line input with focus ignite, adornments, label/hint/error. */
export function Input(props: InputProps): React.ReactElement;
