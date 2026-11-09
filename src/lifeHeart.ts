// Shared bird-drop and HUD artwork in native world units.
export function drawLifeHeart(ctx: CanvasRenderingContext2D, dark: boolean, filled = true) {
  ctx.save();
  ctx.fillStyle = '#ef4444'; ctx.strokeStyle = dark ? '#fecaca' : '#7f1d1d'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, 9); ctx.bezierCurveTo(-19, -2, -10, -17, 0, -8);
  ctx.bezierCurveTo(10, -17, 19, -2, 0, 9);
  if (filled) ctx.fill();
  ctx.stroke(); ctx.restore();
}
