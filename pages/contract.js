import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import abi from "@/lib/abi.json";
import ConnectWalletButton from "@/components/ConnectWalletButton";

const RPC_URL = "https://rpc.kaigan.jsc.dev/rpc?token=8O6QnGw0yT6Nxjp-wskWZ1FX7PBPVjJ65aarF_ebDNo";
const CONTRACT_ADDRESS = "0x7B60257377bC34F12E451DE2e9eBe7Fc99974c5b";

export default function ContractPage() {
  const { ready, authenticated, user } = usePrivy();
  const [count, setCount] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function readCount() {
    setErr("");
    try {
      const { createPublicClient, http, getContract } = await import("viem");
      const chain = { id: 5278000, name: "JSC Kaigan Testnet", nativeCurrency: { name: "JSC Testnet Ether", symbol: "JETH", decimals: 18 }, rpcUrls: { default: { http: [RPC_URL] } } };
      const client = createPublicClient({ chain, transport: http(RPC_URL) });
      const contract = getContract({ address: CONTRACT_ADDRESS, abi, client });
      const value = await contract.read.getCount();
      setCount(Number(value));
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to read count");
    }
  }

  async function txWrite(method) {
    setErr("");
    setLoading(true);
    try {
      if (!ready) throw new Error("Privy is not ready");
      if (!authenticated) throw new Error("Please connect/login first");
      if (!user?.wallet?.address) throw new Error("Please create or connect a wallet first");

      console.log("Sending transaction with wallet:", user.wallet.address);
      console.log("Wallet type:", user.wallet.connectorType);
      
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
            contractAddress: CONTRACT_ADDRESS,
            abi
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
        const { createWalletClient, custom, getContract, encodeFunctionData } = await import("viem");
        
        if (!window.ethereum) {
          throw new Error("No ethereum provider found");
        }

        const chain = { 
          id: 5278000, 
          name: "JSC Kaigan Testnet", 
          nativeCurrency: { name: "JSC Testnet Ether", symbol: "JETH", decimals: 18 }, 
          rpcUrls: { default: { http: [RPC_URL] } } 
        };

        const walletClient = createWalletClient({
          chain,
          transport: custom(window.ethereum),
          account: user.wallet.address
        });

        // Encode the function call
        const data = encodeFunctionData({
          abi,
          functionName: method
        });

        // Send the transaction directly
        const hash = await walletClient.sendTransaction({
          to: CONTRACT_ADDRESS,
          data,
          chain
        });

        console.log("Transaction hash:", hash);
      }
      
      await readCount();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-8 flex flex-col items-center gap-4">
      <h1 className="text-2xl font-semibold">Counter Contract (JSC Kaigan Testnet)</h1>
      <p className="text-sm text-gray-600">{CONTRACT_ADDRESS}</p>

      <div className="mt-2">
        <ConnectWalletButton />
      </div>

      <div className="flex gap-2 mt-4">
        <button className="rovo-privy-btn" onClick={readCount}>Read Count</button>
        <button className="rovo-privy-btn" disabled={loading} onClick={() => txWrite("increment")}>Increment</button>
        <button className="rovo-privy-btn" disabled={loading} onClick={() => txWrite("decrement")}>Decrement</button>
        <button className="rovo-privy-btn" disabled={loading} onClick={() => txWrite("reset")}>Reset</button>
      </div>

      {count !== null && <div className="mt-2">Current count: <strong>{count}</strong></div>}
      {!ready && <div className="text-sm">Auth loading…</div>}
      {err && <div className="text-red-600 text-sm">{err}</div>}
    </div>
  );
}
