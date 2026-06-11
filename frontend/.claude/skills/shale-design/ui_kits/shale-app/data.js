/* ============================================================
   SHALE UI Kit — shared fixtures & formatters
   Fake but plausible protocol state for the click-through.
   Exposes everything on window for the Babel-scoped screens.
   ============================================================ */

const SHALE_TIERS = [
  {
    id: "core", name: "CORE", label: "Stable", risk: 1, tone: "core",
    apy: "2.50 – 3.50%", loss: "③ last-loss", lev: null,
    blurb: "Receives yield first, every epoch, regardless of strategy performance. Last in line for any capital loss — APEX and SEAM absorb losses before CORE is touched.",
    profile: "Capital preservation",
  },
  {
    id: "seam", name: "SEAM", label: "Balanced", risk: 2, tone: "seam",
    apy: "5.00 – 7.00%", loss: "② second-loss", lev: null,
    blurb: "Higher guaranteed APY than CORE. Absorbs losses only after the APEX buffer is fully depleted — a meaningful safety margin while earning more.",
    profile: "Balanced yield",
  },
  {
    id: "apex", name: "APEX", label: "Aggressive", risk: 3, tone: "apex",
    apy: "10.2%+", loss: "① first-loss", lev: "2.4×",
    blurb: "Captures all residual yield after CORE and SEAM are paid. First to absorb any strategy loss — but with leverage on the upside when strategies outperform.",
    profile: "Maximum yield",
  },
];

const SHALE_STRATEGIES = [
  { name: "Aave V3", asset: "USDC", apy: "5.72%", actual: 30, target: 30, tone: "apex",
    model: "Variable-rate supply · two-slope IR model on pool utilization." },
  { name: "Camelot V3", asset: "USDC/USDT", apy: "7.34%", actual: 48, target: 50, tone: "seam",
    model: "Concentrated-liquidity LP fees · vol/TVL × fee tier × 365." },
  { name: "Morpho Blue", asset: "USDC", apy: "3.41%", actual: 22, target: 20, tone: "core",
    model: "P2P lending · matched suppliers earn above Aave, blended with idle." },
];

const SHALE_PROTOCOL = {
  tvl: "$2,481,094",
  blended: "5.74%",
  epoch: 248,
  bufferPct: 18.4,
  split: { core: 46, seam: 35, apex: 19 },
  agent: {
    id: 41,
    status: "PENDING",
    reason: "Blended APY trending down 38bps over 3 epochs (Camelot volume softening). Lowering CORE target to 2.50–3.25% and SEAM to 4.75–6.50% to keep the APEX residual positive and protect senior tranches.",
    core: "2.50 – 3.25%",
    seam: "4.75 – 6.50%",
  },
};

const SHALE_NAV = ["Dashboard", "Deposit", "Portfolio", "Analytics", "Safety", "Scenarios"];

/* ---- Safety monitor ---- */
const SHALE_SAFETY = {
  apexRatioPct: 18.4,
  gateThresholdPct: 15.0,
  coreApyTarget: "2.5 – 3.5%",
  gateActive: false,
  principal: { core: "$1,141,303", seam: "$868,383", apex: "$471,408", corePct: 46, seamPct: 35, apexPct: 19 },
  levels: [
    { level: "HEALTHY",  threshold: "\u2265 20%",  coreAPY: "4 \u2013 6%", desc: "All deposits enabled",                        tone: "positive" },
    { level: "CAUTION",  threshold: "15 \u2013 20%", coreAPY: "4 \u2013 6%", desc: "All deposits enabled",                        tone: "seam" },
    { level: "WARNING",  threshold: "10 \u2013 15%", coreAPY: "4 \u2013 5%", desc: "Monitoring closely",                          tone: "warning" },
    { level: "DANGER",   threshold: "5 \u2013 10%",  coreAPY: "3 \u2013 4%", desc: "CORE deposits restricted",                   tone: "danger" },
    { level: "CRITICAL", threshold: "< 5%",          coreAPY: "2 \u2013 3%", desc: "Emergency \u2014 all deposits paused",        tone: "danger" },
  ],
};

/* ---- Scenario simulator constants (mirror live vault) ---- */
const SHALE_SIM = {
  TOTAL_TVL: 750000, CORE_TVL: 375000, SEAM_TVL: 200000, APEX_TVL: 175000,
  CORE_TARGET_PCT: 2.5, SEAM_TARGET_PCT: 5.0,
  scenarios: [
    { id: "bull",       label: "Bull Market",   tag: "12% strategy",  desc: "Strategy significantly outperforms. APEX captures amplified residual.", apy: 12,   loss: 0 },
    { id: "normal",     label: "Normal DeFi",    tag: "6% strategy",   desc: "Healthy DeFi conditions. All tiers paid, APEX earns a meaningful premium.", apy: 6, loss: 0 },
    { id: "breakeven",  label: "Near Breakeven", tag: "3.2% strategy", desc: "Strategy just covers CORE+SEAM. APEX earns minimal yield \u2014 the APY-reversal zone.", apy: 3.2, loss: 0 },
    { id: "low",        label: "Low Yield",      tag: "1% strategy",   desc: "Strategy can't cover SEAM. APEX receives zero yield and absorbs the shortfall from principal.", apy: 1, loss: 0 },
    { id: "small_loss", label: "Capital Loss",   tag: "\u22125% strategy",  desc: "Strategy loses principal. APEX absorbs the loss first. CORE and SEAM unaffected.", apy: -5, loss: 500 },
    { id: "large_loss", label: "APEX Depleted",  tag: "\u221220% strategy", desc: "Loss exceeds the APEX buffer. SEAM begins absorbing the remainder. CORE still protected.", apy: -20, loss: 2100 },
  ],
};

function shaleSimulate(stratApy, capitalLoss) {
  const S = SHALE_SIM;
  const totalYield = S.TOTAL_TVL * stratApy / 100;
  const coreDue = S.CORE_TVL * S.CORE_TARGET_PCT / 100;
  const seamDue = S.SEAM_TVL * S.SEAM_TARGET_PCT / 100;

  let apexLoss = 0, seamLoss = 0, coreLoss = 0;
  let rem = Math.max(0, capitalLoss);
  const apexAbsorb = Math.min(rem, S.APEX_TVL); apexLoss = apexAbsorb; rem -= apexAbsorb;
  const seamAbsorb = Math.min(rem, S.SEAM_TVL); seamLoss = seamAbsorb; rem -= seamAbsorb;
  coreLoss = Math.min(rem, S.CORE_TVL);

  let avail = totalYield, coreYield = 0, seamYield = 0, apexYield = 0;
  if (avail >= coreDue) { coreYield = coreDue; avail -= coreDue; }
  else { const d = coreDue - avail; coreYield = coreDue; apexLoss += d; avail = 0; }
  if (avail >= seamDue) { seamYield = seamDue; avail -= seamDue; }
  else {
    const d = seamDue - avail; seamYield = Math.max(0, avail);
    const can = Math.max(0, S.APEX_TVL - apexLoss);
    const ab = Math.min(d, can); apexLoss += ab;
    const r2 = d - ab;
    if (r2 > 0) { seamLoss += r2; seamYield = seamDue - r2; } else { seamYield = seamDue; }
    avail = 0;
  }
  apexYield = Math.max(0, avail);

  const coreApy = S.CORE_TVL > 0 ? coreYield / S.CORE_TVL * 100 : 0;
  const seamApy = S.SEAM_TVL > 0 ? seamYield / S.SEAM_TVL * 100 : 0;
  const apexApy = S.APEX_TVL > 0 ? apexYield / S.APEX_TVL * 100 : 0;

  let status = "healthy", note = "All tiers fully paid. APEX earns the leveraged residual.";
  if (coreLoss > 0) { status = "core_hit"; note = "APEX and SEAM depleted. CORE principal is absorbing losses \u2014 an extreme scenario."; }
  else if (seamLoss > 0) { status = "seam_hit"; note = "APEX buffer depleted. SEAM principal is absorbing the remaining shortfall."; }
  else if (apexLoss > 0 && capitalLoss === 0) { status = "apex_deficit"; note = "Yield too low to cover CORE+SEAM targets. APEX principal absorbs the deficit; CORE and SEAM are fully protected."; }
  else if (apexLoss > 0) { status = "apex_deficit"; note = "Capital loss absorbed by APEX. CORE and SEAM principal unaffected."; }

  return { coreYield, seamYield, apexYield, coreApy, seamApy, apexApy, coreLoss, seamLoss, apexLoss,
    coreFinal: S.CORE_TVL - coreLoss, seamFinal: S.SEAM_TVL - seamLoss, apexFinal: Math.max(0, S.APEX_TVL - apexLoss),
    status, note };
}

function shaleFmt(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
function shalePct(n) { return (n >= 0 ? "+" : "") + n.toFixed(2) + "%"; }

const SHALE_POSITIONS = [
  { tier: "CORE", tone: "core", shares: "12,000 shlCORE", value: "$12,184.40", yield: "+$184.40", apy: "3.07%" },
  { tier: "SEAM", tone: "seam", shares: "8,000 shlSEAM", value: "$8,402.10", yield: "+$402.10", apy: "6.21%" },
  { tier: "APEX", tone: "apex", shares: "5,000 shlAPEX", value: "$5,611.80", yield: "+$611.80", apy: "11.40%" },
];

function shaleToneVar(tone) {
  return { core: "var(--core-600)", seam: "var(--seam-600)", apex: "var(--apex-600)" }[tone] || "var(--rock-900)";
}

Object.assign(window, { SHALE_TIERS, SHALE_STRATEGIES, SHALE_PROTOCOL, SHALE_NAV, SHALE_POSITIONS, SHALE_SAFETY, SHALE_SIM, shaleSimulate, shaleFmt, shalePct, shaleToneVar });
