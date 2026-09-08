import { useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { IRRA_TOKEN_CANONICAL, usePayments } from "../hooks/usePayments";
import { products } from "../products";
import { useStoreAuth } from "./StoreLayout";

export default function Shop() {
  const { isAuthenticated, requireAuth } = useStoreAuth();
  const navigate = useNavigate();
  const { orderProduct, isLoading } = usePayments({
    isAuthenticated,
    onRequireAuth: requireAuth,
    onPaymentComplete: () => navigate("/downloads"),
  });
  const paymentNetworkLabel = window.location.hostname.startsWith("testnet.") ? "Test-Pi" : "Pi";
  return (
    <main className="storefront">
      {products.map(product => (
        <ProductCard
          key={product.id}
          {...product}
          paymentNetworkLabel={paymentNetworkLabel}
          onClickBuyWithPi={() => orderProduct("Order " + product.name, product.price, { productId: product.id })}
          onClickBuyWithIrra={() =>
            orderProduct("Order " + product.name, product.price, { productId: product.id }, IRRA_TOKEN_CANONICAL)
          }
          disabled={isLoading}
        />
      ))}
    </main>
  );
}
