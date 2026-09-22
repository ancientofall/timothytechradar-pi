import path from "path";
import { Router } from "express";
import platformAPIClient from "../services/platformAPIClient";
import "../types/session";

export default function mountPaymentsEndpoints(router: Router) {
  const products: Record<string, { file: string; download: string; price: number; name: string }> = {
    ai_productivity_starter_kit_1: {
      file: "AI_Productivity_Starter_Kit.zip",
      download: "AI_Productivity_Starter_Kit.zip",
      price: 3, name: "AI Productivity Starter Kit",
    },
    idea_ignition_kit_1: {
      file: "Idea_Ignition_Kit_All_PDFs.zip",
      download: "Idea_Ignition_Kit.zip",
      price: 5, name: "Idea Ignition Kit",
    },
    pi_nft_signal_field_guide_1: {
      file: "Pi_NFT_Signal_Field_Guide.zip",
      download: "Pi_NFT_Signal_Field_Guide.zip",
      price: 10, name: "Pi NFT Signal Field Guide",
    },
  };

  router.use((req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    if (!req.session.currentUser) return res.status(401).json({ error: "Sign in with Pi first." });
    next();
  });

  router.get(["/kit-access", "/kit-download", "/product-access", "/product-download"], async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    if (!req.session.currentUser) return res.status(401).json({ error: "unauthorized" });
    const productId = typeof req.query.productId === "string"
      ? req.query.productId
      : "ai_productivity_starter_kit_1";
    const product = Object.prototype.hasOwnProperty.call(products, productId) ? products[productId] : undefined;
    if (!product) return res.status(400).json({ error: "unknown_product" });
    try {
      const orders = await req.app.locals.orderCollection.find({
        user: req.session.currentUser.uid,
        product_id: productId,
        paid: true,
      }).toArray();
      for (const order of orders) {
        const { data } = await platformAPIClient.get(`/v2/payments/${order.pi_payment_id}`);
        if (data.user_uid === req.session.currentUser.uid &&
            data.metadata?.productId === productId &&
            data.status?.developer_completed && data.status?.transaction_verified &&
            !data.status?.cancelled && !data.status?.user_cancelled) {
          if (req.path === "/kit-download" || req.path === "/product-download") {
            return res.download(path.resolve(__dirname, `../../private/${product.file}`), product.download);
          }
          return res.json({ hasAccess: true });
        }
      }
      if (req.path === "/kit-download" || req.path === "/product-download") return res.status(403).json({ error: "Purchase required" });
      return res.json({ hasAccess: false });
    } catch {
      return res.status(502).json({ error: "Could not verify purchase. Please try again." });
    }
  });
  class PaymentError extends Error {
    constructor(public status: number, message: string) { super(message); Object.setPrototypeOf(this, PaymentError.prototype); }
  }
  const validId = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(value);
  const completed = (p: any) => p.status?.developer_completed === true && p.status?.transaction_verified === true && p.transaction?.verified === true;
  function validate(p: any, id: string, uid: string, order?: any) {
    const productId = p.metadata?.productId;
    const product = typeof productId === "string" && Object.prototype.hasOwnProperty.call(products, productId) ? products[productId] : undefined;
    if (p.identifier !== id || p.user_uid !== uid || p.direction !== "user_to_app" || !product ||
        p.status?.cancelled || p.status?.user_cancelled || p.token?.canonical || p.tokenCanonical) {
      throw new PaymentError(400, "Invalid or cancelled Pi payment.");
    }
    // Recorded approval terms survive future price changes; old paid downloads remain accessible above.
    const price = order?.amount ?? product.price;
    const memo = order?.memo ?? `Order ${product.name}`;
    if (p.amount !== price || p.memo !== memo ||
        (order && (order.user !== uid || order.product_id !== productId))) {
      throw new PaymentError(400, "Payment details do not match this kit.");
    }
    return { productId, product };
  }
  async function fetchPayment(id: string) {
    return (await platformAPIClient.get(`/v2/payments/${encodeURIComponent(id)}`)).data;
  }
  async function remember(orders: any, p: any) {
    // A deterministic Mongo _id makes concurrent retries create only one new order.
    const existing = await orders.findOne({ pi_payment_id: p.identifier });
    if (existing) return existing;
    const record = { pi_payment_id: p.identifier, product_id: p.metadata.productId,
      user: p.user_uid, amount: p.amount, memo: p.memo, paid: false, cancelled: false,
      created_at: new Date() };
    try { await orders.updateOne({ _id: `pi:${p.identifier}` }, { $setOnInsert: record }, { upsert: true }); }
    catch (error: any) { if (error.code !== 11000) throw error; }
    return await orders.findOne({ pi_payment_id: p.identifier });
  }
  for (const action of ["approve", "complete", "incomplete", "cancelled_payment"]) {
    router.post(`/${action}`, async (req, res) => {
      const id = req.body?.paymentId;
      if (!validId(id)) return res.status(400).json({ error: "Invalid payment reference." });
      if (action === "complete" && !validId(req.body?.txid)) return res.status(400).json({ error: "Invalid transaction reference." });
      try {
        const orders = req.app.locals.orderCollection;
        if (!orders) throw new PaymentError(503, "Payment storage is unavailable. Try again later.");
        const uid = req.session.currentUser!.uid;
        let payment = await fetchPayment(id);
        let order = await orders.findOne({ pi_payment_id: id });
        if (action === "cancelled_payment") {
          if (payment.identifier !== id || payment.user_uid !== uid || payment.direction !== "user_to_app") throw new PaymentError(403, "Payment does not belong to this account.");
          if (!payment.status?.cancelled && !payment.status?.user_cancelled) throw new PaymentError(409, "Pi has not confirmed cancellation.");
          await orders.updateOne({ pi_payment_id: id, user: uid, paid: false }, { $set: { cancelled: true } });
          return res.json({ cancelled: true });
        }
        validate(payment, id, uid, order);
        order = await remember(orders, payment);
        if (action === "approve") {
          if (!payment.status?.developer_approved) {
            try { await platformAPIClient.post(`/v2/payments/${encodeURIComponent(id)}/approve`); }
            catch (error) {
              payment = await fetchPayment(id);
              validate(payment, id, uid, order);
              if (!payment.status?.developer_approved) throw error;
            }
          }
          return res.json({ approved: true });
        }
        const txid = action === "incomplete" ? payment.transaction?.txid : req.body.txid;
        if (!validId(txid) || (payment.transaction?.txid && payment.transaction.txid !== txid)) {
          throw new PaymentError(409, "Transaction is not ready or does not match. Do not pay again.");
        }
        if (!completed(payment)) {
          try { await platformAPIClient.post(`/v2/payments/${encodeURIComponent(id)}/complete`, { txid }); }
          catch (error) {
            // Recover a lost response only if the platform independently confirms completion.
            payment = await fetchPayment(id);
            if (!completed(payment)) throw error;
          }
          payment = await fetchPayment(id);
        }
        validate(payment, id, uid, order);
        if (!completed(payment) || payment.transaction.txid !== txid) throw new PaymentError(409, "Pi has not confirmed payment yet. Do not pay again.");
        await orders.updateOne({ _id: order._id, user: uid }, { $set: { paid: true, txid, cancelled: false, completed_at: new Date() } });
        return res.json({ completed: true, productId: payment.metadata.productId });
      } catch (error) {
        return res.status(error instanceof PaymentError ? error.status : 502).json({
          error: error instanceof PaymentError ? error.message : "Pi payment verification is unavailable. Retry verification; do not pay again.",
        });
      }
    });
  }
}
