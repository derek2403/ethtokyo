import { PrivyClient } from '@privy-io/server-auth';
import { encodeFunctionData } from 'viem';

// Validate environment variables
if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
  throw new Error('NEXT_PUBLIC_PRIVY_APP_ID environment variable is not set');
}
if (!process.env.PRIVY_APP_SECRET) {
  throw new Error('PRIVY_APP_SECRET environment variable is not set');
}

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID,
  process.env.PRIVY_APP_SECRET
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletId, method, contractAddress, abi, args = [], value = "0" } = req.body;

    // Validate request body
    if (!walletId) return res.status(400).json({ error: 'walletId is required' });
    if (!method) return res.status(400).json({ error: 'method is required' });
    if (!contractAddress) return res.status(400).json({ error: 'contractAddress is required' });
    if (!abi) return res.status(400).json({ error: 'abi is required' });

    // Encode the function call using viem
    const data = encodeFunctionData({
      abi,
      functionName: method,
      args: args
    });

    // Send transaction using Privy server client
    const txResponse = await privy.walletApi.ethereum.sendTransaction({
      walletId,
      caip2: 'eip155:5278000', // JSC Kaigan Testnet
      transaction: {
        to: contractAddress,
        data,
        value: value,
        chainId: 5278000
      }
    });

    return res.status(200).json({ hash: txResponse.hash });
  } catch (error) {
    console.error('Transaction error:', error);
    // Return a more detailed error message
    return res.status(500).json({ 
      error: error.message,
      type: error.name,
      details: error.stack
    });
  }
}
