import { Link, useParams } from "react-router-dom";
import { products } from "../products";
import previewText from "../previewText.json";
import Header from "../components/Header";

export default function Preview() {
  const { slug } = useParams();
  const product = products.find(item => item.previewSlug === slug);
  if (!product) return <main className="download-library"><h1>Preview not found</h1><Link to="/">Back to shop</Link></main>;
  const texts = previewText[product.previewSlug as keyof typeof previewText];
  return (
    <div className="preview-view">
      <Header />
      <main className="preview-content">
        <p className="product-name">Free three-page preview</p>
        <h1>{product.name}</h1>
        <p>Explore the cover, introduction, and opening lesson. Scroll to see all three pages, or jump to a page below.</p>
        <nav className="preview-navigation" aria-label="Preview pages">
          {[1, 2, 3].map(page => <a key={page} href={`#sample-${page}`}>Page {page}</a>)}
          <a href={product.previewPdfURL} download>Download PDF</a>
        </nav>
        {[1, 2, 3].map(page => (
          <section key={page} id={`sample-${page}`} className="preview-sheet" aria-labelledby={`sample-title-${page}`}>
            <h2 id={`sample-title-${page}`}>Page {page} of 3 · {['Cover', 'Introduction', 'Opening lesson'][page - 1]}</h2>
            <div className="preview-page-image">
              <img src={`/previews/${product.previewSlug}-page-${page}.jpg`} width="1224" height="1584" alt={`${product.name}, sample page ${page}. Full text is available below.`} />
              <Link className="preview-page-home" to="/" aria-label={`TimothyTechRadar logo on page ${page}: back to shop`} />
            </div>
            <details className="preview-readable"><summary>Read page text</summary><div>{texts[page - 1]}</div></details>
          </section>
        ))}
        <div className="preview-return"><h2>Ready for the full kit?</h2><p>{product.headline}</p><Link className="library-link" to="/">Back to shop · {product.price} Pi</Link></div>
      </main>
    </div>
  );
}
