import { usePrivy } from "@privy-io/react-auth";
import UserPill from "./UserPill";

export default function ConnectWalletButton({ className = "" }) {
  const { ready, authenticated, login } = usePrivy();

  // Wait until Privy is initialized
  if (!ready) {
    return <div>Loading...</div>;
  }

  // Unauthenticated: show a single connect button
  if (!authenticated) {
    return (
      <button
        type="button"
        onClick={login}
        className={`bg-white text-black border border-black rounded px-4 py-2 hover:bg-black/5 transition ${className}`}
      >
        Connect Wallet
      </button>
    );
  }

  // Authenticated: show the UserPill
  return <UserPill />;
}
