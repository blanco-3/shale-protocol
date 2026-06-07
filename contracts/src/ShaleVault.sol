// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./ShaleShare.sol";
import "./interfaces/IAaveV3Pool.sol";

contract ShaleVault is AccessControl, Pausable {
    using SafeERC20 for IERC20;

    // ─── Roles ────────────────────────────────────────────────────────────
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    // ─── External Contracts ───────────────────────────────────────────────
    IERC20 public immutable usdc;
    IAaveV3Pool public immutable aavePool;
    IERC20 public immutable aUsdc;

    // ─── Tier Share Tokens ────────────────────────────────────────────────
    ShaleShare public immutable coreToken;
    ShaleShare public immutable seamToken;
    ShaleShare public immutable apexToken;

    // ─── Tier Principal Tracking ──────────────────────────────────────────
    uint256 public corePrincipal;
    uint256 public seamPrincipal;
    uint256 public apexPrincipal;

    // ─── Yield Accrual Per Tier ───────────────────────────────────────────
    uint256 public coreYieldPerShare;
    uint256 public seamYieldPerShare;
    uint256 public apexYieldPerShare;

    mapping(address => uint256) public userCoreYieldCheckpoint;
    mapping(address => uint256) public userSeamYieldCheckpoint;
    mapping(address => uint256) public userApexYieldCheckpoint;

    // ─── Target Ranges (basis points, annualized) ─────────────────────────
    uint256 public coreTargetMinBps = 400;
    uint256 public coreTargetMaxBps = 600;
    uint256 public seamTargetMinBps = 200;
    uint256 public seamTargetMaxBps = 400;

    // ─── Epoch Tracking ───────────────────────────────────────────────────
    uint256 public lastEpochTimestamp;
    uint256 public constant EPOCH_DURATION = 7 days;
    uint256 public epochCount;

    // ─── Events ───────────────────────────────────────────────────────────
    event Deposited(address indexed user, uint8 indexed tier, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint8 indexed tier, uint256 shares, uint256 amount);
    event EpochSettled(uint256 indexed epochId, uint256 totalYield, uint256 coreShare, uint256 seamShare, uint256 apexShare);
    event TargetsUpdated(uint256 coreMin, uint256 coreMax, uint256 seamMin, uint256 seamMax);

    // ─── Tier Enum ────────────────────────────────────────────────────────
    enum Tier { CORE, SEAM, APEX }

    // ─── Constructor ──────────────────────────────────────────────────────
    constructor(
        address _usdc,
        address _aavePool,
        address _aUsdc,
        address _coreToken,
        address _seamToken,
        address _apexToken,
        address _admin
    ) {
        usdc = IERC20(_usdc);
        aavePool = IAaveV3Pool(_aavePool);
        aUsdc = IERC20(_aUsdc);
        coreToken = ShaleShare(_coreToken);
        seamToken = ShaleShare(_seamToken);
        apexToken = ShaleShare(_apexToken);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        lastEpochTimestamp = block.timestamp;
    }

    // ─── Deposit ──────────────────────────────────────────────────────────
    function deposit(uint256 amount, Tier tier) external whenNotPaused {
        require(amount > 0, "amount must be > 0");

        _claimYield(msg.sender, tier);

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        usdc.approve(address(aavePool), amount);
        aavePool.supply(address(usdc), amount, address(this), 0);

        if (tier == Tier.CORE) {
            corePrincipal += amount;
            userCoreYieldCheckpoint[msg.sender] = coreYieldPerShare;
            coreToken.mint(msg.sender, amount);
            emit Deposited(msg.sender, 0, amount, amount);
        } else if (tier == Tier.SEAM) {
            seamPrincipal += amount;
            userSeamYieldCheckpoint[msg.sender] = seamYieldPerShare;
            seamToken.mint(msg.sender, amount);
            emit Deposited(msg.sender, 1, amount, amount);
        } else {
            apexPrincipal += amount;
            userApexYieldCheckpoint[msg.sender] = apexYieldPerShare;
            apexToken.mint(msg.sender, amount);
            emit Deposited(msg.sender, 2, amount, amount);
        }
    }

    // ─── Withdraw ─────────────────────────────────────────────────────────
    function withdraw(uint256 shares, Tier tier) external whenNotPaused {
        require(shares > 0, "shares must be > 0");

        uint256 pendingYield_ = _claimYield(msg.sender, tier);

        uint256 totalOut = shares + pendingYield_;

        if (tier == Tier.CORE) {
            require(coreToken.balanceOf(msg.sender) >= shares, "insufficient shares");
            coreToken.burn(msg.sender, shares);
            corePrincipal -= shares;
        } else if (tier == Tier.SEAM) {
            require(seamToken.balanceOf(msg.sender) >= shares, "insufficient shares");
            seamToken.burn(msg.sender, shares);
            seamPrincipal -= shares;
        } else {
            require(apexToken.balanceOf(msg.sender) >= shares, "insufficient shares");
            apexToken.burn(msg.sender, shares);
            apexPrincipal = shares > apexPrincipal ? 0 : apexPrincipal - shares;
        }

        aavePool.withdraw(address(usdc), totalOut, address(this));

        usdc.safeTransfer(msg.sender, totalOut);

        emit Withdrawn(msg.sender, uint8(tier), shares, totalOut);
    }

    // ─── Epoch Settlement ─────────────────────────────────────────────────
    function settleEpoch() external {
        require(block.timestamp >= lastEpochTimestamp + EPOCH_DURATION, "epoch not finished");

        uint256 totalPrincipal_ = corePrincipal + seamPrincipal + apexPrincipal;
        uint256 aUsdcBalance = aUsdc.balanceOf(address(this));

        if (totalPrincipal_ == 0) {
            lastEpochTimestamp = block.timestamp;
            return;
        }

        uint256 totalYield = aUsdcBalance > totalPrincipal_ ? aUsdcBalance - totalPrincipal_ : 0;

        uint256 epochSeconds = block.timestamp - lastEpochTimestamp;

        uint256 coreDue = (corePrincipal * coreTargetMinBps * epochSeconds) / (10000 * 365 days);
        uint256 seamDue = (seamPrincipal * seamTargetMinBps * epochSeconds) / (10000 * 365 days);

        uint256 coreAlloc;
        uint256 seamAlloc;
        uint256 apexAlloc;

        if (totalYield >= coreDue + seamDue) {
            coreAlloc = coreDue;
            seamAlloc = seamDue;
            apexAlloc = totalYield - coreDue - seamDue;
        } else if (totalYield >= coreDue) {
            coreAlloc = coreDue;
            seamAlloc = totalYield - coreDue;
            apexAlloc = 0;
        } else {
            coreAlloc = totalYield;
            uint256 deficit = coreDue - totalYield;
            if (apexPrincipal >= deficit) {
                apexPrincipal -= deficit;
            } else {
                uint256 remaining = deficit - apexPrincipal;
                apexPrincipal = 0;
                if (seamPrincipal >= remaining) {
                    seamPrincipal -= remaining;
                } else {
                    seamPrincipal = 0;
                }
            }
            seamAlloc = 0;
            apexAlloc = 0;
        }

        if (coreToken.totalSupply() > 0 && coreAlloc > 0) {
            coreYieldPerShare += (coreAlloc * 1e18) / coreToken.totalSupply();
        }
        if (seamToken.totalSupply() > 0 && seamAlloc > 0) {
            seamYieldPerShare += (seamAlloc * 1e18) / seamToken.totalSupply();
        }
        if (apexToken.totalSupply() > 0 && apexAlloc > 0) {
            apexYieldPerShare += (apexAlloc * 1e18) / apexToken.totalSupply();
        }

        lastEpochTimestamp = block.timestamp;
        epochCount++;

        emit EpochSettled(epochCount, totalYield, coreAlloc, seamAlloc, apexAlloc);
    }

    // ─── Internal: Yield Claim ────────────────────────────────────────────
    function _claimYield(address user, Tier tier) internal returns (uint256 pending) {
        if (tier == Tier.CORE) {
            uint256 shares = coreToken.balanceOf(user);
            pending = (shares * (coreYieldPerShare - userCoreYieldCheckpoint[user])) / 1e18;
            userCoreYieldCheckpoint[user] = coreYieldPerShare;
        } else if (tier == Tier.SEAM) {
            uint256 shares = seamToken.balanceOf(user);
            pending = (shares * (seamYieldPerShare - userSeamYieldCheckpoint[user])) / 1e18;
            userSeamYieldCheckpoint[user] = seamYieldPerShare;
        } else {
            uint256 shares = apexToken.balanceOf(user);
            pending = (shares * (apexYieldPerShare - userApexYieldCheckpoint[user])) / 1e18;
            userApexYieldCheckpoint[user] = apexYieldPerShare;
        }
    }

    // ─── View: Pending Yield ──────────────────────────────────────────────
    function pendingYield(address user, Tier tier) external view returns (uint256) {
        if (tier == Tier.CORE) {
            uint256 shares = coreToken.balanceOf(user);
            return (shares * (coreYieldPerShare - userCoreYieldCheckpoint[user])) / 1e18;
        } else if (tier == Tier.SEAM) {
            uint256 shares = seamToken.balanceOf(user);
            return (shares * (seamYieldPerShare - userSeamYieldCheckpoint[user])) / 1e18;
        } else {
            uint256 shares = apexToken.balanceOf(user);
            return (shares * (apexYieldPerShare - userApexYieldCheckpoint[user])) / 1e18;
        }
    }

    // ─── Governor-Only: Update Targets ────────────────────────────────────
    function updateTargets(
        uint256 _coreMin,
        uint256 _coreMax,
        uint256 _seamMin,
        uint256 _seamMax
    ) external onlyRole(GOVERNOR_ROLE) {
        require(_coreMin <= _coreMax, "invalid core range");
        require(_seamMin <= _seamMax, "invalid seam range");
        require(_coreMax <= 2000, "core max capped at 20%");
        coreTargetMinBps = _coreMin;
        coreTargetMaxBps = _coreMax;
        seamTargetMinBps = _seamMin;
        seamTargetMaxBps = _seamMax;
        emit TargetsUpdated(_coreMin, _coreMax, _seamMin, _seamMax);
    }

    // ─── View: Total TVL ──────────────────────────────────────────────────
    function totalPrincipal() external view returns (uint256) {
        return corePrincipal + seamPrincipal + apexPrincipal;
    }

    // ─── Admin: Pause ─────────────────────────────────────────────────────
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
