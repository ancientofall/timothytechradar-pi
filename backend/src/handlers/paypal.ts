import axios from "axios";
import { createHash, timingSafeEqual } from "crypto";
import { Router } from "express";
import path from "path";
import fs from "fs";
import "../types/session";

export const usdProducts: Record<string, { amount: string; name: string; file: string; download: string }> = {
  ai_productivity_starter_kit_1: { amount: "9.99", name: "AI Productivity Starter Kit", file: "AI_Productivity_Starter_Kit.zip", download: "AI_Productivity_Starter_Kit.zip" },
  idea_ignition_kit_1: { amount: "14.99", name: "Idea Ignition Kit", file: "Idea_Ignition_Kit_All_PDFs.zip", download: "Idea_Ignition_Kit.zip" },
  pi_nft_signal_field_guide_1: { amount: "12.99", name: "Pi NFT Signal Field Guide", file: "Pi_NFT_Signal_Field_Guide.zip", download: "Pi_NFT_Signal_Field_Guide.zip" },
};
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export function validProof(token: unknown, hash: string): boolean {
  return typeof token === "string" && /^[a-f0-9]{64}$/.test(token) &&
    /^[a-f0-9]{64}$/.test(hash) && timingSafeEqual(Buffer.from(digest(token), "hex"), Buffer.from(hash, "hex"));
}
export function validateOrder(remote: any, local: any, merchant: string): void {
  const unit = remote.purchase_units?.[0];
  if (remote.id !== local.paypalId || remote.intent !== "CAPTURE" || remote.purchase_units?.length !== 1 ||
      unit.reference_id !== local._id || unit.custom_id !== local.productId ||
      unit.amount?.currency_code !== "USD" || unit.amount?.value !== local.amount ||
      unit.payee?.merchant_id !== merchant) throw new Error("Payment details did not match");
}
export function validateCapture(capture: any, local: any): void {
  if (capture.status !== "COMPLETED" || capture.amount?.currency_code !== "USD" ||
      capture.amount?.value !== local.amount || !capture.id) throw new Error("Payment is not complete");
}

export default function paypalRouter(frontend: string) {
  const router = Router();
  const mode = process.env.PAYPAL_ENV || "sandbox";
  const apiBase = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const merchant = process.env.PAYPAL_MERCHANT_ID || "";
  const enabled = () => process.env.PAYPAL_ENABLED === "true" && ["live", "sandbox"].includes(mode) &&
    Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && merchant) &&
    (mode !== "live" || frontend.startsWith("https://"));
  async function api(method: "GET" | "POST", url: string, data?: any, requestId?: string) {
    const auth = await axios.post(apiBase + "/v1/oauth2/token", "grant_type=client_credentials", {
      auth: { username: process.env.PAYPAL_CLIENT_ID || "", password: process.env.PAYPAL_CLIENT_SECRET || "" },
      headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000,
    });
    return (await axios.request({ method, url: apiBase + url, data, timeout: 20000,
      headers: { Authorization: "Bearer " + auth.data.access_token, "Content-Type": "application/json",
        ...(requestId ? { "PayPal-Request-Id": requestId } : {}) },
    })).data;
  }
  router.use((req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    if (req.method === "POST" && req.get("origin") !== new URL(frontend).origin)
      return res.status(403).json({ error: "Please use the website to manage your purchase." });
    next();
  });
  router.get("/config", (req, res) => res.json({ enabled: enabled(), mode,
    piSignedIn: Boolean(req.session.currentUser || req.get("authorization")) }));
  router.use(async (req, res, next) => {
    if (!enabled()) return res.status(503).json({ error: "PayPal checkout is not available yet." });
    // Durable per-client limit; only trust the immediate peer (not arbitrary forwarded headers).
    try {
      const window = Math.floor(Date.now() / 60000);
      const key = digest(`paypal:${req.socket.remoteAddress}:${window}`);
      const limit = await req.app.locals.contactLimits.findOneAndUpdate({ _id: key }, {
        $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 120000) },
      }, { upsert: true, returnDocument: "after" });
      if (limit.count > 120) return res.status(429).json({ error: "Please wait a minute and try again." });
      next();
    } catch { res.status(503).json({ error: "Checkout is temporarily unavailable." }); }
  });
  router.post("/orders", async (req, res) => {
    if (req.session.currentUser || req.get("authorization")) return res.status(403).json({ error: "Use Pi checkout while signed in with Pi." });
    const { id, token, productId } = req.body || {};
    const product = typeof productId === "string" && Object.prototype.hasOwnProperty.call(usdProducts, productId) ? usdProducts[productId] : null;
    if (!product || typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id) || typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
      return res.status(400).json({ error: "Invalid checkout request." });
    if (!fs.existsSync(path.resolve(__dirname, "../../private", product.file))) return res.status(503).json({ error: "This publication is temporarily unavailable." });
    try {
      const orders = req.app.locals.paypalOrders;
      await orders.updateOne({ _id: id }, { $setOnInsert: { productId, amount: product.amount, tokenHash: digest(token), mode, createdAt: new Date() } }, { upsert: true });
      const local = await orders.findOne({ _id: id });
      if (!validProof(token, local.tokenHash) || local.productId !== productId || local.mode !== mode) return res.status(403).json({ error: "Invalid checkout request." });
      const remote = local.paypalId ? await api("GET", "/v2/checkout/orders/" + local.paypalId) : await api("POST", "/v2/checkout/orders", {
        intent: "CAPTURE", purchase_units: [{ reference_id: id, custom_id: productId, description: product.name,
          payee: { merchant_id: merchant }, amount: { currency_code: "USD", value: local.amount } }],
        payment_source: { paypal: { experience_context: { brand_name: "TimothyTechRadar", shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW", return_url: `${frontend.replace(/\/$/, "")}/checkout/paypal?id=${id}`,
          cancel_url: `${frontend.replace(/\/$/, "")}/checkout/paypal?id=${id}&cancelled=1` } } },
      }, id);
      await orders.updateOne({ _id: id }, { $set: { paypalId: remote.id } });
      const approval = remote.links?.find((link: any) => ["payer-action", "approve"].includes(link.rel))?.href;
      if (!approval) return res.status(409).json({ error: "This checkout already exists. Open your saved purchase to check its status." });
      const url = new URL(approval);
      if (url.protocol !== "https:" || url.hostname !== (mode === "live" ? "www.paypal.com" : "www.sandbox.paypal.com")) throw new Error("Invalid approval URL");
      res.json({ approvalURL: approval });
    } catch { res.status(502).json({ error: "Checkout could not start. Retry this purchase; do not create a second payment." }); }
  });
  router.post(["/complete", "/download"], async (req, res) => {
    const { id, token } = req.body || {};
    if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id)) return res.status(400).json({ error: "Invalid purchase reference." });
    try {
      const orders = req.app.locals.paypalOrders;
      const local = await orders.findOne({ _id: id });
      if (!local || !validProof(token, local.tokenHash) || local.mode !== mode) return res.status(403).json({ error: "Open this purchase in the browser used at checkout or use your saved recovery link." });
      if (!local.paypalId) return res.status(409).json({ error: "Checkout has not started. Return to the kit to retry." });
      let remote = await api("GET", "/v2/checkout/orders/" + local.paypalId);
      validateOrder(remote, local, merchant);
      // A stable key and a fresh lookup recover safely from interrupted or repeated requests.
      if (req.path === "/complete" && remote.status === "APPROVED") {
        await api("POST", `/v2/checkout/orders/${local.paypalId}/capture`, {}, local._id);
        remote = await api("GET", "/v2/checkout/orders/" + local.paypalId);
        validateOrder(remote, local, merchant);
      }
      const captures = remote.purchase_units[0].payments?.captures;
      if (remote.status !== "COMPLETED" || captures?.length !== 1) return res.status(409).json({ error: "Payment is not complete yet. If you approved it, check again shortly; do not pay again." });
      // Always fetch the current capture, including for repeat downloads (refunds revoke access).
      const capture = await api("GET", "/v2/payments/captures/" + captures[0].id);
      validateCapture(capture, local);
      if (capture.supplementary_data?.related_ids?.order_id !== local.paypalId) throw new Error("Capture order mismatch");
      await orders.updateOne({ _id: id }, { $set: { captureId: capture.id, paid: true, verifiedAt: new Date() } });
      const product = usdProducts[local.productId];
      if (req.path === "/download") return res.download(path.resolve(__dirname, "../../private", product.file), product.download);
      res.json({ paid: true, name: product.name, filename: product.download, reference: local.paypalId, mode });
    } catch { res.status(502).json({ error: "We could not confirm a completed payment. Try checking again. If this continues, contact support with your PayPal reference; do not pay again." }); }
  });
  return router;
}
