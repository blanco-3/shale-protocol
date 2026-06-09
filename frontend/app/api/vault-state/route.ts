import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";
import { arbitrumSepolia } from "viem/chains";

const VAULT     = process.env.NEXT_PUBLIC_VAULT_ADDRESS   as `0x${string}`;
const GOVERNOR  = process.env.NEXT_PUBLIC_GOVERNOR_ADDRESS as `0x${string}`;
const STRATEGY  = process.env.NEXT_PUBLIC_STRATEGY_ROUTER_ADDRESS as `0x${string}`;
const RPC       = process.env.ARBITRUM_SEPOLIA_RPC!;

const VAULT_ABI = parseAbi([
  "function corePrincipal() view returns (uint256)",
  "function seamPrincipal() view returns (uint256)",
  "function apexPrincipal() view returns (uint256)",
  "function coreAccumulatedYield() view returns (uint256)",
  "function seamAccumulatedYield() view returns (uint256)",
  "function apexAccumulatedYield() view returns (uint256)",
  "function coreTargetMinBps() view returns (uint256)",
  "function coreTargetMaxBps() view returns (uint256)",
  "function seamTargetMinBps() view returns (uint256)",
  "function seamTargetMaxBps() view returns (uint256)",
  "function lastEpochTimestamp() view returns (uint256)",
  "function epochCount() view returns (uint256)",
  "function withdrawQueueLength() view returns (uint256)",
  "function pendingPenalties() view returns (uint256)",
]);

const GOV_ABI = parseAbi([
  "function proposalCount() view returns (uint256)",
  "function latestProposal() view returns ((uint256 id, address proposer, uint256 newCoreMin, uint256 newCoreMax, uint256 newSeamMin, uint256 newSeamMax, string reason, uint256 proposedAt, bool executed, bool rejected))",
]);

const STRATEGY_ABI = parseAbi([
  "function totalAssets() view returns (uint256)",
  "function strategyCount() view returns (uint256)",
]);

const EPOCH_DURATION = 7n * 24n * 3600n;

export async function GET() {
  const client = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC) });

  try {
    const [
      corePrincipal, seamPrincipal, apexPrincipal,
      coreYield, seamYield, apexYield,
      coreMin, coreMax, seamMin, seamMax,
      lastEpoch, epochCount, queueLength, pendingPenalties,
      proposalCount, latestProposal,
      strategyPrincipal, strategyPendingYield,
    ] = await Promise.all([
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "corePrincipal" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "seamPrincipal" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "apexPrincipal" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "coreAccumulatedYield" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "seamAccumulatedYield" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "apexAccumulatedYield" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "coreTargetMinBps" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "coreTargetMaxBps" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "seamTargetMinBps" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "seamTargetMaxBps" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "lastEpochTimestamp" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "epochCount" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "withdrawQueueLength" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "pendingPenalties" }),
      client.readContract({ address: GOVERNOR, abi: GOV_ABI, functionName: "proposalCount" }),
      client.readContract({ address: GOVERNOR, abi: GOV_ABI, functionName: "latestProposal" }).catch(() => null),
      client.readContract({ address: STRATEGY, abi: STRATEGY_ABI, functionName: "totalAssets" }).catch(() => 0n),
      client.readContract({ address: STRATEGY, abi: STRATEGY_ABI, functionName: "strategyCount" }).catch(() => 0n),
    ]);

    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    const nextEpochAt = (lastEpoch as bigint) + EPOCH_DURATION;
    const secondsUntilEpoch = nextEpochAt > nowSec ? Number(nextEpochAt - nowSec) : 0;

    const p = latestProposal as {
      id: bigint; proposer: string; newCoreMin: bigint; newCoreMax: bigint;
      newSeamMin: bigint; newSeamMax: bigint; reason: string;
      proposedAt: bigint; executed: boolean; rejected: boolean;
    } | null;

    return NextResponse.json({
      vault: {
        corePrincipal:        (corePrincipal as bigint).toString(),
        seamPrincipal:        (seamPrincipal as bigint).toString(),
        apexPrincipal:        (apexPrincipal as bigint).toString(),
        totalPrincipal:       ((corePrincipal as bigint) + (seamPrincipal as bigint) + (apexPrincipal as bigint)).toString(),
        coreAccumulatedYield: (coreYield as bigint).toString(),
        seamAccumulatedYield: (seamYield as bigint).toString(),
        apexAccumulatedYield: (apexYield as bigint).toString(),
        coreTargetMinBps:     (coreMin as bigint).toString(),
        coreTargetMaxBps:     (coreMax as bigint).toString(),
        seamTargetMinBps:     (seamMin as bigint).toString(),
        seamTargetMaxBps:     (seamMax as bigint).toString(),
        lastEpochTimestamp:   (lastEpoch as bigint).toString(),
        epochCount:           (epochCount as bigint).toString(),
        nextEpochAt:          nextEpochAt.toString(),
        secondsUntilEpoch,
        epochReady:           secondsUntilEpoch === 0,
        withdrawQueueLength:  Number(queueLength as bigint),
        pendingPenalties:     (pendingPenalties as bigint).toString(),
      },
      governor: {
        proposalCount: (proposalCount as bigint).toString(),
        latestProposal: p ? {
          id:         p.id.toString(),
          proposer:   p.proposer,
          newCoreMin: p.newCoreMin.toString(),
          newCoreMax: p.newCoreMax.toString(),
          newSeamMin: p.newSeamMin.toString(),
          newSeamMax: p.newSeamMax.toString(),
          reason:     p.reason,
          proposedAt: p.proposedAt.toString(),
          executed:   p.executed,
          rejected:   p.rejected,
          pending:    !p.executed && !p.rejected,
        } : null,
      },
      strategy: {
        totalAssets:    (strategyPrincipal as bigint).toString(),
        strategyCount:  Number(strategyPendingYield as bigint),
      },
    }, { headers: { "Cache-Control": "no-store" } });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
