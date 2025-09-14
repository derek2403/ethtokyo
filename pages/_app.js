import "@/styles/globals.css";
import "../styles/manga.css";

export default function App({ Component, pageProps }) {
  return (
    <div className="dark">
      <Component {...pageProps} />
    </div>
  );
}
