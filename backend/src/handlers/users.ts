import { Router } from "express";

import platformAPIClient from "../services/platformAPIClient";

export default function mountUserEndpoints(router: Router) {
  router.get("/session", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const current = req.session.currentUser;
    if (!current) return res.json({ user: null });
    try {
      const { data } = await platformAPIClient.get("/v2/me", { headers: { Authorization: `Bearer ${current.accessToken}` } });
      if (data.uid !== current.uid) return res.status(401).json({ error: "session_expired" });
      return res.json({ user: { uid: data.uid, username: data.username, roles: Array.isArray(data.roles) ? data.roles : [] } });
    } catch { return res.status(503).json({ error: "session_verification_unavailable" }); }
  });
  // handle the user auth accordingly
  router.post("/signin", async (req, res) => {
    const auth = req.body.authResult;
    const userCollection = req.app.locals.userCollection;

    if (!userCollection) {
      return res.status(503).json({ error: "service_unavailable", message: "Database not ready" });
    }

    try {
      // Verify the user's access token with the /me endpoint:
      const me = await platformAPIClient.get(`/v2/me`, { headers: { Authorization: `Bearer ${auth.accessToken}` } });
      // Pi identity verification succeeded.
    } catch (err) {
      console.error("Pi token verification failed");
      return res.status(401).json({ error: "invalid_token", message: "Invalid access token" });
    }

    try {
      let currentUser = await userCollection.findOne({ uid: auth.user.uid });

      if (currentUser) {
        await userCollection.updateOne(
          {
            _id: currentUser._id,
          },
          {
            $set: {
              accessToken: auth.accessToken,
            },
          },
        );
      } else {
        const insertResult = await userCollection.insertOne({
          username: auth.user.username,
          uid: auth.user.uid,
          roles: auth.user.roles,
          accessToken: auth.accessToken,
        });

        currentUser = await userCollection.findOne({ _id: insertResult.insertedId });
      }

      req.session.currentUser = currentUser;
      if (req.session.currentUser) req.session.currentUser.accessToken = auth.accessToken;
      return res.status(200).json({ message: "User signed in" });
    } catch (err) {
      console.error("Error during signin:", err);
      return res.status(500).json({ error: "internal_error", message: "Failed to sign in" });
    }
  });

  // handle the user auth accordingly
  router.get("/signout", async (req, res) => {
    req.session.currentUser = null;
    return res.status(200).json({ message: "User signed out" });
  });
}
