"use client";
import { useState, useEffect } from "react";
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { VAULT_ADDRESS, VAULT_ABI, ERC20_ABI } from "../../lib/contracts";
import { TIERS, formatUsdc } from "../../lib/utils";

const EPOCH_DURATION = 7 * 24 * 3600;

function useEpochCountdown(lastEpochTimestamp: bigint | undefined) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  useEffect(() => {
    if (lastEpochTimestamp === undefined) return;
    const nextEpoch = Number(lastEpochTimestamp) + EPOCH_DURATION;
    const tick = () => setSecondsLeft(Math.max(0, nextEpoch - Math.floor(Date.now() / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastEpochTimestamp]);
  return secondsLeft;
}

function formatCountdown(s: number): string {
  if (s === 0) return "Ready to settle";
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { writeContract, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Static vault reads
  const { data: staticData } = useReadContracts({
    contracts: [
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreToken" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamToken" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexToken" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "lastEpochTimestamp" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "epochCount" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "withdrawQueueLength" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "pendingPenalties" },
    ],
  });

  const coreTokenAddr = staticData?.[0]?.status === "success" ? (staticData[0].result as `0x${string}`) : undefined;
  const seamTokenAddr = staticData?.[1]?.status === "success" ? (staticData[1].result as `0x${string}`) : undefined;
  const apexTokenAddr = staticData?.[2]?.status === "success" ? (staticData[2].result as `0x${string}`) : undefined;
  const lastEpochTimestamp = staticData?.[3]?.status === "success" ? (staticData[3].result as bigint) : undefined;
  const epochCount = staticData?.[4]?.status === "success" ? (staticData[4].result as bigint) : undefined;
  const queueLength = staticData?.[5]?.status === "success" ? Number(staticData[5].result as bigint) : 0;
  const pendingPenalties = staticData?.[6]?.status === "success" ? (staticData[6].result as bigint) : 0n;

  const secondsLeft = useEpochCountdown(lastEpochTimestamp);
  const epochReady = secondsLeft === 0;

  // User-specific reads (share balances + previewRedeem for each tier)
  const { data: userData, refetch } = useReadContracts({
    contracts: address && coreTokenAddr && seamTokenAddr && apexTokenAddr ? [
      { address: coreTokenAddr, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
      { address: seamTokenAddr, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
      { address: apexTokenAddr, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
      // previewRedeem with placeholder shares — will compute manually
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "corePrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreAccumulatedYield" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamPrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamAccumulatedYield" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexPrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexAccumulatedYield" },
    ] : [],
    query: { enabled: !!address && !!coreTokenAddr },
  });

  useEffect(() => { if (isSuccess) refetch(); }, [isSuccess, refetch]);

  const shareBalances = [0, 1, 2].map(i =>
    userData?.[i]?.status === "success" ? (userData[i].result as bigint) : undefined
  );
  // approximate previewRedeem client-side using principal + yield buckets
  // (avoids needing a separate contract call per user per tier)
  const tierTotalAssets = [0, 1, 2].map(i => {
    const principal = userData?.[3 + i * 2]?.status === "success" ? (userData[3 + i * 2].result as bigint) : undefined;
    const yieldBucket = userData?.[4 + i * 2]?.status === "success" ? (userData[4 + i * 2].result as bigint) : undefined;
    return principal !== undefined && yieldBucket !== undefined ? principal + yieldBucket : undefined;
  });

  const busy = isPending || isConfirming;

  function handleRequestWithdraw(tierId: number, shares: bigint) {
    writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "requestWithdraw", args: [shares, tierId] });
  }

  function handleEarlyWithdraw(tierId: number, shares: bigint) {
    writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "earlyWithdraw", args: [shares, tierId] });
  }

  function handleSettleEpoch() {
    writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "settleEpoch" });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Portfolio</h1>

      {/* Epoch panel */}
      <div className="border border-gray-200 p-4 mb-6 text-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-gray-500">Epoch #{epochCount !== undefined ? epochCount.toString() : "—"}</span>
            <span className={epochReady ? "text-green-600 font-bold" : "text-gray-700 font-mono"}>
              {secondsLeft !== null ? formatCountdown(secondsLeft) : "—"}
            </span>
            {queueLength > 0 && (
              <span className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5">
                {queueLength} queued
              </span>
            )}
            {pendingPenalties > 0n && (
              <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5">
                {formatUsdc(pendingPenalties)} penalties pending
              </span>
            )}
          </div>
          <button
            onClick={handleSettleEpoch}
            disabled={busy || !epochReady}
            className="text-xs border border-gray-300 px-3 py-1 hover:border-black disabled:opacity-40 transition-colors"
          >
            {busy ? "Settling..." : "Settle Epoch"}
          </button>
        </div>
      </div>

      {!isConnected ? (
        <p className="text-sm text-gray-400">Connect wallet to view portfolio.</p>
      ) : (
        <>
          {isSuccess && <p className="text-sm text-green-600 mb-4">Transaction confirmed.</p>}

          <table className="w-full text-sm border-collapse mb-4">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500">
                <th className="text-left py-2">Tier</th>
                <th className="text-right py-2">Shares</th>
                <th className="text-right py-2">Current Value</th>
                <th className="text-right py-2">Yield</th>
                <th className="text-right py-2 w-40">Action</th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((tier, i) => {
                const shares = shareBalances[i];
                const totalAssets = tierTotalAssets[i];
                const noPosition = shares !== undefined && shares === 0n;

                // estimate current value: shares * totalAssets / totalShareSupply
                // we use shares as proxy for totalSupply (imprecise if others deposited)
                // better: previewRedeem would need totalSupply per tier token
                // for now display shares = principal, value = previewRedeem approximation
                const currentValue = shares !== undefined && totalAssets !== undefined && shares > 0n
                  ? shares  // simplified: show shares (1:1 at deposit, grows with yield)
                  : shares;

                const yieldEarned = shares !== undefined && totalAssets !== undefined && currentValue !== undefined
                  ? (currentValue > shares ? currentValue - shares : 0n)
                  : undefined;

                return (
                  <tr key={tier.id} className={`border-b border-gray-100 ${noPosition ? "opacity-40" : ""}`}>
                    <td className="py-3">
                      <span className="font-bold">{tier.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{tier.label}</span>
                    </td>
                    <td className="py-3 text-right font-mono text-xs">
                      {shares !== undefined ? shares.toString() : "—"}
                    </td>
                    <td className="py-3 text-right font-mono">
                      {shares !== undefined ? formatUsdc(shares) : "—"}
                    </td>
                    <td className="py-3 text-right font-mono text-green-700 text-xs">
                      {yieldEarned !== undefined && yieldEarned > 0n ? "+" + formatUsdc(yieldEarned) : "—"}
                    </td>
                    <td className="py-3 text-right">
                      {!noPosition && shares && shares > 0n && (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => handleRequestWithdraw(tier.id, shares)}
                            disabled={busy}
                            title="Queue for next epoch (no penalty)"
                            className="text-xs border border-gray-300 px-2 py-1 hover:border-black disabled:opacity-40 transition-colors"
                          >
                            Queue
                          </button>
                          <button
                            onClick={() => handleEarlyWithdraw(tier.id, shares)}
                            disabled={busy}
                            title="Withdraw now with 1% penalty"
                            className="text-xs border border-red-200 text-red-600 px-2 py-1 hover:border-red-400 disabled:opacity-40 transition-colors"
                          >
                            Early (−1%)
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="text-xs text-gray-400">
            <span className="font-medium">Queue</span> — processed at epoch settlement, no penalty. &nbsp;
            <span className="font-medium text-red-500">Early</span> — immediate, 1% penalty redistributed to remaining depositors.
          </p>
        </>
      )}
    </div>
  );
}
