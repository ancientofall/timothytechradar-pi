import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { User } from "../types/pi.ts";

interface HeaderProps {
  onSignIn: () => void;
  onSignOut: () => void;
  onSendTestNotification?: () => void;
  user: User | null;
  isLoading?: boolean;
}

const headerStyle: CSSProperties = {
  padding: "8px 16px",
  backgroundColor: "#08142f",
  color: "white",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const logoStyle: CSSProperties = {
  display: "block",
  width: 286,
  maxWidth: "58vw",
  height: "auto",
};

const userSectionStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const Header = ({ user, onSignIn, onSignOut, onSendTestNotification, isLoading }: HeaderProps) => {
  return (
    <header style={headerStyle}>
      <Link to="/" aria-label="TimothyTechRadar home">
        <img src="/timothytechradar-logo-premium.png" alt="TimothyTechRadar" style={logoStyle} />
      </Link>

      <div style={userSectionStyle}>
        <Link to="/downloads" style={{ color: "#a7eee3", fontSize: 14, fontWeight: 700 }}>
          My downloads
        </Link>
        {user ? (
          <>
            <span>@{user.username}</span>
            <button type="button" onClick={onSignOut} disabled={isLoading}>
              Sign out
            </button>
            {onSendTestNotification && user.roles.includes("core_team") && (
              <button onClick={onSendTestNotification}>Send Test Notification to yourself</button>
            )}
          </>
        ) : (
          <button onClick={onSignIn} disabled={isLoading}>
            Sign in
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
