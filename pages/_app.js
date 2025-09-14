import "@/styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <div className="dark">
      <Component {...pageProps} />
    </div>
  );
}
