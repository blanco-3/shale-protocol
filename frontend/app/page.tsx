"use client";
import Link from "next/link";
import { useReadContracts } from "wagmi";
import {
  VAULT_ADDRESS, VAULT_ABI,
  AAVE_POOL_ADDRESS, AAVE_POOL_ABI,
  FIXED_YIELD_ADDRESS, FIXED_YIELD_STRATEGY_ABI,
  STRATEGY_ROUTER_ADDRESS, STRATEGY_ROUTER_ABI,
  USDC_ADDRESS,
} from "../lib/contracts";
import { formatUsdc, TIERS, bpsToPercent } from "../lib/utils";
import { TierCard } from "../components/TierCard";
import { AgentPanel } from "../components/AgentPanel";

export default function Dashboard() {
  const { data: vaultData } = useReadContracts({
    contracts: [
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "corePrincipal" },           // 0
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamPrincipal" },           // 1
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexPrincipal" },           // 2
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreTargetMinBps" },        // 3
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreTargetMaxBps" },        // 4
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamTargetMinBps" },        // 5
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamTargetMaxBps" },        // 6
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "epochCount" },              // 7
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "coreAccumulatedYield" },    // 8
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "seamAccumulatedYield" },    // 9
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "apexAccumulatedYield" },    // 10
    ],
  });

  // Live strategy data: Aave supply rate + FixedYield configured bps + router weights
  const { data: stratData } = useReadContracts({
    contracts: [
      { address: AAVE_POOL_ADDRESS,       abi: AAVE_POOL_ABI,           functionName: "getReserveData",  args: [USDC_ADDRESS] }, // 0
      { address: FIXED_YIELD_ADDRESS,     abi: FIXED_YIELD_STRATEGY_ABI, functionName: "annualYieldBps"                       }, // 1
      { address: STRATEGY_ROUTER_ADDRESS, abi: STRATEGY_ROUTER_ABI,      functionName: "getStrategy",    args: [0n]            }, // 2  Aave weight
      { address: STRATEGY_ROUTER_ADDRESS, abi: STRATEGY_ROUTER_ABI,      functionName: "getStrategy",    args: [1n]            }, // 3  FixedYield weight
    ],
  });

  const r = (i: number) => vaultData?.[i]?.status === "success" ? (vaultData[i].result as bigint) : 0n;
  const corePrincipal = r(0), seamPrincipal = r(1), apexPrincipal = r(2);
  const coreMin = r(3), coreMax = r(4), seamMin = r(5), seamMax = r(6);
  const epochCount = r(7);
  const coreYield = r(8), seamYield = r(9), apexYield = r(10);

  const totalTVL = corePrincipal + seamPrincipal + apexPrincipal;
  const loading = vaultData === undefined;

  // Compute live blended strategy APY in bps from real on-chain reads
  // Aave currentLiquidityRate is in RAY (1e27 = 100%). Convert: bps = rate / 1e23
  const RAY = BigInt("1000000000000000000000000000"); // 1e27
  const aaveReserve = stratData?.[0]?.status === "success"
    ? (stratData[0].result as { currentLiquidityRate: bigint })
    : null;
  const aaveRateBps = aaveReserve
    ? Number(aaveReserve.currentLiquidityRate * 10000n / RAY)
    : null;

  const fixedYieldBps = stratData?.[1]?.status === "success"
    ? Number(stratData[1].result as bigint)
    : null;

  // getStrategy returns tuple [addr, weight, name, active, deployed] — index 1 = weight
  const aaveWeight  = stratData?.[2]?.status === "success"
    ? Number((stratData[2].result as readonly [string, number, string, boolean, bigint])[1])
    : null;
  const fixedWeight = stratData?.[3]?.status === "success"
    ? Number((stratData[3].result as readonly [string, number, string, boolean, bigint])[1])
    : null;

  // Blended strategy APY in bps: weighted average of Aave + FixedYield
  // Falls back to hardcoded estimates (4.2% / 7%) if data unavailable
  const blendedConservativeBps = (aaveRateBps !== null && fixedYieldBps !== null && aaveWeight !== null && fixedWeight !== null)
    ? Math.round((aaveRateBps * aaveWeight + fixedYieldBps * fixedWeight) / 10_000)
    : 420; // fallback: ~4.2% blended
  const blendedOptimisticBps = fixedYieldBps ?? 700; // FixedYield alone as optimistic ceiling

  // Realized APY per tier: (totalAccumulatedYield / principal / epochCount) × 52 × 100
  // Uses epochCount as denominator — gives average per-epoch yield annualised.
  // Returns null when not enough data (fresh deploy, no epochs yet).
  function realizedAPY(principal: bigint, yieldBucket: bigint): string | null {
    if (principal === 0n || yieldBucket === 0n || epochCount === 0n) return null;
    const apy = (Number(yieldBucket) / Number(principal) / Number(epochCount)) * 52 * 100;
    return apy.toFixed(2) + "%";
  }

  const coreRealized  = realizedAPY(corePrincipal, coreYield);
  const seamRealized  = realizedAPY(seamPrincipal, seamYield);
  const apexRealized  = realizedAPY(apexPrincipal, apexYield);

  // APEX projected APY range
  // Formula: (strategyYield × total - coreDue_annual - seamDue_annual) / apexPrincipal
  // Shows two scenarios: conservative (4% blended) and optimistic (7% blended)
  function projectApexAPY(strategyBps: number): string | null {
    if (apexPrincipal === 0n || totalTVL === 0n) return null;
    const total = Number(totalTVL);
    const apex  = Number(apexPrincipal);
    const stratYield = total * strategyBps / 10_000;
    const coreDue    = Number(corePrincipal) * Number(coreMin) / 10_000;
    const seamDue    = Number(seamPrincipal) * Number(seamMin) / 10_000;
    const apexYield  = Math.max(0, stratYield - coreDue - seamDue);
    return (apexYield / apex * 100).toFixed(1) + "%";
  }

  // Blended strategy APY: weighted live rates from Aave + FixedYield (falls back to ~4.2% / 7%)
  const apexConservative = projectApexAPY(blendedConservativeBps);
  const apexOptimistic   = projectApexAPY(blendedOptimisticBps);
  const apexLeverage     = apexPrincipal > 0n && totalTVL > 0n
    ? (Number(totalTVL) / Number(apexPrincipal)).toFixed(1)
    : null;

  return (
    <div>
      {/* Hero */}
      <div className="border border-gray-200 p-6 mb-8">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">AI-Managed Yield Vault</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            SHALE splits your deposit across three risk tiers — CORE, SEAM, and APEX — each earning
            different rates based on loss-absorption priority. An on-chain AI agent continuously
            rebalances across DeFi strategies and adjusts APY targets via governance proposals.
          </p>
          <div className="flex gap-6 text-xs text-gray-400 font-mono border-t border-gray-100 pt-4">
            <span><span className="text-green-700 font-bold">CORE</span> · protected APY · last loss</span>
            <span><span className="text-yellow-700 font-bold">SEAM</span> · higher APY · mid loss</span>
            <span><span className="text-red-700 font-bold">APEX</span> · leveraged APY · first loss</span>
          </div>
        </div>
      </div>

      {/* Protocol stats bar — 5 columns */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8 text-sm">

        <div className="border border-gray-200 p-3">
          <p className="text-xs text-gray-400 mb-1">Total TVL</p>
          <p className="text-xl font-bold font-mono">{loading ? "—" : formatUsdc(totalTVL)}</p>
        </div>

        {/* CORE */}
        <div className="border border-gray-200 p-3">
          <p className="text-xs text-gray-400 mb-0.5">CORE APY</p>
          <p className="text-xs text-gray-400 mb-1">target</p>
          <p className="text-xl font-bold font-mono">
            {bpsToPercent(coreMin)} – {bpsToPercent(coreMax)}
          </p>
          {coreRealized && (
            <p className="text-xs text-green-600 mt-1">realized {coreRealized}</p>
          )}
        </div>

        {/* SEAM */}
        <div className="border border-gray-200 p-3">
          <p className="text-xs text-gray-400 mb-0.5">SEAM APY</p>
          <p className="text-xs text-gray-400 mb-1">target</p>
          <p className="text-xl font-bold font-mono">
            {bpsToPercent(seamMin)} – {bpsToPercent(seamMax)}
          </p>
          {seamRealized && (
            <p className="text-xs text-green-600 mt-1">realized {seamRealized}</p>
          )}
        </div>

        {/* APEX — projected leveraged yield */}
        <div className="border border-gray-200 p-3">
          <p className="text-xs text-gray-400 mb-0.5">APEX APY</p>
          <p className="text-xs text-gray-400 mb-1">
            {apexLeverage ? `${apexLeverage}× leverage` : "leveraged"}
          </p>
          <p className="text-xl font-bold font-mono">
            {apexRealized
              ? apexRealized
              : apexConservative && apexOptimistic
              ? `${apexConservative}–${apexOptimistic}`
              : "—"}
          </p>
          {apexRealized
            ? <p className="text-xs text-green-600 mt-1">realized</p>
            : apexConservative
            ? <p className="text-xs text-gray-400 mt-1">{aaveRateBps !== null ? "live est." : "est."} at {(blendedConservativeBps/100).toFixed(1)}–{(blendedOptimisticBps/100).toFixed(1)}% strategy</p>
            : null}
        </div>

        <div className="border border-gray-200 p-3">
          <p className="text-xs text-gray-400 mb-1">Epoch</p>
          <p className="text-xl font-bold font-mono">
            #{loading ? "—" : epochCount.toString()}
          </p>
        </div>

      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <TierCard tier={TIERS[0]} tvl={corePrincipal} apyMin={coreMin} apyMax={coreMax} />
        <TierCard tier={TIERS[1]} tvl={seamPrincipal} apyMin={seamMin} apyMax={seamMax} />
        <TierCard
          tier={TIERS[2]}
          tvl={apexPrincipal}
          apyMin={undefined}
          apyMax={undefined}
          apyLabel={
            apexRealized
              ? `${apexRealized} realized`
              : apexConservative && apexOptimistic
              ? `${apexConservative}–${apexOptimistic} projected`
              : "Leveraged yield"
          }
        />
      </div>

      {/* Risk–Yield Tradeoff */}
      <div className="border border-gray-200 mb-8">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-bold">Risk–Yield Tradeoff</p>
          <p className="text-xs text-gray-400 mt-0.5">Loss absorption order — who gets hurt first if strategy underperforms</p>
        </div>

        {/* Loss cascade visual */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex text-xs gap-1">
            <div className="flex-1 border border-red-200 bg-red-50 p-3 text-center">
              <p className="font-bold text-red-700">① APEX</p>
              <p className="text-red-500 mt-1">First-loss</p>
              <p className="text-gray-500 mt-1">High APY, principal at risk</p>
            </div>
            <div className="flex items-center text-gray-300 px-1">▶</div>
            <div className="flex-1 border border-yellow-200 bg-yellow-50 p-3 text-center">
              <p className="font-bold text-yellow-700">② SEAM</p>
              <p className="text-yellow-600 mt-1">Second-loss</p>
              <p className="text-gray-500 mt-1">Mid APY, partial buffer</p>
            </div>
            <div className="flex items-center text-gray-300 px-1">▶</div>
            <div className="flex-1 border border-green-200 bg-green-50 p-3 text-center">
              <p className="font-bold text-green-700">③ CORE</p>
              <p className="text-green-600 mt-1">Last-loss</p>
              <p className="text-gray-500 mt-1">Safe APY, principal protected</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Example: strategy returns $900 on $1,000 TVL (−$100 loss). APEX absorbs first — if APEX principal covers it, CORE and SEAM are unaffected. APEX earns more precisely because it takes on this risk.
          </p>
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400">
                <th className="text-left px-4 py-2"></th>
                <th className="text-center px-3 py-2 text-green-700 font-bold">CORE</th>
                <th className="text-center px-3 py-2 text-yellow-700 font-bold">SEAM</th>
                <th className="text-center px-3 py-2 text-red-700 font-bold">APEX</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr className="border-b border-gray-50">
                <td className="px-4 py-2 text-gray-500 font-sans">Target APY</td>
                <td className="px-3 py-2 text-center">{loading ? "—" : `${bpsToPercent(coreMin)}–${bpsToPercent(coreMax)}`}</td>
                <td className="px-3 py-2 text-center">{loading ? "—" : `${bpsToPercent(seamMin)}–${bpsToPercent(seamMax)}`}</td>
                <td className="px-3 py-2 text-center text-gray-500">
                  {apexConservative && apexOptimistic ? `${apexConservative}–${apexOptimistic}` : "Leveraged"}
                </td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="px-4 py-2 text-gray-500 font-sans">APY floor</td>
                <td className="px-3 py-2 text-center text-green-700">Guaranteed ✓</td>
                <td className="px-3 py-2 text-center text-yellow-700">Guaranteed ✓</td>
                <td className="px-3 py-2 text-center text-red-600">None — variable</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="px-4 py-2 text-gray-500 font-sans">Principal risk</td>
                <td className="px-3 py-2 text-center text-green-700">Protected</td>
                <td className="px-3 py-2 text-center text-yellow-700">Partially</td>
                <td className="px-3 py-2 text-center text-red-600">At risk</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="px-4 py-2 text-gray-500 font-sans">Loss priority</td>
                <td className="px-3 py-2 text-center text-green-700">③ Last</td>
                <td className="px-3 py-2 text-center text-yellow-700">② Second</td>
                <td className="px-3 py-2 text-center text-red-600">① First</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-500 font-sans">Best for</td>
                <td className="px-3 py-2 text-center text-gray-600 font-sans">Safety first</td>
                <td className="px-3 py-2 text-center text-gray-600 font-sans">Balanced</td>
                <td className="px-3 py-2 text-center text-gray-600 font-sans">Max yield</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent panel */}
      <AgentPanel />

      {/* CTA row */}
      <div className="flex gap-3 mt-6">
        <Link href="/deposit" className="border border-black px-5 py-2 text-sm hover:bg-black hover:text-white transition-colors">
          Start Earning →
        </Link>
        <Link href="/analytics" className="border border-gray-300 px-5 py-2 text-sm hover:border-black transition-colors">
          View Analytics
        </Link>
        <Link href="/safety" className="border border-gray-300 px-5 py-2 text-sm hover:border-black transition-colors">
          Safety Monitor
        </Link>
      </div>
    </div>
  );
}
