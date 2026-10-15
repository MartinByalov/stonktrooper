// Browser game module for batRenderer.
export function drawBaseballBat(ctx: CanvasRenderingContext2D): void {
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(0, -14); ctx.stroke();
  ctx.strokeStyle = '#d6aa70'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, -35); ctx.stroke();
  ctx.strokeStyle = '#eee0c8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-1, -3); ctx.lineTo(-1, -11); ctx.stroke(); ctx.restore();
}