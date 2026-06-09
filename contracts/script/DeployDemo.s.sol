// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ShaleShare.sol";
import "../src/ShaleVault.sol";
import "../src/ShaleGovernor.sol";
import "../src/MockStrategy.sol";
import "../src/StrategyRouter.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

/**
 * DeployDemo — Self-contained demo environment.
 *
 * Uses MockUSDC + three MockStrategy instances simulating different APYs:
 *   Strategy A (Aave-like):    ~4%  (conservative)
 *   Strategy B (Fixed-yield):  ~7%  (moderate)
 *   Strategy C (Camelot-like): ~9%  (aggressive, Arbitrum-native)
 *
 * EPOCH_DURATION = 1 hour — run RunDemo.s.sol to fast-forward through epochs.
 * No real tokens needed; entirely self-contained on Arbitrum Sepolia.
 */
contract DeployDemo is Script {
    uint16 constant WEIGHT_A = 4_000; // 40%
    uint16 constant WEIGHT_B = 3_000; // 30%
    uint16 constant WEIGHT_C = 3_000; // 30%

    function run() external {
        address deployer    = vm.envAddress("DEPLOYER_ADDRESS");
        address agentWallet = vm.envAddress("AGENT_WALLET_ADDRESS");

        vm.startBroadcast();

        // ── MockUSDC ──────────────────────────────────────────────────────
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC:              ", address(usdc));

        // ── Three MockStrategies with different yield profiles ────────────
        MockStrategy stratA = new MockStrategy(address(usdc), deployer); // Aave-like 4%
        MockStrategy stratB = new MockStrategy(address(usdc), deployer); // Fixed 7%
        MockStrategy stratC = new MockStrategy(address(usdc), deployer); // Camelot 9%
        console.log("MockStrategy A (4%):   ", address(stratA));
        console.log("MockStrategy B (7%):   ", address(stratB));
        console.log("MockStrategy C (9%):   ", address(stratC));

        // ── Share tokens ──────────────────────────────────────────────────
        ShaleShare coreToken = new ShaleShare("SHALE CORE", "shlCORE", deployer);
        ShaleShare seamToken = new ShaleShare("SHALE SEAM", "shlSEAM", deployer);
        ShaleShare apexToken = new ShaleShare("SHALE APEX", "shlAPEX", deployer);

        // ── StrategyRouter ────────────────────────────────────────────────
        StrategyRouter router = new StrategyRouter(address(usdc), deployer, deployer);

        // Set advertised APY rates before handing ownership to router (so agent scanner reads correct values)
        stratA.setAnnualYieldBps(400);  // 4%
        stratB.setAnnualYieldBps(700);  // 7%
        stratC.setAnnualYieldBps(900);  // 9%

        stratA.transferOwnership(address(router));
        stratB.transferOwnership(address(router));
        stratC.transferOwnership(address(router));

        router.addStrategy(address(stratA), WEIGHT_A, "AaveV3-USDC");
        router.addStrategy(address(stratB), WEIGHT_B, "FixedYield-USDC");
        router.addStrategy(address(stratC), WEIGHT_C, "Camelot-USDC");
        router.setKeeper(agentWallet, true);
        console.log("StrategyRouter:        ", address(router));

        // ── ShaleVault ────────────────────────────────────────────────────
        ShaleVault vault = new ShaleVault(
            address(usdc),
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
        console.log("ShaleGovernor:         ", address(governor));

        // ── Governor delay: 5 minutes for demo (shows timelock working) ──
        governor.setMinDelay(5 minutes);

        // ── Mint initial USDC to deployer for demo deposits ───────────────
        usdc.mint(deployer, 500_000 * 1e6); // 500k USDC
        console.log("Minted 500k testUSDC to deployer");

        vm.stopBroadcast();

        console.log("");
        console.log("=== COPY TO .env (DEMO) ===");
        console.log("DEMO_USDC_ADDRESS=",         address(usdc));
        console.log("DEMO_VAULT_ADDRESS=",        address(vault));
        console.log("DEMO_GOVERNOR_ADDRESS=",     address(governor));
        console.log("DEMO_ROUTER_ADDRESS=",       address(router));
        console.log("DEMO_STRAT_A_ADDRESS=",      address(stratA));
        console.log("DEMO_STRAT_B_ADDRESS=",      address(stratB));
        console.log("DEMO_STRAT_C_ADDRESS=",      address(stratC));
    }
}
