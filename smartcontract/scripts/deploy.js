const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Subscription contract...");

  const Subscription = await ethers.getContractFactory("Subscription");
  const subscription = await Subscription.deploy();

  await subscription.waitForDeployment();

  const subscriptionAddress = await subscription.getAddress();
  console.log("Subscription deployed to:", subscriptionAddress);

  // Verify the initial state
  const owner = await subscription.owner();
  const nextPlanId = await subscription.nextPlanId();
  console.log("Contract owner:", owner);
  console.log("Next plan ID:", nextPlanId.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
