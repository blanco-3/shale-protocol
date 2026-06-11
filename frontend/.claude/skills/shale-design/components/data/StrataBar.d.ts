import * as React from "react";

export interface StrataBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  /** @default 100 */
  max?: number;
  /** Fill tone. @default "ink" */
  tone?: "core" | "seam" | "apex" | "positive" | "warning" | "danger" | "ink" | "accent" | string;
  /** Optional target tick (bedrock marker) for actual-vs-target drift. */
  target?: number;
  /** Track height in px. @default 10 */
  height?: number;
  label?: string;
  /** Right-aligned mono value, e.g. "$12,400 (32%)". */
  valueLabel?: string;
}

/** Horizontal meter for allocations, buffer gauges and TVL splits. */
export function StrataBar(props: StrataBarProps): React.ReactElement;
