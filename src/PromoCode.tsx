import { useEffect, useRef, useState } from 'react';
import { CloseButton } from './CloseButton';

// Promo Code window, opened by the Leaderboard star. The code is redeemed into the player's own save.
export function PromoCode({ onClose, onRedeem, fixed = false }: { onClose: () => void; onRedeem?: (code: string) => Promise<string>; fixed?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { input.current?.focus(); }, []);
  return <div className={fixed ? 'promo-overlay promo-overlay-fixed' : 'promo-overlay'} onPointerDown={event => event.stopPropagation()} onKeyDown={event => {
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
  }}>
    <div className="promo-panel loot-overlay" role="dialog" aria-modal="true" aria-labelledby="promo-title">
      <div className="promo-header"><h2 id="promo-title">Promo Code</h2>
        <CloseButton type="button" className="dialog-close promo-close" aria-label="Close Promo Code" onClick={onClose} />
      </div>
      <div className="loot-content promo-content">
        <form className="loot-redeem" onSubmit={async event => {
          event.preventDefault();
          if (!onRedeem || busy || !code.trim()) return;
          setBusy(true); setMessage(null);
          try { setMessage({ text: await onRedeem(code), ok: true }); setCode(''); }
          catch (error) { setMessage({ text: error instanceof Error ? error.message : 'Unable to redeem promo code', ok: false }); }
          finally { setBusy(false); }
        }}>
          <label className="sr-only" htmlFor="promo-code">Code</label>
          <input ref={input} id="promo-code" value={code} onChange={event => { setCode(event.target.value); setMessage(null); }} maxLength={64} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="Enter code" />
          <button type="submit" className="achievement-collect loot-claim" disabled={!code.trim() || busy || !onRedeem}>Claim</button>
        </form>
        <p role="status" className="promo-message" data-ok={message?.ok || undefined}>{message?.text ?? ''}</p>
      </div>
    </div>
  </div>;
}
