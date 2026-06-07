"use client";
import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { GOVERNOR_ADDRESS, GOVERNOR_ABI } from "../lib/contracts";
import { bpsToPercent } from "../lib/utils";

export function AgentPanel() {
  const { isConnected } = useAccount();
  const { writeContract, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: proposal, error } = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: GOVERNOR_ABI,
    functionName: "latestProposal",
  });

  if (error || !proposal) {
    return (
      <div className="border border-gray-200 p-4">
        <p className="text-sm font-bold mb-1">AI Agent</p>
        <p className="text-sm text-gray-400">No proposals yet.</p>
      </div>
    );
  }

  const isPendingProposal = !proposal.executed && !proposal.rejected;
  const busy = isPending || isConfirming;

  return (
    <div className="border border-gray-200 p-4">
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-bold">AI Agent — Proposal #{proposal.id.toString()}</p>
        <span
          className={`text-xs px-2 py-1 ${
            proposal.executed
              ? "bg-black text-white"
              : proposal.rejected
              ? "bg-gray-200 text-gray-500"
              : "bg-yellow-50 text-yellow-700 border border-yellow-200"
          }`}
        >
          {proposal.executed ? "EXECUTED" : proposal.rejected ? "REJECTED" : "PENDING"}
        </span>
      </div>

      {isPendingProposal && (
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3 font-mono">
          <div>
            <span className="text-gray-400">CORE: </span>
            {bpsToPercent(proposal.newCoreMin)} – {bpsToPercent(proposal.newCoreMax)}
          </div>
          <div>
            <span className="text-gray-400">SEAM: </span>
            {bpsToPercent(proposal.newSeamMin)} – {bpsToPercent(proposal.newSeamMax)}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mb-3 leading-relaxed">{proposal.reason}</p>

      {isSuccess && (
        <p className="text-xs text-green-600 mb-2">Proposal executed on-chain.</p>
      )}

      {isPendingProposal && isConnected && (
        <button
          onClick={() =>
            writeContract({
              address: GOVERNOR_ADDRESS,
              abi: GOVERNOR_ABI,
              functionName: "executeProposal",
              args: [proposal.id],
            })
          }
          disabled={busy}
          className="border border-black px-4 py-1 text-sm hover:bg-black hover:text-white transition-colors disabled:opacity-50"
        >
          {busy ? "Accepting..." : "Accept →"}
        </button>
      )}
    </div>
  );
}
