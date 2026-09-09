import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import type { User } from "../types/pi.ts";

interface HeaderProps {
  onSignIn?: () => void;
  onSignOut?: () => void;
  onSendTestNotification?: () => void;
  user?: User | null;
  isLoading?: boolean;
}

export default function Header({ user, onSignIn, onSignOut, onSendTestNotification, isLoading }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const location = useLocation();
  useEffect(() => { setOpen(false); }, [location]);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  function action(callback?: () => void) { setOpen(false); toggle.current?.focus(); callback?.(); }
  return (
    <header ref={header} className="site-header" onBlur={event => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
    }}>
      <Link to="/" aria-label="TimothyTechRadar home" className="site-logo">
        <img src="/timothytechradar-logo-premium.png" alt="TimothyTechRadar" />
      </Link>
      <div className="site-header-actions">
        <Link className="header-downloads" to="/downloads">My downloads</Link>
        <button ref={toggle} type="button" className="site-menu-toggle" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)}>
          <span aria-hidden="true" className="site-menu-icon">{open ? "×" : "☰"}</span> Menu
        </button>
      </div>
      <nav id={menuId} hidden={!open} className="site-menu" aria-label="Site navigation" onClick={event => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }}>
        <div><h2>Explore</h2>
          <NavLink to="/" end>Home / Shop Kits</NavLink>
          <a href="https://timothytechradar.aibusiness-lab.com/" target="_blank" rel="noopener noreferrer">Shop Tech &amp; Read Reviews <span aria-hidden="true">↗</span><span className="discovery-sr-only"> (opens in a new tab)</span></a>
        </div>
        <div><h2>Free Previews</h2>
          <NavLink to="/preview/ai-productivity">AI Productivity</NavLink>
          <NavLink to="/preview/idea-ignition">Idea Ignition</NavLink>
          <NavLink to="/preview/pi-nft-signal">Pi NFT Signal</NavLink>
        </div>
        <div><h2>Your Purchases</h2>
          {user ? <><span className="site-menu-user">@{user.username}</span><button type="button" disabled={isLoading} onClick={() => action(onSignOut)}>Sign out</button></> : onSignIn ? <button type="button" disabled={isLoading} onClick={() => action(onSignIn)}>Sign in</button> : <Link to="/downloads">Sign in to access purchases</Link>}
          <NavLink to="/downloads">My Downloads</NavLink>
          {onSendTestNotification && user?.roles.includes("core_team") && <button type="button" onClick={() => action(onSendTestNotification)}>Send test notification</button>}
        </div>
        <div><h2>Help &amp; Policies</h2>
          <NavLink to="/help">How to Buy</NavLink>
          <NavLink to="/contact">Contact Support</NavLink>
          <NavLink to="/refunds">Refund Policy</NavLink>
          <NavLink to="/privacy">Privacy</NavLink>
          <NavLink to="/terms">Terms</NavLink>
        </div>
      </nav>
    </header>
  );
}
