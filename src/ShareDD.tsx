// Browser game module for ShareDD.
import { useEffect, useRef, useState } from 'react';
import { Check, Share2, X } from 'lucide-react';
import { drawShareCard, formatShareScore, shareCardBackground, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from './shareCard';
import { resultUrl, socialLinks } from './shareLinks';
import { SocialIcon } from './SocialIcon';
import { copyText } from './copyText';

export function ShareDD({ score, theme, demo = false, onClose }: { score: number; theme: 'light' | 'dark'; demo?: boolean; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState('');
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
    closeButton.current?.focus();
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
      drawShareCard(ctx, score, background);
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
  }, [score, theme]);
  const share = async () => {
    if (sharing) return;
    setError('');
    setMessage('');
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
    setMessage('');
    setSharing(true);
    try {
      window.open(destination.href, '_blank', 'noopener,noreferrer');
      await copyText(url, navigator, document, dialog.current ?? document.body);
      setMessage(`${platform} opened with your score link. The link was also copied.`);
    } catch (cause) {
      setMessage('');
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
        setError(`Unable to prepare the ${platform} share link.`);
      }
    } finally { setSharing(false); }
  };
  return <div className="share-dd-overlay fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onPointerDown={event => event.stopPropagation()}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="share-dd-title" className="share-dd-dialog w-full max-w-3xl max-h-[90dvh] overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-2xl" onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key === 'Tab') {
        const buttons = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]');
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}>
      <div className="relative flex justify-center items-center min-h-10 mb-3 px-10">
        <h2 id="share-dd-title" className="text-xl font-black font-mono-term text-[var(--green)]">SCORE</h2>
        <button ref={closeButton} type="button" aria-label="Close Share DD" title="Close" onClick={onClose} className="dialog-close absolute right-0 top-0 p-2 rounded border border-[var(--line)] hover:bg-[var(--alt)] cursor-pointer"><X className="w-5 h-5" aria-hidden="true" /></button>
      </div>
      {demo && <p className="mb-3 text-center text-xs font-bold text-[var(--muted)]">DEMO — simulated score, not a game result</p>}
      <canvas ref={canvas} width={SHARE_CARD_WIDTH} height={SHARE_CARD_HEIGHT} role="img" aria-label={`Stonktrooper best score: ${formatShareScore(score)}`} className="share-dd-canvas block w-full h-auto rounded-lg" />
      <div className="share-dd-actions flex flex-wrap justify-center gap-3 mt-4">
        <button type="button" aria-label={copied ? 'Score link copied' : 'Copy score link'} title={copied ? 'Copied!' : 'Copy score link'} disabled={sharing} onClick={() => { void share(); }} className="flex items-center justify-center gap-2 rounded-lg bg-[#08795c] text-white p-3 font-bold disabled:opacity-40">
          {copied ? <Check className="w-5 h-5" aria-hidden="true" /> : <Share2 className="w-5 h-5" aria-hidden="true" />}
        </button>
        {socialLinks(score).map(platform => <button key={platform.name} type="button" disabled={sharing} onClick={() => { void shareSocial(platform.name); }} aria-label={`Share score link to ${platform.name}`} title={`Share score on ${platform.name}`} className="flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--alt)] hover:brightness-125 p-3 disabled:opacity-40 cursor-pointer"><SocialIcon name={platform.name} /></button>)}
      </div>
      {message && <p role="status" className="share-dd-status mt-3 text-center text-sm text-[var(--green)]">{message}</p>}
      {error && <p role="status" className="share-dd-status mt-3 text-center text-sm text-[var(--red)]">{error}</p>}
    </div>
  </div>;
}