import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. @default "solid" */
  variant?: "solid" | "outline" | "ghost";
  /** Color tone — maps to brand neutral or a tier accent. @default "default" */
  tone?: "default" | "core" | "seam" | "apex" | "accent";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  disabled?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Primary action button for SHALE. Weighted, square-ish, no bounce.
 * @startingPoint section="Core" subtitle="Action button — solid, outline, ghost across tier tones" viewport="700x260"
 */
export function Button(props: ButtonProps): React.ReactElement;
