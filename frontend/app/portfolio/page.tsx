"use client";
import { useState, useEffect } from "react";
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { VAULT_ADDRESS, VAULT_ABI, ERC20_ABI } from "../../lib/contracts";
import { TIERS, formatUsdc } from "../../lib/utils";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { StatTile } from "../../components/ui/StatTile";

const EPOCH_DURATION = 120;

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

const eyebrow: React.CSSProperties = {
  font: "var(--fw-semibold) var(--text-2xs)/1 var(--font-sans)",
  letterSpacing: "var(--ls-wider)", textTransform: "uppercase", color: "var(--text-muted)",
};

const TIER_TONES = ["core", "seam", "apex"] as const;

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { writeContract, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

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

  const { data: userData, refetch } = useReadContracts({
    contracts: address && coreTokenAddr && seamTokenAddr && apexTokenAddr ? [
      { address: coreTokenAddr, abi: ERC20_ABI, functionName: "balanceOf",   args: [address] },
      { address: seamTokenAddr, abi: ERC20_ABI, functionName: "balanceOf",   args: [address] },
      { address: apexTokenAddr, abi: ERC20_ABI, functionName: "balanceOf",   args: [address] },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "corePrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreAccumulatedYield" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamPrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamAccumulatedYield" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexPrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexAccumulatedYield" },
      { address: coreTokenAddr, abi: ERC20_ABI, functionName: "totalSupply" },
      { address: seamTokenAddr, abi: ERC20_ABI, functionName: "totalSupply" },
      { address: apexTokenAddr, abi: ERC20_ABI, functionName: "totalSupply" },
    ] : [],
    query: { enabled: !!address && !!coreTokenAddr, refetchInterval: 15_000 },
  });

  useEffect(() => {
    if (isSuccess) { refetch(); refetchStatic(); }
  }, [isSuccess, refetch, refetchStatic]);

  const g = (i: number): bigint | undefined =>
    userData?.[i]?.status === "success" ? (userData[i].result as bigint) : undefined;

  const shareBalances = [g(0), g(1), g(2)];

  const currentValues = [0, 1, 2].map(i => {
    const shares = shareBalances[i];
    const principal = g(3 + i * 2);
    const yieldBucket = g(4 + i * 2);
    const totalSupply = g(9 + i);
    if (shares === undefined) return undefined;
    if (shares === 0n) return 0n;
    if (principal === undefined || yieldBucket === undefined || !totalSupply) return shares;
    return (shares * (principal + yieldBucket)) / totalSupply;
  });

  const yieldEarned = [0, 1, 2].map(i => {
    const shares = shareBalances[i];
    const cv = currentValues[i];
    if (shares === undefined || cv === undefined) return undefined;
    return cv > shares ? cv - shares : 0n;
  });

  const busy = isPending || isConfirming;
  const GAS = { maxFeePerGas: 500_000_000n, maxPriorityFeePerGas: 1_000_000n } as const;

  function handleRequestWithdraw(tierId: number, shares: bigint) {
    writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "requestWithdraw", args: [shares, tierId], ...GAS });
  }

  function handleEarlyWithdraw(tierId: number, shares: bigint) {
    writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "earlyWithdraw", args: [shares, tierId], ...GAS });
  }

  function handleSettleEpoch() {
    writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "settleEpoch", ...GAS });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "40px 0 60px" }}>
      <div>
        <h1 style={{ font: "var(--fw-bold) 34px/1 var(--font-serif)", color: "var(--text-strong)", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          Portfolio
        </h1>
        <p style={{ font: "400 14px/1 var(--font-sans)", color: "var(--text-muted)", margin: 0 }}>
          Your positions across CORE, SEAM, and APEX tiers.
        </p>
      </div>

      {/* Epoch panel */}
      <Card pad="md">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <StatTile label="Epoch" value={epochCount !== undefined ? `#${epochCount.toString()}` : "—"} />
            <div style={{ width: "1px", height: "36px", background: "var(--border)" }} />
            <div>
              <div style={{ ...eyebrow, marginBottom: "5px" }}>Next Settle</div>
              <span style={{
                fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "16px",
                color: epochReady ? "var(--positive)" : "var(--text-strong)",
                fontVariantNumeric: "tabular-nums",
              }}>
                {secondsLeft !== null ? formatCountdown(secondsLeft) : "—"}
              </span>
            </div>
            {queueLength > 0 && <Badge tone="warning" mono>{queueLength} queued</Badge>}
            {pendingPenalties > 0n && <Badge tone="neutral" mono>{formatUsdc(pendingPenalties)} penalties</Badge>}
          </div>
          <Button size="sm" variant="outline" disabled={busy || !epochReady} onClick={handleSettleEpoch}>
            {busy ? "Settling…" : "Settle Epoch"}
          </Button>
        </div>
      </Card>

      {!isConnected ? (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--text-muted)" }}>
          Connect wallet to view portfolio.
        </p>
      ) : (
        <>
          {isSuccess && (
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--positive)" }}>
              Transaction confirmed.
            </p>
          )}

          <Card pad="none">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Tier", "Shares", "Current Value", "Yield", "Action"].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 0 ? "left" : i === 4 ? "right" : "right",
                      padding: "12px 22px",
                      font: "var(--fw-semibold) 10px/1 var(--font-sans)",
                      letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-faint)",
                      ...(i === 4 ? { width: "180px" } : {}),
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIERS.map((tier, i) => {
                  const shares = shareBalances[i];
                  const cv = currentValues[i];
                  const noPosition = shares !== undefined && shares === 0n;
                  const tone = TIER_TONES[i];

                  return (
                    <tr key={tier.id} style={{ borderBottom: "1px solid var(--border-soft)", opacity: noPosition ? 0.4 : 1 }}>
                      <td style={{ padding: "16px 22px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Badge tone={tone}>{tier.name}</Badge>
                          <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--text-faint)" }}>{tier.label}</span>
                        </div>
                      </td>
                      <td style={{ padding: "16px 22px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-body)", fontVariantNumeric: "tabular-nums" }}>
                        {shares !== undefined ? (Number(shares) / 1e6).toFixed(2) : "—"}
                      </td>
                      <td style={{ padding: "16px 22px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600, color: "var(--text-strong)", fontVariantNumeric: "tabular-nums" }}>
                        {cv !== undefined ? formatUsdc(cv) : "—"}
                      </td>
                      <td style={{ padding: "16px 22px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--positive)", fontVariantNumeric: "tabular-nums" }}>
                        {yieldEarned[i] !== undefined && yieldEarned[i]! > 0n
                          ? "+" + formatUsdc(yieldEarned[i]!)
                          : "—"}
                      </td>
                      <td style={{ padding: "16px 22px", textAlign: "right" }}>
                        {!noPosition && shares && shares > 0n && (
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => handleRequestWithdraw(tier.id, shares)} title="Queue for next epoch (no penalty)">
                              Queue
                            </Button>
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => handleEarlyWithdraw(tier.id, shares)} title="Withdraw now with 1% penalty" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>
                              Early (−1%)
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <Card surface="sunken" pad="md">
            <p style={{ font: "400 12px/1.5 var(--font-sans)", color: "var(--text-muted)", margin: "0 0 4px" }}>
              <strong>Current Value</strong> reflects the live exchange rate:{" "}
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>shares × (principal + yield) / totalSupply</span>.
              Yield is distributed at each epoch settlement.
            </p>
            <p style={{ font: "400 12px/1.5 var(--font-sans)", color: "var(--text-muted)", margin: 0 }}>
              <strong>Queue</strong> — processed at epoch settlement, no penalty. &nbsp;
              <strong style={{ color: "var(--danger)" }}>Early</strong> — immediate, 1% penalty redistributed to remaining depositors.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
