// Browser game module for tenderRenderer.
export function drawChickenTender(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  // Exposed bone with two rounded knuckles, behind the breaded drumstick.
  ctx.fillStyle = '#fff4d6'; ctx.strokeStyle = '#cdbb94'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(4, -2); ctx.lineTo(14, -4);
  ctx.bezierCurveTo(14, -9, 20, -9, 20, -5);
  ctx.bezierCurveTo(24, -5, 24, 1, 20, 1);
  ctx.quadraticCurveTo(16, 3, 15, -1); ctx.lineTo(5, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
  const crust = ctx.createLinearGradient(-8, -7, 6, 8);
  crust.addColorStop(0, '#ffe3a0'); crust.addColorStop(0.4, '#eab04c'); crust.addColorStop(1, '#ad5c20');
  ctx.fillStyle = crust; ctx.strokeStyle = '#925023'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-14, 1);
  ctx.bezierCurveTo(-16, -5, -12, -10, -6, -9);
  ctx.quadraticCurveTo(-1, -11, 3, -6);
  ctx.quadraticCurveTo(5, -3, 10, -2);
  ctx.quadraticCurveTo(13, 1, 9, 4);
  ctx.quadraticCurveTo(4, 4, 1, 8);
  ctx.bezierCurveTo(-5, 12, -14, 9, -14, 1); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (const [x, y, r] of [[-8, -2, 1.3], [-4, 3, 1.1], [0, -3, 1.4], [5, 2, 1.2], [8, -1, 1], [-1, 4, 0.8]]) {
    ctx.fillStyle = '#f8d17f'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#bb762c'; ctx.lineWidth = 0.5; ctx.stroke();
  }
  ctx.restore();
}