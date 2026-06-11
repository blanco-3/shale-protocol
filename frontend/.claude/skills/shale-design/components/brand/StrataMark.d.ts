import * as React from "react";

export interface StrataMarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Mark height in px. @default 40 */
  size?: number;
  /** Append the wordmark beside the mark. */
  wordmark?: boolean;
  /** "serif" → lowercase "shale" · "caps" → tracked "SHALE". @default "serif" */
  wordmarkStyle?: "serif" | "caps";
  /** Wordmark text color (mark colors are fixed brand strata). */
  color?: string;
}

/** The SHALE strata logo, inline SVG, optional wordmark lockup. */
export function StrataMark(props: StrataMarkProps): React.ReactElement;
