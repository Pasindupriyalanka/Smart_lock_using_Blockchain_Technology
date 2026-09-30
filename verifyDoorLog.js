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

const provider = new ethers.JsonRpcProvider(
  "http://127.0.0.1:7545"
);

async function verifyDoorLog() {
  try {
    const network = await provider.getNetwork();

    if (
      network.chainId.toString() !== deployment.chainId
    ) {
      throw new Error("Wrong blockchain network");
    }

    const signer = await provider.getSigner(0);

    const contract = new ethers.Contract(
      deployment.contractAddress,
      artifact.abi,
      signer
    );

    const db = getFirestore();

    // Read the same first record used in storage
    const snapshot = await db
      .collection("door_logs")
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new Error("No door logs found");
    }

    const document = snapshot.docs[0];

    const logId = ethers.id(document.ref.path);

    // Verify original Firebase record
    const originalHash =
      "0x" + generateHash(document);

    const storedHash =
      await contract.getHash(logId);

    if (storedHash === ethers.ZeroHash) {
      throw new Error(
        "This record has not been stored on blockchain"
      );
    }

    const originalVerified =
      await contract.verifyHash(
        logId,
        originalHash
      );

    console.log(
      "Original record verified:",
      originalVerified
    );

    // Simulate a modified record locally
    // This does NOT change Firebase
    const modifiedDocument = {
      ref: document.ref,

      data: () => ({
        ...document.data(),
        action: "TAMPERED_TEST_VALUE"
      })
    };

    const modifiedHash =
      "0x" + generateHash(modifiedDocument);

    const modifiedVerified =
      await contract.verifyHash(
        logId,
        modifiedHash
      );

    console.log(
      "Modified record verified:",
      modifiedVerified
    );

    if (originalVerified && !modifiedVerified) {
      console.log(
        "Tamper detection test: PASS"
      );
    } else {
      console.log(
        "Tamper detection test: FAIL"
      );

      process.exitCode = 1;
    }

  } catch (error) {
    console.error(
      "Verification error:",
      error.shortMessage || error.message
    );

    process.exitCode = 1;
  }
}

verifyDoorLog();