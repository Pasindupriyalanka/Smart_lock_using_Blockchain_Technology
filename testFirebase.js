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

// Connect to Firestore
const db = getFirestore();

// Test Firebase connection
async function testConnection() {
  try {
    const snapshot = await db
      .collection("door_logs")
      .limit(1)
      .get();

    console.log("Firebase connected successfully!");
    console.log("Documents found:", snapshot.size);

    snapshot.forEach((doc) => {
      console.log(
        "Available fields:",
        Object.keys(doc.data())
      );
    });

  } catch (error) {
    console.error("Connection failed:", error.message);
  }
}

testConnection();