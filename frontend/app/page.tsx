"use client";
import { useReadContracts } from "wagmi";
import { VAULT_ADDRESS, VAULT_ABI, GOVERNOR_ADDRESS, GOVERNOR_ABI } from "../lib/contracts";
import { formatUsdc, TIERS } from "../lib/utils";
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
    ],
  });

  const results = vaultData?.map((d) => (d.status === "success" ? (d.result as bigint) : 0n)) ?? Array(7).fill(0n);
  const [corePrincipal, seamPrincipal, apexPrincipal, coreMin, coreMax, seamMin, seamMax] = results;

  const totalTVL = (corePrincipal ?? 0n) + (seamPrincipal ?? 0n) + (apexPrincipal ?? 0n);

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm text-gray-500">Total Value Locked</p>
        <p className="text-4xl font-bold">{formatUsdc(totalTVL)}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <TierCard tier={TIERS[0]} tvl={corePrincipal ?? 0n} apyMin={coreMin} apyMax={coreMax} />
        <TierCard tier={TIERS[1]} tvl={seamPrincipal ?? 0n} apyMin={seamMin} apyMax={seamMax} />
        <TierCard
          tier={TIERS[2]}
          tvl={apexPrincipal ?? 0n}
          apyMin={undefined}
          apyMax={undefined}
          apyLabel="Residual yield"
        />
      </div>

      <AgentPanel />
    </div>
  );
}
