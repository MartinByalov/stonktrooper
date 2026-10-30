// Identical species artwork for upright animals and quadruped mounts.
export function drawAnimalTail(ctx: CanvasRenderingContext2D, bear: boolean, phase: number, x: number, y: number): void {
  const sway = Math.sin(phase * .8) * 1.8;
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
  if (bear) {
    ctx.fillStyle = '#784c28';
    ctx.beginPath(); ctx.ellipse(2, 3, 3, 2.5, -.3, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.strokeStyle = '#632515'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(10, 1, 5 + sway, 9, 11 + sway, 11); ctx.stroke();
    ctx.fillStyle = '#3b2118';
    ctx.beginPath(); ctx.ellipse(12 + sway, 12, 2.5, 3.5, -.7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}