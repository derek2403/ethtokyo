import "@/styles/globals.css";
import { PrivyProvider } from "@privy-io/react-auth";

const PRIVY_APP_ID = (process.env.NEXT_PUBLIC_PRIVY_APP_ID || "").trim();
const PRIVY_CLIENT_ID = (process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || "").trim() || undefined;

export default function App({ Component, pageProps }) {
  if (!PRIVY_APP_ID) {
    if (typeof window !== "undefined") {
      console.error(
        "[Privy] NEXT_PUBLIC_PRIVY_APP_ID is not set or empty. Add it to .env.local and restart the dev server."
      );
    }
    // Render without PrivyProvider to avoid initialization error
    return <Component {...pageProps} />;
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
        // Create embedded wallets for users who don't have a wallet
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <Component {...pageProps} />
    </PrivyProvider>
  );
}
