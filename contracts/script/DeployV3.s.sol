// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ShaleShare.sol";
import "../src/ShaleVault.sol";
import "../src/ShaleGovernor.sol";
import "../src/MockStrategy.sol";
import "../src/MockHighYieldStrategy.sol";
import "../src/StrategyRouter.sol";
import "../src/MockUSDC.sol";

/**
 * DeployV3 — introduces StrategyRouter with two mock sub-strategies.
 *
 * Architecture
 * ────────────
 *   MockUSDC
 *   MockStrategy         (simulates Aave ~2-3% APY)
 *   MockHighYieldStrategy(simulates Morpho ~6-8% APY)
 *   StrategyRouter       ← ShaleVault sees this as "the strategy"
 *   ShaleVault
 *   ShaleGovernor
 *
 * Initial weights
 * ───────────────
 *   MockStrategy      50%  (conservative baseline)
 *   MockHighYield     50%  (agent will optimize from here)
 */
contract DeployV3 is Script {
    function run() external {
        address deployer        = vm.envAddress("DEPLOYER_ADDRESS");
        address agentWalletAddr = vm.envAddress("AGENT_WALLET_ADDRESS");

        vm.startBroadcast();

        // ── MockUSDC ──────────────────────────────────────────────────────
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC:              ", address(usdc));

        // ── Share tokens ──────────────────────────────────────────────────
        ShaleShare coreToken = new ShaleShare("SHALE CORE", "shlCORE", deployer);
        ShaleShare seamToken = new ShaleShare("SHALE SEAM", "shlSEAM", deployer);
        ShaleShare apexToken = new ShaleShare("SHALE APEX", "shlAPEX", deployer);

        // ── Sub-strategies (owned by deployer temporarily) ─────────────────
        MockStrategy lowYield = new MockStrategy(address(usdc), deployer);
        console.log("MockStrategy (Aave):   ", address(lowYield));

        MockHighYieldStrategy highYield = new MockHighYieldStrategy(
            address(usdc), deployer, "MockMorpho"
        );
        console.log("MockHighYield (Morpho):", address(highYield));

        // ── StrategyRouter ────────────────────────────────────────────────
        // vault address not known yet; set placeholder = deployer, update after vault deploy
        StrategyRouter router = new StrategyRouter(address(usdc), deployer, deployer);

        // Transfer sub-strategy ownership to router (router calls deposit/withdraw/harvest)
        lowYield.transferOwnership(address(router));
        highYield.transferOwnership(address(router));

        // Add strategies with 50/50 initial weights
        router.addStrategy(address(lowYield),  5_000, "MockAave");
        router.addStrategy(address(highYield), 5_000, "MockMorpho");

        // Set agent as keeper (can call setWeights + rebalance)
        router.setKeeper(agentWalletAddr, true);

        console.log("StrategyRouter:        ", address(router));

        // ── Vault ─────────────────────────────────────────────────────────
        ShaleVault vault = new ShaleVault(
            address(usdc),
            address(router),
            address(coreToken),
            address(seamToken),
            address(apexToken),
            deployer
        );
        console.log("ShaleVault:            ", address(vault));

        // Wire vault into router (vault is the sole deposit/withdraw/harvest caller)
        router.setVault(address(vault));

        // Transfer share token ownership to vault
        coreToken.transferOwnership(address(vault));
        seamToken.transferOwnership(address(vault));
        apexToken.transferOwnership(address(vault));

        // ── Governor ──────────────────────────────────────────────────────
        ShaleGovernor governor = new ShaleGovernor(address(vault), deployer);
        vault.grantRole(vault.GOVERNOR_ROLE(), address(governor));
        governor.grantRole(governor.PROPOSER_ROLE(), agentWalletAddr);
        console.log("ShaleGovernor:         ", address(governor));

        // ── Log share tokens ──────────────────────────────────────────────
        console.log("CoreToken:             ", address(coreToken));
        console.log("SeamToken:             ", address(seamToken));
        console.log("ApexToken:             ", address(apexToken));

        vm.stopBroadcast();
    }
}
