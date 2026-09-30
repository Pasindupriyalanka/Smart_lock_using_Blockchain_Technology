const { ethers } = require("ethers");
const { getFirestore } = require("firebase-admin/firestore");
const { generateHash } = require("./hashDoorLog");

const deployment = require("./deployment.json");
const artifact = require("./artifacts/DoorLogIntegrity.json");

async function storeTestLog() {
  try {
    // Connect to Firebase
    const db = getFirestore();

    // Read ONLY the test document
    const document = await db
      .collection("blockchain_test_logs")
      .doc("test_001")
      .get();

    if (!document.exists) {
      throw new Error("Test document not found!");
    }

    const data = document.data();

    // Check test record fields
    const fields = [
      "userId",
      "userName",
      "doorName",
      "action",
      "method"
    ];

    const missing = fields.filter(
      field => typeof data[field] !== "string"
    );

    if (
      missing.length > 0 ||
      typeof data.timestamp?.seconds !== "number"
    ) {
      throw new Error(
        "Check the test document fields and timestamp."
      );
    }

    console.log("Test Firebase record found!");

    // Generate original SHA-256 hash
    const logId = ethers.id(document.ref.path);
    const recordHash = "0x" + generateHash(document);

    console.log("Original SHA-256 hash generated!");

    // Connect to Ganache
    const provider = new ethers.JsonRpcProvider(
      "http://127.0.0.1:7545"
    );

    const network = await provider.getNetwork();

    if (
      network.chainId.toString() !== deployment.chainId
    ) {
      throw new Error("Wrong blockchain network!");
    }

    const code = await provider.getCode(
      deployment.contractAddress
    );

    if (code === "0x") {
      throw new Error(
        "Contract not found! Redeploy to current Ganache."
      );
    }

    const signer = await provider.getSigner(0);

    const contract = new ethers.Contract(
      deployment.contractAddress,
      artifact.abi,
      signer
    );

    // Check whether the hash already exists
    const existingHash = await contract.getHash(logId);

    if (existingHash !== ethers.ZeroHash) {
      if (existingHash === recordHash) {
        console.log("Original hash already stored!");
        return;
      }

      throw new Error(
        "A different hash is already stored for this record!"
      );
    }

    // Store the original hash
    console.log("Storing original hash...");

    const transaction = await contract.storeHash(
      logId,
      recordHash
    );

    const receipt = await transaction.wait();

    if (receipt.status !== 1) {
      throw new Error("Blockchain transaction failed!");
    }

    // Confirm blockchain storage
    const verified = await contract.verifyHash(
      logId,
      recordHash
    );

    console.log("Blockchain storage successful!");
    console.log("Transaction:", transaction.hash);
    console.log("Original record verified:", verified);

  } catch (error) {
    console.error(
      "Error:",
      error.shortMessage || error.message
    );

    process.exitCode = 1;
  }
}

storeTestLog();