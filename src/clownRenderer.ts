import { drawHumanHead } from './assetRenderer';

// Shared Hawk/Bell face, in the same local coordinates as drawHumanHead.
export function drawClownMakeup(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.fillStyle = '#fff7ed'; ctx.beginPath(); ctx.ellipse(2, 2, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(8, 0, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#be123c'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, 4); ctx.quadraticCurveTo(3, 7, 6, 4); ctx.stroke();
  ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.arc(-6, -2, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(4, -3, 1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawClownHead(ctx: CanvasRenderingContext2D): void {
  drawHumanHead(ctx, false);
  drawClownMakeup(ctx);
}

// Front-facing version of the Hawk clown for the Disclaimer bag surprise.
export function drawClownHeadFront(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  for (const x of [-8, 8]) {
    ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.arc(x, -1, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#fff7ed'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#98600f'; ctx.lineWidth = 0.8; ctx.stroke();
  for (const x of [-3, 3]) {
    ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(x, -3, 1.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(0, 1, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#be123c'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-4, 5); ctx.quadraticCurveTo(0, 9, 4, 5); ctx.stroke();
  ctx.restore();
}