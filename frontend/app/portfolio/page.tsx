"use client";
import { useState, useEffect } from "react";
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { VAULT_ADDRESS, VAULT_ABI, ERC20_ABI } from "../../lib/contracts";
import { TIERS, formatUsdc } from "../../lib/utils";

const EPOCH_DURATION = 120; // 2-min demo epochs

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

  // Static vault reads — poll every 15s so epoch countdown triggers Settle button
  const { data: staticData, refetch: refetchStatic } = useReadContracts({
    contracts: [
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreToken" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamToken" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexToken" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "lastEpochTimestamp" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "epochCount" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "withdrawQueueLength" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "pendingPenalties" },
    ],
    query: { refetchInterval: 15_000 },
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

  // User-specific reads:
  //  [0-2]  share balances per tier
  //  [3-8]  vault principal + yieldBucket per tier (3 pairs)
  //  [9-11] totalSupply per tier token (for exchange rate)
  const { data: userData, refetch } = useReadContracts({
    contracts: address && coreTokenAddr && seamTokenAddr && apexTokenAddr ? [
      { address: coreTokenAddr,  abi: ERC20_ABI, functionName: "balanceOf",   args: [address] },
      { address: seamTokenAddr,  abi: ERC20_ABI, functionName: "balanceOf",   args: [address] },
      { address: apexTokenAddr,  abi: ERC20_ABI, functionName: "balanceOf",   args: [address] },
      { address: VAULT_ADDRESS,  abi: VAULT_ABI, functionName: "corePrincipal" },
      { address: VAULT_ADDRESS,  abi: VAULT_ABI, functionName: "coreAccumulatedYield" },
      { address: VAULT_ADDRESS,  abi: VAULT_ABI, functionName: "seamPrincipal" },
      { address: VAULT_ADDRESS,  abi: VAULT_ABI, functionName: "seamAccumulatedYield" },
      { address: VAULT_ADDRESS,  abi: VAULT_ABI, functionName: "apexPrincipal" },
      { address: VAULT_ADDRESS,  abi: VAULT_ABI, functionName: "apexAccumulatedYield" },
      { address: coreTokenAddr,  abi: ERC20_ABI, functionName: "totalSupply" },
      { address: seamTokenAddr,  abi: ERC20_ABI, functionName: "totalSupply" },
      { address: apexTokenAddr,  abi: ERC20_ABI, functionName: "totalSupply" },
    ] : [],
    query: { enabled: !!address && !!coreTokenAddr, refetchInterval: 15_000 },
  });

  useEffect(() => {
    if (isSuccess) {
      refetch();
      refetchStatic();
    }
  }, [isSuccess, refetch, refetchStatic]);

  const g = (i: number): bigint | undefined =>
    userData?.[i]?.status === "success" ? (userData[i].result as bigint) : undefined;

  const shareBalances = [g(0), g(1), g(2)];

  // Exchange rate per tier: currentValue = shares * (principal + yieldBucket) / totalSupply
  // This mirrors previewRedeem() in the contract exactly.
  const currentValues = [0, 1, 2].map(i => {
    const shares     = shareBalances[i];
    const principal  = g(3 + i * 2);
    const yieldBucket = g(4 + i * 2);
    const totalSupply = g(9 + i);
    if (shares === undefined) return undefined;
    if (shares === 0n) return 0n;
    if (principal === undefined || yieldBucket === undefined || !totalSupply) return shares;
    return (shares * (principal + yieldBucket)) / totalSupply;
  });

  // Yield = currentValue − original deposit (shares were minted 1:1 at deposit)
  const yieldEarned = [0, 1, 2].map(i => {
    const shares = shareBalances[i];
    const cv     = currentValues[i];
    if (shares === undefined || cv === undefined) return undefined;
    return cv > shares ? cv - shares : 0n;
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
                const cv     = currentValues[i];
                const noPosition = shares !== undefined && shares === 0n;

                return (
                  <tr key={tier.id} className={`border-b border-gray-100 ${noPosition ? "opacity-40" : ""}`}>
                    <td className="py-3">
                      <span className="font-bold">{tier.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{tier.label}</span>
                    </td>
                    <td className="py-3 text-right font-mono text-xs">
                      {shares !== undefined ? (Number(shares) / 1e6).toFixed(2) : "—"}
                    </td>
                    <td className="py-3 text-right font-mono">
                      {cv !== undefined ? formatUsdc(cv) : "—"}
                    </td>
                    <td className="py-3 text-right font-mono text-green-700 text-xs">
                      {yieldEarned[i] !== undefined && yieldEarned[i]! > 0n
                        ? "+" + formatUsdc(yieldEarned[i]!)
                        : "—"}
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

          {/* Exchange rate note */}
          <p className="text-xs text-gray-400 mb-2">
            <span className="font-medium">Current Value</span> reflects the live exchange rate:{" "}
            <span className="font-mono">shares × (principal + yield) / totalSupply</span>.
            Yield is distributed at each epoch settlement.
          </p>
          <p className="text-xs text-gray-400">
            <span className="font-medium">Queue</span> — processed at epoch settlement, no penalty. &nbsp;
            <span className="font-medium text-red-500">Early</span> — immediate, 1% penalty redistributed to remaining depositors.
          </p>
        </>
      )}
    </div>
  );
}
