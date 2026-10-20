import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { drawShareCard, formatShareScore, shareCardBackground, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from './shareCard';

export function LandingScore({ score, theme }: { score: number; theme: 'light' | 'dark' }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const figure = useRef<HTMLElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const ctx = canvas.current?.getContext('2d');
      if (!ctx) return;
      drawShareCard(ctx, score, image, theme);
      // Anchor the visible shoes/artwork, not the transparent PNG margins.
      const pixels = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
      let left = pixels.width, top = pixels.height, right = -1, bottom = -1;
      for (let y = 0; y < pixels.height; y++) for (let x = 0; x < pixels.width; x++) {
        if (pixels.data[(y * pixels.width + x) * 4 + 3] <= 16) continue;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      if (right >= left && bottom >= top) {
        const cropped = ctx.getImageData(left, top, right - left + 1, bottom - top + 1);
        ctx.canvas.width = cropped.width; ctx.canvas.height = cropped.height;
        ctx.putImageData(cropped, 0, 0);
      }
      setLoaded(true);
    };
    image.src = shareCardBackground(theme, import.meta.env.BASE_URL);
    return () => { cancelled = true; };
  }, [score, theme]);

  useLayoutEffect(() => {
    const element = figure.current;
    const panel = element?.parentElement;
    const donate = panel?.querySelector('.home-coffee-link');
    const actions = panel?.querySelector('.landing-menu-actions');
    if (!element || !panel || !donate || !actions || !loaded) return;
    const layout = () => {
      const p = panel.getBoundingClientRect(), d = donate.getBoundingClientRect(), a = actions.getBoundingClientRect();
      const mobile = window.matchMedia('(pointer: coarse)').matches;
      const portrait = window.matchMedia('(orientation: portrait)').matches;
      const left = mobile ? d.left - p.left : d.right - p.left + 8;
      const bottom = mobile ? d.top - p.top - 8 : d.bottom - p.top;
      const availableHeight = Math.max(0, bottom - (mobile && portrait ? a.bottom - p.top + 8 : 8));
      const availableWidth = Math.max(0, mobile && portrait ? p.width - left - 8 : a.left - p.left - left - 8);
      const ratio = canvas.current ? canvas.current.width / canvas.current.height : 1;
      const height = Math.min(availableHeight, availableWidth / ratio, mobile ? 320 : 480);
      element.style.left = `${left}px`;
      element.style.top = `${bottom - height}px`;
      element.style.width = `${height * ratio}px`;
      element.style.height = `${height}px`;
    };
    const observer = new ResizeObserver(layout);
    observer.observe(panel); observer.observe(donate); observer.observe(actions);
    window.addEventListener('resize', layout);
    document.addEventListener('fullscreenchange', layout);
    layout();
    return () => {
      observer.disconnect(); window.removeEventListener('resize', layout);
      document.removeEventListener('fullscreenchange', layout);
    };
  }, [loaded]);

  return <figure ref={figure} className="landing-score" aria-label={`Shared best score: ${formatShareScore(score)}`}>
    <canvas ref={canvas} width={SHARE_CARD_WIDTH} height={SHARE_CARD_HEIGHT} role="img"
      aria-label={`Stonktrooper holding a briefcase with best score ${formatShareScore(score)}`} hidden={!loaded} />
    {!loaded && <p className="landing-score-fallback">Shared best score: <strong>{formatShareScore(score)}</strong></p>}
  </figure>;
}