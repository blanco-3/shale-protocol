"use client";
import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useReadContracts } from "wagmi";
import { VAULT_ADDRESS, VAULT_ABI, USDC_ADDRESS, ERC20_ABI } from "../../lib/contracts";
import { TIERS, TierId, parseUsdc, bpsToPercent } from "../../lib/utils";

export default function DepositPage() {
  const { address, isConnected } = useAccount();
  const [selectedTier, setSelectedTier] = useState<TierId>(0);
  const [amount, setAmount] = useState("");
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetMsg, setFaucetMsg] = useState<string | null>(null);

  const { writeContract, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: allowanceData } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, VAULT_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  const { data: usdcBalanceData } = useReadContract({
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

  const parsedAmount = parseUsdc(amount);
  const allowance = allowanceData as bigint | undefined;
  const usdcBalance = usdcBalanceData as bigint | undefined;
  const needsApproval = allowance !== undefined && allowance < parsedAmount;
  const insufficientBalance = usdcBalance !== undefined && usdcBalance < parsedAmount;

  const busy = isPending || isConfirming;

  function handleApprove() {
    writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [VAULT_ADDRESS, parsedAmount],
    });
  }

  function handleDeposit() {
    writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: "deposit",
      args: [parsedAmount, selectedTier],
    });
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
        setFaucetMsg("10,000 USDC sent! Tx: " + data.txHash.slice(0, 10) + "...");
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

      <div className="grid grid-cols-3 gap-2 mb-6">
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
      <p className="text-xs text-gray-400 mb-4">Target APY: {apyRange[selectedTier]}</p>

      <div className="mb-6">
        <label className="block text-sm text-gray-500 mb-1">Amount (USDC)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min="0"
          className="w-full border border-gray-200 px-3 py-2 font-mono focus:outline-none focus:border-black"
        />
        <div className="flex justify-between items-center mt-1">
          {usdcBalance !== undefined && (
            <p className="text-xs text-gray-400">
              Balance: ${(Number(usdcBalance) / 1e6).toFixed(2)} USDC
            </p>
          )}
          {isConnected && (
            <button
              onClick={handleFaucet}
              disabled={faucetLoading}
              className="text-xs text-gray-400 hover:text-black underline disabled:opacity-50"
            >
              {faucetLoading ? "Sending..." : "Get test USDC"}
            </button>
          )}
        </div>
        {faucetMsg && (
          <p className={`text-xs mt-1 ${faucetMsg.startsWith("10,000") ? "text-green-600" : "text-red-500"}`}>
            {faucetMsg}
          </p>
        )}
      </div>

      {isSuccess && (
        <p className="text-sm text-green-600 mb-4">Transaction confirmed.</p>
      )}

      {!isConnected ? (
        <p className="text-sm text-gray-400">Connect wallet to deposit.</p>
      ) : insufficientBalance && parsedAmount > 0n ? (
        <p className="text-sm text-red-500">Insufficient USDC balance.</p>
      ) : needsApproval ? (
        <button
          onClick={handleApprove}
          disabled={busy || !parsedAmount}
          className="w-full border border-black py-2 hover:bg-black hover:text-white transition-colors disabled:opacity-50"
        >
          {busy ? "Approving..." : "Approve USDC"}
        </button>
      ) : (
        <button
          onClick={handleDeposit}
          disabled={busy || !parsedAmount}
          className="w-full border border-black py-2 hover:bg-black hover:text-white transition-colors disabled:opacity-50"
        >
          {busy ? "Depositing..." : `Deposit to ${TIERS[selectedTier].name} →`}
        </button>
      )}
    </div>
  );
}
