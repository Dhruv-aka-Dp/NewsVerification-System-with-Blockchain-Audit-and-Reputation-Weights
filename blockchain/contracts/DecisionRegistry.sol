// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title DecisionRegistry
/// @notice Append-only log of classification decisions with proof hashes.
contract DecisionRegistry {
    address public owner;
    uint256 public totalDecisions;

    struct Decision {
        string  label;
        bytes32 proofHash;
        uint64  timestamp;
    }

    mapping(bytes32 => Decision) public decisions;
    bytes32[] public decisionKeys;

    event Finalized(bytes32 indexed contentHash, string label, bytes32 proofHash, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() { owner = msg.sender; }

    function finalize(bytes32 contentHash, string calldata label, bytes32 proofHash) external onlyOwner {
        bool isNew = decisions[contentHash].timestamp == 0;
        decisions[contentHash] = Decision(label, proofHash, uint64(block.timestamp));
        if (isNew) { decisionKeys.push(contentHash); }
        unchecked { ++totalDecisions; }
        emit Finalized(contentHash, label, proofHash, block.timestamp);
    }

    function getDecision(bytes32 contentHash) external view returns (string memory, bytes32, uint64, bool) {
        Decision storage d = decisions[contentHash];
        return (d.label, d.proofHash, d.timestamp, d.timestamp != 0);
    }

    function getTotal() external view returns (uint256) { return totalDecisions; }

    function getKeyAtIndex(uint256 i) external view returns (bytes32) {
        return decisionKeys[i];
    }
}
