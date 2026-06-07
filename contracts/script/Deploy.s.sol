// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ShaleShare.sol";
import "../src/ShaleVault.sol";
import "../src/ShaleGovernor.sol";
import "../src/MockStrategy.sol";
import "../src/MockUSDC.sol";

contract Deploy is Script {
    function run() external {
        address deployer        = vm.envAddress("DEPLOYER_ADDRESS");
        address agentWalletAddr = vm.envAddress("AGENT_WALLET_ADDRESS");

        vm.startBroadcast();

        // ── MockUSDC ──────────────────────────────────────────────────────
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC:      ", address(usdc));

        // ── Share tokens ──────────────────────────────────────────────────
        ShaleShare coreToken = new ShaleShare("SHALE CORE", "shlCORE", deployer);
        ShaleShare seamToken = new ShaleShare("SHALE SEAM", "shlSEAM", deployer);
        ShaleShare apexToken = new ShaleShare("SHALE APEX", "shlAPEX", deployer);

        // ── MockStrategy ──────────────────────────────────────────────────
        // vault address not known yet — deploy with placeholder, set owner after
        // instead: deploy strategy with deployer as temporary owner, then transfer
        MockStrategy strategy = new MockStrategy(address(usdc), deployer);
        console.log("MockStrategy:  ", address(strategy));

        // ── Vault (v2) ────────────────────────────────────────────────────
        ShaleVault vault = new ShaleVault(
            address(usdc),
            address(strategy),
            address(coreToken),
            address(seamToken),
            address(apexToken),
            deployer
        );
        console.log("ShaleVault:    ", address(vault));

        // Transfer strategy ownership to vault so only vault can call it
        strategy.transferOwnership(address(vault));

        // Transfer share token ownership to vault
        coreToken.transferOwnership(address(vault));
        seamToken.transferOwnership(address(vault));
        apexToken.transferOwnership(address(vault));

        // ── Governor ──────────────────────────────────────────────────────
        ShaleGovernor governor = new ShaleGovernor(address(vault), deployer);
        vault.grantRole(vault.GOVERNOR_ROLE(), address(governor));
        governor.grantRole(governor.PROPOSER_ROLE(), agentWalletAddr);
        console.log("ShaleGovernor: ", address(governor));

        // ── Seed strategy with USDC so it can pay out withdrawals ─────────
        // (In real deployment this would be initial TVL; here just a buffer)
        usdc.mint(deployer, 100_000 * 1e6);
        usdc.approve(address(strategy), 100_000 * 1e6);
        // Note: addYield() is open — anyone can inject yield for demo purposes
        // Vault will deploy depositor funds; seed only needed for test yield
        console.log("CoreToken:     ", address(coreToken));
        console.log("SeamToken:     ", address(seamToken));
        console.log("ApexToken:     ", address(apexToken));

        vm.stopBroadcast();
    }
}
