import { bpsToPercent, formatUsdc } from "../lib/utils";

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

const RISK_DOTS: Record<number, string[]> = {
  1: ["bg-green-500", "bg-gray-200", "bg-gray-200"],
  2: ["bg-yellow-400", "bg-yellow-400", "bg-gray-200"],
  3: ["bg-red-500",   "bg-red-500",   "bg-red-500"  ],
};

const RISK_LABEL: Record<number, string> = {
  1: "Low Risk",
  2: "Med Risk",
  3: "High Risk",
};

export function TierCard({ tier, tvl, apyMin, apyMax, apyLabel }: Props) {
  const dots = tier.riskLevel ? RISK_DOTS[tier.riskLevel] : null;
  return (
    <div className="border border-gray-200 p-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-gray-400 uppercase">{tier.label}</span>
        <span className="text-lg font-bold">{tier.name}</span>
      </div>

      {/* Risk indicator */}
      {dots && tier.riskLevel && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-1">
            {dots.map((c, i) => <div key={i} className={`w-2 h-2 rounded-full ${c}`} />)}
          </div>
          <span className={`text-xs font-medium ${tier.riskColor ?? "text-gray-500"}`}>
            {RISK_LABEL[tier.riskLevel]}
          </span>
          {tier.lossPosition && (
            <span className="text-xs text-gray-400 ml-auto font-mono">{tier.lossPosition}</span>
          )}
        </div>
      )}

      {/* APY */}
      <div className="mb-3">
        <p className="text-xs text-gray-500">Target APY</p>
        <p className="text-xl font-mono">
          {apyLabel ??
            (apyMin !== undefined && apyMax !== undefined
              ? `${bpsToPercent(apyMin)} – ${bpsToPercent(apyMax)}`
              : "—")}
        </p>
      </div>

      {/* TVL */}
      <div className="mb-3">
        <p className="text-xs text-gray-500">TVL</p>
        <p className="font-mono">{formatUsdc(tvl)}</p>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed flex-1">{tier.description}</p>

      {tier.profile && (
        <p className={`text-xs font-semibold mt-3 ${tier.riskColor ?? "text-gray-600"}`}>
          → {tier.profile}
        </p>
      )}
    </div>
  );
}
