const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Counter contract...");

  const Counter = await ethers.getContractFactory("Counter");
  const counter = await Counter.deploy();

  await counter.waitForDeployment();

  const counterAddress = await counter.getAddress();
  console.log("Counter deployed to:", counterAddress);

  // Verify the initial count
  const initialCount = await counter.getCount();
  console.log("Initial count:", initialCount.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
