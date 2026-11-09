// Small rounded wings retain thickness throughout the shoulder-driven flap.
export function drawPigeonWing(ctx: CanvasRenderingContext2D, phase: number, near: boolean): void {
  const flap = Math.sin(phase);
  ctx.save(); ctx.translate(near ? 0 : -5, near ? -3 : -7);
  ctx.rotate((near ? .3 : -.1) + flap * (near ? .65 : .5));
  ctx.scale(near ? .48 : .35, near ? .52 : .42);
  // A single smooth oval, shaded for volume without separate feather shapes.
  const plumage = ctx.createLinearGradient(-8, -25, 12, 6);
  plumage.addColorStop(0, near ? '#c0ccd8' : '#8493a5');
  plumage.addColorStop(.5, near ? '#94a3b8' : '#64748b');
  plumage.addColorStop(1, '#526176');
  ctx.fillStyle = plumage;
  ctx.beginPath(); ctx.ellipse(2, -9, 12, 20, .35, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (const offset of [0, 5]) {
    ctx.beginPath(); ctx.moveTo(-2 + offset, -4);
    ctx.quadraticCurveTo(1 + offset, -10, 6 + offset, -14); ctx.stroke();
  }
  ctx.restore();
}