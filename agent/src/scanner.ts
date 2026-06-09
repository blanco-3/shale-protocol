import { ethers } from "ethers";
import { provider, ADDRESSES } from "./config";

const ROUTER_ABI = [
  "function strategyCount() view returns (uint256)",
  "function getStrategy(uint256 i) view returns (address addr, uint16 weight, string name, bool active, uint256 deployed)",
  "function totalAssets() view returns (uint256)",
];

const STRATEGY_ABI = [
  "function apyBps() view returns (uint256)",
  "function deployedPrincipal() view returns (uint256)",
  "function pendingYield() view returns (uint256)",
];

export interface StrategyData {
  index:    number;
  addr:     string;
  name:     string;
  weight:   number;   // current target weight bps (0-10000)
  deployed: bigint;   // USDC deployed in this strategy
  apyBps:   number;   // estimated APY in basis points
  active:   boolean;
}

/**
 * Scan all sub-strategies registered in StrategyRouter.
 *
 * APY estimation:
 *   - For MockStrategy / MockHighYieldStrategy: pendingYield / deployedPrincipal
 *     annualised over 7-day epoch. Only meaningful when yield has been injected.
 *   - For real strategies (Aave/Morpho): query protocol-specific on-chain rate.
 *   - Falls back to 0 if unrecognised or no data.
 */
export async function scanStrategies(): Promise<{
  strategies: StrategyData[];
  routerTotal: bigint;
}> {
  if (!ADDRESSES.router) {
    return { strategies: [], routerTotal: 0n };
  }

  const router = new ethers.Contract(ADDRESSES.router, ROUTER_ABI, provider);

  const [count, routerTotal]: [bigint, bigint] = await Promise.all([
    router.strategyCount(),
    router.totalAssets(),
  ]);

  const strategies: StrategyData[] = [];

  for (let i = 0; i < Number(count); i++) {
    const [addr, weight, name, active, deployed] = await router.getStrategy(i);

    let apyBps = 0;

    // Try to read strategy APY: prefer apyBps() view, fall back to yield/principal annualisation
    try {
      const strat = new ethers.Contract(addr, STRATEGY_ABI, provider);

      // Primary: apyBps() — present on MockStrategy, FixedYieldStrategy, CamelotStrategy
      try {
        const rawApy: bigint = await strat.apyBps();
        apyBps = Number(rawApy);
      } catch {
        // Fallback: annualise pendingYield/deployedPrincipal over 7-day epoch
        const [principal, pending]: [bigint, bigint] = await Promise.all([
          strat.deployedPrincipal(),
          strat.pendingYield(),
        ]);
        if (principal > 0n) {
          const rawRate = Number(pending) / Number(principal);
          apyBps = Math.round(rawRate * (365 / 7) * 10_000);
        }
      }
    } catch {
      // Strategy call failed — apyBps stays 0
    }

    strategies.push({
      index:  i,
      addr,
      name,
      weight: Number(weight),
      deployed,
      apyBps,
      active,
    });
  }

  return { strategies, routerTotal };
}
