import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import SignIn from "../components/SignIn";

import { useAuth } from "../hooks/useAuth";
import { IRRA_TOKEN_CANONICAL, usePayments } from "../hooks/usePayments";
import { axiosClient } from "../lib/axiosClient.ts";
import { useCallback, useEffect, useState } from "react";

const Shop = () => {
  const paymentNetworkLabel = window.location.hostname.startsWith("testnet.") ? "Test-Pi" : "Pi";
  const [purchasedProducts, setPurchasedProducts] = useState<Record<string, boolean>>({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const downloadProduct = async (productId: string, filename: string) => {
    setIsDownloading(true);
    setDownloadError("");
    try {
      const response = await axiosClient.get("/payments/product-download", { params: { productId }, responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setDownloadError("Download unavailable. Please sign in and restore your purchase, then try again.");
    } finally {
      setIsDownloading(false);
    }
  };
  const [accessError, setAccessError] = useState("");
  const {
    user,
    isAuthenticated,
    showSignIn,
    signIn,
    signOut,
    closeSignIn,
    requireAuth,
    isLoading: isAuthLoading,
  } = useAuth();

  const checkPurchase = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const productIds = ["ai_productivity_starter_kit_1", "idea_ignition_kit_1"];
      const results = await Promise.all(productIds.map(async (productId) => {
        const { data } = await axiosClient.get("/payments/product-access", { params: { productId } });
        return [productId, data.hasAccess === true] as const;
      }));
      setPurchasedProducts(Object.fromEntries(results));
      setAccessError("");
    } catch {
      setAccessError("Purchase lookup is unavailable. Check that the updated backend is running, then try again.");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setPurchasedProducts({});
    setAccessError("");
    if (isAuthenticated) void checkPurchase();
  }, [isAuthenticated, checkPurchase]);

  const { orderProduct, isLoading } = usePayments({
    isAuthenticated,
    onRequireAuth: requireAuth,
    onPaymentComplete: () => { void checkPurchase(); },
  });

  const onSendTestNotification = () => {
    const notification = {
      title: "Test Notification",
      body: "This is a test notification",
      user_uid: user?.uid,
      subroute: "/shop",
    };
    axiosClient.post("/notifications/send", { notifications: [notification] });
  };

  return (
    <>
      <Header
        user={user}
        onSignIn={signIn}
        onSignOut={signOut}
        onSendTestNotification={onSendTestNotification}
        isLoading={isAuthLoading}
      />

      <ProductCard
  name="AI Productivity Starter Kit"
  description="A practical toolkit for office workers: a quick-start guide, 20 reusable AI prompts, an editable weekly planner, and three worked examples."
      price={0.1}
      pictureURL="/ai-productivity-kit.svg"
      paymentNetworkLabel={paymentNetworkLabel}
  onClickBuyWithPi={() =>
    orderProduct("Order AI Productivity Starter Kit", 0.1, {
      productId: "ai_productivity_starter_kit_1",
    })
  }
  onClickBuyWithIrra={() =>
    orderProduct(
      "Order AI Productivity Starter Kit",
      0.1,
      { productId: "ai_productivity_starter_kit_1" },
      IRRA_TOKEN_CANONICAL
    )
  }
  disabled={isLoading}
      />

      <ProductCard
        name="Idea Ignition Kit"
        description="A creative thinking toolkit with 30 prompts, idea worksheets, a seven-day practice, and a pitch playbook for turning sparks into workable ideas."
        price={0.1}
        pictureURL="/ai-productivity-kit.svg"
        paymentNetworkLabel={paymentNetworkLabel}
        onClickBuyWithPi={() => orderProduct("Order Idea Ignition Kit", 0.1, { productId: "idea_ignition_kit_1" })}
        onClickBuyWithIrra={() => orderProduct("Order Idea Ignition Kit", 0.1, { productId: "idea_ignition_kit_1" }, IRRA_TOKEN_CANONICAL)}
        disabled={isLoading}
      />

      {isAuthenticated && Object.keys(purchasedProducts).length > 0 && (
        <div style={{ margin: 16 }}>
          <button type="button" onClick={() => { void checkPurchase(); }}>Restore my purchase</button>
          {accessError && <p role="status">{accessError}</p>}
        </div>
      )}
      {isAuthenticated && purchasedProducts.ai_productivity_starter_kit_1 && (
        <div style={{ margin: 16, padding: 16, border: "1px solid #5eead4", borderRadius: 8 }}>
          <strong>Your starter kit is ready.</strong>
          <p>Download the files included with your verified {paymentNetworkLabel} purchase.</p>
          <button type="button" disabled={isDownloading} onClick={() => { void downloadProduct("ai_productivity_starter_kit_1", "AI_Productivity_Starter_Kit.zip"); }}>
            {isDownloading ? "Preparing download…" : "Download AI Productivity Starter Kit"}
          </button>
          {downloadError && <p role="alert">{downloadError}</p>}
        </div>
      )}
      {isAuthenticated && purchasedProducts.idea_ignition_kit_1 && (
        <div style={{ margin: 16, padding: 16, border: "1px solid #5eead4", borderRadius: 8 }}>
          <strong>Your Idea Ignition Kit is ready.</strong>
          <p>Download the files included with your verified {paymentNetworkLabel} purchase.</p>
          <button type="button" disabled={isDownloading} onClick={() => { void downloadProduct("idea_ignition_kit_1", "Idea_Ignition_Kit.zip"); }}>
            {isDownloading ? "Preparing download…" : "Download Idea Ignition Kit"}
          </button>
          {downloadError && <p role="alert">{downloadError}</p>}
        </div>
      )}


      {showSignIn && <SignIn onSignIn={signIn} onModalClose={closeSignIn} disabled={isAuthLoading} />}
      <Footer />
    </>
  );
};

export default Shop;
