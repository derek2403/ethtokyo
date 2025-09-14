import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { usePrivy } from '@privy-io/react-auth';
import subscriptionAbi from '@/lib/subscription-abi.json';

// Reuse same RPC and contract as pages/subscription.js
const RPC_URL = `https://rpc.kaigan.jsc.dev/rpc?token=${process.env.NEXT_PUBLIC_KAIGAN_RPC_TOKEN}`;
const SUBSCRIPTION_CONTRACT_ADDRESS = '0xAb8281Eb535238eA29fC10cbc67959e0FBdb6626';

export default function AccessGate() {
  const router = useRouter();
  const { ready, authenticated, user, login } = usePrivy();
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState({ hasSbt: null, hasActiveSub: null, error: '' });

  // Derived flags
  const needsGate = useMemo(() => ready && !authenticated, [ready, authenticated]);

  useEffect(() => {
    async function checkAccess() {
      if (!ready || !authenticated || !user?.wallet?.address) return;
      setChecking(true);
      setStatus({ hasSbt: null, hasActiveSub: null, error: '' });
      try {
        const { createPublicClient, http, getContract } = await import('viem');
        const chain = {
          id: 5278000,
          name: 'JSC Kaigan Testnet',
          nativeCurrency: { name: 'JSC Testnet Ether', symbol: 'JETH', decimals: 18 },
          rpcUrls: { default: { http: [RPC_URL] } },
        };
        const client = createPublicClient({ chain, transport: http(RPC_URL) });
        const sub = getContract({ address: SUBSCRIPTION_CONTRACT_ADDRESS, abi: subscriptionAbi, client });

        // Read SBT contract and balance
        let hasSbt = false;
        try {
          const sbtAddress = await sub.read.mizuhikiSbtContract();
          if (sbtAddress && sbtAddress !== '0x0000000000000000000000000000000000000000') {
            const sbtAbi = [
              {
                inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
                name: 'balanceOf',
                outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
                stateMutability: 'view',
                type: 'function',
              },
            ];
            const sbt = getContract({ address: sbtAddress, abi: sbtAbi, client });
            const bal = await sbt.read.balanceOf([user.wallet.address]);
            hasSbt = BigInt(bal) > 0n;
          }
        } catch (e) {
          // Non-fatal
          console.warn('SBT check failed', e);
        }

        const hasActiveSub = Boolean(await sub.read.isSubscriptionActive([user.wallet.address]));
        setStatus({ hasSbt, hasActiveSub, error: '' });
      } catch (e) {
        setStatus({ hasSbt: null, hasActiveSub: null, error: e?.message || 'Failed to check access' });
      } finally {
        setChecking(false);
      }
    }

    checkAccess();
  }, [ready, authenticated, user?.wallet?.address]);

  // Overlay gate if not authenticated
  if (!ready) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 text-white">
        Initializing authentication…
      </div>
    );
  }

  if (needsGate) {
    return (
      <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-[92%] max-w-md p-6 text-center border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Connect Your Wallet</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">You must connect to continue using the app.</p>
          <button type="button" onClick={login} className="rovo-privy-btn w-full">Create / Connect Wallet</button>
        </div>
      </div>
    );
  }

  // Authenticated banner to prompt subscription if missing
  const showPrompt = ready && authenticated && status.hasSbt !== null && !status.hasActiveSub;
  if (showPrompt) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[900]">
        <div className="bg-yellow-50 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 border border-yellow-300 dark:border-yellow-700 rounded-full shadow px-4 py-2 flex items-center gap-3">
          <span className="text-sm">
            {checking ? 'Checking subscription…' : status.hasSbt ? 'No active subscription detected.' : 'SBT missing and no active subscription.'}
          </span>
          <button
            type="button"
            className="text-sm font-medium px-3 py-1 rounded-full bg-yellow-600 text-white hover:bg-yellow-700"
            onClick={() => router.push('/subscription')}
          >
            Manage Subscription
          </button>
        </div>
      </div>
    );
  }

  // No overlay; allow interaction
  return null;
}

