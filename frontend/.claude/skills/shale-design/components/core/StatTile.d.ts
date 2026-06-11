import * as React from "react";

export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Uppercase eyebrow label. */
  label: string;
  /** Primary metric (rendered mono, tabular). */
  value: React.ReactNode;
  /** Caption beneath the value. */
  sub?: string;
  /** Delta chip, e.g. "+7.34%". */
  delta?: string;
  /** @default "positive" */
  deltaTone?: "positive" | "danger" | "warning" | "neutral";
  /** @default "left" */
  align?: "left" | "center" | "right";
}

/** Dashboard metric tile: label, big mono value, optional sub + delta. */
export function StatTile(props: StatTileProps): React.ReactElement;
