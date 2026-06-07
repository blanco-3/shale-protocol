"use client";
import Link from "next/link";
import { useReadContracts } from "wagmi";
import { VAULT_ADDRESS, VAULT_ABI } from "../lib/contracts";
import { formatUsdc, TIERS, bpsToPercent } from "../lib/utils";
import { TierCard } from "../components/TierCard";
import { AgentPanel } from "../components/AgentPanel";

export default function Dashboard() {
  const { data: vaultData } = useReadContracts({
    contracts: [
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "corePrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamPrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexPrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreTargetMinBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreTargetMaxBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamTargetMinBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamTargetMaxBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "epochCount" },
    ],
  });

  const r = (i: number) => vaultData?.[i]?.status === "success" ? (vaultData[i].result as bigint) : 0n;
  const corePrincipal = r(0), seamPrincipal = r(1), apexPrincipal = r(2);
  const coreMin = r(3), coreMax = r(4), seamMin = r(5), seamMax = r(6);
  const epochCount = r(7);

  const totalTVL = corePrincipal + seamPrincipal + apexPrincipal;

  return (
    <div>
      {/* Hero placeholder — UI to be designed */}
      <div className="border border-dashed border-gray-200 p-6 mb-8 text-center text-gray-400 text-sm">
        [ Hero section — UI concept TBD ]
      </div>

      {/* Protocol stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 text-sm">
        <div className="border border-gray-200 p-3">
          <p className="text-xs text-gray-400 mb-1">Total TVL</p>
          <p className="text-xl font-bold font-mono">{formatUsdc(totalTVL)}</p>
        </div>
        <div className="border border-gray-200 p-3">
          <p className="text-xs text-gray-400 mb-1">CORE APY</p>
          <p className="text-xl font-bold font-mono">{bpsToPercent(coreMin)} – {bpsToPercent(coreMax)}</p>
        </div>
        <div className="border border-gray-200 p-3">
          <p className="text-xs text-gray-400 mb-1">SEAM APY</p>
          <p className="text-xl font-bold font-mono">{bpsToPercent(seamMin)} – {bpsToPercent(seamMax)}</p>
        </div>
        <div className="border border-gray-200 p-3">
          <p className="text-xs text-gray-400 mb-1">Epoch</p>
          <p className="text-xl font-bold font-mono">#{epochCount.toString()}</p>
        </div>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <TierCard tier={TIERS[0]} tvl={corePrincipal} apyMin={coreMin} apyMax={coreMax} />
        <TierCard tier={TIERS[1]} tvl={seamPrincipal} apyMin={seamMin} apyMax={seamMax} />
        <TierCard tier={TIERS[2]} tvl={apexPrincipal} apyMin={undefined} apyMax={undefined} apyLabel="Residual yield" />
      </div>

      {/* Agent panel */}
      <AgentPanel />

      {/* CTA row */}
      <div className="flex gap-3 mt-6">
        <Link href="/deposit" className="border border-black px-5 py-2 text-sm hover:bg-black hover:text-white transition-colors">
          Start Earning →
        </Link>
        <Link href="/analytics" className="border border-gray-300 px-5 py-2 text-sm hover:border-black transition-colors">
          View Analytics
        </Link>
        <Link href="/safety" className="border border-gray-300 px-5 py-2 text-sm hover:border-black transition-colors">
          Safety Monitor
        </Link>
      </div>
    </div>
  );
}
