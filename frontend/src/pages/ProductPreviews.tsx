import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { axiosClient } from "../lib/axiosClient";
import { purchaseFor, savedPurchases } from "../lib/paypalPurchases";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { products } from "../products";
import { usePayments } from "../hooks/usePayments";
import { useStoreAuth } from "./StoreLayout";
export default function ProductPreviews() {
  const { isAuthenticated, requireAuth, authReady, piSessionHint } = useStoreAuth();
  const navigate = useNavigate();
  const [paypal, setPaypal] = useState({ enabled: false, mode: "sandbox", piSignedIn: false });
  const [configReady, setConfigReady] = useState(false);
  const showPayPal = authReady && configReady && !isAuthenticated && !piSessionHint && !paypal.piSignedIn;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setConfigReady(false);
    axiosClient.get("/paypal/config").then(({ data }) => {
      if (active && typeof data.piSignedIn === "boolean") { setPaypal(data); setConfigReady(true); }
    }).catch(() => { /* Keep USD hidden when session status cannot be checked. */ });
    return () => { active = false; };
  }, [isAuthenticated, piSessionHint]);
  async function checkout(productId: string) {
    if (!showPayPal) return;
    setBusy(true); setError("");
    try {
      const { data } = await axiosClient.post("/paypal/orders", purchaseFor(productId), { timeout: 60000 });
      window.location.assign(data.approvalURL);
    } catch (error: unknown) {
      setError(error instanceof Error && "response" in error ?
        (error as { response?: { data?: { error?: string } } }).response?.data?.error || "Checkout is unavailable. Try again or check your saved purchase below." :
        "Please allow browser storage to keep your purchase access, then try again.");
    } finally { setBusy(false); }
  }
  const { orderProduct, isLoading } = usePayments({ isAuthenticated, onRequireAuth: requireAuth,
    onPaymentComplete: () => navigate("/downloads") });
  return <main className="storefront">
    <section style={{ padding: 24, maxWidth: 960, margin: "auto" }}>
      <h1>Explore your next kit</h1>
      <p>Read three free sample pages from each publication, then choose the full kit.</p>
      {showPayPal && <p>{!paypal.enabled ? "PayPal checkout is not available yet." : paypal.mode === "sandbox" ? "PayPal is in sandbox testing mode. No real money is charged." : "Use PayPal for USD checkout. Keep the private recovery link provided after checkout for future downloads."} Pi purchases are available through Pi Browser.</p>}
      {error && <p role="alert">{error}</p>}
      {savedPurchases().length > 0 && <details><summary>Your saved PayPal purchases</summary>
        <ul>{savedPurchases().map(p => <li key={p.id}><Link to={`/checkout/paypal?id=${p.id}`}>{products.find(product => product.id === p.productId)?.name || "View purchase"}</Link></li>)}</ul>
      </details>}
    </section>
    {products.map(product => <section key={product.id} id={product.previewSlug} style={{ scrollMarginTop: 24 }}>
      <ProductCard {...product} showPayments showPayPal={showPayPal}
        onClickPayPal={() => checkout(product.id)} paypalDisabled={!paypal.enabled || busy || isLoading}
        paypalLabel={busy ? "Please wait…" : paypal.mode === "sandbox" && paypal.enabled ? "Test PayPal checkout" : "PayPal checkout"}
        paymentNetworkLabel={window.location.hostname.startsWith("testnet.") ? "Test-Pi" : "Pi"}
        onClickBuyWithPi={() => orderProduct("Order " + product.name, product.price, { productId: product.id })}
        disabled={isLoading || busy} />
    </section>)}
  </main>;
}
