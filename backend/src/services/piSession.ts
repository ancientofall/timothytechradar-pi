import { RequestHandler } from "express";
import "../types/session";
// Retire legacy identities and enforce an absolute session lifetime.
export const validatePiSession: RequestHandler = (req, _res, next) => {
  if (req.session.piAuthVersion !== 1 ||
      !req.session.piAuthenticatedUntil || req.session.piAuthenticatedUntil <= Date.now()) {
    req.session.currentUser = null;
  }
  next();
};
