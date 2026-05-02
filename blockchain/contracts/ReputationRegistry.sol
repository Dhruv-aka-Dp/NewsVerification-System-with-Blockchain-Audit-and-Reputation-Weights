// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ReputationRegistry
/// @notice Logs time-aware reputation decay and update events for explainability.
contract ReputationRegistry {
    address public owner;
    uint256 public totalUpdates;

    struct ReputationUpdate {
        bytes32 userIdHash;
        bytes32 initialHash;
        bytes32 changeHash;
        bytes32 finalHash;
        uint64 timestamp;
    }

    mapping(uint256 => ReputationUpdate) private _updates;

    event ReputationUpdated(
        uint256 indexed updateIndex,
        bytes32 indexed userIdHash,
        bytes32 initialHash,
        bytes32 changeHash,
        bytes32 finalHash,
        uint64 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function logUpdate(
        bytes32 userIdHash,
        bytes32 initialHash,
        bytes32 changeHash,
        bytes32 finalHash
    ) external onlyOwner {
        unchecked { ++totalUpdates; }
        _updates[totalUpdates] = ReputationUpdate({
            userIdHash: userIdHash,
            initialHash: initialHash,
            changeHash: changeHash,
            finalHash: finalHash,
            timestamp: uint64(block.timestamp)
        });

        emit ReputationUpdated(
            totalUpdates,
            userIdHash,
            initialHash,
            changeHash,
            finalHash,
            uint64(block.timestamp)
        );
    }

    function getUpdate(uint256 index) external view returns (
        bytes32 userIdHash,
        bytes32 initialHash,
        bytes32 changeHash,
        bytes32 finalHash,
        uint64 timestamp,
        bool exists
    ) {
        ReputationUpdate memory u = _updates[index];
        return (u.userIdHash, u.initialHash, u.changeHash, u.finalHash, u.timestamp, u.timestamp != 0);
    }
}
