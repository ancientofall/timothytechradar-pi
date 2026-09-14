import ProductCard from "../components/ProductCard";
import { products } from "../products";
export default function Shop() {
  return (
    <main className="storefront">
      {products.map(product => (
        <ProductCard key={product.id} {...product} showPayments={false} showPayPal={false} />
      ))}
    </main>
  );
}
