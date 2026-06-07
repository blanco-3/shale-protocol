// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ShaleShare.sol";
import "../src/ShaleVault.sol";
import "../src/ShaleGovernor.sol";
import "../src/MockAavePool.sol";
import "../src/MockUSDC.sol";

contract Deploy is Script {
    function run() external {
        address deployer        = vm.envAddress("DEPLOYER_ADDRESS");
        address agentWalletAddr = vm.envAddress("AGENT_WALLET_ADDRESS");

        vm.startBroadcast();

        // Deploy MockUSDC — freely mintable testnet token
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC:      ", address(usdc));

        // Deploy MockAavePool backed by MockUSDC
        MockAavePool mock = new MockAavePool(address(usdc));
        console.log("MockAavePool:  ", address(mock));
        console.log("MockAUsdc:     ", address(mock.aUsdc()));

        // Deploy share tokens
        ShaleShare coreToken = new ShaleShare("SHALE CORE", "shlCORE", deployer);
        ShaleShare seamToken = new ShaleShare("SHALE SEAM", "shlSEAM", deployer);
        ShaleShare apexToken = new ShaleShare("SHALE APEX", "shlAPEX", deployer);

        // Deploy vault
        ShaleVault vault = new ShaleVault(
            address(usdc),
            address(mock),
            address(mock.aUsdc()),
            address(coreToken),
            address(seamToken),
            address(apexToken),
            deployer
        );

        coreToken.transferOwnership(address(vault));
        seamToken.transferOwnership(address(vault));
        apexToken.transferOwnership(address(vault));

        // Deploy governor
        ShaleGovernor governor = new ShaleGovernor(address(vault), deployer);
        vault.grantRole(vault.GOVERNOR_ROLE(), address(governor));
        governor.grantRole(governor.PROPOSER_ROLE(), agentWalletAddr);

        // Fund MockAavePool with USDC so it can pay out yield after accrue()
        usdc.approve(address(mock), 100_000 * 1e6);
        mock.fundPool(100_000 * 1e6);

        vm.stopBroadcast();

        console.log("ShaleVault:    ", address(vault));
        console.log("ShaleGovernor: ", address(governor));
        console.log("CoreToken:     ", address(coreToken));
        console.log("SeamToken:     ", address(seamToken));
        console.log("ApexToken:     ", address(apexToken));
    }
}
