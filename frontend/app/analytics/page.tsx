"use client";
import { useReadContracts } from "wagmi";
import { VAULT_ADDRESS, VAULT_ABI, MOCK_STRATEGY_ADDRESS, MOCK_STRATEGY_ABI } from "../../lib/contracts";
import { formatUsdc, bpsToPercent } from "../../lib/utils";

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-gray-200 p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold font-mono">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function TierBar({ label, value, total, color }: { label: string; value: bigint; total: bigint; color: string }) {
  const pct = total > 0n ? Number((value * 10000n) / total) / 100 : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-mono">{formatUsdc(value)} <span className="text-gray-400">({pct.toFixed(1)}%)</span></span>
      </div>
      <div className="h-2 bg-gray-100 w-full">
        <div className={`h-2 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data } = useReadContracts({
    contracts: [
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "corePrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamPrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexPrincipal" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreAccumulatedYield" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamAccumulatedYield" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexAccumulatedYield" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreTargetMinBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreTargetMaxBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamTargetMinBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamTargetMaxBps" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "epochCount" },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "pendingPenalties" },
      { address: MOCK_STRATEGY_ADDRESS, abi: MOCK_STRATEGY_ABI, functionName: "deployedPrincipal" },
      { address: MOCK_STRATEGY_ADDRESS, abi: MOCK_STRATEGY_ABI, functionName: "pendingYield" },
    ],
  });

  const r = (i: number) => data?.[i]?.status === "success" ? (data[i].result as bigint) : 0n;

  const corePrincipal = r(0), seamPrincipal = r(1), apexPrincipal = r(2);
  const coreYield = r(3), seamYield = r(4), apexYield = r(5);
  const coreMin = r(6), coreMax = r(7), seamMin = r(8), seamMax = r(9);
  const epochCount = r(10);
  const pendingPenalties = r(11);
  const strategyPrincipal = r(12), strategyPending = r(13);

  const totalPrincipal = corePrincipal + seamPrincipal + apexPrincipal;
  const totalYield = coreYield + seamYield + apexYield;
  const totalTVL = totalPrincipal + totalYield;

  // APEX buffer ratio — key risk metric (SHALE equiv of Door's Junior Ratio)
  const apexRatioPct = totalPrincipal > 0n
    ? Number((apexPrincipal * 10000n) / totalPrincipal) / 100
    : 0;

  // Effective APY estimate: accumulatedYield / principal * (365 / epochDays)
  // simplified: show target bps as current APY
  const loading = data === undefined;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Analytics</h1>
      <p className="text-sm text-gray-400 mb-6">Real-time protocol metrics</p>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatBox label="Total TVL" value={loading ? "—" : formatUsdc(totalTVL)} sub="principal + yield" />
        <StatBox label="Total Principal" value={loading ? "—" : formatUsdc(totalPrincipal)} />
        <StatBox label="Accrued Yield" value={loading ? "—" : formatUsdc(totalYield)} sub={`Epoch #${epochCount.toString()}`} />
        <StatBox label="APEX Buffer" value={loading ? "—" : `${apexRatioPct.toFixed(1)}%`} sub="of total principal" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {/* TVL Breakdown */}
        <div className="border border-gray-200 p-4">
          <p className="text-sm font-bold mb-4">TVL Breakdown</p>
          <TierBar label="CORE" value={corePrincipal} total={totalPrincipal} color="bg-black" />
          <TierBar label="SEAM" value={seamPrincipal} total={totalPrincipal} color="bg-gray-500" />
          <TierBar label="APEX" value={apexPrincipal} total={totalPrincipal} color="bg-gray-300" />
          <div className="border-t border-gray-100 mt-3 pt-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Total</span>
              <span className="font-mono font-bold">{formatUsdc(totalPrincipal)}</span>
            </div>
          </div>
        </div>

        {/* APY Targets */}
        <div className="border border-gray-200 p-4">
          <p className="text-sm font-bold mb-4">APY Targets</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold">CORE</span>
                <span className="text-xs text-gray-400 ml-2">Stable</span>
              </div>
              <span className="font-mono">{bpsToPercent(coreMin)} – {bpsToPercent(coreMax)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold">SEAM</span>
                <span className="text-xs text-gray-400 ml-2">Balanced</span>
              </div>
              <span className="font-mono">{bpsToPercent(seamMin)} – {bpsToPercent(seamMax)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold">APEX</span>
                <span className="text-xs text-gray-400 ml-2">Aggressive</span>
              </div>
              <span className="font-mono text-gray-500">Residual</span>
            </div>
          </div>
          <div className="border-t border-gray-100 mt-4 pt-3 text-xs text-gray-400">
            Targets updated by AI agent via governance proposals.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {/* Yield Breakdown */}
        <div className="border border-gray-200 p-4">
          <p className="text-sm font-bold mb-4">Accrued Yield by Tier</p>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-gray-500">CORE</span>
              <span className="text-green-700">+{formatUsdc(coreYield)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">SEAM</span>
              <span className="text-green-700">+{formatUsdc(seamYield)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">APEX</span>
              <span className="text-green-700">+{formatUsdc(apexYield)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2">
              <span className="text-gray-400">Total</span>
              <span className="text-green-700 font-bold">+{formatUsdc(totalYield)}</span>
            </div>
          </div>
          {pendingPenalties > 0n && (
            <div className="mt-3 text-xs text-blue-600 bg-blue-50 p-2">
              {formatUsdc(pendingPenalties)} early-withdraw penalties pending redistribution
            </div>
          )}
        </div>

        {/* Strategy */}
        <div className="border border-gray-200 p-4">
          <p className="text-sm font-bold mb-4">Strategy</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Deployed Principal</span>
              <span className="font-mono">{formatUsdc(strategyPrincipal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pending Yield</span>
              <span className="font-mono text-green-700">+{formatUsdc(strategyPending)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Epochs Settled</span>
              <span className="font-mono">{epochCount.toString()}</span>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-400 border-t border-gray-100 pt-3">
            MockStrategy active. Replace with AaveStrategy for mainnet.
          </div>
        </div>
      </div>

      {/* Risk: APEX buffer gauge */}
      <div className="border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-bold">APEX Buffer Ratio</p>
          <span className={`text-xs px-2 py-1 font-bold ${
            apexRatioPct >= 20 ? "bg-green-100 text-green-700" :
            apexRatioPct >= 10 ? "bg-yellow-100 text-yellow-700" :
            apexRatioPct >= 5  ? "bg-orange-100 text-orange-700" :
                                  "bg-red-100 text-red-700"
          }`}>
            {apexRatioPct >= 20 ? "HEALTHY" : apexRatioPct >= 10 ? "CAUTION" : apexRatioPct >= 5 ? "WARNING" : totalPrincipal === 0n ? "—" : "CRITICAL"}
          </span>
        </div>
        <div className="h-3 bg-gray-100 w-full mb-2">
          <div
            className={`h-3 transition-all ${
              apexRatioPct >= 20 ? "bg-green-500" :
              apexRatioPct >= 10 ? "bg-yellow-400" :
              apexRatioPct >= 5  ? "bg-orange-400" : "bg-red-500"
            }`}
            style={{ width: `${Math.min(apexRatioPct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>0%</span>
          <span>Current: <span className="font-mono font-bold text-black">{apexRatioPct.toFixed(2)}%</span></span>
          <span>100%</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          APEX principal acts as a first-loss buffer for CORE and SEAM depositors. Below 10% triggers caution.
        </p>
      </div>
    </div>
  );
}
