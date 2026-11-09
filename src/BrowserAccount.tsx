import { useEffect, useRef, useState } from 'react';
import { workerConfiguration, watchBrowserUser, signInBrowserGoogle, signOutBrowserGoogle, browserAuthError, type BrowserUser } from './browserIdentity';
import { ActionLabel } from './ActionLabel';
import './browserAccount.css';

export function BrowserAccount({ onPlay, starting = false, onUserChange, menuOnly = false }: { onPlay?: () => void; starting?: boolean; onUserChange?: (user: BrowserUser | null) => void; menuOnly?: boolean }) {
  const [user, setUser] = useState<BrowserUser | null>(null);
  const [loading, setLoading] = useState(workerConfiguration.configured);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
      {!user && <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>}
      <span>{!user && !busy && !loading ? 'Sign in / Sign up' : label}</span>
    </button>
    <span className="sr-only" role="status">{status}</span>
    {error && <p role="alert" className="text-xs">{error}</p>}
  </>;
}