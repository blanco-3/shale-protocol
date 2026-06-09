// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ShaleShare.sol";
import "../src/ShaleVault.sol";
import "../src/ShaleGovernor.sol";
import "../src/AaveStrategy.sol";
import "../src/FixedYieldStrategy.sol";
import "../src/StrategyRouter.sol";

/**
 * DeployV4 — Production-level deployment using real Arbitrum Sepolia protocols.
 *
 * Strategies
 * ──────────
 *   AaveStrategy      → Supplies USDC to Aave v3 testnet (real on-chain yield)
 *   FixedYieldStrategy → Simulated high-yield vault (Morpho stand-in for testnet)
 *
 * Underlying asset
 * ────────────────
 *   USDC = 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d  (Aave testnet USDC, 6 decimals)
 *   Get test USDC from: https://staging.aave.com/faucet/
 *
 * Initial weights
 * ───────────────
 *   AaveStrategy      60%  (conservative, real Aave APY ~2-4%)
 *   FixedYield        40%  (simulated 7% APY — backed by yield reserve)
 *
 * Run
 * ───
 *   DEPLOYER_ADDRESS=<addr> AGENT_WALLET_ADDRESS=<addr> \
 *   forge script script/DeployV4.s.sol --rpc-url $ARBITRUM_RPC \
 *     --broadcast --verify --with-gas-price 50000000
 */
contract DeployV4 is Script {
    // ─── Arbitrum Sepolia Protocol Addresses ──────────────────────────────────

    address constant USDC              = 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d;
    address constant AUSDC             = 0x460b97BD498E1157530AEb3086301d5225b91216;
    address constant AAVE_POOL         = 0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff;
    address constant REWARDS_CTRL      = 0x3A203B14CF8749a1e3b7314c6c49004B77Ee667A;
    address constant UNISWAP_ROUTER    = 0x101F443B4d1b059569D643917553c771E1b9663E;

    // ─── Strategy Parameters ──────────────────────────────────────────────────

    uint256 constant FIXED_YIELD_BPS   = 700;   // 7.00% simulated APY
    uint16  constant AAVE_WEIGHT       = 6_000; // 60%
    uint16  constant FIXED_WEIGHT      = 4_000; // 40%

    function run() external {
        address deployer    = vm.envAddress("DEPLOYER_ADDRESS");
        address agentWallet = vm.envAddress("AGENT_WALLET_ADDRESS");

        vm.startBroadcast();

        // ── Share tokens (minting rights transferred to vault after deploy) ────
        ShaleShare coreToken = new ShaleShare("SHALE CORE", "shlCORE", deployer);
        ShaleShare seamToken = new ShaleShare("SHALE SEAM", "shlSEAM", deployer);
        ShaleShare apexToken = new ShaleShare("SHALE APEX", "shlAPEX", deployer);

        // ── Strategy A: Real Aave v3 ──────────────────────────────────────────
        AaveStrategy aaveStrat = new AaveStrategy(
            USDC,
            AUSDC,
            AAVE_POOL,
            REWARDS_CTRL,
            UNISWAP_ROUTER,
            deployer   // temporary owner; transferred to router below
        );
        console.log("AaveStrategy:          ", address(aaveStrat));

        // ── Strategy B: Fixed yield (Morpho stand-in for testnet) ────────────
        FixedYieldStrategy fixedStrat = new FixedYieldStrategy(
            USDC,
            FIXED_YIELD_BPS,
            deployer   // temporary owner; transferred to router below
        );
        console.log("FixedYieldStrategy:    ", address(fixedStrat));

        // ── StrategyRouter ────────────────────────────────────────────────────
        // vault address not yet known; use placeholder (deployer), updated after vault deploy
        StrategyRouter router = new StrategyRouter(USDC, deployer, deployer);

        // Transfer sub-strategy ownership to router (router is the only vault-side caller)
        aaveStrat.transferOwnership(address(router));
        fixedStrat.transferOwnership(address(router));

        // Register strategies with initial weights
        router.addStrategy(address(aaveStrat),  AAVE_WEIGHT,  "AaveV3-USDC");
        router.addStrategy(address(fixedStrat), FIXED_WEIGHT, "FixedYield-USDC");

        // Grant agent KEEPER_ROLE (can call setWeights + rebalance without governance)
        router.setKeeper(agentWallet, true);

        console.log("StrategyRouter:        ", address(router));

        // ── ShaleVault ────────────────────────────────────────────────────────
        ShaleVault vault = new ShaleVault(
            USDC,
            address(router),
            address(coreToken),
            address(seamToken),
            address(apexToken),
            deployer
        );
        console.log("ShaleVault:            ", address(vault));

        // Wire vault → router
        router.setVault(address(vault));

        // Transfer share token minting rights to vault
        coreToken.transferOwnership(address(vault));
        seamToken.transferOwnership(address(vault));
        apexToken.transferOwnership(address(vault));

        // ── ShaleGovernor ─────────────────────────────────────────────────────
        ShaleGovernor governor = new ShaleGovernor(address(vault), deployer);
        vault.grantRole(vault.GOVERNOR_ROLE(), address(governor));
        governor.grantRole(governor.PROPOSER_ROLE(), agentWallet);
        console.log("ShaleGovernor:         ", address(governor));

        // ── Share tokens ──────────────────────────────────────────────────────
        console.log("CoreToken:             ", address(coreToken));
        console.log("SeamToken:             ", address(seamToken));
        console.log("ApexToken:             ", address(apexToken));

        // ── Protocol addresses used ───────────────────────────────────────────
        console.log("--- External ---");
        console.log("USDC (Aave testnet):   ", USDC);
        console.log("aUSDC:                 ", AUSDC);
        console.log("Aave v3 Pool:          ", AAVE_POOL);
        console.log("RewardsController:     ", REWARDS_CTRL);
        console.log("UniV3 SwapRouter:      ", UNISWAP_ROUTER);

        vm.stopBroadcast();

        // ── Post-deploy checklist ─────────────────────────────────────────────
        console.log("");
        console.log("=== POST-DEPLOY STEPS ===");
        console.log("1. Get test USDC from https://staging.aave.com/faucet/");
        console.log("2. Fund FixedYieldStrategy yield reserve:");
        console.log("   fixedStrat.fundYieldReserve(amount)");
        console.log("3. Update agent/.env with new contract addresses");
        console.log("4. Update frontend/.env.local with new contract addresses");
        console.log("5. Run agent: cd agent && npm start");
    }
}
