// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ReputationRegistry
/// @notice Commits epoch-level reputation state hashes for auditability.
contract ReputationRegistry {
    address public owner;
    uint256 public latestEpoch;

    struct Snapshot {
        bytes32 stateHash;
        uint64  timestamp;
    }

    mapping(uint256 => Snapshot) public snapshots;

    event SnapshotCommitted(uint256 indexed epochNumber, bytes32 stateHash, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() { owner = msg.sender; }

    function commitSnapshot(uint256 epochNumber, bytes32 stateHash) external onlyOwner {
        snapshots[epochNumber] = Snapshot(stateHash, uint64(block.timestamp));
        if (epochNumber > latestEpoch) { latestEpoch = epochNumber; }
        emit SnapshotCommitted(epochNumber, stateHash, block.timestamp);
    }

    function getSnapshot(uint256 epochNumber) external view returns (bytes32, uint64, bool) {
        Snapshot storage s = snapshots[epochNumber];
        return (s.stateHash, s.timestamp, s.timestamp != 0);
    }

    function getLatestEpoch() external view returns (uint256) { return latestEpoch; }
}
