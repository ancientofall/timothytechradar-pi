import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { axiosClient } from "../lib/axiosClient";

type Challenge = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};
const turnstile = () => (window as unknown as { turnstile?: Challenge }).turnstile;
const reasons = [
  "Purchase question",
  "Download problem",
  "Duplicate charge",
  "Faulty or undeliverable files",
  "Privacy request",
  "General question",
];

export default function Contact() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [available, setAvailable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const script = document.createElement("script");
    setAvailable(false);
    setError("");
    async function start() {
      try {
        const { data } = await axiosClient.get("/contact/config");
        if (cancelled) return;
        function render() {
          if (cancelled || !container.current || !turnstile()) return;
          widget.current = turnstile()!.render(container.current, {
            sitekey: data.siteKey,
            action: "contact",
            callback: (value: string) => {
              setToken(value);
              setError("");
            },
            "expired-callback": () => setToken(""),
            "error-callback": () => {
              setToken("");
              setError("The security check could not load. Please retry below.");
            },
          });
          setAvailable(true);
        }
        if (turnstile()) render();
        else {
          script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
          script.async = true;
          script.onload = render;
          script.onerror = () => {
            if (!cancelled) setError("The security check could not load. Please retry below.");
          };
          document.head.appendChild(script);
        }
      } catch {
        if (!cancelled) setError("Contact is temporarily unavailable. Please try again later.");
      }
    }
    void start();
    return () => {
      cancelled = true;
      if (widget.current !== null) turnstile()?.remove(widget.current);
      widget.current = null;
      script.remove();
    };
  }, [attempt]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !token) return;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const { data } = await axiosClient.post(
        "/contact",
        { email: email.trim(), reason, message, website, token },
        { timeout: 35000 }
      );
      setStatus(data.message);
      setMessage("");
      setEmail("");
      setReason("");
    } catch {
      setError(
        "We couldn't confirm submission. Please try again later. If it already went through, you may receive a reply."
      );
    } finally {
      setBusy(false);
      setToken("");
      if (widget.current !== null) turnstile()?.reset(widget.current);
    }
  }
  return (
    <main className="download-library">
      <h1>Questions? Let's connect.</h1>
      <p>Choose a topic, share the details, and we'll reply to the email you provide.</p>
      <form className="contact-form download-card" onSubmit={event => void submit(event)}>
        <label htmlFor="contact-email">Your email</label>
        <input
          id="contact-email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={event => setEmail(event.target.value)}
        />
        <label htmlFor="contact-reason">How can we help?</label>
        <select id="contact-reason" required value={reason} onChange={event => setReason(event.target.value)}>
          <option value="">Select a reason</option>
          {reasons.map(value => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <label htmlFor="contact-message">Your message</label>
        <textarea
          id="contact-message"
          required
          minLength={10}
          maxLength={5000}
          rows={7}
          value={message}
          onChange={event => setMessage(event.target.value)}
          aria-describedby="contact-note"
        />
        <p id="contact-note">
          For order help, include the kit name and transaction identifier if available. Never include wallet
          passphrases, passwords, or access tokens.
        </p>
        <div style={{ position: "absolute", left: "-10000px" }} aria-hidden="true">
          <label>
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={event => setWebsite(event.target.value)}
            />
          </label>
        </div>
        <div ref={container} />
        <p>
          We use your email and message to respond to your request. <Link to="/privacy">Privacy notice</Link>
        </p>
        <button className="library-button" disabled={busy || !available || !token}>
          {busy ? "Sending your message..." : "Send message"}
        </button>
        {status && <p role="status">{status}</p>}
        {error && (
          <div role="alert">
            <p>{error}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setToken("");
                setAttempt(value => value + 1);
              }}
            >
              Retry security check
            </button>
          </div>
        )}
      </form>
    </main>
  );
}
