const crypto = require("node:crypto");

const {
  initializeApp,
  applicationDefault
} = require("firebase-admin/app");

const {
  getFirestore
} = require("firebase-admin/firestore");

// Initialize Firebase
initializeApp({
  credential: applicationDefault()
});

const db = getFirestore();

// Generate SHA-256 hash
function generateHash(document) {

  const data = document.data();

  const record = {
    documentPath: document.ref.path,
    userId: data.userId ?? null,
    userName: data.userName ?? null,
    doorName: data.doorName ?? null,
    action: data.action ?? null,
    method: data.method ?? null,
    timestamp: data.timestamp
      ? {
          seconds: data.timestamp.seconds,
          nanoseconds: data.timestamp.nanoseconds
        }
      : null
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(record))
    .digest("hex");
}

// Read Firebase record and generate hash
async function testHash() {

  try {

    const snapshot = await db
      .collection("door_logs")
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log("No door logs found.");
      return;
    }

    const document = snapshot.docs[0];

    const hash = generateHash(document);

    console.log("Firebase connected successfully!");
    console.log("SHA-256 Hash generated successfully!");
    console.log("Document ID:", document.id);
    console.log("Generated Hash:", hash);

  } catch (error) {
    console.error("Error:", error.message);
  }

}

if (require.main === module) {
  testHash();
}

module.exports = { generateHash };