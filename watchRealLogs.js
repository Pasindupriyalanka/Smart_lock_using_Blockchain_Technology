
const {
  initializeApp,
  applicationDefault,
  getApps
} = require("firebase-admin/app");

const {
  getFirestore
} = require("firebase-admin/firestore");

// Initialize Firebase
if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault()
  });
}

const db = getFirestore();

let firstSnapshot = true;

console.log("Connecting to Firebase...");

// Listen for new real door logs
db.collection("door_logs").onSnapshot(

  (snapshot) => {

    // Ignore records already present
    if (firstSnapshot) {
      firstSnapshot = false;

      console.log("Real Door Logs Listener Ready!");
      console.log("Waiting for NEW door access...");
      return;
    }

    for (const change of snapshot.docChanges()) {

      if (change.type === "added") {

        console.log("------------------------");
        console.log("NEW DOOR LOG DETECTED!");
        console.log("Document ID:", change.doc.id);
        console.log("------------------------");

      }
    }

  },

  (error) => {
    console.error("Listener Error:", error.message);
    process.exitCode = 1;
  }
);
