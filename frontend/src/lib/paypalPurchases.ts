export type SavedPurchase = { id: string; token: string; productId: string };
const key = "ttr-paypal-purchases";
export function savedPurchases(): SavedPurchase[] {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
export function savePurchase(purchase: SavedPurchase) {
  localStorage.setItem(key, JSON.stringify([...savedPurchases().filter(p => p.id !== purchase.id), purchase]));
}
export function purchaseFor(productId: string): SavedPurchase {
  const existing = savedPurchases().find(p => p.productId === productId);
  if (existing) return existing;
  const purchase = { id: crypto.randomUUID(), productId,
    token: Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("") };
  // Save before creating an order. If storage is unavailable, do not start checkout.
  savePurchase(purchase);
  return purchase;
}
