import cron from "node-cron";
import { fetchAaveAPYBps } from "./aave";
import { readVaultState } from "./vault";
import { assessMarket, submitProposal } from "./proposer";
import { maybeSettleEpoch } from "./settler";
import { CRON_SCHEDULE } from "./config";

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

    // 3. Assess and maybe propose
    const market = assessMarket(vaultState, aaveAPYBps);
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
