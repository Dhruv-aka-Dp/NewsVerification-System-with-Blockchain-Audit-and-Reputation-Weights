// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SubmissionRegistry
/// @notice Append-only log of news content hashes for tamper-evident auditing.
contract SubmissionRegistry {
    address public owner;
    uint256 public totalSubmissions;

    struct Submission {
        bytes32 metadataHash;
        uint64  timestamp;
    }

    mapping(bytes32 => Submission) public submissions;
    bytes32[] public submissionKeys;

    event Logged(bytes32 indexed contentHash, bytes32 metadataHash, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() { owner = msg.sender; }

    function log(bytes32 contentHash, bytes32 metadataHash) external onlyOwner {
        if (submissions[contentHash].timestamp == 0) {
            submissions[contentHash] = Submission(metadataHash, uint64(block.timestamp));
            submissionKeys.push(contentHash);
            unchecked { ++totalSubmissions; }
        }
        emit Logged(contentHash, metadataHash, block.timestamp);
    }

    function getSubmission(bytes32 contentHash) external view returns (bytes32, uint64, bool) {
        Submission storage s = submissions[contentHash];
        return (s.metadataHash, s.timestamp, s.timestamp != 0);
    }

    function getTotal() external view returns (uint256) { return totalSubmissions; }

    function getKeyAtIndex(uint256 i) external view returns (bytes32) {
        return submissionKeys[i];
    }
}
