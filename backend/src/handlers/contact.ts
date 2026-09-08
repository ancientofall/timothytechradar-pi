import { Router, json } from "express";
import axios from "axios";
import cors from "cors";
import { createHmac } from "crypto";
import { Collection } from "mongodb";

export const reasons = ["Purchase question", "Download problem", "Duplicate charge", "Faulty or undeliverable files", "Privacy request", "General question"];
export function validMessage(body: any): boolean {
  return !!body && typeof body.email === "string" && body.email.length <= 254 &&
    /^[^\s<>@,;\r\n]+@[^\s<>@,;\r\n]+\.[^\s<>@,;\r\n]+$/.test(body.email) &&
    reasons.includes(body.reason) && typeof body.message === "string" &&
    body.message.trim().length >= 10 && body.message.length <= 5000 &&
    !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(body.message) &&
    typeof body.token === "string" && body.token.length > 0 && body.token.length <= 2048;
}

type Bucket = { _id: string; count: number; expiresAt: Date };
export default function contactRouter(frontendURL: string) {
  const router = Router();
  router.use(cors({ origin: new URL(frontendURL).origin, credentials: true }));
  const ready = () => ["CONTACT_TO", "CONTACT_FROM", "BREVO_API_KEY", "TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY", "CONTACT_RATE_SECRET"].every(key => !!process.env[key]);
  router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  router.get("/config", (_req, res) => {
    if (!ready()) return res.status(503).json({ error: "Contact is temporarily unavailable. Please try again later." });
    return res.json({ siteKey: process.env.TURNSTILE_SITE_KEY });
  });
  router.post("/", json({ limit: "12kb" }), async (req, res) => {
    if (!ready()) return res.status(503).json({ error: "Contact is temporarily unavailable. Please try again later." });
    if (req.get("origin") !== new URL(frontendURL).origin) return res.status(403).json({ error: "Please send your message from our contact page." });
    if (!validMessage(req.body) || req.body.website) return res.status(400).json({ error: "Check your email, reason and message, and complete the security check." });
    try {
      const buckets = req.app.locals.contactLimits as Collection<Bucket>;
      // Shared database counters survive restarts and do not trust forwarded IP headers.
      const allow = async (key: string, maximum: number, period: number) => {
        const window = Math.floor(Date.now() / period);
        const id = createHmac("sha256", process.env.CONTACT_RATE_SECRET!).update(key + ":" + window).digest("hex");
        const result = await buckets.findOneAndUpdate({ _id: id }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 2) * period) } }, { upsert: true, returnDocument: "after" });
        return !!result && result.count <= maximum;
      };
      if (!await allow("global", 60, 3600000)) return res.status(429).json({ error: "The contact form is busy. Please try again later." });
      const verification = await axios.post("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        secret: process.env.TURNSTILE_SECRET_KEY, response: req.body.token,
      }, { timeout: 10000, maxRedirects: 0 });
      if (verification.data.success !== true || verification.data.hostname !== new URL(frontendURL).hostname || verification.data.action !== "contact") {
        return res.status(400).json({ error: "Please complete a fresh security check and try again." });
      }
      if (!await allow("daily", 100, 86400000)) return res.status(429).json({ error: "The contact form has reached today's limit. Please try again tomorrow." });
      if (!await allow("email:" + req.body.email.toLowerCase(), 5, 86400000)) return res.status(429).json({ error: "You have reached today's message limit. Please try again tomorrow." });
      const sent = await axios.post("https://api.brevo.com/v3/smtp/email", {
        sender: { email: process.env.CONTACT_FROM, name: "TimothyTechRadar Contact" }, to: [{ email: process.env.CONTACT_TO }], replyTo: { email: req.body.email },
        subject: "TimothyTechRadar contact: " + req.body.reason,
        textContent: "Reason: " + req.body.reason + "\nReply email: " + req.body.email + "\n\n" + req.body.message.trim(),
      }, { headers: { "api-key": process.env.BREVO_API_KEY! }, timeout: 15000, maxRedirects: 0 });
      if (!sent.data.messageId) throw new Error("No delivery receipt");
      return res.json({ message: "Your message has been submitted. Watch your inbox for our reply." });
    } catch {
      // Do not log request bodies, email addresses, credentials, or provider responses.
      return res.status(503).json({ error: "We couldn't confirm submission. Please try again later; if it already went through, you may receive a reply." });
    }
  });
  router.use((error: any, _req: any, res: any, _next: any) => {
    res.status(error.status === 413 ? 413 : 400).json({ error: "The form could not be processed. Please check the message length and try again." });
  });
  return router;
}

