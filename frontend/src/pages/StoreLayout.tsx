import { Outlet, useOutletContext } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useSession } from "../components/AuthProvider";
import PiBrowserNotice from "../components/PiBrowserNotice";
import { useAuth } from "../hooks/useAuth";
import { axiosClient } from "../lib/axiosClient";

export const useStoreAuth = () => useOutletContext<ReturnType<typeof useAuth>>();

export default function StoreLayout() {
  const auth = useSession();
  return (
    <>
      <Header
        user={auth.user}
        onSignIn={auth.requireAuth}
        onSignOut={auth.signOut}
        isLoading={auth.isLoading}
        onSendTestNotification={() => {
          void axiosClient.post("/notifications/send", {
            notifications: [
              {
                title: "Test Notification",
                body: "This is a test notification",
                user_uid: auth.user?.uid,
                subroute: "/",
              },
            ],
          });
        }}
      />
      {!auth.isAuthenticated && <PiBrowserNotice />}
      <Outlet context={auth} />
      <Footer />
    </>
  );
}
