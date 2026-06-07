// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ShaleShare.sol";
import "../src/ShaleVault.sol";
import "../src/ShaleGovernor.sol";
import "../src/MockStrategy.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract ShaleVaultTest is Test {
    MockUSDC      internal usdc;
    MockStrategy  internal strategy;
    ShaleShare    internal coreToken;
    ShaleShare    internal seamToken;
    ShaleShare    internal apexToken;
    ShaleVault    internal vault;
    ShaleGovernor internal governor;

    address internal admin = address(0xA11CE);
    address internal alice = address(0xA11CE1);
    address internal bob   = address(0xB0B);
    address internal agent = address(0xA6E47);

    uint256 constant ONE_USDC      = 1e6;
    uint256 constant THOUSAND_USDC = 1000 * ONE_USDC;

    function setUp() public {
        vm.startPrank(admin);

        usdc = new MockUSDC();

        coreToken = new ShaleShare("SHALE CORE", "shlCORE", admin);
        seamToken = new ShaleShare("SHALE SEAM", "shlSEAM", admin);
        apexToken = new ShaleShare("SHALE APEX", "shlAPEX", admin);

        // Deploy strategy with admin as temp owner, then transfer to vault
        strategy = new MockStrategy(address(usdc), admin);

        vault = new ShaleVault(
            address(usdc),
            address(strategy),
            address(coreToken),
            address(seamToken),
            address(apexToken),
            admin
        );

        strategy.transferOwnership(address(vault));
        coreToken.transferOwnership(address(vault));
        seamToken.transferOwnership(address(vault));
        apexToken.transferOwnership(address(vault));

        governor = new ShaleGovernor(address(vault), admin);
        vault.grantRole(vault.GOVERNOR_ROLE(), address(governor));
        governor.grantRole(governor.PROPOSER_ROLE(), agent);

        vm.stopPrank();

        usdc.mint(alice, 100_000 * ONE_USDC);
        usdc.mint(bob,   100_000 * ONE_USDC);
    }

    // ─── Helper ───────────────────────────────────────────────────────────

    function _depositAs(address user, uint256 amount, ShaleVault.Tier tier) internal {
        vm.startPrank(user);
        usdc.approve(address(vault), amount);
        vault.deposit(amount, tier);
        vm.stopPrank();
    }

    /// @dev Inject yield into MockStrategy (simulates Aave/strategy earning)
    function _injectYield(uint256 amount) internal {
        usdc.mint(admin, amount);
        vm.startPrank(admin);
        usdc.approve(address(strategy), amount);
        strategy.addYield(amount);
        vm.stopPrank();
    }

    // ─── Test 1: deposit CORE ─────────────────────────────────────────────

    function test_deposit_core() public {
        _depositAs(alice, THOUSAND_USDC, ShaleVault.Tier.CORE);

        assertEq(vault.corePrincipal(), THOUSAND_USDC, "corePrincipal");
        assertEq(coreToken.balanceOf(alice), THOUSAND_USDC, "shlCORE balance");
        assertEq(strategy.deployedPrincipal(), THOUSAND_USDC, "strategy principal");
    }

    // ─── Test 2: deposit SEAM ─────────────────────────────────────────────

    function test_deposit_seam() public {
        _depositAs(alice, THOUSAND_USDC, ShaleVault.Tier.SEAM);

        assertEq(vault.seamPrincipal(), THOUSAND_USDC, "seamPrincipal");
        assertEq(seamToken.balanceOf(alice), THOUSAND_USDC, "shlSEAM balance");
    }

    // ─── Test 3: deposit APEX ─────────────────────────────────────────────

    function test_deposit_apex() public {
        _depositAs(alice, THOUSAND_USDC, ShaleVault.Tier.APEX);

        assertEq(vault.apexPrincipal(), THOUSAND_USDC, "apexPrincipal");
        assertEq(apexToken.balanceOf(alice), THOUSAND_USDC, "shlAPEX balance");
    }

    // ─── Test 4: epoch settle happy path — yields credited per tier ───────

    function test_settle_epoch_happy_path() public {
        _depositAs(alice, 10_000 * ONE_USDC, ShaleVault.Tier.CORE);
        _depositAs(bob,    5_000 * ONE_USDC, ShaleVault.Tier.SEAM);
        _depositAs(alice,  5_000 * ONE_USDC, ShaleVault.Tier.APEX);

        vm.warp(block.timestamp + 7 days);
        _injectYield(200 * ONE_USDC);

        vault.settleEpoch();

        assertEq(vault.epochCount(), 1);
        // ERC-4626-style: yield credited to buckets, previewRedeem > 1
        assertGt(vault.coreAccumulatedYield(), 0, "coreAccumulatedYield should grow");
        assertGt(vault.seamAccumulatedYield(), 0, "seamAccumulatedYield should grow");
        assertGt(vault.apexAccumulatedYield(), 0, "apexAccumulatedYield should grow");

        // previewRedeem should exceed principal for CORE
        uint256 aliceShares = coreToken.balanceOf(alice);
        assertGt(vault.previewRedeem(aliceShares, ShaleVault.Tier.CORE), aliceShares);
    }

    // ─── Test 5: insufficient yield → APEX principal slashed ─────────────

    function test_settle_epoch_insufficient_yield() public {
        _depositAs(alice, 10_000 * ONE_USDC, ShaleVault.Tier.CORE);
        _depositAs(bob,    5_000 * ONE_USDC, ShaleVault.Tier.APEX);

        uint256 apexBefore = vault.apexPrincipal();

        vm.warp(block.timestamp + 7 days);
        _injectYield(1 * ONE_USDC); // well below CORE's ~7.67 USDC target

        vault.settleEpoch();

        assertLt(vault.apexPrincipal(), apexBefore, "APEX principal should be slashed");
        assertEq(vault.seamAccumulatedYield(), 0);
    }

    // ─── Test 6: queued withdraw processed at epoch ───────────────────────

    function test_queued_withdraw() public {
        _depositAs(alice, THOUSAND_USDC, ShaleVault.Tier.CORE);
        _depositAs(bob,   THOUSAND_USDC, ShaleVault.Tier.APEX);

        vm.warp(block.timestamp + 7 days);
        _injectYield(50 * ONE_USDC);

        // Alice queues withdrawal
        vm.prank(alice);
        vault.requestWithdraw(THOUSAND_USDC, ShaleVault.Tier.CORE);
        assertEq(vault.withdrawQueueLength(), 1);

        uint256 aliceBefore = usdc.balanceOf(alice);
        vault.settleEpoch();

        uint256 received = usdc.balanceOf(alice) - aliceBefore;

        // Alice should get back principal + her share of yield
        assertGe(received, THOUSAND_USDC, "should receive at least principal");
        assertEq(coreToken.balanceOf(alice), 0, "shares burned");
        assertEq(vault.withdrawQueueLength(), 0, "queue cleared");
    }

    // ─── Test 7: early withdraw with 1% penalty ───────────────────────────

    function test_early_withdraw_penalty() public {
        _depositAs(alice, THOUSAND_USDC, ShaleVault.Tier.CORE);
        _depositAs(bob,   THOUSAND_USDC, ShaleVault.Tier.APEX);

        vm.warp(block.timestamp + 7 days);
        _injectYield(50 * ONE_USDC);
        vault.settleEpoch();

        uint256 aliceBefore = usdc.balanceOf(alice);
        uint256 aliceShares = coreToken.balanceOf(alice);
        uint256 expectedValue = vault.previewRedeem(aliceShares, ShaleVault.Tier.CORE);
        uint256 expectedPenalty = expectedValue / 100;

        vm.prank(alice);
        vault.earlyWithdraw(aliceShares, ShaleVault.Tier.CORE);

        uint256 received = usdc.balanceOf(alice) - aliceBefore;

        assertEq(received, expectedValue - expectedPenalty, "should receive value minus 1% penalty");
        assertGt(vault.pendingPenalties(), 0, "penalty held in vault");
    }

    // ─── Test 8: penalty redistributed at next epoch ─────────────────────

    function test_penalty_redistribution() public {
        _depositAs(alice, THOUSAND_USDC, ShaleVault.Tier.CORE);
        _depositAs(bob,   THOUSAND_USDC, ShaleVault.Tier.APEX);

        // Alice early-withdraws before epoch
        vm.prank(alice);
        vault.earlyWithdraw(THOUSAND_USDC, ShaleVault.Tier.CORE);

        uint256 penaltyBefore = vault.pendingPenalties();
        assertGt(penaltyBefore, 0);

        // Bob is the only remaining depositor — all penalty goes to APEX
        vm.warp(block.timestamp + 7 days);
        _injectYield(10 * ONE_USDC);
        vault.settleEpoch();

        // Penalties should be cleared
        assertEq(vault.pendingPenalties(), 0, "penalties distributed");
        // Bob's APEX should have more than his original deposit
        uint256 bobValue = vault.previewRedeem(apexToken.balanceOf(bob), ShaleVault.Tier.APEX);
        assertGt(bobValue, THOUSAND_USDC, "Bob receives penalty bonus");
    }

    // ─── Test 9: governor propose and execute ─────────────────────────────

    function test_governor_propose_and_execute() public {
        vm.prank(agent);
        uint256 pid = governor.proposeRebalance(300, 450, 150, 250, "Aave APY dropped.");

        assertEq(pid, 1);
        assertFalse(governor.latestProposal().executed);

        governor.executeProposal(1);

        assertEq(vault.coreTargetMinBps(), 300);
        assertEq(vault.seamTargetMaxBps(), 250);
        assertTrue(governor.latestProposal().executed);
    }

    // ─── Test 10: governor reject ─────────────────────────────────────────

    function test_governor_reject() public {
        vm.prank(agent);
        governor.proposeRebalance(100, 200, 50, 100, "Extreme proposal.");

        vm.prank(admin);
        governor.rejectProposal(1);

        assertTrue(governor.latestProposal().rejected);

        vm.expectRevert("was rejected");
        governor.executeProposal(1);
    }

    // ─── Test 11: cannot settle before epoch ─────────────────────────────

    function test_cannot_settle_before_epoch() public {
        _depositAs(alice, THOUSAND_USDC, ShaleVault.Tier.CORE);

        vm.expectRevert("epoch not finished");
        vault.settleEpoch();
    }

    // ─── Test 12: only proposer can propose ──────────────────────────────

    function test_only_proposer_can_propose() public {
        vm.prank(alice);
        vm.expectRevert();
        governor.proposeRebalance(300, 450, 150, 250, "unauthorized");
    }
}
