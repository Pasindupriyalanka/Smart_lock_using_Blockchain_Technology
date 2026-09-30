// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DoorLogIntegrity {

    address public owner;

    mapping(bytes32 => bytes32) private logHashes;

    event HashStored(
        bytes32 indexed logId,
        bytes32 recordHash
    );

    constructor() {
        owner = msg.sender;
    }

    // Store the original Firebase record hash
    function storeHash(
        bytes32 logId,
        bytes32 recordHash
    ) public {

        require(msg.sender == owner, "Not authorized");

        require(
            recordHash != bytes32(0),
            "Invalid hash"
        );

        require(
            logHashes[logId] == bytes32(0),
            "Record already exists"
        );

        logHashes[logId] = recordHash;

        emit HashStored(logId, recordHash);
    }

    // Retrieve the original hash
    function getHash(
        bytes32 logId
    ) public view returns (bytes32) {

        return logHashes[logId];
    }

    // Verify Firebase record integrity
    function verifyHash(
        bytes32 logId,
        bytes32 currentHash
    ) public view returns (bool) {

        return logHashes[logId] != bytes32(0)
            && logHashes[logId] == currentHash;
    }
}