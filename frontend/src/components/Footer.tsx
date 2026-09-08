import type { CSSProperties } from "react";

const footerStyle: CSSProperties = {
  marginTop: 32,
  padding: "24px 16px 32px",
  borderTop: "1px solid #d1d5db",
  textAlign: "center",
  color: "#374151",
};

const linkStyle: CSSProperties = {
  display: "inline-block",
  marginTop: 12,
  color: "#4f46e5",
  fontWeight: 700,
  textDecoration: "none",
};

const Footer = () => (
  <footer style={footerStyle}>
    <p>
      Discover the latest tech, read product reviews, and shop your next upgrade on our TimothyTechRadar website.
    </p>
    <a
      href="https://timothytechradar.aibusiness-lab.com/"
      target="_blank"
      rel="noreferrer"
      style={linkStyle}
    >
      Visit TimothyTechRadar &mdash; Shop Tech &amp; Read Reviews &rarr;
    </a>
    <div style={{ fontSize: 14, lineHeight: 1.6, marginTop: 24 }}>
      <p>Questions about your purchase? <a href="/contact">Contact support</a></p>
      <nav aria-label="Help and policies" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 20px" }}>
        <a href="/help">How to buy</a>
        <a href="/refunds">Refund policy</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </nav>
      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 18 }}>© {new Date().getFullYear()} TimothyTechRadar. All rights reserved.</p>
    </div>
  </footer>
);

export default Footer;
