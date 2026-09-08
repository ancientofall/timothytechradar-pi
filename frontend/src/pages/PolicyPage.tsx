import type { ReactNode } from "react";

export type PolicyKind = "help" | "refunds" | "privacy" | "terms";

const content: Record<PolicyKind, { title: string; body: ReactNode }> = {
  help: {
    title: "Purchases and download help",
    body: <>
      <ol>
        <li>Open the storefront in Pi Browser and sign in with your Pi account.</li>
        <li>Review the product description, price, and refund policy before choosing Pay with Pi. Check the amount and network in your wallet before approving.</li>
        <li>After payment is verified, My downloads opens. Choose Prepare my files beside your purchased kit, then Save ZIP or Save or share files.</li>
        <li>Save the ZIP file using your browser's download or share options, then extract it to open the included documents.</li>
      </ol>
      <p>Already purchased? Open My downloads and sign in with the same Pi account. Choose Check my purchases if your kit is not shown. If a payment appears stuck, contact support before paying again.</p>
      <p>For help, email your Pi username, product name, transaction identifier if available, and a description of the issue. Never send wallet passphrases, passwords, or access tokens.</p>
    </>,
  },
  refunds: {
    title: "Refund policy",
    body: <>
      <p>TimothyTechRadar offers refunds for verified duplicate charges and faulty or undeliverable digital files. We do not offer change-of-mind refunds except where applicable consumer law requires them.</p>
      <h2>Duplicate charges</h2>
      <p>If you were charged more than once for the same intended purchase, contact us so we can verify the payments and refund the duplicate charge.</p>
      <h2>Faulty or undeliverable files</h2>
      <p>If a file is corrupt, does not work as described, or cannot be delivered, contact support. We will investigate and offer a working replacement, delivery assistance, or a refund as appropriate. This does not delay or limit any remedy you are entitled to by law.</p>
      <h2>Requesting assistance</h2>
      <p>Email jonhad2@live.com with your Pi username, product name, transaction identifier if available, and a description of the problem. Refund requests are reviewed manually; submitting a request does not automatically issue a refund.</p>
      <h2>Your consumer rights</h2>
      <p>This policy does not exclude or restrict applicable consumer rights, including any mandatory cancellation, withdrawal, repair, replacement, price reduction, or refund rights. Downloading a file does not by itself waive those rights.</p>
      <p>Purchases made on external websites are handled by those sellers under their own policies.</p>
    </>,
  },
  privacy: {
    title: "Privacy notice",
    body: <>
      <p>This notice covers the TimothyTechRadar Pi storefront. Contact jonhad2@live.com with privacy questions or requests.</p>
      <h2>Information used by the storefront</h2>
      <p>When you sign in, the app processes your Pi username, account identifier, roles, authentication token, and session information. Purchase records include product and payment identifiers, transaction identifiers, and payment status. Hosting logs can contain IP addresses, requested pages, timestamps, and errors. If you email support, we receive your email address and the information you provide.</p>
      <h2>Why we use it</h2>
      <p>We use this information to authenticate you, verify payments, deliver downloads, restore purchase access, troubleshoot problems, and respond to support requests. Session cookies support sign-in where your browser permits them.</p>
      <h2>Services and storage</h2>
      <p>Pi Network processes authentication and payments. The storefront and its database run on DigitalOcean hosting. Database backups are also stored encrypted in Microsoft OneDrive. Support correspondence is handled through Microsoft email. Blockchain transaction records may be publicly accessible and cannot be erased by this storefront.</p>
      <h2>Retention and requests</h2>
      <p>Purchase records support later download access. Automated database backups are configured for approximately 14 days of local retention and 30 days in OneDrive. These backup periods do not describe the retention of live purchase records or support email.</p>
      <p>You may contact us to request access, correction, or deletion of your information. We will review requests under applicable law; some records may need to be retained for transaction verification or legal obligations.</p>
      <h2>External links</h2>
      <p>External shops and linked websites have their own privacy practices. Review their notices before submitting information or purchasing.</p>
    </>,
  },
  terms: {
    title: "Storefront terms",
    body: <>
      <p>These terms describe purchases of digital resources from TimothyTechRadar. Review the product description, price, and refund policy before purchasing.</p>
      <h2>Payments and delivery</h2>
      <p>Confirm the amount and network displayed in Pi Wallet before approving payment. Downloads become available after the storefront verifies the payment. Use the same Pi account to restore purchase access. Testnet purchases use Test-Pi and are separate from Mainnet purchases.</p>
      <h2>Digital resources</h2>
      <p>Resources provide general educational and productivity guidance. Check AI-generated outputs before relying on them. Purchasing a resource does not guarantee income, business results, or a particular productivity improvement. Follow any usage license included with the product and respect third-party intellectual property.</p>
      <h2>Support and refunds</h2>
      <p>Contact jonhad2@live.com for purchase or delivery issues. Our <a href="/refunds">refund policy</a> covers duplicate charges and faulty or undeliverable files, subject to applicable consumer rights.</p>
      <h2>External sellers</h2>
      <p>Purchases on linked external websites are separate transactions with those sellers. Review their pricing, delivery terms, and policies.</p>
      <h2>Consumer protections</h2>
      <p>Nothing in these terms limits rights or remedies that cannot lawfully be excluded.</p>
    </>,
  },
};

export default function PolicyPage({ kind }: { kind: PolicyKind }) {
  const page = content[kind];
  return <main style={{ maxWidth: 780, margin: "0 auto", padding: "32px 24px", background: "#f8fafc", color: "#0f172a", minHeight: "100vh", lineHeight: 1.7 }}>
    <a href="/">&larr; Back to TimothyTechRadar</a>
    <h1 style={{ marginTop: 24 }}>{page.title}</h1>
    {page.body}
    <p><a href="mailto:jonhad2@live.com">Contact support: jonhad2@live.com</a></p>
  </main>;
}
