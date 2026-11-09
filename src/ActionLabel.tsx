import { useLayoutEffect, useRef, useState } from 'react';

/** Center painted glyphs, not the font's platform-dependent line box. */
export function ActionLabel({ children }: { children: string }) {
  const root = useRef<HTMLSpanElement>(null);
  const [bounds, setBounds] = useState<{ width: number; height: number; x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => {
      const style = getComputedStyle(element);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      svg.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none';
      text.style.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      text.textContent = children;
      svg.append(text);
      document.body.append(svg);
      const metrics = text.getBBox();
      svg.remove();
      const next = {
        width: Math.max(1, metrics.width),
        height: Math.max(1, metrics.height),
        x: -metrics.x,
        y: -metrics.y,
      };
      setBounds(previous => previous && Object.keys(next).every(key => previous[key as keyof typeof next] === next[key as keyof typeof next]) ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (element.parentElement) observer.observe(element.parentElement);
    document.fonts.addEventListener('loadingdone', measure);
    let active = true;
    void document.fonts.ready.then(() => { if (active) measure(); });
    return () => { active = false; observer.disconnect(); document.fonts.removeEventListener('loadingdone', measure); };
  }, [children]);
  return <span ref={root} className="action-label">
    {bounds ? <svg width={bounds.width} height={bounds.height} role="img" aria-label={children}>
      <text x={bounds.x} y={bounds.y}>{children}</text>
    </svg> : children}
  </span>;
}

/** Badge digits: drawn at device resolution and centred on their actual painted pixels,
 *  so a number sits in the exact middle of its circle with any platform font. */
export function BadgeLabel({ children }: { children: string }) {
  const root = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const element = root.current, target = canvas.current;
    const badge = element?.parentElement;
    if (!element || !target || !badge) return;
    const paint = () => {
      const style = getComputedStyle(badge);
      const size = badge.getBoundingClientRect();
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      const width = Math.round(size.width * ratio), height = Math.round(size.height * ratio);
      if (!width || !height) return;
      target.width = width; target.height = height;
      target.style.width = `${size.width}px`; target.style.height = `${size.height}px`;
      const ctx = target.getContext('2d');
      if (!ctx) return;
      ctx.font = `${style.fontStyle} ${style.fontWeight} ${parseFloat(style.fontSize) * ratio}px ${style.fontFamily}`;
      ctx.fillStyle = style.color; ctx.textBaseline = 'alphabetic';
      // Paint once, find the inked pixels, then repaint centred on them.
      ctx.clearRect(0, 0, width, height); ctx.fillText(children, 0, height * .8);
      const data = ctx.getImageData(0, 0, width, height).data;
      let left = width, right = -1, top = height, bottom = -1;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 40) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
      }
      if (right < 0) return;
      ctx.clearRect(0, 0, width, height);
      ctx.fillText(children, (width - (right + 1 - left)) / 2 - left, (height - (bottom + 1 - top)) / 2 - top + height * .8);
    };
    paint();
    let active = true;
    document.fonts.addEventListener('loadingdone', paint);
    void document.fonts.ready.then(() => { if (active) paint(); });
    return () => { active = false; document.fonts.removeEventListener('loadingdone', paint); };
  }, [children]);
  return <span ref={root} className="badge-label" role="img" aria-label={children}>
    <canvas ref={canvas} aria-hidden="true" />
  </span>;
}
