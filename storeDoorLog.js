const { ethers } = require("ethers");

const {
  getFirestore
} = require("firebase-admin/firestore");

const {
  generateHash
} = require("./hashDoorLog");

const deployment = require("./deployment.json");

const artifact = require(
  "./artifacts/DoorLogIntegrity.json"
);

// Connect to Ganache
const provider = new ethers.JsonRpcProvider(
  "http://127.0.0.1:7545"
);

async function storeDoorLog() {
  try {
    // Check the blockchain network
    const network = await provider.getNetwork();

    if (
      network.chainId.toString() !== deployment.chainId
    ) {
      throw new Error("Wrong blockchain network");
    }

    // Check whether the contract exists
    const code = await provider.getCode(
      deployment.contractAddress
    );

    if (code === "0x") {
      throw new Error(
        "Contract not found. Check Ganache and redeploy."
      );
    }

    // Connect to smart contract
    const signer = await provider.getSigner(0);

    const contract = new ethers.Contract(
      deployment.contractAddress,
      artifact.abi,
      signer
    );

    // Read one Firebase access record
    const db = getFirestore();

    const snapshot = await db
      .collection("door_logs")
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log("No door logs found.");
      return;
    }

    const document = snapshot.docs[0];

    // Generate identifiers and hash
    const logId = ethers.id(document.ref.path);

    const recordHash = "0x" + generateHash(document);

    // Check if record is already stored
    const existingHash = await contract.getHash(logId);

    if (existingHash !== ethers.ZeroHash) {
      console.log("Record already exists on blockchain.");

      const verified = await contract.verifyHash(
        logId,
        recordHash
      );

      console.log("Integrity verified:", verified);
      return;
    }

    // Store the original hash
    console.log("Storing hash on blockchain...");

    const transaction = await contract.storeHash(
      logId,
      recordHash
    );

    await transaction.wait();

    // Verify storage was successful
    const verified = await contract.verifyHash(
      logId,
      recordHash
    );

    console.log("Blockchain storage successful!");
    console.log("Document ID:", document.id);
    console.log("Transaction:", transaction.hash);
    console.log("Integrity verified:", verified);

  } catch (error) {
    console.error(
      "Error:",
      error.shortMessage || error.message
    );

    process.exitCode = 1;
  }
}

storeDoorLog();