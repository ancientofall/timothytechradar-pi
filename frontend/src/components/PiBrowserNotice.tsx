import { useState } from "react";

export default function PiBrowserNotice() {
  const [message, setMessage] = useState("");
  const address = "https://timothytechradar.com/";
  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setMessage("Address copied. Paste it into Pi Browser's address bar.");
    } catch {
      setMessage("Copy wasn't available. Select and copy the address below.");
    }
  }
  return (
    <section className="pi-browser-notice" aria-label="Purchasing with Pi Browser">
      <p className="product-name">Browse here. Purchase in Pi Browser.</p>
      <h2>Ready to purchase? Open TimothyTechRadar in Pi Browser.</h2>
      <p>Explore the kits and free previews in this browser. To sign in, pay with Pi, and access your purchases, open this website in Pi Browser.</p>
      <div className="pi-browser-actions">
        <button type="button" className="library-button" onClick={copyAddress}>Copy website address</button>
        <input aria-label="Website address to open in Pi Browser" readOnly value={address} onFocus={event => event.currentTarget.select()} />
      </div>
      <p className="pi-copy-status" role="status">{message}</p>
      <details><summary>How to open the shop in Pi Browser</summary>
        <ol><li>Open the Pi Browser app on your phone.</li><li>Paste the website address into its address bar and go to the site.</li><li>Select Sign in, then choose your kit. Find purchases under My downloads.</li></ol>
      </details>
      <p className="pi-browser-caption">Already using Pi Browser? You can sign in here.</p>
    </section>
  );
}
