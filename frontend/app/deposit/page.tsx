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

const PCT_PRESETS = [25, 50, 75, 100] as const;

export default function DepositPage() {
  const { address, isConnected } = useAccount();
  const [selectedTier, setSelectedTier] = useState<TierId>(0);
  const [amount, setAmount] = useState("");
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetMsg, setFaucetMsg] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<"idle" | "approving" | "depositing" | "approval-confirmed" | "deposit-confirmed" | "error">("idle");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Holds pending deposit params when auto-chaining approve → deposit
  const autoDepositRef = useRef<{ amount: bigint; tier: TierId } | null>(null);

  const { writeContract, isPending, data: txHash, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, VAULT_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  const { data: usdcBalanceData, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: vaultData } = useReadContracts({
    contracts: [
      { address: VAULT_ADDRESS,         abi: VAULT_ABI,       functionName: "coreTargetMinBps" }, // 0
      { address: VAULT_ADDRESS,         abi: VAULT_ABI,       functionName: "coreTargetMaxBps" }, // 1
      { address: VAULT_ADDRESS,         abi: VAULT_ABI,       functionName: "seamTargetMinBps" }, // 2
      { address: VAULT_ADDRESS,         abi: VAULT_ABI,       functionName: "seamTargetMaxBps" }, // 3
      { address: VAULT_ADDRESS,         abi: VAULT_ABI,       functionName: "corePrincipal" },    // 4
      { address: VAULT_ADDRESS,         abi: VAULT_ABI,       functionName: "seamPrincipal" },    // 5
      { address: VAULT_ADDRESS,         abi: VAULT_ABI,       functionName: "apexPrincipal" },    // 6
      { address: AAVE_STRATEGY_ADDRESS, abi: SIM_AAVE_ABI,    functionName: "apyBps" },           // 7
      { address: CAMELOT_STRATEGY_ADDRESS, abi: SIM_CAMELOT_ABI, functionName: "apyBps" },        // 8
      { address: MORPHO_STRATEGY_ADDRESS,  abi: SIM_MORPHO_ABI,  functionName: "apyBps" },        // 9
    ],
    query: { refetchInterval: 30_000 },
  });

  const g = (i: number) => vaultData?.[i]?.status === "success" ? (vaultData[i].result as bigint) : 0n;
  const [coreMin, coreMax, seamMin, seamMax, corePrincipal, seamPrincipal, apexPrincipal, aaveApy, camelotApy, morphoApy] =
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(g);

  // Blended strategy APY (weights: Aave 30%, Camelot 50%, Morpho 20%)
  const blendedBps = (aaveApy * 30n + camelotApy * 50n + morphoApy * 20n) / 100n;

  // Expected APEX APY = (TVL × blendedAPY − CORE_max_need − SEAM_max_need) / apexPrincipal
  const apexApyBps = (() => {
    const tvl = corePrincipal + seamPrincipal + apexPrincipal;
    if (!tvl || !apexPrincipal || !blendedBps) return null;
    const totalYield = tvl * blendedBps / 10000n;
    const coreNeed   = corePrincipal * coreMax / 10000n;
    const seamNeed   = seamPrincipal * seamMax / 10000n;
    const residual   = totalYield > coreNeed + seamNeed ? totalYield - coreNeed - seamNeed : 0n;
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

  // After TX confirmed: distinguish approve vs deposit, auto-chain if needed
  useEffect(() => {
    if (!isSuccess) return;
    if (txHash) setLastTxHash(txHash);
    const wasApproval = txStatus === "approving";

    if (wasApproval && autoDepositRef.current) {
      // Auto-chain: approval done, fire deposit TX after a short settle delay
      const pending = autoDepositRef.current;
      autoDepositRef.current = null;
      setTxStatus("depositing");
      const t = setTimeout(() => {
        resetWrite();
        setTimeout(() => {
          writeContract(
            {
              address: VAULT_ADDRESS,
              abi: VAULT_ABI,
              functionName: "deposit",
              args: [pending.amount, pending.tier],
              maxFeePerGas: 500_000_000n,
              maxPriorityFeePerGas: 1_000_000n,
            },
            {
              onError: (e) => {
                autoDepositRef.current = null;
                const msg = e.message ?? String(e);
                if (msg.toLowerCase().includes("user rejected") || msg.toLowerCase().includes("denied")) {
                  setTxStatus("idle");
                } else {
                  setErrorMsg(msg.slice(0, 300));
                  setTxStatus("error");
                }
              },
            }
          );
        }, 200);
      }, 800);
      return () => clearTimeout(t);
    } else if (wasApproval) {
      // Manual approval path (no auto-deposit pending)
      setTxStatus("approval-confirmed");
      const r = setTimeout(() => refetchAllowance(), 2000);
      const c = setTimeout(() => setTxStatus("idle"), 6000);
      return () => { clearTimeout(r); clearTimeout(c); };
    } else {
      // Deposit confirmed
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
  // If allowance is not yet loaded, default to needing approval when an amount is entered
  const needsApproval = parsedAmount > 0n && (allowance === undefined || allowance < parsedAmount);
  const insufficientBalance = usdcBalance !== undefined && usdcBalance < parsedAmount;
  const busy = isPending || isConfirming;

  // Pre-simulate deposit to catch revert reason before sending
  const { error: simError } = useSimulateContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "deposit",
    args: parsedAmount > 0n ? [parsedAmount, selectedTier] : undefined,
    query: {
      enabled: !!address && parsedAmount > 0n && !needsApproval && !insufficientBalance,
    },
  });

  function setPercent(pct: number) {
    if (!usdcBalance) return;
    const value = (usdcBalance * BigInt(pct)) / 100n;
    setAmount((Number(value) / 1e6).toFixed(2));
  }

  function handleApproveAndDeposit() {
    // Store the intent so the isSuccess effect can auto-fire the deposit after approval
    autoDepositRef.current = { amount: parsedAmount, tier: selectedTier };
    setTxStatus("approving");
    setErrorMsg(null);
    writeContract(
      {
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [VAULT_ADDRESS, parsedAmount],
        maxFeePerGas: 500_000_000n,
        maxPriorityFeePerGas: 1_000_000n,
      },
      {
        onError: (e) => {
          autoDepositRef.current = null;
          const msg = e.message ?? String(e);
          if (msg.toLowerCase().includes("user rejected") || msg.toLowerCase().includes("denied")) {
            setTxStatus("idle");
          } else {
            setErrorMsg(msg.slice(0, 300));
            setTxStatus("error");
          }
        },
      }
    );
  }

  function handleDeposit() {
    setTxStatus("depositing");
    setErrorMsg(null);
    writeContract(
      {
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "deposit",
        args: [parsedAmount, selectedTier],
        maxFeePerGas: 500_000_000n,
        maxPriorityFeePerGas: 1_000_000n,
      },
      {
        onError: (e) => {
          const msg = e.message ?? String(e);
          if (msg.toLowerCase().includes("user rejected") || msg.toLowerCase().includes("denied")) {
            setTxStatus("idle");
          } else {
            setErrorMsg(msg.slice(0, 300));
            setTxStatus("error");
          }
        },
      }
    );
  }

  async function handleFaucet() {
    if (!address) return;
    setFaucetLoading(true);
    setFaucetMsg(null);
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (res.ok) {
        setFaucetMsg("1,000 USDC sent! Tx: " + data.txHash.slice(0, 10) + "...");
        setTimeout(() => refetchBalance(), 5000); // refetch after ~5s
      } else {
        setFaucetMsg(data.error ?? "Faucet error");
      }
    } catch {
      setFaucetMsg("Network error");
    } finally {
      setFaucetLoading(false);
    }
  }

  const statusBg: Record<string, string> = {
    "approval-confirmed": "bg-green-50 border-green-200 text-green-800",
    "deposit-confirmed":  "bg-green-50 border-green-200 text-green-800",
    error:      "bg-red-50 border-red-200 text-red-700",
    approving:  "bg-blue-50 border-blue-200 text-blue-700",
    depositing: "bg-blue-50 border-blue-200 text-blue-700",
  };

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold mb-6">Deposit</h1>

      {/* TX status banner */}
      {txStatus !== "idle" && (
        <div className={`border p-3 mb-4 text-sm ${statusBg[txStatus] ?? ""}`}>
          {txStatus === "approval-confirmed" && (
            <div className="flex items-center justify-between">
              <span className="font-bold">Approval confirmed. Now click Deposit →</span>
              {lastTxHash && (
                <a href={`https://sepolia.arbiscan.io/tx/${lastTxHash}`} target="_blank" rel="noopener noreferrer" className="text-xs underline ml-2">
                  View →
                </a>
              )}
            </div>
          )}
          {txStatus === "deposit-confirmed" && (
            <div className="flex items-center justify-between">
              <span className="font-bold">Deposit confirmed.</span>
              {lastTxHash && (
                <a href={`https://sepolia.arbiscan.io/tx/${lastTxHash}`} target="_blank" rel="noopener noreferrer" className="text-xs underline ml-2">
                  View on Arbiscan →
                </a>
              )}
            </div>
          )}
          {txStatus === "approving" && (busy ? "Step 1/2 — Waiting for approval… deposit will follow automatically." : "Approval submitted.")}
          {txStatus === "depositing" && (busy ? "Step 2/2 — Waiting for deposit confirmation…" : "Deposit submitted.")}
          {txStatus === "error" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">Transaction failed.</span>
                <button onClick={() => { setTxStatus("idle"); setErrorMsg(null); resetWrite(); }} className="text-xs underline ml-2">Dismiss</button>
              </div>
              {errorMsg && <p className="text-xs font-mono break-all opacity-80">{errorMsg}</p>}
            </div>
          )}
        </div>
      )}

      {/* Tier selector */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {TIERS.map((tier) => (
          <button
            key={tier.id}
            onClick={() => setSelectedTier(tier.id as TierId)}
            className={`border p-3 text-left transition-colors ${
              selectedTier === tier.id
                ? "border-black bg-black text-white"
                : "border-gray-200 hover:border-gray-400"
            }`}
          >
            <p className="font-bold text-sm">{tier.name}</p>
            <p className="text-xs opacity-70">{tier.label}</p>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 mb-1">{TIERS[selectedTier].description}</p>
      <p className="text-xs text-gray-400 mb-5">Target APY: <span className="font-mono">{apyRange[selectedTier]}</span></p>

      {/* Amount input */}
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm text-gray-500">Amount (USDC)</label>
          {usdcBalance !== undefined && (
            <span className="text-xs text-gray-400">
              Balance: <span className="font-mono">${(Number(usdcBalance) / 1e6).toFixed(2)}</span>
            </span>
          )}
        </div>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min="0"
          className="w-full border border-gray-200 px-3 py-2 font-mono focus:outline-none focus:border-black"
        />
      </div>

      {/* % presets */}
      <div className="flex gap-2 mb-4">
        {PCT_PRESETS.map((pct) => (
          <button
            key={pct}
            onClick={() => setPercent(pct)}
            disabled={!usdcBalance}
            className="flex-1 text-xs border border-gray-200 py-1 hover:border-black disabled:opacity-40 transition-colors"
          >
            {pct === 100 ? "MAX" : `${pct}%`}
          </button>
        ))}
        {isConnected && (
          <button
            onClick={handleFaucet}
            disabled={faucetLoading}
            className="text-xs text-gray-400 hover:text-black underline disabled:opacity-50 ml-auto whitespace-nowrap"
          >
            {faucetLoading ? "Sending..." : "Get test USDC"}
          </button>
        )}
      </div>

      {faucetMsg && (
        <p className={`text-xs mb-3 ${faucetMsg.includes("sent") ? "text-green-600" : "text-red-500"}`}>
          {faucetMsg}
        </p>
      )}

      {/* Simulation error — shows contract revert reason before TX */}
      {simError && parsedAmount > 0n && !needsApproval && (
        <div className="border border-red-200 bg-red-50 p-2 mb-3 text-xs text-red-700 font-mono break-all">
          Simulation: {simError.message?.slice(0, 200) ?? String(simError)}
        </div>
      )}

      {/* Action button */}
      {!isConnected ? (
        <p className="text-sm text-gray-400 mb-4">Connect wallet to deposit.</p>
      ) : insufficientBalance && parsedAmount > 0n ? (
        <p className="text-sm text-red-500 mb-4">Insufficient USDC balance.</p>
      ) : needsApproval ? (
        <button
          onClick={handleApproveAndDeposit}
          disabled={busy || !parsedAmount}
          className="w-full border border-black py-2 hover:bg-black hover:text-white transition-colors disabled:opacity-50 mb-4"
        >
          {txStatus === "approving" && busy ? "Approving… (1/2)" : txStatus === "depositing" && busy ? "Depositing… (2/2)" : `Approve & Deposit to ${TIERS[selectedTier].name} →`}
        </button>
      ) : (
        <button
          onClick={handleDeposit}
          disabled={busy || !parsedAmount}
          className="w-full border border-black py-2 hover:bg-black hover:text-white transition-colors disabled:opacity-50 mb-4"
        >
          {busy ? "Depositing…" : `Deposit to ${TIERS[selectedTier].name} →`}
        </button>
      )}

      {/* Info section */}
      <div className="border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500 space-y-1">
        <p className="font-bold text-gray-700 mb-2">Important Information</p>
        <p>• Deposits are deployed to the yield strategy immediately.</p>
        <p>• Yield is distributed at the end of each 2-minute epoch via waterfall.</p>
        <p>• Target APY is indicative and adjusted by the AI agent based on market conditions.</p>
        <p>• APEX depositors bear first loss if yield falls short of CORE/SEAM targets.</p>
        <p>• Use <span className="font-medium">Queue</span> withdrawal (no penalty) or <span className="font-medium">Early</span> withdrawal (1% penalty) in Portfolio.</p>
      </div>
    </div>
  );
}
