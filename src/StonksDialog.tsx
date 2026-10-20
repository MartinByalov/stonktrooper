import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { StonkGenerator } from '../stonks/js/stonk-generator.js';

type StonkInfo = ReturnType<StonkGenerator['getStonk']>;

export function StonksDialog({ onClose }: { onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const generator = useRef<StonkGenerator | null>(null);
  const [info, setInfo] = useState<StonkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus();
    return () => { previous?.focus(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    async function generate() {
      try {
        let gen = generator.current;
        if (!gen) {
          gen = new StonkGenerator({ basePath: `${import.meta.env.BASE_URL}stonks` });
          await gen.load();
          if (cancelled) return;
          generator.current = gen;
        }
        const id = gen.randomId();
        const image = document.createElement('canvas');
        await gen.render(id, image, { size: 512 });
        if (cancelled) return;
        const context = canvas.current?.getContext('2d');
        if (!context) throw new Error('Canvas is unavailable.');
        context.clearRect(0, 0, 512, 512);
        context.drawImage(image, 0, 0);
        setInfo(gen.getStonk(id));
      } catch {
        if (!cancelled) setError('Unable to load your Stonk. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void generate();
    return () => { cancelled = true; };
  }, []);

  const golden = info?.traits.some(trait => trait.name.toLowerCase().includes('gold'));
  return <div className="stonks-overlay" onPointerDown={event => event.stopPropagation()} onClick={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <div ref={panel} className="stonks-dialog font-mono-term" role="dialog" aria-modal="true" aria-labelledby="stonks-title" onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const buttons = [...panel.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
        const first = buttons[0], last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <div className="stonks-header">
        <h2 id="stonks-title">The Stonks</h2>
        <button ref={close} type="button" className="stonks-close" aria-label="Close The Stonks" onClick={onClose}><X size={20} aria-hidden="true" /></button>
      </div>
      <div className="stonks-body">
        <div className="stonks-canvas-frame" aria-busy={loading}>
          <canvas ref={canvas} width={512} height={512} role="img" aria-label={info ? `Stonk #${info.id}` : 'Stonk preview'} />
          {loading && <div className="stonks-loading" role="status">Generating your Stonk…</div>}
        </div>
        <div className="stonks-details">
          <h3>{info ? `Stonk #${info.id}` : 'Your Stonk'}</h3>
          {error && <p className="stonks-error" role="alert">{error}</p>}
          {info && <>
            <div className="stonks-pills">
              <span>Rank #{info.rarityRank} / {info.totalSupply}</span>
              <span>Rarity: {Number(info.rarityScore).toFixed(1)}</span>
              {golden && <span className="stonks-golden">Golden Candle (~5%)</span>}
            </div>
            <dl className="stonks-traits">{info.traits.map(trait => <div key={trait.category}>
              <dt>{trait.label || trait.category}</dt><dd>{trait.name || 'None'}</dd>
            </div>)}</dl>
          </>}
          <div className="stonks-actions">
            <button type="button" disabled={loading || !!error || !info} onClick={() => {
              if (!canvas.current || !info) return;
              const link = document.createElement('a');
              link.download = `stonk-${info.id}.png`;
              link.href = canvas.current.toDataURL('image/png');
              link.click();
            }}>Download</button>
          </div>
        </div>
      </div>
    </div>
  </div>;
}