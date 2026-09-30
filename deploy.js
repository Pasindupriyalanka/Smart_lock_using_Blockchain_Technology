const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Connect to Ganache
const provider = new ethers.JsonRpcProvider(
  "http://127.0.0.1:7545"
);

async function deployContract() {
  try {
    console.log("Connecting to Ganache...");

    const signer = await provider.getSigner(0);
    const network = await provider.getNetwork();

    console.log("Connected to Ganache!");

    // Read compiled smart contract
    const artifactPath = path.join(
      __dirname,
      "artifacts",
      "DoorLogIntegrity.json"
    );

    const artifact = JSON.parse(
      fs.readFileSync(artifactPath, "utf8")
    );

    const abi = artifact.abi;
    const bytecode = artifact.evm.bytecode.object;

    // Create contract factory
    const factory = new ethers.ContractFactory(
      abi,
      bytecode,
      signer
    );

    console.log("Deploying smart contract...");

    // Deploy smart contract
    const contract = await factory.deploy();

    await contract.waitForDeployment();

    const contractAddress =
      await contract.getAddress();

    console.log(
      "Smart Contract deployed successfully!"
    );

    console.log(
      "Contract Address:",
      contractAddress
    );

    // Save deployment information
    const deployment = {
      contractAddress,
      chainId: network.chainId.toString()
    };

    fs.writeFileSync(
      path.join(__dirname, "deployment.json"),
      JSON.stringify(deployment, null, 2)
    );

    console.log("Deployment information saved!");

  } catch (error) {
    console.error(
      "Deployment failed:",
      error.message
    );
    process.exitCode = 1;
  }
}

deployContract();