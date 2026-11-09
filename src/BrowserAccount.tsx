import { useEffect, useRef, useState } from 'react';
import { workerConfiguration, watchBrowserUser, signInBrowserGoogle, signOutBrowserGoogle, browserAuthError, type BrowserUser } from './browserIdentity';
import { ActionLabel } from './ActionLabel';
import { GoogleGlyph } from './GoogleSignInButton';
import './browserAccount.css';

export function BrowserAccount({ onPlay, starting = false, onUserChange, onNotice, menuOnly = false }: { onPlay?: () => void; starting?: boolean; onUserChange?: (user: BrowserUser | null) => void; onNotice?: (message: string) => void; menuOnly?: boolean }) {
  const [user, setUser] = useState<BrowserUser | null>(null);
  const [loading, setLoading] = useState(workerConfiguration.configured);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // With onNotice the host shows the message in the Live Feed bar; the line below stays for screen readers only.
  useEffect(() => { onNotice?.(error); }, [error, onNotice]);
  const locked = useRef(false);
  useEffect(() => {
    if (!workerConfiguration.configured) return;
    try {
      return watchBrowserUser(user => {
        setUser(user); setLoading(false); onUserChange?.(user);
      }, error => { setError(browserAuthError(error)); setLoading(false); });
    } catch (error) { setError(browserAuthError(error)); setLoading(false); }
  }, [onUserChange]);
  const authenticate = async () => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try {
      if (user) await signOutBrowserGoogle();
      else await signInBrowserGoogle();
    } catch (error) { setError(browserAuthError(error)); }
    finally { locked.current = false; setBusy(false); }
  };
  const label = busy || loading ? 'Please wait…' : user ? 'Sign out' : 'Sign in';
  const status = !workerConfiguration.configured ? 'Google sign-in: Worker API setup required.'
    : user ? `Signed in as ${user.displayName || 'a Google player'}.`
    : 'Sign in with Google to keep your outfit in your Google Drive and take part in Monthly Squeeze.';
  if (menuOnly && user) return null;
  return <>
    {user && onPlay && <button type="button" data-browser-play disabled={starting || busy} aria-busy={starting}
      onClick={onPlay} className="menu-action-button landing-menu-play-button w-full rounded font-bold font-mono-term"
      title="Play locally. Cloud progress is not connected yet."><ActionLabel>Play</ActionLabel></button>}
    <button type="button" data-browser-account aria-label={user ? 'Sign out' : 'Sign in or sign up with Google'}
      title={status} className={user ? 'browser-sign-out' : 'menu-action-button google-sign-in-button w-full rounded border border-[var(--line)] bg-[var(--panel)] text-[var(--text)] font-bold font-mono-term cursor-pointer'}
      disabled={!workerConfiguration.configured || loading || busy} aria-busy={loading || busy}
      onClick={() => void authenticate()}>
      {!user && <GoogleGlyph />}
      <span>{!user && !busy && !loading ? 'Sign in with Google' : label}</span>
    </button>
    <span className="sr-only" role="status">{status}</span>
    {error && <p role="alert" className={onNotice ? 'sr-only' : 'text-xs'}>{error}</p>}
  </>;
}