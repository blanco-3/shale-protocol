"use client";
import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useReadContracts } from "wagmi";
import { VAULT_ADDRESS, VAULT_ABI, USDC_ADDRESS, ERC20_ABI } from "../../lib/contracts";
import { TIERS, TierId, parseUsdc, bpsToPercent } from "../../lib/utils";

const PCT_PRESETS = [25, 50, 75, 100] as const;

export default function DepositPage() {
  const { address, isConnected } = useAccount();
  const [selectedTier, setSelectedTier] = useState<TierId>(0);
  const [amount, setAmount] = useState("");
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetMsg, setFaucetMsg] = useState<string | null>(null);

  const { writeContract, isPending, data: txHash } = useWriteContract();
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
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreTargetMinBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreTargetMaxBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamTargetMinBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamTargetMaxBps" },
    ],
  });

  const [coreMin, coreMax, seamMin, seamMax] = vaultData?.map((d) =>
    d.status === "success" ? (d.result as bigint) : 0n
  ) ?? Array(4).fill(0n);

  const apyRange: Record<TierId, string> = {
    0: `${bpsToPercent(coreMin ?? 0n)} – ${bpsToPercent(coreMax ?? 0n)}`,
    1: `${bpsToPercent(seamMin ?? 0n)} – ${bpsToPercent(seamMax ?? 0n)}`,
    2: "Residual (variable)",
  };

  const usdcBalance = usdcBalanceData as bigint | undefined;
  const parsedAmount = parseUsdc(amount);
  const allowance = allowanceData as bigint | undefined;
  const needsApproval = allowance !== undefined && allowance < parsedAmount;
  const insufficientBalance = usdcBalance !== undefined && usdcBalance < parsedAmount;
  const busy = isPending || isConfirming;

  function setPercent(pct: number) {
    if (!usdcBalance) return;
    const value = (usdcBalance * BigInt(pct)) / 100n;
    setAmount((Number(value) / 1e6).toFixed(2));
  }

  function handleApprove() {
    writeContract(
      {
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [VAULT_ADDRESS, parsedAmount],
      },
      { onSuccess: () => refetchAllowance() }
    );
  }

  function handleDeposit() {
    writeContract(
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "deposit", args: [parsedAmount, selectedTier] },
      { onSuccess: () => { refetchAllowance(); refetchBalance(); setAmount(""); } }
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
        refetchBalance();
      } else {
        setFaucetMsg(data.error ?? "Faucet error");
      }
    } catch {
      setFaucetMsg("Network error");
    } finally {
      setFaucetLoading(false);
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold mb-6">Deposit</h1>

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
        <p className={`text-xs mb-3 ${faucetMsg.startsWith("10,000") ? "text-green-600" : "text-red-500"}`}>
          {faucetMsg}
        </p>
      )}

      {isSuccess && <p className="text-sm text-green-600 mb-4">Deposit confirmed.</p>}

      {/* Action button */}
      {!isConnected ? (
        <p className="text-sm text-gray-400 mb-4">Connect wallet to deposit.</p>
      ) : insufficientBalance && parsedAmount > 0n ? (
        <p className="text-sm text-red-500 mb-4">Insufficient USDC balance.</p>
      ) : needsApproval ? (
        <button
          onClick={handleApprove}
          disabled={busy || !parsedAmount}
          className="w-full border border-black py-2 hover:bg-black hover:text-white transition-colors disabled:opacity-50 mb-4"
        >
          {busy ? "Approving..." : "Approve USDC"}
        </button>
      ) : (
        <button
          onClick={handleDeposit}
          disabled={busy || !parsedAmount}
          className="w-full border border-black py-2 hover:bg-black hover:text-white transition-colors disabled:opacity-50 mb-4"
        >
          {busy ? "Depositing..." : `Deposit to ${TIERS[selectedTier].name} →`}
        </button>
      )}

      {/* Info section */}
      <div className="border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500 space-y-1">
        <p className="font-bold text-gray-700 mb-2">Important Information</p>
        <p>• Deposits are deployed to the yield strategy immediately.</p>
        <p>• Yield is distributed at the end of each 7-day epoch via waterfall.</p>
        <p>• Target APY is indicative and adjusted by the AI agent based on market conditions.</p>
        <p>• APEX depositors bear first loss if yield falls short of CORE/SEAM targets.</p>
        <p>• Use <span className="font-medium">Queue</span> withdrawal (no penalty) or <span className="font-medium">Early</span> withdrawal (1% penalty) in Portfolio.</p>
      </div>
    </div>
  );
}
