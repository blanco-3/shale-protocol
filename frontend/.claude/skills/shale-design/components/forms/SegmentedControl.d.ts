import * as React from "react";

export interface SegmentOption {
  value: string;
  label: string;
  /** Optional second line, e.g. "Stable" / "Aggressive". */
  sub?: string;
  /** Fill tone when selected. @default "default" */
  tone?: "core" | "seam" | "apex" | "default";
}

export interface SegmentedControlProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: SegmentOption[];
  value: string;
  onChange?: (value: string) => void;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
}

/**
 * Slab segmented selector — the canonical SHALE tier picker.
 * @startingPoint section="Forms" subtitle="Tier / option selector with ink-fill slabs" viewport="700x150"
 */
export function SegmentedControl(props: SegmentedControlProps): React.ReactElement;
