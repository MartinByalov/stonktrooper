import { useLayoutEffect, useRef, useState } from 'react';
import { MenuRunner } from './MenuRunner';
import { candleGlyph, drawCandleDesign } from './candleDesign';
import type { Progress } from './progression';
import { menuPetSurfaceOffset } from './track';

// Like Home: move the market under a fixed walking runner, sampling candle tops for his feet.
export function ExchangeMarket({ theme, animationsEnabled, equipped, showMount = false, title }: { theme: 'light' | 'dark'; animationsEnabled: boolean; equipped: Progress['equipped']; showMount?: boolean; title?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const petSurface = useRef<((offset: number) => number) | null>(null);
  const [size, setSize] = useState({ width: 208, height: 150 });
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const { width, height } = size;
  const scale = Math.min(width / 112, height / 116);
  const heroX = width * .54, heroY = height * .76;
  useLayoutEffect(() => {
    const element = canvas.current, container = root.current;
    const ctx = element?.getContext('2d');
    if (!element || !container || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    element.width = Math.ceil(width * dpr); element.height = Math.ceil(height * dpr);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const spacing = 9, count = 96, cycle = count * spacing;
    const candles = Array.from({ length: count }, (_, i) => {
      const price = (index: number) => Math.sin(index * Math.PI * 2 / count * 3) * 12 + Math.sin(index * Math.PI * 2 / count * 7) * 5;
      const open = price(i), close = price(i + 1);
      return candleGlyph(equipped.candles, open, close, Math.min(open, close) - 3, Math.max(open, close) + 5, price(i - 1), open);
    });
    const tops=candles.map(candle=>Math.min(candle.open,candle.close));
    let frame = 0, previous = 0, distance = 0;
    const draw = (now: number) => {
      const animate = animationsEnabled && !motion.matches && !document.hidden;
      if (previous && animate) distance = (distance + Math.min(now - previous, 50) * (showMount ? .012 : .024)) % cycle;
      previous = now;
      const position = (heroX + distance) / spacing;
      const index = Math.floor(position) % count, next = (index + 1) % count;
      const fraction = position % 1;
      const top = (i: number) => Math.min(candles[i].open, candles[i].close);
      const surface = top(index) * (1 - fraction) + top(next) * fraction;
      petSurface.current=offset=>menuPetSurfaceOffset(tops,position,offset,scale,spacing);
      ctx.resetTransform(); ctx.clearRect(0, 0, element.width, element.height);
      ctx.scale(dpr, dpr); ctx.translate(-distance, heroY - surface);
      for (let copy = -1; copy <= 1; copy++) for (let i = 0; i < count; i++) {
        drawCandleDesign(ctx, equipped.candles, theme === 'dark', copy * cycle + i * spacing - 3, 6, candles[i]);
      }
      container.dataset.scroll = String(distance);
      if (animate) frame = requestAnimationFrame(draw);
    };
    const refresh = () => { cancelAnimationFrame(frame); previous = 0; draw(performance.now()); };
    refresh();
    document.addEventListener('visibilitychange', refresh); motion.addEventListener('change', refresh);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', refresh); motion.removeEventListener('change', refresh); };
  }, [width, height, heroX, heroY, scale, equipped.candles, theme, animationsEnabled, showMount]);
  return <div ref={root} className="exchange-outfit-market">
    <canvas ref={canvas} className="exchange-outfit-candles" aria-hidden="true" />
    {title && <span className="exchange-outfit-title player-title" style={{ left: heroX, top: Math.max(44, heroY - 88 * scale) }} aria-live="polite">{title}</span>}
    <div className="exchange-outfit-runner" style={{ left: heroX - 88 * scale, top: heroY - 164 * scale, width: 136 * scale, height: 268 * scale }}>
      <MenuRunner theme={theme} scale={scale} topPadding={80} bottomPadding={100} petSurface={showMount ? undefined : petSurface} animationsEnabled={animationsEnabled} hatSkin={equipped.hats} suitcaseSkin={equipped.suitcase} suitSkin={equipped.suits} shoeSkin={equipped.shoes} petSkin={equipped.pets} mountSkin={showMount ? equipped.mounts : undefined} />
    </div>
  </div>;
}