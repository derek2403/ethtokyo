# Counter Contract Deployment Guide

## Setup Instructions

### 1. Environment Variables
Create a `.env` file in the smartcontract directory with the following variables:

```
KAIGAN_RPC_TOKEN=your_rpc_token_here
PRIVATE_KEY=your_private_key_here
```

### 2. Get Required Credentials
- **RPC Token**: Visit https://rpc.kaigan.jsc.dev to get your personalized RPC token
- **Testnet Funds**: Visit https://faucet.kaigan.jsc.dev to get testnet JETH tokens
- **Private Key**: Export your wallet's private key (keep this secure!)

### 3. Install Dependencies
```bash
npm install
```

### 4. Compile Contract
```bash
npx hardhat compile
```

### 5. Deploy to Kaigan Testnet
```bash
npx hardhat run scripts/deploy.js --network kaigan
```

### 6. Interact with Contract
```bash
npx hardhat run scripts/interact.js --network kaigan <contract_address>
```

## Network Configuration
- **Network Name**: kaigan
- **Chain ID**: 5278000
- **Currency Symbol**: JETH
- **Block Explorer**: https://explorer.kaigan.jsc.dev

## Contract Functions
- `increment()`: Increment the counter by 1
- `decrement()`: Decrement the counter by 1 (requires count > 0)
- `reset()`: Reset counter to 0 (owner only)
- `getCount()`: Get current count value
