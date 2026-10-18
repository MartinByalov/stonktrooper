// Rasterize grid lines in backing pixels, not fractional, zoomed world strokes.
// Canvas clipping remains active when its transform is reset.
export function drawChartGridLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  const transform = ctx.getTransform();
  const left = transform.a * x1 + transform.e;
  const top = transform.d * y1 + transform.f;
  const right = transform.a * x2 + transform.e;
  const bottom = transform.d * y2 + transform.f;
  ctx.save();
  ctx.resetTransform();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fillRect(Math.round(Math.min(left, right)), Math.round(Math.min(top, bottom)),
    Math.max(1, Math.round(Math.abs(right - left))), Math.max(1, Math.round(Math.abs(bottom - top))));
  ctx.restore();
}