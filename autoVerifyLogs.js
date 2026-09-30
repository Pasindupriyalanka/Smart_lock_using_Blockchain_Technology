
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

async function startVerification() {
  try {
    // Check Blockchain network
    const network = await provider.getNetwork();

    if (
      network.chainId.toString() !== deployment.chainId
    ) {
      throw new Error("Wrong Blockchain network!");
    }

    // Check deployed smart contract
    const code = await provider.getCode(
      deployment.contractAddress
    );

    if (code === "0x") {
      throw new Error("Smart Contract not found!");
    }

    // Read-only smart contract connection
    const contract = new ethers.Contract(
      deployment.contractAddress,
      artifact.abi,
      provider
    );

    const db = getFirestore();

    console.log("Connected to Blockchain!");
    console.log("Starting automatic verification...");

    let firstSnapshot = true;
    let queue = Promise.resolve();

    // Listen to changes in our test document
    db.collection("blockchain_test_logs")
      .doc("test_003")
      .onSnapshot(

        (document) => {

          if (!document.exists) {
            console.log("Test document not found!");
            return;
          }

          // Ignore initial snapshot
          if (firstSnapshot) {
            firstSnapshot = false;

            console.log(
              "Automatic verification listener ready!"
            );

            console.log(
              "Waiting for Firebase modifications..."
            );

            return;
          }

          // Process changes sequentially
          queue = queue.then(async () => {

            console.log("Firebase modification detected!");

            const logId = ethers.id(
              document.ref.path
            );

            const originalHash =
              await contract.getHash(logId);

            if (originalHash === ethers.ZeroHash) {
              console.log(
                "WARNING: No original Blockchain hash!"
              );
              return;
            }

            const currentHash =
              "0x" + generateHash(document);

            const verified =
              await contract.verifyHash(
                logId,
                currentHash
              );

            console.log(
              "Integrity verified:",
              verified
            );

            if (verified) {
              console.log(
                "SUCCESS: RECORD VERIFIED"
              );
            } else {
              console.log(
                "ALERT: DATA MODIFICATION DETECTED!"
              );
            }

            console.log("------------------------");

          }).catch((error) => {
            console.error(
              "Verification error:",
              error.message
            );
          });

        },

        (error) => {
          console.error(
            "Listener error:",
            error.message
          );
        }
      );

  } catch (error) {
    console.error(
      "Startup error:",
      error.message
    );
    process.exitCode = 1;
  }
}

startVerification();
