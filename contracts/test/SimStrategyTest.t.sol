// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SimAaveV3Strategy.sol";
import "../src/SimCamelotV3Strategy.sol";
import "../src/SimMorphoStrategy.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// ─── Mock tokens ──────────────────────────────────────────────────────────────

contract MintableUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

contract SimStrategyTest is Test {
    MintableUSDC internal usdc;
    address      internal admin  = address(0xAD);
    address      internal router = address(0xB0);

    function setUp() public {
        usdc = new MintableUSDC();
        usdc.mint(router, 100_000 * 1e6);
    }

    // ════════════════════════════════════════════
    // SimAaveV3Strategy
    // ════════════════════════════════════════════

    function _deployAave() internal returns (SimAaveV3Strategy) {
        return new SimAaveV3Strategy(address(usdc), admin, admin);
    }

    function test_aave_default_apy_at_65pct_util() public {
        SimAaveV3Strategy s = _deployAave();
        // util=6500, slope1=700, optimal=8000 → 700*6500/8000 = 568 bps ≈ 5.68%
        uint256 apy = s.apyBps();
        assertApproxEqAbs(apy, 568, 5, "5.68% APY at 65% util");
    }

    function test_aave_apy_at_kink() public {
        SimAaveV3Strategy s = _deployAave();
        vm.prank(admin);
        s.setUtilization(8000);
        // At optimal: slope1 = 700 bps exactly
        assertEq(s.apyBps(), 700, "7% APY at kink");
    }

    function test_aave_apy_above_kink_jumps() public {
        SimAaveV3Strategy s = _deployAave();
        vm.prank(admin);
        s.setUtilization(9000); // 10% above kink
        // 700 + 7500 * (1000) / (2000) = 700 + 3750 = 4450 bps
        uint256 apy = s.apyBps();
        assertEq(apy, 4450, "stress APY above kink");
    }

    function test_aave_deposit_and_harvest_mints_yield() public {
        SimAaveV3Strategy s = _deployAave();
        vm.prank(admin); s.transferOwnership(router);

        vm.startPrank(router);
        usdc.approve(address(s), 10_000 * 1e6);
        s.deposit(10_000 * 1e6);
        vm.stopPrank();

        // Warp 1 year — should accrue ~5.68% of 10k = ~568 USDC
        vm.warp(block.timestamp + 365 days);

        uint256 supply = usdc.totalSupply();
        vm.prank(router);
        uint256 yield = s.harvest();

        assertGt(yield, 0, "harvest returns yield");
        assertApproxEqAbs(yield, 568 * 1e6, 10 * 1e6, "~5.68% annual at 65% util");
        // Yield was MINTED, total supply increased
        assertEq(usdc.totalSupply(), supply + yield, "USDC minted (no reserve needed)");
    }

    function test_aave_setUtilization_only_market_admin() public {
        SimAaveV3Strategy s = _deployAave();
        vm.prank(address(0xBAD));
        vm.expectRevert("SA3: not market admin");
        s.setUtilization(5000);
    }

    function test_aave_utilization_bounds() public {
        SimAaveV3Strategy s = _deployAave();
        vm.prank(admin);
        vm.expectRevert("SA3: invalid utilization");
        s.setUtilization(10_001);
    }

    function test_aave_market_state_view() public {
        SimAaveV3Strategy s = _deployAave();
        (uint256 util, uint256 apy,,) = s.marketState();
        assertEq(util, 6500, "default util");
        assertApproxEqAbs(apy, 568, 5, "default APY");
    }

    // ════════════════════════════════════════════
    // SimCamelotV3Strategy
    // ════════════════════════════════════════════

    function _deployCamelot() internal returns (SimCamelotV3Strategy) {
        return new SimCamelotV3Strategy(address(usdc), admin, admin);
    }

    function test_camelot_default_apy_formula() public {
        SimCamelotV3Strategy s = _deployCamelot();
        // dailyVol=6000, fee=5 → dailyFee = 6000*5/10000 = 3 bps/day → APY = 3*365 = 1095 bps
        assertEq(s.apyBps(), 1095, "~10.95% LP APY at default params");
    }

    function test_camelot_high_volume_higher_apy() public {
        SimCamelotV3Strategy s = _deployCamelot();
        vm.prank(admin);
        s.setVolumeRatio(12_000); // 1.2x TVL daily
        // 12000*5/10000 = 6 bps/day → 6*365 = 2190 bps ≈ 21.9%
        assertEq(s.apyBps(), 2190, "~21.9% at 1.2x daily volume");
    }

    function test_camelot_low_volume_lower_apy() public {
        SimCamelotV3Strategy s = _deployCamelot();
        vm.prank(admin);
        s.setVolumeRatio(2_000); // 0.2x TVL daily
        // 2000*5/10000 = 1 bps/day → 365 bps ≈ 3.65%
        assertEq(s.apyBps(), 365, "~3.65% at low volume");
    }

    function test_camelot_deposit_harvest_mints_yield() public {
        SimCamelotV3Strategy s = _deployCamelot();
        vm.prank(admin); s.transferOwnership(router);

        vm.startPrank(router);
        usdc.approve(address(s), 10_000 * 1e6);
        s.deposit(10_000 * 1e6);
        vm.stopPrank();

        vm.warp(block.timestamp + 365 days);

        uint256 supply = usdc.totalSupply();
        vm.prank(router);
        uint256 yield = s.harvest();

        assertApproxEqAbs(yield, 1095 * 1e6, 20 * 1e6, "~10.95% annual LP fees");
        assertEq(usdc.totalSupply(), supply + yield, "yield minted");
    }

    function test_camelot_setVolumeRatio_only_market_admin() public {
        SimCamelotV3Strategy s = _deployCamelot();
        vm.prank(address(0xBAD));
        vm.expectRevert("SC3: not market admin");
        s.setVolumeRatio(5000);
    }

    function test_camelot_market_state_view() public {
        SimCamelotV3Strategy s = _deployCamelot();
        (uint256 vol, uint256 fee, uint256 daily, uint256 apy,,) = s.marketState();
        assertEq(vol, 6000);
        assertEq(fee, 5);
        assertEq(daily, 3);          // 3 bps/day
        assertEq(apy, 1095);         // 3 * 365
    }

    // ════════════════════════════════════════════
    // SimMorphoStrategy
    // ════════════════════════════════════════════

    function _deployMorpho() internal returns (SimMorphoStrategy) {
        return new SimMorphoStrategy(address(usdc), admin, admin);
    }

    function test_morpho_default_apy_formula() public {
        SimMorphoStrategy s = _deployMorpho();
        // p2p = 570 + (850-570)/2 = 570 + 140 = 710 bps
        // matched  = 7000 * 710 / 10000 = 497 bps
        // unmatched= 3000 * 570 / 10000 = 171 bps
        // blended  = 497 + 171 = 668 bps ≈ 6.68%
        uint256 apy = s.apyBps();
        assertApproxEqAbs(apy, 668, 5, "~6.68% blended Morpho APY");
    }

    function test_morpho_fully_matched_earns_p2p_rate() public {
        SimMorphoStrategy s = _deployMorpho();
        vm.prank(admin);
        s.setRates(570, 850, 10_000); // 100% matched
        // blended = p2p = 710 bps
        assertEq(s.apyBps(), 710, "fully matched = P2P rate");
    }

    function test_morpho_unmatched_earns_supply_rate() public {
        SimMorphoStrategy s = _deployMorpho();
        vm.prank(admin);
        s.setRates(570, 850, 0); // 0% matched (all idle on Aave)
        assertEq(s.apyBps(), 570, "unmatched = Aave supply rate");
    }

    function test_morpho_high_demand_scenario() public {
        SimMorphoStrategy s = _deployMorpho();
        vm.prank(admin);
        s.setRates(700, 1200, 9000); // high demand, 90% matched
        // p2p = 700 + (1200-700)/2 = 700 + 250 = 950
        // matched = 9000*950/10000 = 855
        // unmatched = 1000*700/10000 = 70
        // blended = 855+70 = 925
        assertEq(s.apyBps(), 925, "high demand blended APY");
    }

    function test_morpho_deposit_harvest_mints_yield() public {
        SimMorphoStrategy s = _deployMorpho();
        vm.prank(admin); s.transferOwnership(router);

        vm.startPrank(router);
        usdc.approve(address(s), 10_000 * 1e6);
        s.deposit(10_000 * 1e6);
        vm.stopPrank();

        vm.warp(block.timestamp + 365 days);

        uint256 supply = usdc.totalSupply();
        vm.prank(router);
        uint256 yield = s.harvest();

        assertApproxEqAbs(yield, 668 * 1e6, 20 * 1e6, "~6.68% annual Morpho P2P");
        assertEq(usdc.totalSupply(), supply + yield, "yield minted");
    }

    function test_morpho_setRates_only_market_admin() public {
        SimMorphoStrategy s = _deployMorpho();
        vm.prank(address(0xBAD));
        vm.expectRevert("SM: not market admin");
        s.setRates(500, 800, 5000);
    }

    function test_morpho_borrow_must_be_gte_supply() public {
        SimMorphoStrategy s = _deployMorpho();
        vm.prank(admin);
        vm.expectRevert("SM: borrow < supply");
        s.setRates(800, 500, 5000); // borrow < supply → invalid
    }

    function test_morpho_market_state_view() public {
        SimMorphoStrategy s = _deployMorpho();
        (, , uint256 matching, uint256 p2p, uint256 blended,,) = s.marketState();
        assertEq(matching, 7000);
        assertEq(p2p, 710);
        assertApproxEqAbs(blended, 668, 5);
    }

    // ════════════════════════════════════════════
    // Cross-strategy: demonstrate APY divergence
    // ════════════════════════════════════════════

    function test_apy_ordering_matches_risk_tiers() public {
        SimAaveV3Strategy    aave    = _deployAave();
        SimMorphoStrategy    morpho  = _deployMorpho();
        SimCamelotV3Strategy camelot = _deployCamelot();

        // Default market: Camelot > Morpho > Aave
        assertGt(camelot.apyBps(), morpho.apyBps(),  "Camelot LP > Morpho P2P");
        assertGt(morpho.apyBps(),  aave.apyBps(),    "Morpho P2P > Aave supply");
    }

    function test_market_event_camelot_volume_crash() public {
        SimCamelotV3Strategy camelot = _deployCamelot();
        SimAaveV3Strategy    aave    = _deployAave();

        // Initial: Camelot beats Aave
        assertGt(camelot.apyBps(), aave.apyBps());

        // Market event: volume crashes (Camelot pool dries up)
        vm.prank(admin);
        camelot.setVolumeRatio(1_000); // 0.1x TVL daily → 365 * 0.5 = 182.5 bps

        // After crash: Aave > Camelot — agent should shift weights
        assertGt(aave.apyBps(), camelot.apyBps(),
            "after volume crash, Aave beats Camelot: agent must rebalance");
    }

    function test_market_event_aave_utilization_spike() public {
        SimAaveV3Strategy aave = _deployAave();

        // Normal: ~5.7%
        assertApproxEqAbs(aave.apyBps(), 568, 10);

        // Utilization spike (high borrow demand)
        vm.prank(admin);
        aave.setUtilization(9500);

        // Above kink: 700 + 7500 * 1500/2000 = 700 + 5625 = 6325 bps ≈ 63%
        assertGt(aave.apyBps(), 6000, "stress utilization = high supply APY");
    }
}
