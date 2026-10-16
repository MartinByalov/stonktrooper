// Draw after the head and all stacked hats, in the character's local coordinates.
export function drawPigeonStain(ctx: CanvasRenderingContext2D, x: number, y: number, white: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = white ? '#ffffff' : '#000000';
  ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.2, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(2, 3, 2, 4.5, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-5, 1, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, 1, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}