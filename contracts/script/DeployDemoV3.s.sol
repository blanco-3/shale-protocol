// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ShaleShare.sol";
import "../src/ShaleVault.sol";
import "../src/ShaleGovernor.sol";
import "../src/StrategyRouter.sol";
import "../src/SimAaveV3Strategy.sol";
import "../src/SimCamelotV3Strategy.sol";
import "../src/SimMorphoStrategy.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

/**
 * DeployDemoV3 — Sim-strategy demo environment.
 *
 * Strategies are parameterised versions of real DeFi protocol models:
 *
 *   Strategy A — SimAaveV3    (Aave V3 two-slope interest rate model)
 *                Default util 65% → APY ~5.7%
 *                setUtilization() changes APY in real-time during demo
 *
 *   Strategy B — SimCamelotV3 (Uniswap V3 / Camelot V3 LP fee model)
 *                Daily vol 60% of TVL, 0.05% fee tier → APY ~10.95%
 *                setVolumeRatio() / setFeeTier() simulates trading activity
 *
 *   Strategy C — SimMorpho   (Morpho Blue P2P lending, 70% matched)
 *                Aave supply 5.7%, borrow 8.5%, 70% matched → APY ~6.6%
 *                setRates() changes matching ratio and reference rates
 *
 * Yield is minted by MockUSDC.mint() — no reserve seeding required.
 * APYs fluctuate when marketAdmin calls setUtilization / setVolumeRatio / setRates,
 * giving the AI agent a real optimisation problem to solve each epoch.
 *
 * EPOCH_DURATION = 2 minutes — see run_demo_v3.sh for full demo flow.
 */
contract DeployDemoV3 is Script {
    // Initial weights: Camelot highest yield gets most capital
    uint16 constant WEIGHT_AAVE    = 3_000; // 30%
    uint16 constant WEIGHT_CAMELOT = 5_000; // 50%
    uint16 constant WEIGHT_MORPHO  = 2_000; // 20%

    function run() external {
        address deployer    = vm.envAddress("DEPLOYER_ADDRESS");
        address agentWallet = vm.envAddress("AGENT_WALLET_ADDRESS");

        vm.startBroadcast();

        // ── MockUSDC ──────────────────────────────────────────────────────
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC:              ", address(usdc));

        // ── Simulation strategies ─────────────────────────────────────────
        // deployer is marketAdmin (can update utilization/volume during demo)
        SimAaveV3Strategy    stratA = new SimAaveV3Strategy(address(usdc), deployer, deployer);
        SimCamelotV3Strategy stratB = new SimCamelotV3Strategy(address(usdc), deployer, deployer);
        SimMorphoStrategy    stratC = new SimMorphoStrategy(address(usdc), deployer, deployer);

        console.log("SimAaveV3 (util 65%%~5.7%%):    ", address(stratA));
        console.log("SimCamelotV3 (vol 60%%~10.9%%): ", address(stratB));
        console.log("SimMorpho (P2P 70%%~6.6%%):     ", address(stratC));

        // ── Share tokens ──────────────────────────────────────────────────
        ShaleShare coreToken = new ShaleShare("SHALE CORE", "shlCORE", deployer);
        ShaleShare seamToken = new ShaleShare("SHALE SEAM", "shlSEAM", deployer);
        ShaleShare apexToken = new ShaleShare("SHALE APEX", "shlAPEX", deployer);

        // ── StrategyRouter ────────────────────────────────────────────────
        StrategyRouter router = new StrategyRouter(address(usdc), deployer, deployer);

        // Transfer strategy ownership to router BEFORE adding (router calls deposit/harvest)
        stratA.transferOwnership(address(router));
        stratB.transferOwnership(address(router));
        stratC.transferOwnership(address(router));

        router.addStrategy(address(stratA), WEIGHT_AAVE,    "Aave V3 USDC");
        router.addStrategy(address(stratB), WEIGHT_CAMELOT, "Camelot V3 USDC/USDT LP");
        router.addStrategy(address(stratC), WEIGHT_MORPHO,  "Morpho Blue USDC");
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
        governor.setMinDelay(5 minutes);
        console.log("ShaleGovernor:         ", address(governor));

        // ── Mint initial USDC to deployer for demo deposits ───────────────
        usdc.mint(deployer, 500_000 * 1e6); // 500k USDC
        console.log("Minted 500k testUSDC to deployer");

        vm.stopBroadcast();

        console.log("");
        console.log("=== Initial APYs ===");
        console.log("SimAaveV3  (util=65%%): ~5.7%%");
        console.log("SimCamelot (vol=60%%):  ~10.95%%");
        console.log("SimMorpho  (match=70%%): ~6.6%%");
        console.log("");
        console.log("=== COPY TO agent/.env + frontend/.env.local ===");
        console.log("USDC_ADDRESS=",              address(usdc));
        console.log("SHALE_VAULT_ADDRESS=",       address(vault));
        console.log("SHALE_GOVERNOR_ADDRESS=",    address(governor));
        console.log("STRATEGY_ROUTER_ADDRESS=",   address(router));
        console.log("AAVE_STRATEGY_ADDRESS=",     address(stratA));
        console.log("CAMELOT_STRATEGY_ADDRESS=",  address(stratB));
        console.log("MORPHO_STRATEGY_ADDRESS=",   address(stratC));
    }
}
