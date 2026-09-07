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
    <section aria-label="Customer support" style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 20 }}>Need help with your purchase or download?</h2>
      <p>Email us with your Pi username and a description of the issue.</p>
      <a href="mailto:jonhad2@live.com?subject=TimothyTechRadar%20support" style={linkStyle}>
        Contact support: jonhad2@live.com
      </a>
      <p style={{ fontSize: 14 }}>Never include your wallet passphrase, password, or access tokens.</p>
    </section>
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
