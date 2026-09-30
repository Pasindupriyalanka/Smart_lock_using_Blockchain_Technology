const fs = require("fs");
const path = require("path");
const solc = require("solc");

// Read Solidity smart contract
const contractPath = path.join(
  __dirname,
  "contracts",
  "DoorLogIntegrity.sol"
);

const source = fs.readFileSync(
  contractPath,
  "utf8"
);

// Solidity compiler configuration
const input = {
  language: "Solidity",

  sources: {
    "DoorLogIntegrity.sol": {
      content: source
    }
  },

  settings: {
    evmVersion: "paris",

    outputSelection: {
      "*": {
        "*": [
          "abi",
          "evm.bytecode.object"
        ]
      }
    }
  }
};

// Compile smart contract
const output = JSON.parse(
  solc.compile(JSON.stringify(input))
);

// Check compilation errors
if (output.errors) {
  output.errors.forEach((error) => {
    console.log(error.formattedMessage);
  });

  const hasErrors = output.errors.some(
    (error) => error.severity === "error"
  );

  if (hasErrors) {
    process.exit(1);
  }
}

// Get compiled contract
const contract =
  output.contracts["DoorLogIntegrity.sol"]
    ["DoorLogIntegrity"];

// Create artifacts folder
const artifactsPath = path.join(
  __dirname,
  "artifacts"
);

fs.mkdirSync(artifactsPath, {
  recursive: true
});

// Save compiled contract
fs.writeFileSync(
  path.join(
    artifactsPath,
    "DoorLogIntegrity.json"
  ),
  JSON.stringify(contract, null, 2)
);

console.log(
  "Smart Contract compiled successfully!"
);

console.log(
  "Artifact saved successfully!"
);