"use client";
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { VAULT_ADDRESS, VAULT_ABI } from "../../lib/contracts";
import { TIERS, formatUsdc } from "../../lib/utils";

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { writeContract, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const { data } = useReadContracts({
    contracts: TIERS.map((tier) => ({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: "pendingYield" as const,
      args: address ? ([address, tier.id] as const) : undefined,
    })),
    query: { enabled: !!address },
  });

  const busy = isPending || isConfirming;

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

      {!isConnected ? (
        <p className="text-sm text-gray-400">Connect wallet to view portfolio.</p>
      ) : (
        <>
          <table className="w-full text-sm border-collapse mb-6">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2">Tier</th>
                <th className="text-left py-2">Risk</th>
                <th className="text-right py-2">Accrued Yield</th>
                <th className="text-right py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((tier, i) => {
                const pendingYield = data?.[i]?.status === "success"
                  ? (data[i].result as bigint)
                  : undefined;
                return (
                  <tr key={tier.id} className="border-b border-gray-100">
                    <td className="py-3 font-bold">{tier.name}</td>
                    <td className="py-3 text-gray-500 text-xs">{tier.label}</td>
                    <td className="py-3 text-right font-mono">
                      {pendingYield !== undefined ? formatUsdc(pendingYield) : "—"}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleWithdraw(tier.id, pendingYield ?? 0n)}
                        disabled={busy || !pendingYield || pendingYield === 0n}
                        className="text-xs border border-gray-300 px-2 py-1 hover:border-black disabled:opacity-40 transition-colors"
                      >
                        Withdraw
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {isSuccess && (
            <p className="text-sm text-green-600 mb-4">Transaction confirmed.</p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSettleEpoch}
              disabled={busy}
              className="text-sm border border-gray-300 px-3 py-1 hover:border-black disabled:opacity-50 transition-colors"
            >
              {busy ? "Settling..." : "Settle Epoch"}
            </button>
            <p className="text-xs text-gray-400">Anyone can call this after 7 days.</p>
          </div>
        </>
      )}
    </div>
  );
}
