import * as React from "react";

export interface RiskMeterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 1 = CORE (low) · 2 = SEAM (med) · 3 = APEX (high). @default 1 */
  level?: 1 | 2 | 3;
  showLabel?: boolean;
  /** Dot diameter in px. @default 8 */
  dotSize?: number;
}

/** Three-dot tier risk indicator (low / med / high) with label. */
export function RiskMeter(props: RiskMeterProps): React.ReactElement;
