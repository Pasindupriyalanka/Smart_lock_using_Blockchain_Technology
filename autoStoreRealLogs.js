
const { ethers } = require("ethers");

const { getFirestore } = require(
  "firebase-admin/firestore"
);

const { generateHash } = require("./hashDoorLog");

const deployment = require("./deployment.json");

const artifact = require(
  "./artifacts/DoorLogIntegrity.json"
);

// Firebase connection is initialized by hashDoorLog.js
const db = getFirestore();

// Ganache connection
const provider = new ethers.JsonRpcProvider(
  "http://127.0.0.1:7545"
);

async function startListener() {
  try {
    console.log("Connecting to Ganache...");

    // Check the blockchain network
    const network = await provider.getNetwork();

    if (
      network.chainId.toString() !== deployment.chainId
    ) {
      throw new Error("Wrong Blockchain network!");
    }

    // Check deployed contract
    const code = await provider.getCode(
      deployment.contractAddress
    );

    if (code === "0x") {
      throw new Error(
        "Contract not found! Check your deployment."
      );
    }

    // Connect with the first Ganache account
    const signer = await provider.getSigner(0);

    const contract = new ethers.Contract(
      deployment.contractAddress,
      artifact.abi,
      signer
    );

    // Check contract ownership
    const owner = await contract.owner();

    if (
      owner.toLowerCase() !==
      (await signer.getAddress()).toLowerCase()
    ) {
      throw new Error(
        "The selected account is not the contract owner!"
      );
    }

    console.log("Connected to Ganache!");
    console.log("Starting Firebase listener...");

    // Process transactions one by one
    let queue = Promise.resolve();

    // Process a newly created Firebase record
    async function storeLog(document) {

      const data = document.data();

      // Validate required fields
      if (
        typeof data.userId !== "string" ||
        typeof data.userName !== "string" ||
        typeof data.doorName !== "string" ||
        typeof data.action !== "string" ||
        typeof data.method !== "string" ||
        typeof data.timestamp?.seconds !== "number"
      ) {
        console.log(
          "Skipping incomplete record:",
          document.id
        );

        return;
      }

      // Generate record identifier
      const logId = ethers.id(document.ref.path);

      // Generate SHA-256 hash
      const recordHash =
        "0x" + generateHash(document);

      // Check for existing Blockchain record
      const existingHash = await contract.getHash(
        logId
      );

      if (existingHash !== ethers.ZeroHash) {

        if (existingHash === recordHash) {
          console.log(
            "Record already stored:",
            document.id
          );
        } else {
          console.log(
            "WARNING: HASH MISMATCH:",
            document.id
          );
        }

        return;
      }

      // Store the new hash
      console.log("New record:", document.id);
      console.log("Generating SHA-256 hash...");
      console.log("Storing hash on Blockchain...");

      const transaction = await contract.storeHash(
        logId,
        recordHash
      );

      // Wait for transaction confirmation
      const receipt = await transaction.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error(
          "Blockchain transaction failed!"
        );
      }

      // Verify the stored hash
      const verified = await contract.verifyHash(
        logId,
        recordHash
      );

      if (!verified) {
        throw new Error(
          "Hash verification failed!"
        );
      }

      console.log(
        "Blockchain storage successful!"
      );

      console.log(
        "Transaction:",
        transaction.hash
      );

      console.log(
        "Integrity verified:",
        verified
      );

      console.log("------------------------");
    }

    // Ignore documents in the initial snapshot
    let firstSnapshot = true;

    // Listen for new Firestore records
    db.collection("door_logs")
      .onSnapshot(

        (snapshot) => {

          if (firstSnapshot) {
  firstSnapshot = false;

  queue = queue.then(async () => {
    console.log("Checking existing Firebase records...");

    let verified = 0;
    let missing = 0;
    let modified = 0;

    for (const doc of snapshot.docs) {
      const logId = ethers.id(doc.ref.path);

      const storedHash = await contract.getHash(logId);

      if (storedHash === ethers.ZeroHash) {
        console.log("UNPROTECTED:", doc.id);
        missing++;
        continue;
      }

      const currentHash = "0x" + generateHash(doc);

      if (storedHash === currentHash) {
        console.log("VERIFIED:", doc.id);
        verified++;
      } else {
        console.log("ALERT - HASH MISMATCH:", doc.id);
        modified++;
      }
    }

    console.log("Recovery check completed!");
    console.log("Verified:", verified);
    console.log("Missing:", missing);
    console.log("Modified:", modified);

    console.log("Firebase listener ready!");
    console.log("Waiting for NEW records...");

  }).catch((error) => {
    console.error("Recovery check failed:", error.message);
  });

  return;
}

          for (
            const change of snapshot.docChanges()
          ) {

            if (change.type !== "added") {
              continue;
            }

            queue = queue
              .then(
                () => storeLog(change.doc)
              )
              .catch((error) => {

                console.error(
                  "Storage error:",
                  error.shortMessage ||
                  error.message
                );

              });
          }
        },

        (error) => {

          console.error(
            "Firebase listener error:",
            error.message
          );

          process.exitCode = 1;
        }
      );

  } catch (error) {

    console.error(
      "Startup error:",
      error.shortMessage ||
      error.message
    );

    process.exitCode = 1;
  }
}

// Start automatic listener
startListener();
