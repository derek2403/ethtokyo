import "@/styles/globals.css";
import "../styles/manga.css"; // ✅ keep your manga.css
import { PrivyProvider } from "@privy-io/react-auth";
import { useRouter } from "next/router";
import { jscKaiganTestnet } from "@/lib/chains";
import "../styles/manga.css";
import ConnectWalletButton from "@/components/ConnectWalletButton";

const PRIVY_APP_ID = (process.env.NEXT_PUBLIC_PRIVY_APP_ID || "").trim();
const PRIVY_CLIENT_ID =
  (process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || "").trim() || undefined;

export default function App({ Component, pageProps }) {
  const router = useRouter();
  if (!PRIVY_APP_ID) {
    if (typeof window !== "undefined") {
      console.error(
        "[Privy] NEXT_PUBLIC_PRIVY_APP_ID is not set or empty. Add it to .env.local and restart the dev server."
      );
    }
    // Render without PrivyProvider to avoid initialization error
    return (
      <div className="dark">
        <Component {...pageProps} />
      </div>
    );
  }

  if (!PRIVY_APP_ID.startsWith("app_")) {
    if (typeof window !== "undefined") {
      console.warn(
        "[Privy] The app ID does not look like an app_... value. Are you using the App Secret by mistake?"
      );
    }
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      clientId={PRIVY_CLIENT_ID}
      config={{
        // Chains
        defaultChain: jscKaiganTestnet,
        supportedChains: [jscKaiganTestnet],

        appearance: {
          accentColor: "#6A6FF5",
          theme: "#FFFFFF",
          showWalletLoginFirst: false,
          logo: "https://auth.privy.io/logos/privy-logo.png",
          walletChainType: "ethereum",
          walletList: [
            "detected_wallets",
            "metamask",
            "coinbase_wallet",
            "base_account",
            "rainbow",
            "okx_wallet",
            "wallet_connect"
          ]
        },
        loginMethods: ["email", "google", "wallet", "discord"],
        fundingMethodConfig: {
          moonpay: {
            useSandbox: true
          }
        },
        embeddedWallets: {
          requireUserPasswordOnCreate: false,
          showWalletUIs: true,
          ethereum: {
            createOnLogin: "users-without-wallets"
          }
        },
        mfa: {
          noPromptOnMfaRequired: false
        },
        externalWallets: {
          ethereum: {
            connectors: {
              injected: {},
              walletConnect: {} // ✅ fixed key
            }
          }
        }
      }}
    >
      <div className="dark">
        {/* Floating connect wallet button in the corner (hidden on landing page) */}
        {router.pathname !== "/" && (
          <div className="fixed top-4 right-4 z-[900]">
            <ConnectWalletButton className="cta-primary" />
          </div>
        )}
        <Component {...pageProps} />
      </div>
    </PrivyProvider>
  );
}
