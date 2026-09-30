const { ethers } = require("ethers");

const { getFirestore } = require(
  "firebase-admin/firestore"
);

const { generateHash } = require(
  "./hashDoorLog"
);

const deployment = require(
  "./deployment.json"
);

const artifact = require(
  "./artifacts/DoorLogIntegrity.json"
);

async function verifyTestLog() {
  try {

    // Connect to Firebase
    const db = getFirestore();

    const document = await db
      .collection("blockchain_test_logs")
      .doc("test_003")
      .get();

    if (!document.exists) {
      throw new Error("Test document not found!");
    }

    // Generate current Firebase record hash
    const logId = ethers.id(document.ref.path);

    const currentHash =
      "0x" + generateHash(document);

    // Connect to Ganache
    const provider = new ethers.JsonRpcProvider(
      "http://127.0.0.1:7545"
    );

    const network = await provider.getNetwork();

    if (
      network.chainId.toString() !==
      deployment.chainId
    ) {
      throw new Error("Wrong blockchain network!");
    }

    const code = await provider.getCode(
      deployment.contractAddress
    );

    if (code === "0x") {
      throw new Error("Contract not found!");
    }

    const contract = new ethers.Contract(
      deployment.contractAddress,
      artifact.abi,
      provider
    );

    // Retrieve original blockchain hash
    const originalHash = await contract.getHash(
      logId
    );

    if (originalHash === ethers.ZeroHash) {
      throw new Error(
        "Original hash not found on blockchain!"
      );
    }

    // Verify integrity
    const verified = await contract.verifyHash(
      logId,
      currentHash
    );

    console.log("---------------------------");
    console.log("BLOCKCHAIN INTEGRITY TEST");
    console.log("---------------------------");

    console.log("Document:", document.id);
    console.log("Original Hash:", originalHash);
    console.log("Current Hash:", currentHash);

    console.log("Integrity verified:", verified);

    if (verified) {
      console.log("RESULT: RECORD VERIFIED");
    } else {
      console.log("RESULT: DATA MODIFICATION DETECTED");
    }

  } catch (error) {
    console.error(
      "Error:",
      error.shortMessage || error.message
    );

    process.exitCode = 1;
  }
}

verifyTestLog();