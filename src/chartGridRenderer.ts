// Rasterize grid lines in backing pixels, not fractional, zoomed world strokes.
// Canvas clipping remains active when its transform is reset.
export function drawChartGridLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, soft = false): void {
  const transform = ctx.getTransform();
  const left = transform.a * x1 + transform.e;
  const top = transform.d * y1 + transform.f;
  const right = transform.a * x2 + transform.e;
  const bottom = transform.d * y2 + transform.f;
  ctx.save();
  ctx.resetTransform();
  ctx.fillStyle = ctx.strokeStyle;
  if (soft) {
    // A two-pixel core moves continuously instead of jumping between single
    // bright pixels on black. Fractional edges blend as the camera advances.
    const vertical = x1 === x2;
    ctx.globalAlpha *= 0.5;
    ctx.fillRect(vertical ? left - 1 : Math.min(left, right), vertical ? Math.min(top, bottom) : top - 1,
      vertical ? 2 : Math.abs(right - left), vertical ? Math.abs(bottom - top) : 2);
  } else {
    ctx.fillRect(Math.round(Math.min(left, right)), Math.round(Math.min(top, bottom)),
      Math.max(1, Math.round(Math.abs(right - left))), Math.max(1, Math.round(Math.abs(bottom - top))));
  }
  ctx.restore();
}