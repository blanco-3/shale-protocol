"use client";
import { useState, useEffect } from "react";
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { VAULT_ADDRESS, VAULT_ABI, ERC20_ABI } from "../../lib/contracts";
import { TIERS, formatUsdc } from "../../lib/utils";

const EPOCH_DURATION = 7 * 24 * 3600; // 7 days in seconds

function useEpochCountdown(lastEpochTimestamp: bigint | undefined) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (lastEpochTimestamp === undefined) return;
    const nextEpoch = Number(lastEpochTimestamp) + EPOCH_DURATION;
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      setSecondsLeft(Math.max(0, nextEpoch - now));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastEpochTimestamp]);

  return secondsLeft;
}

function formatCountdown(seconds: number): string {
  if (seconds === 0) return "Ready to settle";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { writeContract, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Step 1: static vault reads (token addresses + epoch timestamp)
  const { data: staticData } = useReadContracts({
    contracts: [
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreToken" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamToken" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexToken" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "lastEpochTimestamp" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "epochCount" },
    ],
  });

  const coreTokenAddr = staticData?.[0]?.status === "success" ? (staticData[0].result as `0x${string}`) : undefined;
  const seamTokenAddr = staticData?.[1]?.status === "success" ? (staticData[1].result as `0x${string}`) : undefined;
  const apexTokenAddr = staticData?.[2]?.status === "success" ? (staticData[2].result as `0x${string}`) : undefined;
  const lastEpochTimestamp = staticData?.[3]?.status === "success" ? (staticData[3].result as bigint) : undefined;
  const epochCount = staticData?.[4]?.status === "success" ? (staticData[4].result as bigint) : undefined;

  const secondsLeft = useEpochCountdown(lastEpochTimestamp);
  const epochReady = secondsLeft === 0;

  // Step 2: user-specific reads (share balances + pending yield)
  const { data: userData, refetch: refetchUser } = useReadContracts({
    contracts: address && coreTokenAddr && seamTokenAddr && apexTokenAddr
      ? [
          { address: coreTokenAddr, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
          { address: seamTokenAddr, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
          { address: apexTokenAddr, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
          { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "pendingYield", args: [address, 0] },
          { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "pendingYield", args: [address, 1] },
          { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "pendingYield", args: [address, 2] },
        ]
      : [],
    query: { enabled: !!address && !!coreTokenAddr },
  });

  useEffect(() => {
    if (isSuccess) refetchUser();
  }, [isSuccess, refetchUser]);

  const shareBalances = [0, 1, 2].map((i) =>
    userData?.[i]?.status === "success" ? (userData[i].result as bigint) : undefined
  );
  const pendingYields = [3, 4, 5].map((i) =>
    userData?.[i]?.status === "success" ? (userData[i].result as bigint) : undefined
  );

  const busy = isPending || isConfirming;
  const hasAnyPosition = shareBalances.some((b) => b !== undefined && b > 0n);

  function handleWithdraw(tierId: number, shares: bigint) {
    writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: "withdraw",
      args: [shares, tierId],
    });
  }

  function handleSettleEpoch() {
    writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: "settleEpoch",
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Portfolio</h1>

      {/* Epoch info */}
      <div className="border border-gray-200 p-4 mb-6 text-sm">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-gray-500">Epoch #{epochCount !== undefined ? epochCount.toString() : "—"}</span>
            <span className="mx-2 text-gray-300">|</span>
            <span className={epochReady ? "text-green-600 font-bold" : "text-gray-700"}>
              {secondsLeft !== null ? formatCountdown(secondsLeft) : "—"}
            </span>
          </div>
          <button
            onClick={handleSettleEpoch}
            disabled={busy || !epochReady}
            className="text-xs border border-gray-300 px-3 py-1 hover:border-black disabled:opacity-40 transition-colors"
          >
            {busy ? "Settling..." : "Settle Epoch"}
          </button>
        </div>
        {!epochReady && secondsLeft !== null && (
          <p className="text-xs text-gray-400 mt-1">Next settlement available in {formatCountdown(secondsLeft)}</p>
        )}
      </div>

      {!isConnected ? (
        <p className="text-sm text-gray-400">Connect wallet to view portfolio.</p>
      ) : (
        <>
          {isSuccess && (
            <p className="text-sm text-green-600 mb-4">Transaction confirmed.</p>
          )}

          {!hasAnyPosition && shareBalances.every((b) => b !== undefined) ? (
            <p className="text-sm text-gray-400 mb-4">No positions. Deposit USDC to get started.</p>
          ) : (
            <table className="w-full text-sm border-collapse mb-6">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2">Tier</th>
                  <th className="text-right py-2">Shares (USDC)</th>
                  <th className="text-right py-2">Accrued Yield</th>
                  <th className="text-right py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {TIERS.map((tier, i) => {
                  const shares = shareBalances[i];
                  const pendingYield = pendingYields[i];
                  const noPosition = shares !== undefined && shares === 0n;
                  return (
                    <tr key={tier.id} className={`border-b border-gray-100 ${noPosition ? "opacity-40" : ""}`}>
                      <td className="py-3">
                        <span className="font-bold">{tier.name}</span>
                        <span className="text-xs text-gray-400 ml-2">{tier.label}</span>
                      </td>
                      <td className="py-3 text-right font-mono">
                        {shares !== undefined ? formatUsdc(shares) : "—"}
                      </td>
                      <td className="py-3 text-right font-mono text-green-700">
                        {pendingYield !== undefined && pendingYield > 0n
                          ? "+" + formatUsdc(pendingYield)
                          : "—"}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => shares && handleWithdraw(tier.id, shares)}
                          disabled={busy || !shares || shares === 0n}
                          className="text-xs border border-gray-300 px-2 py-1 hover:border-black disabled:opacity-40 transition-colors"
                        >
                          Withdraw All
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <p className="text-xs text-gray-400">
            Shares are shlCORE / shlSEAM / shlAPEX tokens. Withdraw redeems 1:1 for principal + accrued yield.
          </p>
        </>
      )}
    </div>
  );
}
