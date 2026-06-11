"use client";
import { useState, useEffect, useRef } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useReadContracts, useSimulateContract } from "wagmi";
import {
  VAULT_ADDRESS, VAULT_ABI, USDC_ADDRESS, ERC20_ABI,
  AAVE_STRATEGY_ADDRESS, SIM_AAVE_ABI,
  CAMELOT_STRATEGY_ADDRESS, SIM_CAMELOT_ABI,
  MORPHO_STRATEGY_ADDRESS, SIM_MORPHO_ABI,
} from "../../lib/contracts";
import { TIERS, TierId, parseUsdc, bpsToPercent } from "../../lib/utils";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { SegmentedControl, type SegmentOption } from "../../components/ui/SegmentedControl";
import { RiskMeter } from "../../components/ui/RiskMeter";

const PCT_PRESETS = [25, 50, 75, 100] as const;

const TIER_TONES = ["core", "seam", "apex"] as const;
type TierTone = typeof TIER_TONES[number];

export default function DepositPage() {
  const { address, isConnected } = useAccount();
  const [selectedTier, setSelectedTier] = useState<TierId>(0);
  const [amount, setAmount] = useState("");
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetMsg, setFaucetMsg] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<"idle" | "approving" | "depositing" | "approval-confirmed" | "deposit-confirmed" | "error">("idle");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const autoDepositRef = useRef<{ amount: bigint; tier: TierId } | null>(null);

  const { writeContract, isPending, data: txHash, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "allowance",
    args: address ? [address, VAULT_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  const { data: usdcBalanceData, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: vaultData } = useReadContracts({
    contracts: [
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreTargetMinBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreTargetMaxBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamTargetMinBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamTargetMaxBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "corePrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamPrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexPrincipal" },
      { address: AAVE_STRATEGY_ADDRESS,     abi: SIM_AAVE_ABI,    functionName: "apyBps" },
      { address: CAMELOT_STRATEGY_ADDRESS,  abi: SIM_CAMELOT_ABI, functionName: "apyBps" },
      { address: MORPHO_STRATEGY_ADDRESS,   abi: SIM_MORPHO_ABI,  functionName: "apyBps" },
    ],
    query: { refetchInterval: 30_000 },
  });

  const g = (i: number) => vaultData?.[i]?.status === "success" ? (vaultData[i].result as bigint) : 0n;
  const [coreMin, coreMax, seamMin, seamMax, corePrincipal, seamPrincipal, apexPrincipal, aaveApy, camelotApy, morphoApy] =
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(g);

  const blendedBps = (aaveApy * 30n + camelotApy * 50n + morphoApy * 20n) / 100n;
  const apexApyBps = (() => {
    const tvl = corePrincipal + seamPrincipal + apexPrincipal;
    if (!tvl || !apexPrincipal || !blendedBps) return null;
    const totalYield = tvl * blendedBps / 10000n;
    const coreNeed = corePrincipal * coreMax / 10000n;
    const seamNeed = seamPrincipal * seamMax / 10000n;
    const residual = totalYield > coreNeed + seamNeed ? totalYield - coreNeed - seamNeed : 0n;
    return residual * 10000n / apexPrincipal;
  })();

  const apexApyLabel = apexApyBps !== null && apexApyBps > 0n
    ? `~${bpsToPercent(apexApyBps)}+ (residual)`
    : "Residual (variable)";

  const apyRange: Record<TierId, string> = {
    0: `${bpsToPercent(coreMin ?? 0n)} – ${bpsToPercent(coreMax ?? 0n)}`,
    1: `${bpsToPercent(seamMin ?? 0n)} – ${bpsToPercent(seamMax ?? 0n)}`,
    2: apexApyLabel,
  };

  useEffect(() => {
    if (!isSuccess) return;
    if (txHash) setLastTxHash(txHash);
    const wasApproval = txStatus === "approving";
    if (wasApproval && autoDepositRef.current) {
      const pending = autoDepositRef.current;
      autoDepositRef.current = null;
      setTxStatus("depositing");
      const t = setTimeout(() => {
        resetWrite();
        setTimeout(() => {
          writeContract(
            { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "deposit", args: [pending.amount, pending.tier], maxFeePerGas: 500_000_000n, maxPriorityFeePerGas: 1_000_000n },
            { onError: (e) => { autoDepositRef.current = null; const msg = e.message ?? String(e); if (msg.toLowerCase().includes("user rejected") || msg.toLowerCase().includes("denied")) { setTxStatus("idle"); } else { setErrorMsg(msg.slice(0, 300)); setTxStatus("error"); } } }
          );
        }, 200);
      }, 800);
      return () => clearTimeout(t);
    } else if (wasApproval) {
      setTxStatus("approval-confirmed");
      const r = setTimeout(() => refetchAllowance(), 2000);
      const c = setTimeout(() => setTxStatus("idle"), 6000);
      return () => { clearTimeout(r); clearTimeout(c); };
    } else {
      setTxStatus("deposit-confirmed");
      setAmount("");
      const r = setTimeout(() => { refetchAllowance(); refetchBalance(); }, 2000);
      const c = setTimeout(() => setTxStatus("idle"), 8000);
      return () => { clearTimeout(r); clearTimeout(c); };
    }
  }, [isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const usdcBalance = usdcBalanceData as bigint | undefined;
  const parsedAmount = parseUsdc(amount);
  const allowance = allowanceData as bigint | undefined;
  const needsApproval = parsedAmount > 0n && (allowance === undefined || allowance < parsedAmount);
  const insufficientBalance = usdcBalance !== undefined && usdcBalance < parsedAmount;
  const busy = isPending || isConfirming;

  const { error: simError } = useSimulateContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "deposit",
    args: parsedAmount > 0n ? [parsedAmount, selectedTier] : undefined,
    query: { enabled: !!address && parsedAmount > 0n && !needsApproval && !insufficientBalance },
  });

  function setPercent(pct: number) {
    if (!usdcBalance) return;
    const value = (usdcBalance * BigInt(pct)) / 100n;
    setAmount((Number(value) / 1e6).toFixed(2));
  }

  function handleApproveAndDeposit() {
    autoDepositRef.current = { amount: parsedAmount, tier: selectedTier };
    setTxStatus("approving"); setErrorMsg(null);
    writeContract(
      { address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "approve", args: [VAULT_ADDRESS, parsedAmount], maxFeePerGas: 500_000_000n, maxPriorityFeePerGas: 1_000_000n },
      { onError: (e) => { autoDepositRef.current = null; const msg = e.message ?? String(e); if (msg.toLowerCase().includes("user rejected") || msg.toLowerCase().includes("denied")) { setTxStatus("idle"); } else { setErrorMsg(msg.slice(0, 300)); setTxStatus("error"); } } }
    );
  }

  function handleDeposit() {
    setTxStatus("depositing"); setErrorMsg(null);
    writeContract(
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "deposit", args: [parsedAmount, selectedTier], maxFeePerGas: 500_000_000n, maxPriorityFeePerGas: 1_000_000n },
      { onError: (e) => { const msg = e.message ?? String(e); if (msg.toLowerCase().includes("user rejected") || msg.toLowerCase().includes("denied")) { setTxStatus("idle"); } else { setErrorMsg(msg.slice(0, 300)); setTxStatus("error"); } } }
    );
  }

  async function handleFaucet() {
    if (!address) return;
    setFaucetLoading(true); setFaucetMsg(null);
    try {
      const res = await fetch("/api/faucet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address }) });
      const data = await res.json();
      if (res.ok) { setFaucetMsg("1,000 USDC sent! Tx: " + data.txHash.slice(0, 10) + "..."); setTimeout(() => refetchBalance(), 5000); }
      else { setFaucetMsg(data.error ?? "Faucet error"); }
    } catch { setFaucetMsg("Network error"); }
    finally { setFaucetLoading(false); }
  }

  const tierOptions: SegmentOption[] = TIERS.map((t) => ({
    value: String(t.id),
    label: t.name,
    sub: t.label,
    tone: TIER_TONES[t.id] as TierTone,
  }));

  const activeTier = TIERS[selectedTier];
  const tierTone = TIER_TONES[selectedTier];

  const getStatusBg = () => {
    if (txStatus === "approval-confirmed" || txStatus === "deposit-confirmed") return { bg: "var(--positive-bg)", border: "var(--positive)", color: "var(--positive)" };
    if (txStatus === "error") return { bg: "var(--danger-bg)", border: "var(--danger)", color: "var(--danger)" };
    return { bg: "var(--surface-sunken)", border: "var(--border)", color: "var(--text-muted)" };
  };
  const statusStyle = getStatusBg();

  return (
    <div style={{ maxWidth: "520px", margin: "0 auto", padding: "40px 0 60px" }}>
      <h1 style={{ font: "var(--fw-bold) 34px/1 var(--font-serif)", color: "var(--text-strong)", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
        Deposit
      </h1>
      <p style={{ font: "400 14px/1.5 var(--font-sans)", color: "var(--text-muted)", margin: "0 0 26px" }}>
        Choose a tier, then deposit USDC. Yield settles every epoch via waterfall.
      </p>

      {/* TX status banner */}
      {txStatus !== "idle" && (
        <div style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, borderRadius: "var(--r-md)", padding: "12px 16px", marginBottom: "20px" }}>
          {txStatus === "approval-confirmed" && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: "13px", color: statusStyle.color }}>Approval confirmed. Now click Deposit →</span>
              {lastTxHash && (
                <a href={`https://sepolia.arbiscan.io/tx/${lastTxHash}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--accent-600)", marginLeft: "8px" }}>View →</a>
              )}
            </div>
          )}
          {txStatus === "deposit-confirmed" && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: "13px", color: statusStyle.color }}>Deposit confirmed.</span>
              {lastTxHash && (
                <a href={`https://sepolia.arbiscan.io/tx/${lastTxHash}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--accent-600)", marginLeft: "8px" }}>View on Arbiscan →</a>
              )}
            </div>
          )}
          {txStatus === "approving" && (
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--text-muted)" }}>
              {busy ? "Step 1/2 — Waiting for approval… deposit will follow automatically." : "Approval submitted."}
            </span>
          )}
          {txStatus === "depositing" && (
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--text-muted)" }}>
              {busy ? "Step 2/2 — Waiting for deposit confirmation…" : "Deposit submitted."}
            </span>
          )}
          {txStatus === "error" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: "13px", color: statusStyle.color }}>Transaction failed.</span>
                <button type="button" onClick={() => { setTxStatus("idle"); setErrorMsg(null); resetWrite(); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--danger)", textDecoration: "underline" }}>Dismiss</button>
              </div>
              {errorMsg && <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--danger)", wordBreak: "break-all", margin: 0, opacity: 0.8 }}>{errorMsg}</p>}
            </div>
          )}
        </div>
      )}

      {/* Tier selector */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ font: "var(--fw-semibold) var(--text-2xs)/1 var(--font-sans)", letterSpacing: "var(--ls-wider)", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px" }}>
          Select tier
        </div>
        <SegmentedControl
          value={String(selectedTier)}
          onChange={(v) => setSelectedTier(Number(v) as TierId)}
          size="lg"
          options={tierOptions}
        />
      </div>

      {/* Tier info card */}
      <Card pad="lg" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ font: "var(--fw-bold) 17px/1 var(--font-serif)", color: "var(--text-strong)" }}>{activeTier.name}</span>
            <RiskMeter level={(activeTier.riskLevel ?? 1) as 1 | 2 | 3} />
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: "16px", color: `var(--${tierTone}-600)`, fontVariantNumeric: "tabular-nums" }}>
            {apyRange[selectedTier]}
          </span>
        </div>
        <p style={{ font: "400 12px/1.55 var(--font-sans)", color: "var(--text-muted)", margin: "0 0 18px" }}>
          {activeTier.description}
        </p>

        <Input
          label="Amount"
          prefix="$"
          suffix="USDC"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min="0"
          style={{ marginBottom: "12px" }}
          error={insufficientBalance && parsedAmount > 0n ? "Insufficient USDC balance" : undefined}
        />

        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          {PCT_PRESETS.map((pct) => (
            <Button key={pct} size="sm" variant="outline" tone="default" disabled={!usdcBalance} onClick={() => setPercent(pct)} style={{ flex: 1 }}>
              {pct === 100 ? "MAX" : `${pct}%`}
            </Button>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-faint)" }}>
            Balance: <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-body)", fontVariantNumeric: "tabular-nums" }}>
              {usdcBalance !== undefined ? `$${(Number(usdcBalance) / 1e6).toFixed(2)}` : "—"}
            </span>
          </span>
          {isConnected && (
            <button type="button" onClick={handleFaucet} disabled={faucetLoading} style={{ background: "none", border: "none", cursor: "pointer", font: "var(--fw-medium) 12px/1 var(--font-sans)", color: "var(--accent-600)", textDecoration: "underline", opacity: faucetLoading ? 0.5 : 1 }}>
              {faucetLoading ? "Sending..." : "Get 1,000 test USDC"}
            </button>
          )}
        </div>
      </Card>

      {faucetMsg && (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: faucetMsg.includes("sent") ? "var(--positive)" : "var(--danger)", margin: "0 0 12px" }}>
          {faucetMsg}
        </p>
      )}

      {/* Simulation error */}
      {simError && parsedAmount > 0n && !needsApproval && (
        <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger)", borderRadius: "var(--r-md)", padding: "10px 14px", marginBottom: "12px" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--danger)", wordBreak: "break-all", margin: 0 }}>
            Simulation: {simError.message?.slice(0, 200) ?? String(simError)}
          </p>
        </div>
      )}

      {/* Action button */}
      {!isConnected ? (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>Connect wallet to deposit.</p>
      ) : needsApproval ? (
        <Button fullWidth size="lg" tone={tierTone} disabled={busy || !parsedAmount} onClick={handleApproveAndDeposit}>
          {txStatus === "approving" && busy ? "Approving… (1/2)" : txStatus === "depositing" && busy ? "Depositing… (2/2)" : `Approve & Deposit to ${activeTier.name} →`}
        </Button>
      ) : (
        <Button fullWidth size="lg" tone={tierTone} disabled={busy || !parsedAmount} onClick={handleDeposit}>
          {busy ? "Depositing…" : `Deposit to ${activeTier.name} →`}
        </Button>
      )}

      {/* Info */}
      <div style={{ marginTop: "18px" }}>
        <Card surface="sunken" pad="md">
          <div style={{ font: "var(--fw-semibold) var(--text-2xs)/1 var(--font-sans)", letterSpacing: "var(--ls-wider)", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px" }}>
            Important
          </div>
          {[
            "Deposits are deployed to the yield strategy immediately.",
            "Yield distributes at the end of each 2-minute epoch via waterfall.",
            "Target APY is indicative and adjusted by the AI agent based on market conditions.",
            "APEX depositors bear first loss if yield falls short of CORE/SEAM targets.",
            "Use Queue withdrawal (no penalty) or Early withdrawal (1% penalty) in Portfolio.",
          ].map((t) => (
            <div key={t} style={{ display: "flex", gap: "8px", font: "400 12px/1.5 var(--font-sans)", color: "var(--text-muted)", marginBottom: "5px" }}>
              <span style={{ color: `var(--${tierTone}-500)` }}>•</span>{t}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
