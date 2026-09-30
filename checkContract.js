const { ethers } = require("ethers");

const deployment = require("./deployment.json");

async function checkContract() {
  try {
    const provider = new ethers.JsonRpcProvider(
      "http://127.0.0.1:7545"
    );

    console.log("Connecting to Ganache...");

    const code = await provider.getCode(
      deployment.contractAddress
    );

    if (code === "0x") {
      console.log("Contract NOT FOUND");
    } else {
      console.log("Contract FOUND");
    }

  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkContract();