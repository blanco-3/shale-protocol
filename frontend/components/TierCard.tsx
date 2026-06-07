import { bpsToPercent, formatUsdc } from "../lib/utils";

interface Props {
  tier: { id: number; name: string; label: string; description: string };
  tvl: bigint;
  apyMin: bigint | undefined;
  apyMax: bigint | undefined;
  apyLabel?: string;
}

export function TierCard({ tier, tvl, apyMin, apyMax, apyLabel }: Props) {
  return (
    <div className="border border-gray-200 p-4">
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs text-gray-400 uppercase">{tier.label}</span>
        <span className="text-lg font-bold">{tier.name}</span>
      </div>
      <div className="mb-3">
        <p className="text-xs text-gray-500">Target APY</p>
        <p className="text-xl font-mono">
          {apyLabel ??
            (apyMin !== undefined && apyMax !== undefined
              ? `${bpsToPercent(apyMin)} – ${bpsToPercent(apyMax)}`
              : "—")}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500">TVL</p>
        <p className="font-mono">{formatUsdc(tvl)}</p>
      </div>
      <p className="text-xs text-gray-400 mt-3 leading-relaxed">{tier.description}</p>
    </div>
  );
}
