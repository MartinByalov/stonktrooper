import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { drawShareCard, formatShareScore, shareCardBackground, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from './shareCard';

export function LandingScore({ score, theme }: { score: number; theme: 'light' | 'dark' }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const figure = useRef<HTMLElement>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [portalHost, setPortalHost] = useState<Element>(() => document.fullscreenElement ?? document.body);

  useEffect(() => {
    const sync = () => setPortalHost(document.fullscreenElement ?? document.body);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

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
  }, [score, theme, portalHost]);

  useLayoutEffect(() => {
    const element = figure.current;
    const panel = anchor.current?.parentElement;
    const donate = panel?.querySelector('.home-coffee-link');
    const actions = panel?.querySelector('.landing-menu-actions');
    const guide = panel?.querySelector('.landing-menu-guide-button');
    const footer = panel?.closest('.game-app')?.querySelector('.site-footer');
    if (!element || !panel || !donate || !actions || !guide || !footer || !loaded) return;
    const layout = () => {
      const p = panel.getBoundingClientRect(), d = donate.getBoundingClientRect(), a = actions.getBoundingClientRect();
      // Include touch laptops/tablets and narrow responsive browser viewports.
      const mobile = window.matchMedia('(any-pointer: coarse), (max-width: 1024px)').matches;
      const portrait = window.matchMedia('(orientation: portrait)').matches;
      const target = portrait ? guide.getBoundingClientRect() : d;
      const center = target.left + target.width / 2;
      const bottom = mobile ? target.top : footer.getBoundingClientRect().bottom;
      const availableHeight = Math.max(0, bottom - p.top - 8);
      const availableWidth = Math.max(0, mobile
        ? 2 * Math.min(center - p.left, p.right - center, portrait ? p.width / 2 : a.left - center - 8)
        : a.left - d.right - 16);
      const ratio = canvas.current ? canvas.current.width / canvas.current.height : 1;
      const height = Math.min(availableHeight, availableWidth / ratio, mobile ? 320 : 480);
      const left = mobile ? center - height * ratio / 2 : d.right + 8;
      element.style.left = `${left}px`;
      element.style.top = `${bottom - height}px`;
      element.style.width = `${height * ratio}px`;
      element.style.height = `${height}px`;
      element.dataset.layout = mobile ? portrait ? 'portrait' : 'landscape' : 'desktop';
    };
    const observer = new ResizeObserver(layout);
    observer.observe(panel); observer.observe(donate); observer.observe(actions); observer.observe(footer);
    const mutations = new MutationObserver(layout);
    mutations.observe(panel, { attributes: true, subtree: true, attributeFilter: ['style', 'class'] });
    const media = window.matchMedia('(any-pointer: coarse), (max-width: 1024px)');
    media.addEventListener('change', layout);
    window.addEventListener('resize', layout);
    window.addEventListener('scroll', layout, true);
    document.addEventListener('fullscreenchange', layout);
    window.visualViewport?.addEventListener('resize', layout);
    layout();
    return () => {
      observer.disconnect(); mutations.disconnect(); media.removeEventListener('change', layout);
      window.visualViewport?.removeEventListener('resize', layout);
      window.removeEventListener('resize', layout);
      window.removeEventListener('scroll', layout, true);
      document.removeEventListener('fullscreenchange', layout);
    };
  }, [loaded, portalHost]);

  return <><span ref={anchor} hidden />{createPortal(<figure ref={figure} className="landing-score" aria-label={`Shared best score: ${formatShareScore(score)}`}>
    <canvas ref={canvas} width={SHARE_CARD_WIDTH} height={SHARE_CARD_HEIGHT} role="img"
      aria-label={`Stonktrooper holding a briefcase with best score ${formatShareScore(score)}`} hidden={!loaded} />
    {!loaded && <p className="landing-score-fallback">Shared best score: <strong>{formatShareScore(score)}</strong></p>}
  </figure>, portalHost)}</>;
}