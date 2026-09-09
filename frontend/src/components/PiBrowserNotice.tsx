import { useId, useState } from "react";

export default function PiBrowserNotice({ signIn = false }: { signIn?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const instructionsId = useId();
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
    <section className={`pi-browser-notice${signIn ? "" : " discovery-panel"}`} aria-label={signIn ? "Purchasing with Pi Browser" : "Explore TimothyTechRadar"}>
      {signIn ? <h2>Ready to purchase? Open TimothyTechRadar in Pi Browser.</h2> : <>
        <div className="discovery-intro">
          <h2>Discover your next advantage.</h2>
          <p>Explore digital kits here, or find tech products and reviews on our companion site.</p>
        </div>
        <div className="discovery-actions">
          <a className="discovery-link" href="https://timothytechradar.aibusiness-lab.com/" target="_blank" rel="noopener noreferrer">Shop Tech &amp; Read Reviews <span aria-hidden="true">↗</span><span className="discovery-sr-only"> (opens in a new tab)</span></a>
          <button type="button" className="discovery-toggle" aria-expanded={expanded} aria-controls={instructionsId} onClick={() => setExpanded(!expanded)}>Buying a kit with Pi? <span aria-hidden="true">{expanded ? "−" : "+"}</span></button>
        </div>
      </>}
      <div id={instructionsId} hidden={!signIn && !expanded} className={signIn ? "" : "discovery-instructions"}>
      <p>Explore the kits and free previews in this browser. To sign in, pay with Pi, and access your purchases, open this website in Pi Browser.</p>
      <div className="pi-browser-actions">
        <button type="button" className="library-button" onClick={copyAddress}>Copy website address</button>
        <input aria-label="Website address to open in Pi Browser" readOnly value={address} onFocus={event => event.currentTarget.select()} />
      </div>
      <p className="pi-copy-status" role="status">{message}</p>
      <div>
        <ol><li>Open the Pi Browser app on your phone.</li><li>Paste the website address into its address bar and go to the site.</li><li>Select Sign in, then choose your kit. Find purchases under My downloads.</li></ol>
      </div>
      <p className="pi-browser-caption">Already using Pi Browser? You can sign in here.</p>
      </div>
    </section>
  );
}
