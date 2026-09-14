import { createContext, useContext } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import SignIn from "./SignIn";

const AuthContext = createContext<ReturnType<typeof useAuth> | null>(null);
export function useSession() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthProvider is required");
  return auth;
}
export default function AuthProvider() {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>
    <Outlet />
    {auth.showSignIn && <SignIn onSignIn={auth.signIn} onModalClose={auth.closeSignIn} disabled={auth.isLoading} error={auth.authError} />}
  </AuthContext.Provider>;
}
