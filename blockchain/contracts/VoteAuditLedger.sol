// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title VoteAuditLedger
/// @notice Append-only log of anonymized vote commitment hashes.
contract VoteAuditLedger {
    address public owner;
    uint256 public totalVotes;

    mapping(bytes32 => bytes32[]) internal _commitments;
    bytes32[] public voteHashes;

    event Committed(bytes32 indexed itemHash, bytes32 voteHash, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() { owner = msg.sender; }

    function commit(bytes32 itemHash, bytes32 voteHash) external onlyOwner {
        _commitments[itemHash].push(voteHash);
        voteHashes.push(voteHash);
        unchecked { ++totalVotes; }
        emit Committed(itemHash, voteHash, block.timestamp);
    }

    function getVoteCommitments(bytes32 itemHash) external view returns (bytes32[] memory) {
        return _commitments[itemHash];
    }

    function getVoteCount(bytes32 itemHash) external view returns (uint256) {
        return _commitments[itemHash].length;
    }

    function getTotal() external view returns (uint256) { return totalVotes; }

    function getVoteAtIndex(uint256 i) external view returns (bytes32) {
        return voteHashes[i];
    }
}
