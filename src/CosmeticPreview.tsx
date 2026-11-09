import { useEffect, useRef } from 'react';
import { drawPet } from './petRenderer';
import { drawMount } from './mountRenderer';
import { drawHatArtwork } from './assetRenderer';
import { hatMetrics } from './hatPose';
import { drawEquippedBag, drawSuitPreview, drawShoePreview } from './cosmeticModels';
import { candleGlyph, drawCandleDesign } from './candleDesign';
import type { Skin } from './progression';

export function CosmeticPreview({ skin, theme, animationsEnabled = true, centerArtwork = false }: { skin: Skin; theme: 'light' | 'dark'; animationsEnabled?: boolean; centerArtwork?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    const dark = theme === 'dark';
    let frame = 0;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const draw = (now: number) => {
    const animate = ['hats-propeller', 'hats-crown', 'hats-ath', 'shoes-moon', 'suitcase-event-horizon', 'mounts-classic', 'mounts-penny'].includes(skin.id) && animationsEnabled && !motion.matches && !document.hidden;
    ctx.clearRect(0, 0, 240, 144); ctx.save();
    if (skin.category === 'mounts') {
      // The default mount is whichever animal you tame: show the whale, bull and bear in turn.
      const kinds = ['whale', 'bull', 'bear'] as const;
      const kind = skin.id === 'mounts-classic' && animate ? kinds[Math.floor(now / 2500) % kinds.length] : 'whale';
      // Penny Stock is taller than the whale; its mane and tail sway gently.
      const penny = skin.id === 'mounts-penny';
      // Centre each card: the pony's seat origin sits behind its art, and the bull and
      // bear are set back under their rider in the game.
      const setBack = skin.id === 'mounts-classic' && kind !== 'whale' ? 12 * 1.9 : 0;
      ctx.translate(penny ? 174 : 120 + setBack, penny ? 132.5 : 122); ctx.scale(penny ? -2.6 : -1.9, penny ? 2.6 : 1.9); drawMount(ctx, skin.id, kind, dark, penny && animate ? now / 500 : 0);
    } else if (skin.category === 'pets') {
      // Brick's original bounds are [-22,23] × [-25,4], including its .8 scale.
      ctx.translate(skin.id==='pets-brick'?119.16:120, skin.id==='pets-brick'?89.64:126);
      ctx.scale(2.1, 2.1); drawPet(ctx, skin.id, dark);
    } else if (skin.category === 'hats') {
      // The candlestick crown is fine-grained, so it is shown larger.
      const ath = skin.id === 'hats-ath';
      ctx.translate(120,72);ctx.scale(ath?3.5:2.6,ath?3.5:2.6);ctx.translate(0,-hatMetrics(skin.id).centerY);
      drawHatArtwork(ctx, false, false, dark, skin.id, animate ? now / 1000 : 0);
    } else if (skin.category === 'suitcase') {
      // The desk items stand above the box, so its art sits lower to stay centred.
      ctx.translate(99, skin.id === 'suitcase-severance' ? 60 : 54); ctx.scale(3, 3); drawEquippedBag(ctx, skin.id, dark);
    } else if (skin.category === 'suits') {
      ctx.translate(120, 70); ctx.scale(1.9, 1.9); drawSuitPreview(ctx, skin.id, dark);
    } else if (skin.category === 'shoes') {
      ctx.translate(120, 72); ctx.scale(1.5, 1.5); drawShoePreview(ctx, skin.id, dark, animate ? now/1000 : 0);
    } else if (skin.category === 'candles') {
      for (const [i, length] of [86, 42, 66, 98, 54].entries()) {
        const open = 72 + length / 2, close = 72 - length / 2;
        // Keep alternating body lengths even for Heikin-Ashi's averaged open.
        const glyph = candleGlyph(skin.id, open, close, close - 10, open + 10, open, open);
        drawCandleDesign(ctx, skin.id, dark, 14 + i * 44, 36, i % 2 === 0 ? glyph : { ...glyph, open: glyph.close, close: glyph.open, bullish: false });
      }
    }
    ctx.restore();
    if (centerArtwork) {
      // Reward thumbnails align the painted item, not the gameplay model's origin.
      const image = ctx.getImageData(0, 0, 240, 144);
      let top = 144, bottom = -1;
      for (let y = 0; y < 144; y++) {
        for (let x = 0; x < 240; x++) {
          if (image.data[(y * 240 + x) * 4 + 3] > 0) {
            top = Math.min(top, y); bottom = y;
            break;
          }
        }
      }
      if (bottom >= top) {
        ctx.clearRect(0, 0, 240, 144);
        ctx.putImageData(image, 0, Math.round((143 - top - bottom) / 2));
      }
    }
    if (animate) frame = requestAnimationFrame(draw);
    };
    const refresh = () => { cancelAnimationFrame(frame); draw(performance.now()); };
    refresh();
    document.addEventListener('visibilitychange', refresh); motion.addEventListener('change', refresh);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', refresh); motion.removeEventListener('change', refresh); };
  }, [skin.id, skin.category, theme, animationsEnabled, centerArtwork]);
  return <canvas ref={canvas} width={240} height={144} aria-hidden="true" />;
}