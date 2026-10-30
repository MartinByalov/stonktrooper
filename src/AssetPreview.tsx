// Browser game module for AssetPreview.
import { useEffect, useRef } from 'react';
import { drawBriefcase, drawCharacterHat, drawPickupAsset, drawSwanAsset, drawApeAsset } from './assetRenderer';
import { drawAnimalCharacter } from './animalRenderer';
import type { Animal, Swan } from './types';
import { createBossArena } from './boxingRules';
import { drawBossEncounter } from './bossRenderer';
import { drawChickenTender } from './tenderRenderer';
import { drawDumpster } from './dumpsterRenderer';
import { jeromePreviewPunch } from './jeromePunch';

export type PreviewAsset = 'dumpster' | 'tender' | 'jerome' | 'coin' | 'diamond' | 'banknote' | 'bag' | 'banana' | 'ape' | 'whale' | 'swan' | 'white' | 'hawk' | 'bell' | 'pigeon' | 'printer' | 'bull' | 'bear' | 'bull-rider' | 'bear-rider' | 'jump' | 'briefcase' | 'fedora';

// Retain only small, finished previews, never the 512px measurement buffers.
const previewCache = new Map<string, HTMLCanvasElement>();
const PREVIEW_CACHE_LIMIT = 96;

export function AssetPreview({ asset, compact = false, theme = 'light', grounded = false, coinLetter = 'M', animated = false }: { asset: PreviewAsset; compact?: boolean; theme?: 'light' | 'dark'; grounded?: boolean; coinLetter?: 'M' | 'B'; animated?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const output = canvas.current?.getContext('2d');
    if (!output) return;
    const key = `${asset}:${theme}:${grounded}:${coinLetter}`;
    const cached = animated ? undefined : previewCache.get(key);
    if (cached) {
      previewCache.delete(key);
      previewCache.set(key, cached);
      output.clearRect(0, 0, 160, 160);
      output.drawImage(cached, 0, 0);
      return;
    }
    // Render without clipping first, then fit the actual painted bounds, not
    // the character's feet/origin, into the square preview.
    const buffer = document.createElement('canvas');
    buffer.width = 512; buffer.height = 512;
    const ctx = buffer.getContext('2d');
    if (!ctx) return;
    let request = 0;
    let last = -Infinity;
    const started = performance.now();
    const arena = asset === 'jerome' ? createBossArena() : undefined;
    let wasMoving: boolean | undefined;
    const render = (now: number) => {
    const moving = animated && !matchMedia('(prefers-reduced-motion: reduce)').matches && !canvas.current?.closest('[data-animations="false"]');
    if (animated) request = requestAnimationFrame(render);
    if (!moving && wasMoving === false) return;
    if (moving && now - last < 1000 / 24) return;
    wasMoving = moving;
    last = now;
    const phase = moving ? now / 180 : .8;
    ctx.clearRect(0, 0, 512, 512);
    ctx.save();
    ctx.translate(256, 256);
    if (asset === 'dumpster') {
      ctx.translate(0, 45);
      ctx.scale(1.6, 1.6);
      drawDumpster(ctx, 1, phase, 0, theme === 'dark', false, 1, phase * 10, false, moving ? 16 - (phase * 8 % 60) : 0);
    } else if (asset === 'jerome') {
      const bossArena = arena ?? createBossArena();
      bossArena.boss.x = 0; bossArena.boss.y = 40;
      bossArena.boss.facing = -1;
      bossArena.boss.walkPhase = phase;
      bossArena.boss.moving = moving;
      const punch = jeromePreviewPunch(moving ? Math.max(0, now - started) * .06 : 0);
      bossArena.boss.attack = moving ? punch.attack : 0;
      bossArena.boss.arm = punch.arm;
      bossArena.boss.aimY = bossArena.boss.y - 60;
      if (animated) { ctx.translate(26, 0); ctx.scale(.9, .9); }
      else ctx.scale(1.5, 1.5);
      drawBossEncounter(ctx, bossArena, theme === 'dark');
    } else if (asset === 'tender') {
      ctx.scale(2.5, 2.5);
      if (moving) ctx.rotate(Math.sin(phase) * .12);
      drawChickenTender(ctx);
    } else if (asset === 'bull' || asset === 'bear' || asset === 'whale' || asset === 'bull-rider' || asset === 'bear-rider') {
      ctx.translate(15, 55);
      const rider = asset.endsWith('-rider');
      ctx.scale(rider ? 1 : 1.3, rider ? 1 : 1.3);
      drawAnimalCharacter(ctx, { type: rider ? asset.split('-')[0] : asset, mount: rider ? (asset === 'bull-rider' ? 'bear' : 'bull') : undefined, phase, attackTimer: moving ? Math.max(0, 20 - phase * 8 % 60) : 0 } as Animal, false, false, theme === 'dark', !moving && (asset === 'bull' || asset === 'bull-rider'), false, false, rider);
    } else if (asset === 'ape') {
      ctx.scale(1.6, 1.6);
      drawApeAsset(ctx, phase, false, moving ? Math.max(0, 16 - phase * 8 % 60) : 0);
    } else if (asset === 'swan' || asset === 'pigeon' || asset === 'white' || asset === 'hawk') {
      ctx.scale(2, 2);
      ctx.save();
      if (asset === 'white') {
        // Keep pale feathers readable on the light theme without changing the model.
        ctx.shadowColor = '#334155';
        ctx.shadowBlur = 2;
      }
      drawSwanAsset(ctx, { kind: asset, phase, isCharging: false } as Swan);
      ctx.restore();
    } else if (asset === 'jump') {
      // Mixed candles remain intact; yellow marks the double-jump charge zone.
      ctx.fillStyle = 'rgba(250, 204, 21, 0.18)'; ctx.fillRect(-67, 15, 65, 40);
      for (let i = 0; i < 4; i++) {
        const x = -62 + i * 16, top = 28 - i * 4;
        ctx.strokeStyle = i % 2 ? '#ef5350' : '#26a69a'; ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath(); ctx.moveTo(x + 5, top - 5); ctx.lineTo(x + 5, 57); ctx.stroke();
        ctx.fillRect(x, top, 10, 18 + i * 2);
        ctx.fillStyle = '#facc15'; ctx.fillRect(x, top - 2, 10, 3);
      }
      ctx.fillStyle = '#26a69a'; ctx.fillRect(38, -34, 12, 87);
      ctx.strokeStyle = '#26a69a'; ctx.beginPath(); ctx.moveTo(44, -42); ctx.lineTo(44, 60); ctx.stroke();
      const arc = (color: string, startX: number, startY: number, controlX: number, controlY: number, endX: number, endY: number) => {
        ctx.strokeStyle = color; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(startX, startY); ctx.quadraticCurveTo(controlX, controlY, endX, endY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(endX - 5, endY + 3); ctx.lineTo(endX, endY); ctx.lineTo(endX - 2, endY + 7); ctx.stroke();
      };
      arc('#cbd5e1', -51, 22, -45, -30, -16, -10);
      arc('#facc15', -16, -10, 4, -65, 43, -39);
      ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(-16, -10, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = '#cbd5e1'; ctx.fillText('1', -41, -15);
      ctx.fillStyle = '#facc15'; ctx.fillText('2', 8, -50);
    } else if (asset === 'diamond') {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.09)';
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, -4, 49, 62, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.75)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, -4, 43, 56, 0, Math.PI * 1.05, Math.PI * 1.4); ctx.stroke();
      ctx.save(); ctx.translate(0, -4); ctx.scale(2 * 148 / 156, 2 * 148 / 156);
      drawPickupAsset(ctx, { type: 'diamond', x: 0, y: 0, taken: false }, 0, 0, moving ? phase * 10 : 0, theme === 'dark');
      ctx.restore();
    } else if (asset === 'printer' && animated) {
      ctx.scale(1.6, 1.6); ctx.translate(0, 10);
      if (moving) {
        // Android's visual cash-ejection trajectory; no game pickup is spawned.
        const age = ((phase % 7.2) + 7.2) % 7.2 / 7.2;
        ctx.save();
        ctx.translate(-16 - age * 44, -19 - Math.sin(age * Math.PI) * 11 + age * 9);
        ctx.rotate(-.2 - age * 1.5);
        ctx.globalAlpha *= Math.min(1, (1 - age) * 4);
        ctx.fillStyle = theme === 'dark' ? '#bbf7d0' : '#86cf96';
        ctx.strokeStyle = '#21643b'; ctx.lineWidth = .7;
        ctx.fillRect(-7, -3.5, 14, 7); ctx.strokeRect(-7, -3.5, 14, 7);
        ctx.strokeRect(-5.5, -2.2, 11, 4.4);
        ctx.beginPath(); ctx.ellipse(0, 0, 2, 2.6, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      drawPickupAsset(ctx, { type: 'printer', x: 0, y: 0, taken: false }, 0, -17, phase, theme === 'dark');
    } else if (asset === 'fedora') {
      // Use Android's corrected profile orientation in the guide as well.
      ctx.scale(2.4, 2.4);
      drawCharacterHat(ctx, false, false, theme === 'dark');
    } else if (asset === 'briefcase') {
      if (moving) ctx.rotate(Math.sin(phase) * .08);
      drawBriefcase(ctx, theme === 'dark');
    } else {
      ctx.scale(2.4, 2.4);
      if (moving && asset === 'bag') ctx.rotate(Math.sin(phase) * .1);
      // Use the same orientation and theme-aware pickup renderer as the chart.
      drawPickupAsset(ctx, { type: asset, x: 0, y: 0, taken: false }, 0, 0, moving ? phase * 10 : 0, theme === 'dark', coinLetter);
    }
    ctx.restore();
    const pixels = ctx.getImageData(0, 0, 512, 512).data;
    let left = 512, top = 512, right = -1, bottom = -1;
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x++) {
        if (pixels[(y * 512 + x) * 4 + 3] === 0) continue;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    output.clearRect(0, 0, 160, 160);
    if (right < left) return;
    const width = right - left + 1, height = bottom - top + 1;
    if (animated && asset !== 'coin') {
      const scale = Math.min(.8, 156 / Math.max(width, height));
      output.drawImage(buffer, left, top, width, height,
        (160 - width * scale) / 2, (160 - height * scale) / 2, width * scale, height * scale);
      return;
    }
    const smallerPickup = ['banana', 'coin', 'briefcase', 'fedora'].includes(asset);
    const smallPickup = ['tender', 'bell'].includes(asset);
    const size = smallerPickup ? 86 : smallPickup ? 104 : asset === 'diamond' ? 156 : 136;
    const scale = size / Math.max(width, height);
    output.drawImage(buffer, left, top, width, height,
      (160 - width * scale) / 2, grounded ? 160 - height * scale : (160 - height * scale) / 2, width * scale, height * scale);
    if (animated) return;
    const preview = document.createElement('canvas');
    preview.width = 160; preview.height = 160;
    const previewContext = preview.getContext('2d');
    if (previewContext) {
      previewContext.drawImage(canvas.current!, 0, 0);
      if (previewCache.size >= PREVIEW_CACHE_LIMIT) previewCache.delete(previewCache.keys().next().value!);
      previewCache.set(key, preview);
    }
    };
    render(performance.now());
    return () => cancelAnimationFrame(request);
  }, [asset, theme, grounded, coinLetter, animated]);
  return <canvas ref={canvas} width={160} height={160} role="img" aria-label={`${asset} game asset`} data-animated={animated || undefined} className={`${compact ? 'w-[72px]' : 'w-24'} aspect-square h-auto shrink-0 max-w-full`} />;
}