import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import subscriptionAbi from "@/lib/subscription-abi.json";
import ConnectWalletButton from "@/components/ConnectWalletButton";

const RPC_URL = `https://rpc.kaigan.jsc.dev/rpc?token=${process.env.NEXT_PUBLIC_KAIGAN_RPC_TOKEN}`;
const SUBSCRIPTION_CONTRACT_ADDRESS = "0xAb8281Eb535238eA29fC10cbc67959e0FBdb6626";

export default function SubscriptionPage() {
  const { ready, authenticated, user } = usePrivy();
  const [contractOwner, setContractOwner] = useState(null);
  const [nextPlanId, setNextPlanId] = useState(null);
  const [plans, setPlans] = useState([]);
  const [userSubscription, setUserSubscription] = useState(null);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);
  const [isSbtHolder, setIsSbtHolder] = useState(false);
  const [isVerifiedAndSubscribed, setIsVerifiedAndSubscribed] = useState(false);
  const [mizuhikiSbtAddress, setMizuhikiSbtAddress] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [contractBalance, setContractBalance] = useState("0");
  const [checkMessage, setCheckMessage] = useState(null);
  const [checkOk, setCheckOk] = useState(null);
  const [checking, setChecking] = useState(false);
  // Arbitrary address check state
  const [targetAddress, setTargetAddress] = useState("");
  const [targetCheckMessage, setTargetCheckMessage] = useState(null);
  const [targetCheckOk, setTargetCheckOk] = useState(null);
  const [targetChecking, setTargetChecking] = useState(false);

  // Form states
  const [newPlanPrice, setNewPlanPrice] = useState("");
  const [newPlanDuration, setNewPlanDuration] = useState("");

  const chain = {
    id: 5278000,
    name: "JSC Kaigan Testnet",
    nativeCurrency: { name: "JSC Testnet Ether", symbol: "JETH", decimals: 18 },
    rpcUrls: { default: { http: [RPC_URL] } }
  };

  async function createPublicClient() {
    const { createPublicClient, http } = await import("viem");
    return createPublicClient({ chain, transport: http(RPC_URL) });
  }

  async function getContract(client) {
    const { getContract } = await import("viem");
    return getContract({ 
      address: SUBSCRIPTION_CONTRACT_ADDRESS, 
      abi: subscriptionAbi, 
      client 
    });
  }

  async function readContractData() {
    setErr("");
    try {
      const client = await createPublicClient();
      const contract = await getContract(client);

      // Read basic contract info
      const owner = await contract.read.owner();
      const nextId = await contract.read.nextPlanId();
      const sbtAddress = await contract.read.mizuhikiSbtContract();
      
      setContractOwner(owner.toLowerCase());
      setNextPlanId(Number(nextId));
      setMizuhikiSbtAddress(sbtAddress);

      // Get contract balance
      const balance = await client.getBalance({ address: SUBSCRIPTION_CONTRACT_ADDRESS });
      setContractBalance(balance.toString());

      // Read available plans
      const planPromises = [];
      for (let i = 1; i < Number(nextId); i++) {
        planPromises.push(
          contract.read.getPlan([BigInt(i)]).then(plan => ({ id: i, ...plan }))
        );
      }
      
      if (planPromises.length > 0) {
        const planResults = await Promise.all(planPromises);
        setPlans(planResults.filter(plan => plan.active));
      }

      // Read user subscription and SBT status if authenticated
      if (authenticated && user?.wallet?.address) {
        // Check SBT balance directly on the SBT contract
        let sbtHolder = false;
        try {
          if (sbtAddress && sbtAddress !== '0x0000000000000000000000000000000000000000') {
            const { getContract } = await import('viem');
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
            sbtHolder = BigInt(bal) > 0n;
          }
        } catch (e) {
          console.warn('Failed to read SBT balance', e);
        }

        const userSub = await contract.read.getSubscription([user.wallet.address]);
        const isActive = await contract.read.isSubscriptionActive([user.wallet.address]);
        const verifiedAndSubscribed = await contract.read.isVerifiedAndSubscribed([user.wallet.address]);
        
        setUserSubscription(userSub);
        setIsSubscriptionActive(isActive);
        setIsVerifiedAndSubscribed(Boolean(verifiedAndSubscribed));
        setIsSbtHolder(sbtHolder);
      }
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to read contract data");
    }
  }

  async function createPlan() {
    if (!newPlanPrice || !newPlanDuration) {
      setErr("Please enter both price and duration");
      return;
    }

    setErr("");
    setLoading(true);
    try {
      const { parseEther } = await import("viem");
      const priceInWei = parseEther(newPlanPrice);
      const durationInSeconds = parseInt(newPlanDuration) * 24 * 60 * 60; // Convert days to seconds

      await txWrite("createPlan", [priceInWei, BigInt(durationInSeconds)]);
      
      setNewPlanPrice("");
      setNewPlanDuration("");
      await readContractData();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to create plan");
    } finally {
      setLoading(false);
    }
  }

  async function subscribeToPlan(planId) {
    setErr("");
    setLoading(true);
    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) {
        throw new Error("Plan not found");
      }

      await txWrite("subscribe", [BigInt(planId)], plan.price);
      await readContractData();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to subscribe");
    } finally {
      setLoading(false);
    }
  }

  async function checkVerifiedAndSubscribedNow() {
    setChecking(true);
    setCheckMessage(null);
    setCheckOk(null);
    setErr("");
    try {
      const client = await createPublicClient();
      const contract = await getContract(client);

      // Contract-side check (source of truth) with msg.sender = connected wallet
      const ok = await client.readContract({
        address: SUBSCRIPTION_CONTRACT_ADDRESS,
        abi: subscriptionAbi,
        functionName: 'isCallerVerifiedAndSubscribed',
        account: user.wallet.address,
      });
      setCheckOk(Boolean(ok));

      if (ok) {
        setCheckMessage("You are verified (hold the Mizuhiki SBT) and have an active subscription.");
      } else {
        // Diagnose what is missing
        let hasSbt = false;
        try {
          const sbtAddress = await contract.read.mizuhikiSbtContract();
          if (sbtAddress && sbtAddress !== '0x0000000000000000000000000000000000000000') {
            const { getContract } = await import('viem');
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
        } catch {}

        const hasActiveSub = await contract.read.isSubscriptionActive([user.wallet.address]);

        if (!hasSbt && !hasActiveSub) {
          setCheckMessage("You are not verified (SBT missing) and you do not have an active subscription.");
        } else if (!hasSbt) {
          setCheckMessage("You are not verified (Mizuhiki SBT missing).");
        } else if (!hasActiveSub) {
          setCheckMessage("You do not have an active subscription.");
        } else {
          // Should not happen if ok is false, but fallback message
          setCheckMessage("You are missing one or more requirements.");
        }
      }
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to check verified + subscribed status");
    } finally {
      setChecking(false);
    }
  }

  function isValidAddress(addr) {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  }

  async function checkAddressVerifiedAndSubscribed() {
    setTargetChecking(true);
    setTargetCheckMessage(null);
    setTargetCheckOk(null);
    setErr("");

    try {
      if (!isValidAddress(targetAddress)) {
        throw new Error("Please enter a valid address (0x...) to check");
      }
      const client = await createPublicClient();
      const contract = await getContract(client);

      // Read combined check and also diagnose if false
      const combined = await contract.read.isVerifiedAndSubscribed([targetAddress]);
      setTargetCheckOk(Boolean(combined));

      if (combined) {
        setTargetCheckMessage("Address is verified (SBT holder) and has an active subscription.");
      } else {
        // Diagnose: SBT ownership and active subscription
        let hasSbt = false;
        try {
          const sbtAddress = await contract.read.mizuhikiSbtContract();
          if (sbtAddress && sbtAddress !== '0x0000000000000000000000000000000000000000') {
            const { getContract } = await import('viem');
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
            const bal = await sbt.read.balanceOf([targetAddress]);
            hasSbt = BigInt(bal) > 0n;
          }
        } catch {}

        const hasActiveSub = await contract.read.isSubscriptionActive([targetAddress]);

        if (!hasSbt && !hasActiveSub) {
          setTargetCheckMessage("Address is not verified (SBT missing) and does not have an active subscription.");
        } else if (!hasSbt) {
          setTargetCheckMessage("Address is not verified (Mizuhiki SBT missing).");
        } else if (!hasActiveSub) {
          setTargetCheckMessage("Address does not have an active subscription.");
        } else {
          setTargetCheckMessage("Address is missing one or more requirements.");
        }
      }
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to check address status");
    } finally {
      setTargetChecking(false);
    }
  }

  async function cancelSubscription() {
    setErr("");
    setLoading(true);
    try {
      await txWrite("cancelSubscription", []);
      await readContractData();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to cancel subscription");
    } finally {
      setLoading(false);
    }
  }

  async function withdrawFunds() {
    setErr("");
    setLoading(true);
    try {
      await txWrite("withdraw", []);
      await readContractData();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to withdraw funds");
    } finally {
      setLoading(false);
    }
  }

  async function txWrite(method, args = [], value = BigInt(0)) {
    if (!ready) throw new Error("Privy is not ready");
    if (!authenticated) throw new Error("Please connect/login first");
    if (!user?.wallet?.address) throw new Error("Please create or connect a wallet first");

    console.log("Sending transaction with wallet:", user.wallet.address);
    
    // Check if this is an embedded wallet (has ID) or external wallet
    if (user.wallet.id) {
      // Embedded wallet - use Privy server API
      const response = await fetch('/api/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletId: user.wallet.id,
          method,
          args,
          value: value.toString(),
          contractAddress: SUBSCRIPTION_CONTRACT_ADDRESS,
          abi: subscriptionAbi
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Transaction failed');
      }

      const { hash } = await response.json();
      console.log("Transaction hash:", hash);
    } else {
      // External wallet (MetaMask, etc.) - use direct web3 interaction
      const { createWalletClient, custom, encodeFunctionData } = await import("viem");
      
      if (!window.ethereum) {
        throw new Error("No ethereum provider found");
      }

      // Ensure wallet is on the target chain before sending
      const hexChainId = '0x' + chain.id.toString(16);
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: hexChainId }],
        });
      } catch (switchErr) {
        // If the chain has not been added to MetaMask, add it first, then switch
        if (switchErr?.code === 4902 || (switchErr?.data && String(switchErr.data).includes('Unrecognized chain ID'))) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: hexChainId,
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls: chain.rpcUrls?.default?.http || [RPC_URL],
              }],
            });
            // Try switching again
            await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexChainId }] });
          } catch (addErr) {
            console.warn('Failed to add/switch chain', addErr);
            throw new Error(`Please switch your wallet to ${chain.name} (id: ${chain.id}) and try again.`);
          }
        } else {
          // Generic switch error
          console.warn('Switch chain failed', switchErr);
          throw new Error(`Please switch your wallet to ${chain.name} (id: ${chain.id}) and try again.`);
        }
      }

      const walletClient = createWalletClient({
        chain,
        transport: custom(window.ethereum),
        account: user.wallet.address
      });

      // Encode the function call
      const data = encodeFunctionData({
        abi: subscriptionAbi,
        functionName: method,
        args
      });

      // Send the transaction directly
      const hash = await walletClient.sendTransaction({
        to: SUBSCRIPTION_CONTRACT_ADDRESS,
        data,
        value,
        chain
      });

      console.log("Transaction hash:", hash);
    }
  }

  function formatEther(wei) {
    if (!wei) return "0";
    const { formatEther } = require("viem");
    return formatEther(BigInt(wei));
  }

  function formatDuration(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}${hours > 0 ? ` ${hours}h` : ''}`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }

  function formatDate(timestamp) {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  }

  const isOwner = authenticated && user?.wallet?.address && 
                 contractOwner && user.wallet.address.toLowerCase() === contractOwner;

  useEffect(() => {
    readContractData();
  }, [ready, authenticated, user]);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Subscription Service</h1>
        <p className="text-sm text-gray-600 mb-6">{SUBSCRIPTION_CONTRACT_ADDRESS}</p>

        <div className="mb-6">
          <ConnectWalletButton />
        </div>

        {err && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {err}
          </div>
        )}

        {/* Owner Section */}
        {isOwner && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-blue-800">Owner Panel</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-3">Create New Plan</h3>
                <div className="space-y-3">
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Price (JETH)"
                    value={newPlanPrice}
                    onChange={(e) => setNewPlanPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Duration (days)"
                    value={newPlanDuration}
                    onChange={(e) => setNewPlanDuration(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={createPlan}
                    disabled={loading}
                    className="w-full rovo-privy-btn"
                  >
                    Create Plan
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Contract Stats</h3>
                <div className="space-y-2">
                  <p>Contract Balance: <strong>{formatEther(contractBalance)} JETH</strong></p>
                  <p>Next Plan ID: <strong>{nextPlanId}</strong></p>
                  <button
                    onClick={withdrawFunds}
                    disabled={loading}
                    className="w-full rovo-privy-btn"
                  >
                    Withdraw Funds
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Subscription Status */}
        {authenticated && user?.wallet?.address && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Your Subscription</h2>
              <button
                onClick={checkVerifiedAndSubscribedNow}
                disabled={checking}
                className="rovo-privy-btn"
              >
                {checking ? 'Checking…' : 'Check Verified + Subscribed'}
              </button>
            </div>
            {/* Inline result for the on-demand check */}
            {checkMessage && (
              <div className={`mb-4 px-4 py-2 rounded ${checkOk ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {checkMessage}
              </div>
            )}

            <div className="text-sm text-gray-600 mb-2">
              Mizuhiki SBT Contract: <span className="font-mono">{mizuhikiSbtAddress || 'not set'}</span>
            </div>
            
            {/* Arbitrary Address Check */}
            <div className="mt-4 mb-6 p-4 border border-gray-200 rounded">
              <h3 className="font-medium mb-2">Check another address</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="0x... address"
                  value={targetAddress}
                  onChange={(e) => setTargetAddress(e.target.value.trim())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <button
                  onClick={checkAddressVerifiedAndSubscribed}
                  disabled={targetChecking}
                  className="rovo-privy-btn"
                >
                  {targetChecking ? 'Checking…' : 'Check Address'}
                </button>
              </div>
              {targetCheckMessage && (
                <div className={`mt-3 px-4 py-2 rounded ${targetCheckOk ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {targetCheckMessage}
                </div>
              )}
            </div>

            {isSubscriptionActive ? (
              <div className="space-y-3">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>Plan ID:</strong> {userSubscription.planId.toString()}</p>
                    <p><strong>Started:</strong> {formatDate(userSubscription.startTime)}</p>
                    <p><strong>Expires:</strong> {formatDate(userSubscription.endTime)}</p>
                  </div>
                  <div>
                    <button
                      onClick={cancelSubscription}
                      disabled={loading}
                      className="rovo-privy-btn bg-red-600 hover:bg-red-700"
                    >
                      Cancel Subscription
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-600">
                {userSubscription?.active === false ? 
                  "Your subscription has been cancelled or expired." : 
                  "You don't have an active subscription."
                }
              </div>
            )}
          </div>
        )}

        {/* Available Plans */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
          
          {plans.length === 0 ? (
            <p className="text-gray-600">No subscription plans available.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div key={plan.id} className="border border-gray-200 rounded-lg p-6 bg-white">
                  <h3 className="text-lg font-semibold mb-3">Plan #{plan.id}</h3>
                  <div className="space-y-2 mb-4">
                    <p><strong>Price:</strong> {formatEther(plan.price)} JETH</p>
                    <p><strong>Duration:</strong> {formatDuration(Number(plan.duration))}</p>
                  </div>
                  
                  {authenticated && user?.wallet?.address && !isSubscriptionActive && (
                    <button
                      onClick={() => subscribeToPlan(plan.id)}
                      disabled={loading}
                      className="w-full rovo-privy-btn"
                    >
                      Subscribe
                    </button>
                  )}
                  
                  {isSubscriptionActive && (
                    <div className="text-green-600 text-sm">
                      You already have an active subscription
                    </div>
                  )}
                  
                  {!authenticated && (
                    <div className="text-gray-500 text-sm">
                      Connect wallet to subscribe
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8">
          <button 
            className="rovo-privy-btn" 
            onClick={readContractData}
          >
            Refresh Data
          </button>
        </div>

        {!ready && <div className="text-sm mt-4">Auth loading…</div>}
      </div>
    </div>
  );
}
