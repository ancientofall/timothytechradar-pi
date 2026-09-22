import { createHmac, timingSafeEqual } from "crypto";
import { RequestHandler } from "express";
import { SessionData } from "express-session";
import env from "../environments";
import "../types/session";

const signature = (id: string) => createHmac("sha256", env.session_secret).update(`pi-session-v1:${id}`).digest("hex");
export const piSessionToken = (id: string) => `${id}.${signature(id)}`;

// Both transports reference the same revocable server session. Never accept a Pi access token here.
export const validatePiSession: RequestHandler = async (req, res, next) => {
  const authorization = req.get("authorization");
  if (authorization) {
    const match = /^Bearer ([A-Za-z0-9_-]{16,128})\.([a-f0-9]{64})$/.exec(authorization);
    if (!match || !timingSafeEqual(Buffer.from(match[2], "hex"), Buffer.from(signature(match[1]), "hex"))) {
      return res.status(401).json({ error: "invalid_session" });
    }
    try {
      const stored = await new Promise<SessionData | null | undefined>((resolve, reject) => req.sessionStore.get(match[1], (error, data) => error ? reject(error) : resolve(data)));
      if (!stored?.currentUser || stored.piAuthVersion !== 1 || !stored.piAuthenticatedUntil || stored.piAuthenticatedUntil <= Date.now()) {
        return res.status(401).json({ error: "session_expired" });
      }
      req.sessionID = match[1];
      // express-session's nested Express types differ from the app's Express types.
      req.sessionStore.createSession(req as unknown as Parameters<typeof req.sessionStore.createSession>[0], stored);
    } catch {
      return res.status(503).json({ error: "session_unavailable" });
    }
  }
  if (req.session.piAuthVersion !== 1 ||
      !req.session.piAuthenticatedUntil || req.session.piAuthenticatedUntil <= Date.now()) {
    req.session.currentUser = null;
  }
  next();
};
