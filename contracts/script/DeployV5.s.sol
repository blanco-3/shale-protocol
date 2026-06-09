// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ShaleShare.sol";
import "../src/ShaleVault.sol";
import "../src/ShaleGovernor.sol";
import "../src/AaveStrategy.sol";
import "../src/FixedYieldStrategy.sol";
import "../src/CamelotStrategy.sol";
import "../src/StrategyRouter.sol";

/**
 * DeployV5 — Tranche CDO structure with real loss absorption.
 *
 * Key changes from V4
 * ───────────────────
 *   - APEX buffer gate: CORE/SEAM deposits blocked when APEX < 15% of TVL
 *   - Capital loss absorption at epoch: APEX -> SEAM -> CORE
 *   - APY ordering fixed: SEAM target > CORE target (5-7% vs 2.5-3.5%)
 *   - Penalties: 60% to APEX (first-loss insurance premium)
 *   - updateTargets enforces seamMin > coreMax at contract level
 *   - FixedYieldStrategy.simulateLoss() for live demo of loss absorption
 *   - StrategyRouter.demoSimulateLoss() for deployer to trigger demo
 *
 * V5 additions
 * ────────────
 *   - CamelotStrategy (Arbitrum-native, 9% APY) added as third sub-strategy
 *   - Three-strategy portfolio: Aave ~4% / FixedYield 7% / Camelot 9%
 *   - Meaningful APY spread gives AI rebalancer a real optimisation problem
 *   - MIN_DEPOSIT_LOCK (1 day) timing attack defence in ShaleVault
 *   - maxWithdrawalsPerEpoch governable (default 100)
 */
contract DeployV5 is Script {
    // ─── Arbitrum Sepolia Protocol Addresses ──────────────────────────────────
    address constant USDC                 = 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d;
    address constant AUSDC                = 0x460b97BD498E1157530AEb3086301d5225b91216;
    address constant AAVE_POOL            = 0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff;
    address constant REWARDS_CTRL         = 0x3A203B14CF8749a1e3b7314c6c49004B77Ee667A;
    address constant UNISWAP_ROUTER       = 0x101F443B4d1b059569D643917553c771E1b9663E;
    // Chainlink L2 Sequencer Uptime Feed — Arbitrum Sepolia
    // Source: https://docs.chain.link/data-feeds/l2-sequencer-feeds
    address constant SEQUENCER_FEED       = 0x4DA69f028A5790fe6402c1c2f41DaB1eC95f0D11;

    uint256 constant FIXED_YIELD_BPS   = 700;   // 7% simulated APY for FixedYieldStrategy
    uint256 constant CAMELOT_YIELD_BPS = 900;   // 9% simulated APY for CamelotStrategy
    uint16  constant AAVE_WEIGHT       = 4_000; // 40% — variable rate, lowest APY
    uint16  constant FIXED_WEIGHT      = 3_000; // 30% — fixed 7%
    uint16  constant CAMELOT_WEIGHT    = 3_000; // 30% — Arbitrum-native, highest APY

    function run() external {
        address deployer    = vm.envAddress("DEPLOYER_ADDRESS");
        address agentWallet = vm.envAddress("AGENT_WALLET_ADDRESS");

        vm.startBroadcast();

        // ── Share tokens ──────────────────────────────────────────────────
        ShaleShare coreToken = new ShaleShare("SHALE CORE", "shlCORE", deployer);
        ShaleShare seamToken = new ShaleShare("SHALE SEAM", "shlSEAM", deployer);
        ShaleShare apexToken = new ShaleShare("SHALE APEX", "shlAPEX", deployer);

        // ── Strategy A: Real Aave v3 ──────────────────────────────────────
        AaveStrategy aaveStrat = new AaveStrategy(
            USDC, AUSDC, AAVE_POOL, REWARDS_CTRL, UNISWAP_ROUTER, deployer
        );
        console.log("AaveStrategy:          ", address(aaveStrat));

        // ── Strategy B: Fixed yield (Morpho stand-in + loss demo) ─────────
        FixedYieldStrategy fixedStrat = new FixedYieldStrategy(
            USDC, FIXED_YIELD_BPS, deployer
        );
        console.log("FixedYieldStrategy:    ", address(fixedStrat));

        // ── Strategy C: Camelot (Arbitrum-native LP simulation) ───────────
        CamelotStrategy camelotStrat = new CamelotStrategy(
            USDC, CAMELOT_YIELD_BPS, deployer
        );
        console.log("CamelotStrategy:       ", address(camelotStrat));

        // ── StrategyRouter ────────────────────────────────────────────────
        StrategyRouter router = new StrategyRouter(USDC, deployer, deployer);

        // MUST be called before transferOwnership — owner-only.
        // Without this, _checkSequencer() silently returns and deposits proceed
        // even during a sequencer outage. Setting it here guarantees it can never
        // be forgotten in a subsequent step.
        aaveStrat.setSequencerFeed(SEQUENCER_FEED);
        console.log("AaveStrategy sequencerFeed set:", SEQUENCER_FEED);

        aaveStrat.transferOwnership(address(router));
        fixedStrat.transferOwnership(address(router));
        camelotStrat.transferOwnership(address(router));

        router.addStrategy(address(aaveStrat),    AAVE_WEIGHT,    "AaveV3-USDC");
        router.addStrategy(address(fixedStrat),   FIXED_WEIGHT,   "FixedYield-USDC");
        router.addStrategy(address(camelotStrat), CAMELOT_WEIGHT, "Camelot-USDC");
        router.setKeeper(agentWallet, true);

        console.log("StrategyRouter:        ", address(router));

        // ── ShaleVault (v3 — with loss absorption + apex gate) ────────────
        ShaleVault vault = new ShaleVault(
            USDC,
            address(router),
            address(coreToken),
            address(seamToken),
            address(apexToken),
            deployer
        );
        console.log("ShaleVault:            ", address(vault));

        router.setVault(address(vault));

        coreToken.transferOwnership(address(vault));
        seamToken.transferOwnership(address(vault));
        apexToken.transferOwnership(address(vault));

        // ── ShaleGovernor ─────────────────────────────────────────────────
        ShaleGovernor governor = new ShaleGovernor(address(vault), deployer);
        vault.grantRole(vault.GOVERNOR_ROLE(), address(governor));
        governor.grantRole(governor.PROPOSER_ROLE(), agentWallet);

        // MUST be set before handing over control: minDelay=0 (default) means AI agent
        // key compromise → immediate execution with no human review window.
        // 1 hour gives the admin time to reject a malicious proposal.
        governor.setMinDelay(1 hours);
        console.log("ShaleGovernor:         ", address(governor));
        console.log("  minDelay:            1 hour");

        console.log("CoreToken:             ", address(coreToken));
        console.log("SeamToken:             ", address(seamToken));
        console.log("ApexToken:             ", address(apexToken));

        vm.stopBroadcast();

        console.log("");
        console.log("=== COPY TO .env ===");
        console.log("SHALE_VAULT_ADDRESS=",       address(vault));
        console.log("SHALE_GOVERNOR_ADDRESS=",    address(governor));
        console.log("STRATEGY_ROUTER_ADDRESS=",   address(router));
        console.log("NEXT_PUBLIC_VAULT_ADDRESS=", address(vault));
        console.log("NEXT_PUBLIC_GOVERNOR_ADDRESS=", address(governor));
        console.log("NEXT_PUBLIC_STRATEGY_ROUTER_ADDRESS=", address(router));
        console.log("NEXT_PUBLIC_FIXED_YIELD_STRATEGY_ADDRESS=", address(fixedStrat));

        console.log("");
        console.log("=== DEMO FLOW ===");
        console.log("1. Get testUSDC: https://staging.aave.com/faucet/");
        console.log("2. deposit(X, APEX) to fill buffer (>15% of TVL)");
        console.log("3. deposit(X, CORE) and deposit(X, SEAM)");
        console.log("4. Agent rebalances: Camelot(9%) gets more weight than Aave(4%)");
        console.log("5. Simulate loss: router.demoSimulateLoss(2, lossAmount)");
        console.log("6. settleEpoch() -> LossAbsorbed event shows APEX absorbs first");
        console.log("7. previewRedeem(shares, APEX) drops, CORE unchanged");
    }
}
