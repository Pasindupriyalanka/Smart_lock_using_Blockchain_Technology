
const { ethers } = require("ethers");

const { generateHash } = require("./hashDoorLog");

const { getFirestore } = require(
  "firebase-admin/firestore"
);

const deployment = require("./deployment.json");

const artifact = require(
  "./artifacts/DoorLogIntegrity.json"
);

async function checkRealLogs() {
  try {
    console.log("Connecting to Ganache...");

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
      throw new Error("Smart contract not found!");
    }

    const contract = new ethers.Contract(
      deployment.contractAddress,
      artifact.abi,
      provider
    );

    const db = getFirestore();

    console.log("Reading actual door logs...");

    // Read only 10 records for the initial test
    const snapshot = await db
      .collection("door_logs")
      .limit(10)
      .get();

    console.log("Records found:", snapshot.size);

    let verified = 0;
    let modified = 0;
    let unprotected = 0;
    let errors = 0;

    for (const document of snapshot.docs) {
      try {
        const logId = ethers.id(document.ref.path);

        const storedHash = await contract.getHash(
          logId
        );

        console.log("----------------------");
        console.log("Document ID:", document.id);

        if (storedHash === ethers.ZeroHash) {
          console.log(
            "UNPROTECTED: No original hash"
          );

          unprotected++;
          continue;
        }

        const currentHash =
          "0x" + generateHash(document);

        if (storedHash === currentHash) {
          console.log("VERIFIED");
          verified++;
        } else {
          console.log("HASH MISMATCH");
          modified++;
        }

      } catch (error) {
        errors++;
        console.error(
          "Checking failed:",
          document.id,
          error.shortMessage || error.message
        );
      }
    }

    console.log("\nREAL DOOR LOGS REPORT");
    console.log("----------------------");
    console.log("Verified:", verified);
    console.log("Hash mismatches:", modified);
    console.log("Unprotected:", unprotected);
    console.log("Errors:", errors);

  } catch (error) {
    console.error(
      "Connection failed:",
      error.shortMessage || error.message
    );

    process.exitCode = 1;
  }
}

checkRealLogs();
