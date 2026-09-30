
const { ethers } = require("ethers");

const { getFirestore } = require(
  "firebase-admin/firestore"
);

const { generateHash } = require("./hashDoorLog");

const deployment = require("./deployment.json");

const artifact = require(
  "./artifacts/DoorLogIntegrity.json"
);

// Connect to Ganache
const provider = new ethers.JsonRpcProvider(
  "http://127.0.0.1:7545"
);

async function recoverLogs() {
  try {
    console.log("Starting Blockchain recovery...");

    // Verify the network
    const network = await provider.getNetwork();

    if (
      network.chainId.toString() !==
      deployment.chainId
    ) {
      throw new Error("Wrong Blockchain network!");
    }

    // Verify the deployed contract exists
    const code = await provider.getCode(
      deployment.contractAddress
    );

    if (code === "0x") {
      throw new Error(
        "Contract not found. Check Ganache workspace!"
      );
    }

    // Create a read-only contract connection
    const contract = new ethers.Contract(
      deployment.contractAddress,
      artifact.abi,
      provider
    );

    const db = getFirestore();

    // Read all existing test records
    const snapshot = await db
      .collection("blockchain_test_logs")
      .get();

    console.log("Firebase connected!");
    console.log("Records found:", snapshot.size);
    console.log("---------------------------");

    let verified = 0;
    let modified = 0;
    let missing = 0;
    let errors = 0;

    // Compare each record with Blockchain
    for (const document of snapshot.docs) {
      try {
        console.log("Checking:", document.id);

        const logId = ethers.id(
          document.ref.path
        );

        // Read the original Blockchain hash
        const storedHash = await contract.getHash(
          logId
        );

        // Identify records not yet protected
        if (storedHash === ethers.ZeroHash) {
          console.log(
            "NOT STORED: No Blockchain hash"
          );
          missing++;
          console.log("---------------------------");
          continue;
        }

        // Calculate current Firebase hash
        const currentHash =
          "0x" + generateHash(document);

        // Compare against Blockchain
        const isValid = await contract.verifyHash(
          logId,
          currentHash
        );

        if (isValid) {
          console.log("VERIFIED: Hash matches");
          verified++;
        } else {
          console.log(
            "ALERT: DATA MODIFICATION DETECTED!"
          );
          modified++;
        }

      } catch (error) {
        errors++;
        console.error(
          "Record check failed:",
          document.id,
          error.message
        );
      }

      console.log("---------------------------");
    }

    // Display recovery report
    console.log("BLOCKCHAIN RECOVERY REPORT");
    console.log("---------------------------");
    console.log("Verified records:", verified);
    console.log("Modified records:", modified);
    console.log("Not stored:", missing);
    console.log("Errors:", errors);

    if (modified > 0 || missing > 0 || errors > 0) {
      console.log(
        "ATTENTION: Some records need review."
      );
    } else {
      console.log(
        "SUCCESS: All records verified!"
      );
    }

  } catch (error) {
    console.error(
      "Recovery failed:",
      error.shortMessage || error.message
    );

    process.exitCode = 1;
  }
}

recoverLogs();

