import { useEffect, useState } from 'react';
import { drawBriefcase, drawCharacterHat } from './assetRenderer';

// Use the actual How to Play/game renderers, embedded into the SVG scene.
function BirdAccessory({ kind }: { kind: 'hat' | 'briefcase' }) {
  const [image, setImage] = useState('');
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const update = () => {
      ctx.clearRect(0, 0, 256, 256);
      ctx.save(); ctx.translate(128, 128); ctx.scale(3, 3);
      const dark = document.documentElement.dataset.theme !== 'light';
      if (kind === 'hat') { ctx.scale(-1, 1); drawCharacterHat(ctx, false, false, dark); }
      else drawBriefcase(ctx, dark);
      ctx.restore(); setImage(canvas.toDataURL());
    };
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    update();
    return () => observer.disconnect();
  }, [kind]);
  return image ? <image href={image} x={-128 / 3} y={-128 / 3} width={256 / 3} height={256 / 3} /> : null;
}

// Decorative original scene; no external image assets.
export function LiquidatedBackdrop() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 440 360" preserveAspectRatio="xMidYMid slice" className="liquidated-backdrop absolute inset-0 w-full h-full pointer-events-none">
      <rect width="440" height="360" fill="var(--liquidated-scene-bg, #101b2b)" />
      <circle cx="360" cy="42" r="37" fill="#d5e7f3" opacity="0.08" />
      <g fill="var(--liquidated-scene-skyline, #213247)" opacity="0.65">
        <path d="M0 300V250H35V274H62V225H105V300ZM330 360V260H365V232H401V280H440V360Z" />
      </g>
      <g stroke="var(--liquidated-scene-crane, #e7ad58)" strokeWidth="2" fill="none" opacity="0.95">
        <path d="M312 360V89H340V360M312 89L340 125L312 162L340 199L312 236L340 273L312 310L340 347" />
        <path d="M52 89H408V107H52ZM52 107L89 89L126 107L163 89L200 107L237 89L274 107L311 89L348 107L385 89" />
        <path d="M326 37L52 89M326 37L408 89M326 37V89M98 107V188" />
        <path d="M98 188V199Q98 208 107 202" strokeWidth="3" />
        <path d="M0 122Q125 148 250 122T440 125" opacity="0.6" />
      </g>
      {[{ x: 135, y: 86, flip: 1 }, { x: 216, y: 86, flip: -1 }, { x: 284, y: 86, flip: 1 }].map(({ x, y, flip }) => (
        <g key={x} data-liquidated-bird={x === 135 ? 1 : x === 216 ? 2 : 3} transform={`translate(${x} ${y}) scale(${flip} 1)`}>
          <path d="M-7 -8L-24 -3L-13 -15Z" fill="#647d89" />
          <ellipse cy="-15" rx="12" ry="15" fill="#f2dc56" />
          <path d="M-9 -25Q-19 -14 -7 -7L2 -11L-1 -25Z" fill="#68abd0" />
          <path d="M-11 -18L-2 -15M-10 -13L-2 -11" stroke="#b3c7ce" strokeWidth="1.5" />
          <path d="M2 -27L3 -3" stroke="#263c40" strokeWidth="3" />
          <circle cx="5" cy="-30" r="9" fill="var(--liquidated-scene-ink)" />
          <ellipse cx="9" cy="-28" rx="5" ry="4" fill="var(--liquidated-scene-bg)" />
          <circle cx="10" cy="-33" r="1.3" fill="var(--liquidated-scene-bg)" />
          {x === 135 && (
            <g className="liquidated-bird-hat" transform="translate(5 -33) scale(0.65)" fill="var(--liquidated-scene-ink)">
              <BirdAccessory kind="hat" />
            </g>
          )}
          {x === 284 && (
            <g className="liquidated-bird-briefcase" transform="translate(19 -28) rotate(-8)" fill="var(--liquidated-scene-ink)" strokeLinejoin="round">
              <g transform="translate(0 9) scale(0.34)"><BirdAccessory kind="briefcase" /></g>
            </g>
          )}
          <path d="M13 -30L20 -28L13 -26Z" fill="#6d7b80" />
          <path d="M-4 -2V2H-8M5 -2V2H9" stroke="#8b938d" strokeWidth="1.5" fill="none" />
        </g>
      ))}
      <rect y="115" width="440" height="245" fill="var(--liquidated-scene-bg, #101b2b)" opacity="0.45" />
    </svg>
  );
}