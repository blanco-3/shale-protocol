// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./ShaleVault.sol";

contract ShaleGovernor is AccessControl {

    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");

    ShaleVault public immutable vault;

    struct Proposal {
        uint256 id;
        address proposer;
        uint256 newCoreMin;
        uint256 newCoreMax;
        uint256 newSeamMin;
        uint256 newSeamMax;
        string reason;
        uint256 proposedAt;
        bool executed;
        bool rejected;
    }

    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;

    uint256 public constant MIN_DELAY = 0;

    event ProposalCreated(
        uint256 indexed id,
        address indexed proposer,
        uint256 newCoreMin,
        uint256 newCoreMax,
        uint256 newSeamMin,
        uint256 newSeamMax,
        string reason
    );
    event ProposalExecuted(uint256 indexed id);
    event ProposalRejected(uint256 indexed id, address indexed by);

    constructor(address _vault, address _admin) {
        vault = ShaleVault(_vault);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    function proposeRebalance(
        uint256 newCoreMin,
        uint256 newCoreMax,
        uint256 newSeamMin,
        uint256 newSeamMax,
        string calldata reason
    ) external onlyRole(PROPOSER_ROLE) returns (uint256 proposalId) {
        require(newCoreMin <= newCoreMax, "invalid core range");
        require(newSeamMin <= newSeamMax, "invalid seam range");
        require(bytes(reason).length > 0, "reason required");

        proposalId = ++proposalCount;
        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            newCoreMin: newCoreMin,
            newCoreMax: newCoreMax,
            newSeamMin: newSeamMin,
            newSeamMax: newSeamMax,
            reason: reason,
            proposedAt: block.timestamp,
            executed: false,
            rejected: false
        });

        emit ProposalCreated(proposalId, msg.sender, newCoreMin, newCoreMax, newSeamMin, newSeamMax, reason);
    }

    function executeProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(!p.executed, "already executed");
        require(!p.rejected, "was rejected");
        require(block.timestamp >= p.proposedAt + MIN_DELAY, "delay not passed");

        p.executed = true;
        vault.updateTargets(p.newCoreMin, p.newCoreMax, p.newSeamMin, p.newSeamMax);

        emit ProposalExecuted(proposalId);
    }

    function rejectProposal(uint256 proposalId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Proposal storage p = proposals[proposalId];
        require(!p.executed, "already executed");
        require(!p.rejected, "already rejected");
        p.rejected = true;
        emit ProposalRejected(proposalId, msg.sender);
    }

    function latestProposal() external view returns (Proposal memory) {
        require(proposalCount > 0, "no proposals");
        return proposals[proposalCount];
    }
}
