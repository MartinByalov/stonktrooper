import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AssetPreview } from './AssetPreview';
import { drawPickupAsset } from './assetRenderer';

export function SettingsDiamond({ theme, animationsEnabled }: { theme: 'light' | 'dark'; animationsEnabled: boolean }) {
  const [phase, setPhase] = useState<'idle' | 'holding' | 'falling' | 'dropped'>('idle');
  const pointer = useRef({ x: 0, y: 0 });
  const floating = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const diamond = useRef<HTMLCanvasElement>(null);
  const rotationStarted = useRef<number | null>(null);
  const active = phase === 'holding' || phase === 'falling';

  useEffect(() => {
    if (!active) return;
    const move = (event: PointerEvent) => { pointer.current = { x: event.clientX, y: event.clientY }; };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, [active]);

  useEffect(() => {
    if (phase !== 'holding') return;
    const timer = window.setTimeout(() => setPhase('falling'), 5000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let started: number | undefined;
    const origin = { ...pointer.current };
    const reduced = !animationsEnabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const draw = (now: number) => {
      started ??= now;
      const point = phase === 'holding' ? pointer.current : origin;
      const x = Math.max(32, Math.min(window.innerWidth - 32, point.x));
      const top = Math.max(0, point.y - 80);
      const progress = Math.min(1, (now - started) / (reduced ? 500 : 1100));
      const y = phase === 'falling' ? top + (window.innerHeight + 80 - top) * progress * progress : top;
      const ctx = diamond.current?.getContext('2d');
      if (ctx) {
        rotationStarted.current ??= now;
        const elapsed = reduced ? 0 : now - rotationStarted.current;
        ctx.clearRect(0, 0, 160, 160);
        ctx.save();
        ctx.translate(80, 80);
        // Preserve the pickup's faceted 3D spin, then tumble on release.
        if (phase === 'falling' && !reduced) ctx.rotate(progress * Math.PI * 4);
        ctx.scale(3.8, 3.8);
        drawPickupAsset(ctx, { type: 'diamond', x: 0, y: 0, taken: false }, 0, 0, elapsed * 0.06);
        ctx.restore();
      }
      if (floating.current) {
        floating.current.style.transform = `translate3d(${x - 32}px, ${y}px, 0)`;
        floating.current.style.visibility = phase === 'falling' && reduced ? 'hidden' : 'visible';
      }
      if (label.current) {
        const labelX = Math.max(64, Math.min(window.innerWidth - 64, pointer.current.x));
        label.current.style.transform = `translate3d(${labelX - 64}px, ${Math.max(0, pointer.current.y - 38)}px, 0)`;
      }
      if (phase === 'falling' && progress === 1) { rotationStarted.current = null; setPhase('dropped'); return; }
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [active, phase, animationsEnabled]);

  return <>
    {phase !== 'idle' ? <span className="settings-diamond-message" role="status">{phase === 'holding' ? "Don't drop it!" : '😤'}</span> :
      <button type="button" className="settings-diamond-button" aria-label="Pick up the diamond" onClick={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        pointer.current = event.detail === 0 ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: event.clientX, y: event.clientY };
        rotationStarted.current = null;
        setPhase('holding');
      }}><AssetPreview asset="diamond" theme={theme} /></button>}
    {active && createPortal(<div className="settings-diamond-effect" data-phase={phase} data-theme={theme} aria-hidden="true">
      <div ref={floating} className="settings-diamond-floating"><canvas ref={diamond} width={160} height={160} className="settings-diamond-bare" /></div>
      {phase === 'falling' && <div ref={label} className="settings-diamond-paper-hands">Paper Hands</div>}
    </div>, document.fullscreenElement ?? document.body)}
  </>;
}