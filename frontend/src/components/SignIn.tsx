import { useEffect, useRef } from "react";
import PiBrowserNotice from "./PiBrowserNotice";
interface SignInProps { onSignIn: () => void; onModalClose: () => void; disabled?: boolean; error?: string; }
export default function SignIn({ onSignIn, onModalClose, disabled, error }: SignInProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return (
    <dialog ref={dialog} className="pi-signin-dialog" aria-label="Sign in with Pi Browser" onCancel={onModalClose}>
      <PiBrowserNotice signIn />
      {error && <p role="alert">{error}</p>}
      <div className="pi-browser-actions">
        <button type="button" className="library-button" onClick={onSignIn} disabled={disabled}>{disabled ? "Waiting for Pi Browser..." : "I'm in Pi Browser - sign in"}</button>
        <button type="button" className="library-button" onClick={onModalClose}>Keep browsing</button>
      </div>
    </dialog>
  );
}
