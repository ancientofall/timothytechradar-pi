import { Router } from "express";
import axios from "axios";
import { exchangePiToken } from "../services/appStudioAuth";
import "../types/session";
export default function mountUserEndpoints(router: Router) {
  router.use((_req, res, next) => { res.setHeader("Cache-Control", "private, no-store"); next(); });
  router.get("/session", (req, res) => {
    const user = req.session.currentUser;
    return res.json({ user: user ? { uid: user.uid, username: user.username, roles: user.roles } : null });
  });
  router.post("/signin", async (req, res) => {
    const accessToken = req.body?.accessToken;
    if (typeof accessToken !== "string" || !accessToken.trim() || accessToken.length > 16384) {
      return res.status(400).json({ error: "access_token_required" });
    }
    const users = req.app.locals.userCollection;
    if (!users) return res.status(503).json({ error: "service_unavailable" });
    let identity;
    try { identity = await exchangePiToken(accessToken); }
    catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      return res.status(status === 401 || status === 403 ? 401 : 503).json({
        error: status === 401 || status === 403 ? "invalid_token" : "authentication_unavailable",
      });
    }
    try {
      // Legacy roles were browser-supplied; do not grant them to verified sessions.
      await users.updateOne({ uid: identity.uid }, {
        $set: identity, $unset: { accessToken: "" },
      }, { upsert: true });
      await new Promise<void>((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
      req.session.currentUser = identity;
      req.session.piAuthVersion = 1;
      req.session.piAuthenticatedUntil = Date.now() + 24 * 60 * 60 * 1000;
      await new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
      return res.json({ user: identity });
    } catch {
      req.session.currentUser = null;
      return res.status(500).json({ error: "signin_failed" });
    }
  });
  router.get("/signout", (req, res) => {
    req.session.destroy(error => {
      if (error) return res.status(503).json({ error: "signout_failed" });
      res.clearCookie("connect.sid", { secure: true, httpOnly: true, sameSite: "none", path: "/" });
      return res.json({ message: "User signed out" });
    });
  });
}
