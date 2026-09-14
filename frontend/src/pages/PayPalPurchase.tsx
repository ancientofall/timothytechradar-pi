import { useState } from "react";
import { Link } from "react-router-dom";
import { axiosClient } from "../lib/axiosClient";
import { savedPurchases, savePurchase } from "../lib/paypalPurchases";

export default function PayPalPurchase() {
  const [purchase] = useState(() => {
    const id = new URLSearchParams(location.search).get("id");
    const token = new URLSearchParams(location.hash.slice(1)).get("key");
    if (id && token && /^[a-f0-9]{64}$/.test(token)) {
      const restored = { id, token, productId: "recovered" };
      try { savePurchase(restored); } catch { /* In-memory proof still allows a download. */ }
      history.replaceState(null, "", location.pathname + location.search);
      return restored;
    }
    return savedPurchases().find(p => p.id === id);
  });
  const [receipt, setReceipt] = useState<{ name: string; filename: string; reference: string; mode: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function check() {
    setBusy(true); setMessage("");
    try { const { data } = await axiosClient.post("/paypal/complete", purchase, { timeout: 90000 }); setReceipt(data); }
    catch (error: unknown) { setMessage(error instanceof Error && "response" in error ?
      (error as { response?: { data?: { error?: string } } }).response?.data?.error || "Payment could not be checked. Try again; do not pay twice." : "Payment could not be checked. Try again."); }
    finally { setBusy(false); }
  }
  async function download() {
    if (!receipt) return;
    setBusy(true); setMessage("");
    try {
      const { data } = await axiosClient.post("/paypal/download", purchase, { responseType: "blob", timeout: 90000 });
      const url = URL.createObjectURL(data); const link = document.createElement("a");
      link.href = url; link.download = receipt.filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch { setMessage("Download unavailable. Check your payment again or contact support. Do not pay again."); }
    finally { setBusy(false); }
  }
  return <main style={{ maxWidth: 760, margin: "32px auto", padding: 24, background: "white", borderRadius: 18 }}>
    <h1>Your PayPal purchase</h1>
    {new URLSearchParams(location.search).has("cancelled") && <p>You returned from checkout without completing it. You can return to the kits or check a payment you already approved.</p>}
    {!purchase ? <p>Open this page in the browser you used at checkout, or use your saved recovery link. If you cannot find it, contact support with your PayPal transaction reference.</p> : <>
      <p>After approving your payment in PayPal, select “Confirm payment” to finish your purchase and unlock your files. If a connection drops, check again here instead of paying again.</p>
      <button onClick={check} disabled={busy}>{busy ? "Please wait…" : "Confirm payment"}</button>
      {receipt && <><h2>{receipt.name}</h2><p>{receipt.mode === "sandbox" ? "Sandbox test payment confirmed." : "Payment confirmed."} Reference: {receipt.reference}</p>
        <button onClick={download} disabled={busy}>Download your kit</button></>}
      <p><a href={`${location.origin}/checkout/paypal?id=${purchase.id}#key=${purchase.token}`}>Your private recovery link</a> — bookmark this link or copy and save it somewhere private. Anyone with it can access this purchase. It is not emailed automatically.</p>
    </>}
    {message && <p role="alert">{message}</p>}
    <p><Link to="/previews">Back to the kits</Link> · <Link to="/contact">Contact support</Link></p>
  </main>;
}
