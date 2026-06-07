import { ethers } from "ethers";
import { provider, ADDRESSES, USE_MOCK_AAVE } from "./config";

const DATA_PROVIDER_ABI = [
  "function getReserveData(address asset) view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint40)",
];

const MOCK_POOL_ABI = [
  "function apyBps() view returns (uint256)",
];

/**
 * Fetch current USDC supply APY in basis points.
 *
 * When USE_MOCK_AAVE=true, reads MockAavePool.apyBps() directly (useful for demo).
 * Otherwise reads Aave V3 data provider: liquidityRate in RAY → compound APY in bps.
 *
 *   APR = liquidityRate / 1e27
 *   APY = (1 + APR/365)^365 - 1
 *   bps = APY * 10000
 */
export async function fetchAaveAPYBps(): Promise<number> {
  if (USE_MOCK_AAVE) {
    const mock = new ethers.Contract(ADDRESSES.mockAavePool, MOCK_POOL_ABI, provider);
    const bps: bigint = await mock.apyBps();
    return Number(bps);
  }

  try {
    if (!ADDRESSES.aaveDataProvider) {
      console.warn("[aave] AAVE_DATA_PROVIDER_ADDRESS not set, using fallback 3%");
      return 300;
    }

    const dataProvider = new ethers.Contract(
      ADDRESSES.aaveDataProvider,
      DATA_PROVIDER_ABI,
      provider
    );

    const reserveData = await dataProvider.getReserveData(ADDRESSES.usdc);
    const liquidityRateRay: bigint = reserveData[5];

    const RAY = BigInt("1000000000000000000000000000"); // 1e27
    const aprFloat = Number(liquidityRateRay) / Number(RAY);
    const apyFloat = Math.pow(1 + aprFloat / 365, 365) - 1;
    return Math.round(apyFloat * 10000);
  } catch (err) {
    console.error("[aave] Failed to fetch APY:", err);
    return 300; // 3% conservative fallback
  }
}
