// Browser game module for ShareDD.
import { useEffect, useRef, useState } from 'react';
import { Check, Share2, X } from 'lucide-react';
import { drawShareCard, formatShareScore, shareCardBackground, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from './shareCard';
import { resultUrl, socialLinks } from './shareLinks';
import { SocialIcon } from './SocialIcon';
import { copyText } from './copyText';

export function ShareDD({ score, theme, scoreTheme = theme, demo = false, onClose }: { score: number; theme: 'light' | 'dark'; scoreTheme?: 'light' | 'dark'; demo?: boolean; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = resultUrl(score);
  useEffect(() => {
    setCopied(false);
  }, [score]);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const firstVisibleButton = dialog.current?.querySelectorAll<HTMLButtonElement>('button');
    Array.from(firstVisibleButton ?? []).find(button => button.getClientRects().length > 0)?.focus();
    return () => { previous?.focus(); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setFile(null);
    setError('');
    const background = new Image();
    const render = () => {
      if (cancelled) return;
      const ctx = canvas.current?.getContext('2d');
      if (!ctx || !canvas.current) { setError('Unable to generate the share image.'); return; }
      // Geometry follows the artwork theme, not the theme of the finished run.
      drawShareCard(ctx, score, background, theme);
      // Ignore transparent rows below the shoes for display only; the exported
      // card retains the complete native image and its transparency.
      const pixels = ctx.getImageData(0, 0, background.naturalWidth, background.naturalHeight).data;
      let bottom = background.naturalHeight - 1;
      while (bottom > 0) {
        let occupied = false;
        for (let x = 0; x < background.naturalWidth; x++) {
          if (pixels[(bottom * background.naturalWidth + x) * 4 + 3] > 16) { occupied = true; break; }
        }
        if (occupied) break;
        bottom--;
      }
      dialog.current?.style.setProperty('--share-art-ratio', String(background.naturalWidth / (bottom + 1)));
      canvas.current.toBlob(blob => {
        if (cancelled) return;
        if (blob) setFile(new File([blob], 'stonktrooper-dd.png', { type: 'image/png' }));
        else setError('Unable to generate the share image.');
      }, 'image/png');
    };
    background.onload = render;
    background.onerror = () => { if (!cancelled) setError('Unable to load the share image background.'); };
    background.src = shareCardBackground(theme, import.meta.env.BASE_URL);
    return () => { cancelled = true; };
  }, [score, theme, scoreTheme]);
  const share = async () => {
    if (sharing) return;
    setError('');
    setCopied(false);
    setSharing(true);
    try {
      await copyText(url, navigator, document, dialog.current ?? document.body);
      setCopied(true);
    } catch {
      setError('Unable to copy the score link. Check clipboard permissions and try again.');
    } finally { setSharing(false); }
  };
  const shareSocial = async (platform: string) => {
    const destination = socialLinks(score).find(item => item.name === platform);
    if (!destination || sharing) return;
    setError('');
    setSharing(true);
    try {
      window.open(destination.href, '_blank', 'noopener,noreferrer');
    } catch {
      setError(`Unable to open the ${platform} share link.`);
    } finally { setSharing(false); }
  };
  return <div className="share-dd-overlay fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onPointerDown={event => event.stopPropagation()}>
    <div ref={dialog} role="dialog" aria-modal="false" aria-label={demo ? 'Share score demo — simulated result' : 'Share score'} className="share-dd-dialog" onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key === 'Tab') {
        if (!window.matchMedia('(pointer: coarse) and (orientation: portrait)').matches) return;
        const buttons = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]') ?? [])
          .filter(button => button.getClientRects().length > 0);
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}>
      <button ref={closeButton} type="button" aria-label="Close Share DD" title="Close" onClick={onClose} className="dialog-close mobile-dialog-close share-dd-close p-2 rounded border border-[var(--line)] hover:bg-[var(--alt)] cursor-pointer"><X className="w-5 h-5" aria-hidden="true" /></button>
      <div className="share-dd-image">
        <canvas ref={canvas} width={SHARE_CARD_WIDTH} height={SHARE_CARD_HEIGHT} role="img" aria-label={`Stonktrooper best score: ${formatShareScore(score)}`} className="share-dd-canvas" />
      </div>
      <div className="share-dd-actions">
        {socialLinks(score).map(platform => <button key={platform.name} type="button" disabled={sharing} onClick={() => { void shareSocial(platform.name); }} aria-label={`Share score link to ${platform.name}`} title={`Share score on ${platform.name}`} className="share-dd-social-button flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--alt)] p-3 disabled:opacity-40 cursor-pointer"><SocialIcon name={platform.name} /></button>)}
        <button type="button" aria-label={error || (copied ? 'Score link copied' : 'Copy score link')} title={error || (copied ? 'Copied!' : 'Copy score link')} disabled={sharing} onClick={() => { void share(); }} className="share-dd-copy flex items-center justify-center gap-2 rounded-lg p-3 font-bold disabled:opacity-40">
          {copied ? <Check className="w-5 h-5" aria-hidden="true" /> : <Share2 className="w-5 h-5" aria-hidden="true" />}
        </button>
      </div>
    </div>
  </div>;
}