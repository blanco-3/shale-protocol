import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default "neutral" */
  tone?: "neutral" | "ink" | "core" | "seam" | "apex" | "positive" | "warning" | "danger";
  /** Show a leading status dot. */
  dot?: boolean;
  /** Hollow style with colored ring + text. */
  outline?: boolean;
  /** Use mono font, no uppercase — for codes / hashes / bps. */
  mono?: boolean;
  children?: React.ReactNode;
}

/** Small status / label pill in any brand or tier tone. */
export function Badge(props: BadgeProps): React.ReactElement;
