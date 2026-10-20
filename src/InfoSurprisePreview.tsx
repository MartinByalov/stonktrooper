import { useEffect, useRef } from 'react';
import { drawClownHeadFront } from './clownRenderer';

export type InfoFruit = 'orange' | 'apple' | 'kiwi' | 'tomato';

export function InfoSurprisePreview({ kind }: { kind: InfoFruit | 'clown' }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 160, 160);
    ctx.save(); ctx.translate(80, 80);
    if (kind === 'clown') {
      ctx.scale(3, 3); drawClownHeadFront(ctx);
    } else {
      const colors = { orange: '#f59e0b', apple: '#dc2626', kiwi: '#84cc16', tomato: '#ef4444' };
      ctx.fillStyle = colors[kind]; ctx.strokeStyle = kind === 'kiwi' ? '#854d0e' : '#9a3412';
      ctx.lineWidth = kind === 'kiwi' ? 5 : 2;
      ctx.beginPath(); ctx.ellipse(0, 3, kind === 'tomato' ? 41 : 36, kind === 'kiwi' ? 39 : 36, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (kind === 'kiwi') {
        ctx.fillStyle = '#ecfccb'; ctx.beginPath(); ctx.ellipse(0, 3, 10, 15, 0, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 12; i++) {
          const angle = i * Math.PI / 6;
          ctx.fillStyle = '#292524'; ctx.beginPath(); ctx.ellipse(Math.cos(angle) * 22, 3 + Math.sin(angle) * 25, 1.6, 3, angle, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        ctx.strokeStyle = '#713f12'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(3, -43); ctx.stroke();
        ctx.fillStyle = '#15803d'; ctx.beginPath();
        if (kind === 'tomato') {
          for (let i = 0; i < 10; i++) {
            const angle = i * Math.PI / 5, radius = i % 2 ? 6 : 22;
            ctx.lineTo(Math.cos(angle) * radius, -29 + Math.sin(angle) * radius * 0.5);
          }
        } else { ctx.ellipse(13, -37, 13, 5, -0.5, 0, Math.PI * 2); }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(-3, 2, 24, Math.PI * 1.05, Math.PI * 1.35); ctx.stroke();
      }
    }
    ctx.restore();
  }, [kind]);
  return <canvas ref={canvas} width={160} height={160} role="img" aria-label={kind} className="w-24 aspect-square h-auto shrink-0 max-w-full" />;
}