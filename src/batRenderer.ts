// Browser game module for batRenderer.
export function drawBaseballBat(ctx: CanvasRenderingContext2D): void {
  ctx.save(); ctx.lineCap = 'round';
  // Both fists sit on the slim handle (y=-2 and y=-9). The wooden
  // silhouette widens continuously beyond the grip into a rounded barrel.
  ctx.fillStyle = '#d6aa70';
  ctx.beginPath(); ctx.moveTo(0, 3);
  ctx.lineTo(-1.6, 3); ctx.lineTo(-1.6, -12);
  ctx.bezierCurveTo(-1.6, -19, -4, -25, -4, -34);
  ctx.bezierCurveTo(-4, -40, 4, -40, 4, -34);
  ctx.bezierCurveTo(4, -25, 1.6, -19, 1.6, -12);
  ctx.lineTo(1.6, 3); ctx.closePath(); ctx.fill();
  // Small end knob prevents the hands sliding off the handle.
  ctx.fillStyle = '#b88a51';
  ctx.beginPath(); ctx.ellipse(0, 3, 2.8, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#eee0c8'; ctx.lineWidth = .7;
  ctx.beginPath(); ctx.moveTo(-.7, -13);
  ctx.bezierCurveTo(-.7, -22, -2.6, -28, -2.2, -34); ctx.stroke();
  ctx.restore();
}