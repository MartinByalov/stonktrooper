import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LEGAL_VERSION, PRIVACY_POLICY, TERMS } from './legal';
import { LegalDocumentView } from './LegalDocumentView';
import { ActionLabel } from './ActionLabel';
import { CloseButton } from './CloseButton';

const STORAGE_KEY = 'cr_legal_accepted';

export const legalAccepted = (): boolean => {
  try { return localStorage.getItem(STORAGE_KEY) === LEGAL_VERSION; } catch { return false; }
};

// First launch (and after the documents change): a full-screen section where the player
// agrees to the Terms and confirms reading the Privacy Policy before playing. Both
// documents open as full-screen sections like About & Help.
export function LegalConsent({ onAccept }: { onAccept: () => void }) {
  const [reading, setReading] = useState<'terms' | 'privacy' | null>(null);
  const focusTarget = useRef<HTMLButtonElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  useEffect(() => { focusTarget.current?.focus(); }, [reading]);
  // Game shortcuts (Space to play, M, N…) stay inactive until the player confirms.
  useEffect(() => {
    const block = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && reading) { setReading(null); }
      if (!screen.current?.contains(event.target as Node) || event.key === 'Escape') { event.stopImmediatePropagation(); event.preventDefault(); }
    };
    window.addEventListener('keydown', block, true);
    return () => window.removeEventListener('keydown', block, true);
  }, [reading]);
  const confirm = () => {
    try { localStorage.setItem(STORAGE_KEY, LEGAL_VERSION); } catch { /* still allow play this session */ }
    onAccept();
  };
  const document = reading === 'terms' ? TERMS : PRIVACY_POLICY;
  const host = window.document.querySelector('.game-app') ?? window.document.body;
  return createPortal(reading
    // A document: full screen, like About & Help.
    ? <div ref={screen} className="site-info-overlay legal-consent fixed inset-0 z-50 flex items-center justify-center" style={{ zIndex: 10001 }}
      onPointerDown={event => event.stopPropagation()}>
      <div role="dialog" aria-modal="true" aria-labelledby="legal-consent-title" className="site-info-dialog legal-consent-dialog w-full max-w-xl max-h-[85dvh] overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl">
        <div className="site-info-header relative flex justify-center items-center min-h-10 mb-4 px-10">
          <h2 id="legal-consent-title" className="site-info-title font-bold text-xl">{document.title}</h2>
          <CloseButton ref={focusTarget} type="button" aria-label={`Close ${document.title}`} onClick={() => setReading(null)} className="dialog-close mobile-dialog-close site-info-close absolute right-0 top-0 p-2 border border-[var(--line)] rounded hover:bg-[var(--alt)]" />
        </div>
        <div className="site-info-content legal-consent-document text-sm leading-relaxed"><LegalDocumentView document={document} /></div>
      </div>
    </div>
    // The confirmation: a framed section over the dimmed Home screen.
    : <div ref={screen} className="legal-consent-backdrop" onPointerDown={event => event.stopPropagation()}>
      <section role="dialog" aria-modal="true" aria-labelledby="legal-consent-title" className="legal-consent-confirm">
        <h2 id="legal-consent-title" className="sr-only">Terms &amp; Privacy</h2>
        <p>To play Stonktrooper, you must agree to the{' '}
          <button type="button" className="legal-consent-link" onClick={() => setReading('terms')}>Terms &amp; Conditions</button>{' '}
          and confirm that you have read the{' '}
          <button type="button" className="legal-consent-link" onClick={() => setReading('privacy')}>Privacy Policy</button>.</p>
        <div className="landing-menu-actions legal-consent-actions">
          <button ref={focusTarget} type="button" onClick={confirm} className="menu-action-button landing-menu-play-button rounded font-bold font-mono-term"><ActionLabel>Confirm</ActionLabel></button>
        </div>
      </section>
    </div>, host);
}
