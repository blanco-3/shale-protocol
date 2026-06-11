"use client";
import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { GOVERNOR_ADDRESS, GOVERNOR_ABI } from "../lib/contracts";
import { bpsToPercent } from "../lib/utils";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";

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
      <Card surface="ink" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{
          width: 8, height: 8, borderRadius: "var(--r-pill)",
          background: "var(--text-faint)", flex: "none",
        }} />
        <p style={{ font: "var(--fw-medium) var(--text-sm)/1 var(--font-sans)", color: "var(--text-inverse)", opacity: 0.6, margin: 0 }}>
          AI Agent — No proposals yet.
        </p>
      </Card>
    );
  }

  const isPendingProposal = !proposal.executed && !proposal.rejected;
  const busy = isPending || isConfirming;

  const statusTone = proposal.executed ? "positive" : proposal.rejected ? "neutral" : "warning";
  const statusLabel = proposal.executed ? "EXECUTED" : proposal.rejected ? "REJECTED" : "PENDING";

  return (
    <Card surface="ink" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{
          width: 8, height: 8, borderRadius: "var(--r-pill)", flex: "none",
          background: isPendingProposal ? "var(--warning)" : "var(--text-faint)",
          boxShadow: isPendingProposal ? "0 0 0 3px rgba(194,134,42,0.25)" : "none",
        }} />
        <span style={{
          fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: "13px",
          color: "var(--sand-50)", flex: 1,
        }}>
          AI Agent — Proposal #{proposal.id.toString()}
        </span>
        <Badge tone={statusTone} mono>{statusLabel}</Badge>
      </div>

      {/* Proposed ranges */}
      {isPendingProposal && (
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px",
          background: "rgba(255,255,255,0.06)", borderRadius: "var(--r-md)", padding: "12px",
        }}>
          {(["CORE", "SEAM"] as const).map((t) => {
            const [min, max] = t === "CORE"
              ? [proposal.newCoreMin, proposal.newCoreMax]
              : [proposal.newSeamMin, proposal.newSeamMax];
            const tone = t === "CORE" ? "core" : "seam";
            return (
              <div key={t} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: "10px", letterSpacing: "0.1em", color: `var(--${tone}-400)` }}>{t}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600, color: "var(--sand-50)", fontVariantNumeric: "tabular-nums" }}>
                  {bpsToPercent(min)} – {bpsToPercent(max)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Reason */}
      <p style={{ font: "400 var(--text-xs)/1.5 var(--font-sans)", color: "var(--text-inverse)", opacity: 0.65, margin: 0 }}>
        {proposal.reason}
      </p>

      {isSuccess && (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--positive)", margin: 0 }}>
          Proposal executed on-chain.
        </p>
      )}

      {isPendingProposal && isConnected && (
        <Button
          tone="accent"
          size="sm"
          disabled={busy}
          onClick={() =>
            writeContract({
              address: GOVERNOR_ADDRESS,
              abi: GOVERNOR_ABI,
              functionName: "executeProposal",
              args: [proposal.id],
              maxFeePerGas: 500_000_000n,
              maxPriorityFeePerGas: 1_000_000n,
            })
          }
          style={{ alignSelf: "flex-start" }}
        >
          {busy ? "Accepting…" : "Accept →"}
        </Button>
      )}
    </Card>
  );
}
