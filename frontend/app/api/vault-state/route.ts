import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";
import { arbitrumSepolia } from "viem/chains";

const VAULT = process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}`;
const GOVERNOR = process.env.NEXT_PUBLIC_GOVERNOR_ADDRESS as `0x${string}`;
const MOCK_AAVE = process.env.NEXT_PUBLIC_MOCK_AAVE_ADDRESS as `0x${string}`;
const RPC = process.env.ARBITRUM_SEPOLIA_RPC!;

const VAULT_ABI = parseAbi([
  "function corePrincipal() view returns (uint256)",
  "function seamPrincipal() view returns (uint256)",
  "function apexPrincipal() view returns (uint256)",
  "function coreTargetMinBps() view returns (uint256)",
  "function coreTargetMaxBps() view returns (uint256)",
  "function seamTargetMinBps() view returns (uint256)",
  "function seamTargetMaxBps() view returns (uint256)",
  "function lastEpochTimestamp() view returns (uint256)",
  "function epochCount() view returns (uint256)",
]);

const GOV_ABI = parseAbi([
  "function proposalCount() view returns (uint256)",
  "function latestProposal() view returns ((uint256 id, address proposer, uint256 newCoreMin, uint256 newCoreMax, uint256 newSeamMin, uint256 newSeamMax, string reason, uint256 proposedAt, bool executed, bool rejected))",
]);

const MOCK_ABI = parseAbi(["function apyBps() view returns (uint256)"]);

const EPOCH_DURATION = 7n * 24n * 3600n;

export async function GET() {
  const client = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC) });

  try {
    const [
      corePrincipal, seamPrincipal, apexPrincipal,
      coreMin, coreMax, seamMin, seamMax,
      lastEpoch, epochCount, proposalCount, latestProposal, apyBps,
    ] = await Promise.all([
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "corePrincipal" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "seamPrincipal" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "apexPrincipal" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "coreTargetMinBps" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "coreTargetMaxBps" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "seamTargetMinBps" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "seamTargetMaxBps" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "lastEpochTimestamp" }),
      client.readContract({ address: VAULT, abi: VAULT_ABI, functionName: "epochCount" }),
      client.readContract({ address: GOVERNOR, abi: GOV_ABI, functionName: "proposalCount" }),
      client.readContract({ address: GOVERNOR, abi: GOV_ABI, functionName: "latestProposal" }).catch(() => null),
      client.readContract({ address: MOCK_AAVE, abi: MOCK_ABI, functionName: "apyBps" }).catch(() => 420n),
    ]);

    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    const nextEpochAt = (lastEpoch as bigint) + EPOCH_DURATION;
    const secondsUntilEpoch = nextEpochAt > nowSec ? Number(nextEpochAt - nowSec) : 0;

    const proposal = latestProposal as {
      id: bigint; proposer: string; newCoreMin: bigint; newCoreMax: bigint;
      newSeamMin: bigint; newSeamMax: bigint; reason: string;
      proposedAt: bigint; executed: boolean; rejected: boolean;
    } | null;

    return NextResponse.json({
      vault: {
        corePrincipal: corePrincipal.toString(),
        seamPrincipal: seamPrincipal.toString(),
        apexPrincipal: apexPrincipal.toString(),
        totalPrincipal: ((corePrincipal as bigint) + (seamPrincipal as bigint) + (apexPrincipal as bigint)).toString(),
        coreTargetMinBps: coreMin.toString(),
        coreTargetMaxBps: coreMax.toString(),
        seamTargetMinBps: seamMin.toString(),
        seamTargetMaxBps: seamMax.toString(),
        lastEpochTimestamp: (lastEpoch as bigint).toString(),
        epochCount: epochCount.toString(),
        nextEpochAt: nextEpochAt.toString(),
        secondsUntilEpoch,
        epochReady: secondsUntilEpoch === 0,
      },
      governor: {
        proposalCount: proposalCount.toString(),
        latestProposal: proposal ? {
          id: proposal.id.toString(),
          proposer: proposal.proposer,
          newCoreMin: proposal.newCoreMin.toString(),
          newCoreMax: proposal.newCoreMax.toString(),
          newSeamMin: proposal.newSeamMin.toString(),
          newSeamMax: proposal.newSeamMax.toString(),
          reason: proposal.reason,
          proposedAt: proposal.proposedAt.toString(),
          executed: proposal.executed,
          rejected: proposal.rejected,
          pending: !proposal.executed && !proposal.rejected,
        } : null,
      },
      aave: {
        apyBps: (apyBps as bigint).toString(),
        apyPercent: (Number(apyBps as bigint) / 100).toFixed(2),
      },
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
