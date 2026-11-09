// Browser game module for bossWeaponRenderer.
import { drawBaseballBat } from './batRenderer';
export function drawBossWeapon(ctx: CanvasRenderingContext2D, kind: 'bat' | 'chainsaw'): void {
  ctx.save();
  if (kind === 'bat') {
    drawBaseballBat(ctx);
  } else {
    ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.roundRect(7, -5, 33, 9, 4); ctx.fill();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.stroke();
    for (let x = 12; x < 38; x += 4) { ctx.fillStyle = '#64748b'; ctx.fillRect(x, -7, 2, 2); ctx.fillRect(x, 4, 2, 2); }
    ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.roundRect(-9, -9, 22, 17, 4); ctx.fill();
    ctx.strokeStyle = '#202936'; ctx.lineWidth = 3; ctx.strokeRect(-5, -14, 13, 6);
    ctx.fillStyle = '#1e293b'; ctx.fillRect(-5, -3, 8, 5);
  }
  ctx.restore();
}