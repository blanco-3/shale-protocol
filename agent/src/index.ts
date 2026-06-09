import cron from "node-cron";
import { ethers } from "ethers";
import { fetchAaveAPYBps } from "./aave";
import { readVaultState } from "./vault";
import { assessMarket, submitProposal } from "./proposer";
import { maybeSettleEpoch } from "./settler";
import { maybeRebalance } from "./rebalancer";
import { CRON_SCHEDULE, ADDRESSES, provider } from "./config";

let isRunning = false;

async function agentLoop() {
  if (isRunning) {
    console.log("[agent] Previous run still in progress, skipping.");
    return;
  }
  isRunning = true;

  console.log(`\n[agent] ─── Run at ${new Date().toISOString()} ───`);

  try {
    // 1. Check and settle epoch if ready
    await maybeSettleEpoch();

    // 2. Read state + APY in parallel
    const [vaultState, aaveAPYBps] = await Promise.all([
      readVaultState(),
      fetchAaveAPYBps(),
    ]);

    const totalTVL = vaultState.corePrincipal + vaultState.seamPrincipal + vaultState.apexPrincipal;

    console.log(`[agent] Aave APY:      ${(aaveAPYBps / 100).toFixed(2)}%`);
    console.log(`[agent] CORE target:   ${(Number(vaultState.coreTargetMinBps) / 100).toFixed(2)}% – ${(Number(vaultState.coreTargetMaxBps) / 100).toFixed(2)}%`);
    console.log(`[agent] SEAM target:   ${(Number(vaultState.seamTargetMinBps) / 100).toFixed(2)}% – ${(Number(vaultState.seamTargetMaxBps) / 100).toFixed(2)}%`);
    console.log(`[agent] Total TVL:     $${(Number(totalTVL) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);

    // 3. Rebalance strategies (agent moves funds autonomously via KEEPER_ROLE)
    await maybeRebalance();

    // 4. Assess and maybe propose APY target update
    const market = await assessMarket(vaultState, aaveAPYBps);
    console.log(`[agent] Decision:      ${market.recommendation}`);

    if (market.recommendation !== "HOLD") {
      await submitProposal(market);
    } else {
      console.log(`[agent] ${market.reason}`);
    }
  } catch (err) {
    console.error(`[agent] Error:`, err);
  } finally {
    isRunning = false;
  }
}

agentLoop();
cron.schedule(CRON_SCHEDULE, agentLoop);
console.log(`[agent] Started. Cron: ${CRON_SCHEDULE}`);

// ── EpochSettled event listener — triggers immediate agent loop ─────────────
if (ADDRESSES.vault) {
  const vaultContract = new ethers.Contract(
    ADDRESSES.vault,
    ["event EpochSettled(uint256 indexed epochId, uint256 totalYield, uint256 coreShare, uint256 seamShare, uint256 apexShare)"],
    provider
  );

  vaultContract.on("EpochSettled", (epochId: bigint) => {
    console.log(`\n[agent] EpochSettled #${epochId} detected — triggering immediate run.`);
    agentLoop();
  });

  console.log("[agent] Listening for EpochSettled events.");
}
