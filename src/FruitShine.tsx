import { useEffect, useRef, type ReactNode } from 'react';

// Coin-style reflection: a soft white band sweeps across the fruit's own
// pixels (the coin face uses the same 45% band, about every two seconds).
const SWEEP_PERIOD = 2050;

export function FruitShine({ animate, children }: { animate: boolean; children: ReactNode }) {
  const root = useRef<HTMLSpanElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = overlay.current, ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, last = 0;
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (now - last < 1000 / 24) return;
      last = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const source = root.current?.querySelector<HTMLCanvasElement>('canvas:not(.fruit-shine-overlay)');
      if (!animate || motion.matches || !source) return;
      // Fruit pixels act as the mask, so the band never spills outside it.
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-in';
      const sweep = (now % SWEEP_PERIOD) / SWEEP_PERIOD * (canvas.width + 80) - 40;
      const band = ctx.createLinearGradient(sweep - 18, 0, sweep + 18, 0);
      band.addColorStop(0, 'rgba(255,255,255,0)');
      band.addColorStop(0.5, 'rgba(255,255,255,0.45)');
      band.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = band;
      ctx.fillRect(sweep - 18, 0, 36, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [animate]);
  return <span ref={root} className="info-fruit-shine">
    {children}
    <canvas ref={overlay} className="fruit-shine-overlay" width={160} height={160} aria-hidden="true" />
  </span>;
}
