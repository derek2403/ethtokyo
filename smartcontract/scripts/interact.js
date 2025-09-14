const { ethers } = require("hardhat");

async function main() {
  // Get the contract address from command line argument or use a default
  const contractAddress = process.argv[2];
  
  if (!contractAddress) {
    console.error("Please provide contract address as argument");
    console.error("Usage: npx hardhat run scripts/interact.js --network kaigan <contract_address>");
    process.exit(1);
  }

  console.log("Interacting with Counter contract at:", contractAddress);

  const Counter = await ethers.getContractFactory("Counter");
  const counter = Counter.attach(contractAddress);

  // Get current count
  const currentCount = await counter.getCount();
  console.log("Current count:", currentCount.toString());

  // Increment the counter
  console.log("Incrementing counter...");
  const incrementTx = await counter.increment();
  await incrementTx.wait();
  console.log("Counter incremented!");

  // Get updated count
  const newCount = await counter.getCount();
  console.log("New count:", newCount.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
