import { useCallback, useEffect, useRef, useState } from "react";
import { axiosClient } from "../lib/axiosClient";
import { getPiSdk } from "../lib/piSdk";
import type { AuthResult, PaymentDTO, User } from "../types/pi";

export const useAuth = () => {
  const signingIn = useRef(false);
  const pendingPayments = useRef<PaymentDTO[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [piSessionHint, setPiSessionHint] = useState(() => {
    try { return sessionStorage.getItem("ttr-pi-signed-in") === "true"; } catch { return false; }
  });
  const [user, setUser] = useState<User | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  useEffect(() => {
    let active = true;
    axiosClient.get("/user/session").then(({ data }) => {
      if (!active) return;
      setUser(data.user || null);
      if (data.user) {
        setPiSessionHint(true);
        try { sessionStorage.setItem("ttr-pi-signed-in", "true"); } catch { /* Cookies still restore the session. */ }
      }
    }).catch(() => { /* Do not treat failed restoration as confirmed sign-out. */ })
      .finally(() => { if (active) setAuthReady(true); });
    return () => { active = false; };
  }, []);

  const onIncompletePaymentFound = useCallback(async (payment: PaymentDTO) => {
    if (signingIn.current) { pendingPayments.current.push(payment); return; }
    try {
      await axiosClient.post("/payments/incomplete", { payment });
    } catch (err) {
      console.error("Error handling incomplete payment:", err);
    }
  }, []);

  const signInUser = useCallback(async (authResult: AuthResult) => {
    try {
      const { data } = await axiosClient.post("/user/signin", { accessToken: authResult.accessToken });
      setUser(data.user);
      setPiSessionHint(true);
      try { sessionStorage.setItem("ttr-pi-signed-in", "true"); } catch { /* Navigation retains in-memory auth. */ }
      setShowSignIn(false);
      for (const payment of pendingPayments.current.splice(0)) {
        await axiosClient.post("/payments/incomplete", { payment }).catch(() => { /* Retry through Pi on next sign-in. */ });
      }
    } catch (err) {
      console.error("Sign-in failed");
      setAuthError("We couldn't finish signing in. Please try again in Pi Browser.");
    }
  }, []);

  const signIn = useCallback(async () => {
    if (signingIn.current) return;
    signingIn.current = true;
    pendingPayments.current = [];
    setAuthError("");
    setIsLoading(true);
    try {
      const pi = await getPiSdk();
      const authResult = await pi.authenticate(["username"], onIncompletePaymentFound);
      await signInUser(authResult);
    } catch (err) {
      console.error("Pi authentication did not complete");
      setAuthError("Sign-in didn't complete. Open this website in Pi Browser and try again.");
    } finally {
      signingIn.current = false;
      pendingPayments.current = [];
      setIsLoading(false);
    }
  }, [onIncompletePaymentFound, signInUser]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await axiosClient.get("/user/signout");
      delete axiosClient.defaults.headers.common.Authorization;
      setUser(null);
      setPiSessionHint(false);
      try { sessionStorage.removeItem("ttr-pi-signed-in"); } catch { /* No browser storage available. */ }
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const closeSignIn = useCallback(() => {
    setShowSignIn(false);
  }, []);

  return {
    authReady,
    piSessionHint,
    user,
    isAuthenticated: Boolean(user),
    showSignIn,
    signIn,
    signOut,
    closeSignIn,
    requireAuth: () => setShowSignIn(true),
    isLoading: isLoading || !authReady,
    authError,
  };
};
