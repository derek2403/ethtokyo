require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    kaigan: {
      url: `https://rpc.kaigan.jsc.dev/rpc?token=${process.env.KAIGAN_RPC_TOKEN}`,
      chainId: 5278000,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
