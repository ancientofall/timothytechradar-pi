import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { axiosClient } from "../lib/axiosClient";
import { products } from "../products";
import { useStoreAuth } from "./StoreLayout";

function KitDownload({ product }: { product: (typeof products)[number] }) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setURL] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!file) return;
    const objectURL = URL.createObjectURL(file);
    setURL(objectURL);
    return () => URL.revokeObjectURL(objectURL);
  }, [file]);
  async function prepare() {
    setBusy(true);
    setError("");
    setFile(null);
    setURL("");
    try {
      const response = await axiosClient.get("/payments/product-download", {
        params: { productId: product.id },
        responseType: "blob",
      });
      setFile(new File([response.data], product.filename, { type: "application/zip" }));
    } catch {
      setError("Your files could not be retrieved. Try again or sign in again. You do not need to pay again.");
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    if (!file) return;
    setError("");
    try {
      await navigator.share({ files: [file], title: product.name });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError("Try the Save ZIP link below if the sharing menu is unavailable.");
    }
  }
  return (
    <section className="download-card">
      <img src={product.pictureURL} alt="" width="96" />
      <h2>{product.name}</h2>
      <p>Ready when you are. Prepare your kit, then save it and get started.</p>
      <button className="library-button" disabled={busy} onClick={() => void prepare()}>
        {busy ? "Preparing your kit..." : "Prepare my files"}
      </button>
      {file && url && (
        <div role="status">
          <p>Your kit is ready to save.</p>
          {navigator.canShare?.({ files: [file] }) && (
            <>
              <button className="library-button" onClick={() => void share()}>
                Save or share files
              </button>
              <p>On iPhone, choose Save to Files from the sharing menu.</p>
            </>
          )}
          <a className="library-link" href={url} download={product.filename}>
            Save ZIP
          </a>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

function PurchasedKits() {
  const [access, setAccess] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    Promise.all(
      products.map(async product => {
        const { data } = await axiosClient.get("/payments/product-access", { params: { productId: product.id } });
        return [product.id, data.hasAccess === true] as const;
      })
    )
      .then(results => {
        if (active) setAccess(Object.fromEntries(results));
      })
      .catch(() => {
        if (active) setError("We couldn't check your purchases. Try again in a moment. You do not need to pay again.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  return (
    <>
      <button className="library-button" disabled={busy} onClick={() => setAttempt(value => value + 1)}>
        Check my purchases
      </button>
      {busy && <p role="status">Finding your kits...</p>}
      {error && <p role="alert">{error}</p>}
      {!busy && !error && !Object.values(access).some(Boolean) && (
        <p>
          No verified purchases found yet. Just paid? Check again in a moment, or sign in with the Pi account you used
          to purchase.
        </p>
      )}
      {products
        .filter(product => access[product.id])
        .map(product => (
          <KitDownload key={product.id} product={product} />
        ))}
    </>
  );
}

export default function Downloads() {
  const { user, signIn, isLoading } = useStoreAuth();
  return (
    <main className="download-library">
      <Link to="/">Back to the shop</Link>
      <h1>Your kits. Your next move.</h1>
      <p>Find your purchased resources here, whenever inspiration calls.</p>
      {user ? (
        <PurchasedKits key={user.uid} />
      ) : (
        <>
          <p>Sign in with the Pi account you used at checkout to access your downloads.</p>
          <button className="library-button" disabled={isLoading} onClick={signIn}>
            Sign in to my downloads
          </button>
        </>
      )}
    </main>
  );
}
