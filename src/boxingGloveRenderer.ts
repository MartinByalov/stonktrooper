// Shared leather glove model in local right-facing character coordinates.
export function drawBoxingGlove(ctx: CanvasRenderingContext2D, x: number, y: number, near = true, scale = 1): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  const leather = ctx.createRadialGradient(-3, -4, 1, 1, 0, 12);
  leather.addColorStop(0, near ? '#fa7180' : '#c54c61');
  leather.addColorStop(0.45, near ? '#c92e49' : '#95273e'); leather.addColorStop(1, '#581b2c');
  ctx.fillStyle = leather; ctx.strokeStyle = '#511d2d'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-7, 4); ctx.bezierCurveTo(-10, -8, -5, -11, 4, -9);
  ctx.bezierCurveTo(12, -8, 12, 2, 7, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#a92842'; ctx.beginPath(); ctx.ellipse(-5, 2, 3.8, 5, -0.35, 0, Math.PI * 2); ctx.fill();
  const cuff = ctx.createLinearGradient(-6, 5, 7, 9);
  cuff.addColorStop(0, '#e5e9ed'); cuff.addColorStop(1, '#8995a5');
  ctx.fillStyle = cuff; ctx.beginPath(); ctx.roundRect(-6, 5, 13, 5, 1.5); ctx.fill();
  ctx.strokeStyle = '#f6a5ad'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-4, -6); ctx.quadraticCurveTo(1, -9, 6, -5); ctx.stroke();
  ctx.restore();
}