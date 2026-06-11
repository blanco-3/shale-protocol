import { bpsToPercent, formatUsdc } from "../lib/utils";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { RiskMeter } from "./ui/RiskMeter";
import { StatTile } from "./ui/StatTile";

type Accent = "core" | "seam" | "apex";

interface Props {
  tier: {
    id: number; name: string; label: string; description: string;
    riskLevel?: 1 | 2 | 3;
    lossPosition?: string;
    riskColor?: string;
    profile?: string;
  };
  tvl: bigint;
  apyMin: bigint | undefined;
  apyMax: bigint | undefined;
  apyLabel?: string;
}

const TIER_ACCENT: Record<string, Accent> = {
  CORE: "core",
  SEAM: "seam",
  APEX: "apex",
};

const TIER_TONE: Record<string, "core" | "seam" | "apex"> = {
  CORE: "core",
  SEAM: "seam",
  APEX: "apex",
};

export function TierCard({ tier, tvl, apyMin, apyMax, apyLabel }: Props) {
  const accent = TIER_ACCENT[tier.name] ?? "core";
  const tone = TIER_TONE[tier.name] ?? "core";

  const apyValue =
    apyLabel ??
    (apyMin !== undefined && apyMax !== undefined
      ? `${bpsToPercent(apyMin)} – ${bpsToPercent(apyMax)}`
      : "—");

  return (
    <Card accent={accent} strataEdge style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <Badge tone={tone}>{tier.label}</Badge>
          <span style={{
            fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: "22px",
            letterSpacing: "-0.01em", color: "var(--text-strong)", lineHeight: 1,
          }}>{tier.name}</span>
        </div>
        {tier.riskLevel && (
          <RiskMeter level={tier.riskLevel} showLabel={false} dotSize={10} />
        )}
      </div>

      {/* Risk row */}
      {tier.riskLevel && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <RiskMeter level={tier.riskLevel} />
          {tier.lossPosition && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-faint)" }}>
              {tier.lossPosition}
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <StatTile label="Target APY" value={apyValue} />
        <StatTile label="TVL" value={formatUsdc(tvl)} />
      </div>

      {/* Description */}
      <p style={{ font: "400 var(--text-sm)/1.5 var(--font-sans)", color: "var(--text-muted)", flex: 1, margin: 0 }}>
        {tier.description}
      </p>

      {tier.profile && (
        <p style={{
          fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: "12px",
          color: `var(--${tone}-600)`, margin: 0,
        }}>
          → {tier.profile}
        </p>
      )}
    </Card>
  );
}
