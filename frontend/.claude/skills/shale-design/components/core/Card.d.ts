import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Surface treatment. @default "paper" */
  surface?: "paper" | "raised" | "sunken" | "ink";
  /** Top-edge accent color, keyed to a tier or any CSS color. */
  accent?: "core" | "seam" | "apex" | "accent" | string;
  /** Inner padding. @default "md" */
  pad?: "none" | "sm" | "md" | "lg";
  /** Render the accent edge as a thick strata band instead of a hairline. */
  strataEdge?: boolean;
  /** Lift + shadow on hover. */
  interactive?: boolean;
  children?: React.ReactNode;
}

/** Sandstone surface container with optional sedimentary tier edge. */
export function Card(props: CardProps): React.ReactElement;
