// Intersect the moving reflection strip with the coin analytically rather than
// installing an antialiased circular canvas clip for every visible coin/frame.
export const coinReflectionBounds = (sweep: number, radius = 10, halfWidth = 4) => {
  const left = Math.max(-radius, sweep - halfWidth);
  const right = Math.min(radius, sweep + halfWidth);
  return left < right ? { left, right } : null;
};

export function drawCoinReflection(ctx: CanvasRenderingContext2D, sweep: number): void {
  const bounds = coinReflectionBounds(sweep);
  if (!bounds) return;
  const { left, right } = bounds;
  const leftAngle = Math.acos(left / 10), rightAngle = Math.acos(right / 10);
  const reflection = ctx.createLinearGradient(sweep - 4, 0, sweep + 4, 0);
  reflection.addColorStop(0, 'rgba(255,255,255,0)');
  reflection.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  reflection.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = reflection;
  ctx.beginPath();
  ctx.arc(0, 0, 10, -leftAngle, -rightAngle);
  ctx.lineTo(right, Math.sqrt(Math.max(0, 100 - right * right)));
  ctx.arc(0, 0, 10, rightAngle, leftAngle);
  ctx.closePath();
  ctx.fill();
}