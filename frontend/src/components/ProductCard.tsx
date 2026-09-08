import type { CSSProperties } from "react";

interface ProductCardProps {
  name: string;
  description: string;
  headline: string;
  accent: string;
  benefits: { title: string; text: string }[];
  price: number;
  pictureURL: string;
  paymentNetworkLabel: string;
  onClickBuyWithPi: () => void;
  onClickBuyWithIrra: () => void;
  disabled?: boolean;
}

const containerStyle: CSSProperties = {
  margin: "18px 16px",
  padding: 16,
  border: "1px solid #d7deea",
  borderRadius: 18,
  background: "rgba(255, 255, 255, 0.84)",
  boxShadow: "0 10px 28px rgba(11, 23, 53, 0.08)",
};

const imageStyle: CSSProperties = {
  width: "100%",
  objectFit: "cover",
};

const priceSectionStyle: CSSProperties = {
  textAlign: "center",
  marginBottom: 8,
};

const paymentOptionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  flex: 1,
  minWidth: 0,
  padding: "12px 10px",
  border: "1px solid #d7deea",
  borderRadius: 14,
  background: "#ffffff",
};

const paymentActionsStyle: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "stretch",
  gap: 10,
  marginTop: 8,
};

const primaryButtonStyle: CSSProperties = {
  width: "100%",
  border: 0,
  borderRadius: 999,
  padding: "10px 14px",
  color: "#ffffff",
  background: "linear-gradient(135deg, #182b58, #2f66c7)",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  color: "#102047",
  background: "#e8f7f5",
  border: "1px solid #8bd9d0",
};

const irraCaptionStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: "#666",
};

const ProductCard = ({
  name,
  description,
  headline,
  accent,
  benefits,
  price,
  pictureURL,
  paymentNetworkLabel,
  onClickBuyWithPi,
  onClickBuyWithIrra,
  disabled,
}: ProductCardProps) => {
  return (
    <div style={containerStyle}>
      <div className="product-story">
        <div className="product-art">
          <img style={imageStyle} src={pictureURL} alt={name} />
        </div>

        <div className="product-copy">
          <p className="product-name" style={{ color: accent }}>
            {name}
          </p>
          <h2>{headline}</h2>
          <p className="product-intro">{description}</p>
          <ul className="product-benefits">
            {benefits.map(benefit => (
              <li key={benefit.title} style={{ borderLeftColor: accent }}>
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div style={priceSectionStyle}>
        <div style={paymentActionsStyle}>
          <div style={paymentOptionStyle}>
            <strong style={{ color: "#182b58", fontSize: 16 }}>
              {price} {paymentNetworkLabel}
            </strong>
            <button type="button" style={primaryButtonStyle} onClick={onClickBuyWithPi} disabled={disabled}>
              Pay with Pi
            </button>
          </div>
          <div style={paymentOptionStyle}>
            <strong style={{ color: "#182b58", fontSize: 16 }}>{price} IRRA</strong>
            <button type="button" style={secondaryButtonStyle} onClick={onClickBuyWithIrra} disabled={disabled}>
              Pay with IRRA
            </button>
            <p style={irraCaptionStyle}>IRRA prices don't follow actual price, it's set for demo purpose</p>
          </div>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.5 }}>
          Digital download. Refunds for duplicate charges and faulty or undeliverable files, subject to applicable
          consumer rights. <a href="/refunds">Refund policy</a> · <a href="/terms">Terms</a>
        </p>
      </div>
    </div>
  );
};

export default ProductCard;
