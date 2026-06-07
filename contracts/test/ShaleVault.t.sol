// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ShaleShare.sol";
import "../src/ShaleVault.sol";
import "../src/ShaleGovernor.sol";
import "../src/MockAavePool.sol";

/**
 * @notice Minimal mock USDC for tests (no permit, no blacklist).
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) { return 6; }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ShaleVaultTest is Test {
    MockUSDC internal usdc;
    MockAavePool internal aavePool;
    ShaleShare internal coreToken;
    ShaleShare internal seamToken;
    ShaleShare internal apexToken;
    ShaleVault internal vault;
    ShaleGovernor internal governor;

    address internal admin = address(0xA11CE);
    address internal alice = address(0xA11CE1);
    address internal bob   = address(0xB0B);
    address internal agent = address(0xA6E47);

    uint256 constant ONE_USDC = 1e6;
    uint256 constant THOUSAND_USDC = 1000 * ONE_USDC;

    function setUp() public {
        vm.startPrank(admin);

        // Deploy mock USDC
        usdc = new MockUSDC();

        // Deploy mock Aave
        aavePool = new MockAavePool(address(usdc));

        // Deploy share tokens (admin as temp owner)
        coreToken = new ShaleShare("SHALE CORE", "shlCORE", admin);
        seamToken = new ShaleShare("SHALE SEAM", "shlSEAM", admin);
        apexToken = new ShaleShare("SHALE APEX", "shlAPEX", admin);

        // Deploy vault
        vault = new ShaleVault(
            address(usdc),
            address(aavePool),
            address(aavePool.aUsdc()),
            address(coreToken),
            address(seamToken),
            address(apexToken),
            admin
        );

        // Transfer share token ownership to vault
        coreToken.transferOwnership(address(vault));
        seamToken.transferOwnership(address(vault));
        apexToken.transferOwnership(address(vault));

        // Deploy governor
        governor = new ShaleGovernor(address(vault), admin);

        // Wire roles
        vault.grantRole(vault.GOVERNOR_ROLE(), address(governor));
        governor.grantRole(governor.PROPOSER_ROLE(), agent);

        vm.stopPrank();

        // Fund users with USDC
        usdc.mint(alice, 100_000 * ONE_USDC);
        usdc.mint(bob,   100_000 * ONE_USDC);

        // Fund mock pool with extra USDC for yield payouts
        usdc.mint(admin, 10_000 * ONE_USDC);
        vm.prank(admin);
        usdc.approve(address(aavePool), type(uint256).max);
        vm.prank(admin);
        aavePool.fundPool(10_000 * ONE_USDC);
    }

    // ─── Helper ───────────────────────────────────────────────────────────

    function _depositAs(address user, uint256 amount, ShaleVault.Tier tier) internal {
        vm.startPrank(user);
        usdc.approve(address(vault), amount);
        vault.deposit(amount, tier);
        vm.stopPrank();
    }

    // ─── Test 1: deposit CORE ─────────────────────────────────────────────

    function test_deposit_core() public {
        _depositAs(alice, THOUSAND_USDC, ShaleVault.Tier.CORE);

        assertEq(vault.corePrincipal(), THOUSAND_USDC, "corePrincipal");
        assertEq(coreToken.balanceOf(alice), THOUSAND_USDC, "shlCORE balance");
        // aUSDC should have been minted to vault
        assertEq(aavePool.aUsdc().balanceOf(address(vault)), THOUSAND_USDC, "vault aUSDC");
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

    // ─── Test 4: epoch settle happy path ─────────────────────────────────

    function test_settle_epoch_happy_path() public {
        // CORE: 10,000 USDC, SEAM: 5,000 USDC, APEX: 5,000 USDC
        _depositAs(alice, 10_000 * ONE_USDC, ShaleVault.Tier.CORE);
        _depositAs(bob,    5_000 * ONE_USDC, ShaleVault.Tier.SEAM);
        _depositAs(alice,  5_000 * ONE_USDC, ShaleVault.Tier.APEX);

        // Advance 7 days
        vm.warp(block.timestamp + 7 days);

        // Accrue 5% annual yield on 20k for 7 days ≈ 20000 * 0.05 * 7/365 ≈ 191.78 USDC
        // Use 200 USDC to ensure CORE and SEAM are satisfied
        uint256 yieldAmount = 200 * ONE_USDC;
        vm.prank(admin);
        aavePool.accrue(address(vault), yieldAmount);

        vm.expectEmit(true, false, false, false);
        emit ShaleVault.EpochSettled(1, yieldAmount, 0, 0, 0); // just check event fires

        vault.settleEpoch();

        assertEq(vault.epochCount(), 1);
        // CORE should have yield accumulated (coreYieldPerShare > 0)
        assertGt(vault.coreYieldPerShare(), 0, "coreYieldPerShare should grow");
        // SEAM should have yield
        assertGt(vault.seamYieldPerShare(), 0, "seamYieldPerShare should grow");
        // APEX gets remainder
        assertGt(vault.apexYieldPerShare(), 0, "apexYieldPerShare should grow");
    }

    // ─── Test 5: epoch settle insufficient yield ──────────────────────────

    function test_settle_epoch_insufficient_yield() public {
        _depositAs(alice, 10_000 * ONE_USDC, ShaleVault.Tier.CORE);
        _depositAs(bob,    5_000 * ONE_USDC, ShaleVault.Tier.APEX);

        uint256 apexBefore = vault.apexPrincipal();

        vm.warp(block.timestamp + 7 days);

        // Very low yield: 1 USDC (well below CORE's target)
        // CORE target for 7 days = 10000 * 400/10000 * 7/365 ≈ 7.67 USDC
        uint256 yieldAmount = 1 * ONE_USDC;
        vm.prank(admin);
        aavePool.accrue(address(vault), yieldAmount);

        vault.settleEpoch();

        // APEX principal should be reduced by deficit
        assertLt(vault.apexPrincipal(), apexBefore, "APEX principal should decrease");
        // SEAM gets nothing (no SEAM deposits)
        assertEq(vault.seamYieldPerShare(), 0);
    }

    // ─── Test 6: withdraw with yield ─────────────────────────────────────

    function test_withdraw_with_yield() public {
        _depositAs(alice, THOUSAND_USDC, ShaleVault.Tier.CORE);
        _depositAs(bob,    THOUSAND_USDC, ShaleVault.Tier.APEX);

        vm.warp(block.timestamp + 7 days);

        // Inject 50 USDC yield
        uint256 yieldAmount = 50 * ONE_USDC;
        vm.prank(admin);
        aavePool.accrue(address(vault), yieldAmount);

        vault.settleEpoch();

        uint256 aliceBefore = usdc.balanceOf(alice);

        // Alice withdraws all CORE shares
        vm.startPrank(alice);
        vault.withdraw(THOUSAND_USDC, ShaleVault.Tier.CORE);
        vm.stopPrank();

        uint256 aliceAfter = usdc.balanceOf(alice);
        uint256 received = aliceAfter - aliceBefore;

        // Alice should receive principal + some yield
        assertGt(received, THOUSAND_USDC, "should receive more than principal");
        // coreToken should be fully burned
        assertEq(coreToken.balanceOf(alice), 0);
    }

    // ─── Test 7: governor propose and execute ────────────────────────────

    function test_governor_propose_and_execute() public {
        // Agent proposes lower targets
        vm.prank(agent);
        uint256 pid = governor.proposeRebalance(300, 450, 150, 250, "Aave APY dropped to 3.2%, reducing targets.");

        assertEq(pid, 1);
        ShaleGovernor.Proposal memory p = governor.latestProposal();
        assertFalse(p.executed);
        assertFalse(p.rejected);

        // Anyone executes
        governor.executeProposal(1);

        // Vault targets updated
        assertEq(vault.coreTargetMinBps(), 300);
        assertEq(vault.coreTargetMaxBps(), 450);
        assertEq(vault.seamTargetMinBps(), 150);
        assertEq(vault.seamTargetMaxBps(), 250);

        // Proposal marked executed
        p = governor.latestProposal();
        assertTrue(p.executed);
    }

    // ─── Test 8: governor reject ─────────────────────────────────────────

    function test_governor_reject() public {
        vm.prank(agent);
        governor.proposeRebalance(100, 200, 50, 100, "Extreme proposal.");

        vm.prank(admin);
        governor.rejectProposal(1);

        ShaleGovernor.Proposal memory p = governor.latestProposal();
        assertTrue(p.rejected);

        // executeProposal should revert
        vm.expectRevert("was rejected");
        governor.executeProposal(1);
    }

    // ─── Test 9: cannot settle early ─────────────────────────────────────

    function test_cannot_settle_before_epoch() public {
        _depositAs(alice, THOUSAND_USDC, ShaleVault.Tier.CORE);

        vm.expectRevert("epoch not finished");
        vault.settleEpoch();
    }

    // ─── Test 10: only proposer can propose ──────────────────────────────

    function test_only_proposer_can_propose() public {
        vm.prank(alice);
        vm.expectRevert();
        governor.proposeRebalance(300, 450, 150, 250, "unauthorized");
    }
}
