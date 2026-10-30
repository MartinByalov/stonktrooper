// Independent of locomotion: seated and idle characters blink too. No timers or
// random state are created during rendering. Tests can supply a fixed time.
export function eyeOpenness(seconds: number, seed = 0): number {
  const period = 3.4 + Math.abs(Math.sin(seed * 1.73)) * 1.8;
  const t = ((seconds + seed * .713) % period + period) % period;
  const distance = Math.abs(t - period * .72);
  if (distance >= .11) return 1;
  return Math.max(.04, distance / .11);
}

export function drawBlinkingEye(ctx: CanvasRenderingContext2D, x: number, y: number, draw: () => void, seed = 0, seconds = performance.now() / 1000): void {
  ctx.save();
  try {
    ctx.translate(x, y);
    ctx.scale(1, eyeOpenness(seconds, seed));
    ctx.translate(-x, -y);
    draw();
  } finally { ctx.restore(); }
}