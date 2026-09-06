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
      Stay ahead of the curve - browse the latest AI and tech products, discover what stands out, and purchase your next smart upgrade in just a few clicks.
    </p>
    <a
      href="https://timothytechradar.aibusiness-lab.com/"
      target="_blank"
      rel="noreferrer"
      style={linkStyle}
    >
      Explore TimothyTechRadar AI Business &rarr;
    </a>
  </footer>
);

export default Footer;
