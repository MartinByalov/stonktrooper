// Shared cabins in rocket-local coordinates, seated on the fuselage roof.
export const ROCKET_SEAT_SPACING = 36;
export const rocketSeatCenter = (seat: number) => 2 - seat * ROCKET_SEAT_SPACING;
export const ROCKET_PET_CANOPY = { x: rocketSeatCenter(1), baseY: -13, radiusX: 15, radiusY: 27 } as const;

// The hero and pet use exactly the same silhouette, without axis stretching.
export function traceRocketCanopy(ctx: CanvasRenderingContext2D, x = rocketSeatCenter(0)): void {
  ctx.beginPath();
  ctx.moveTo(x - 15, -13);
  ctx.bezierCurveTo(x - 19, -49, x + 19, -49, x + 15, -13);
  ctx.closePath();
}

export function clipRocketCanopy(ctx: CanvasRenderingContext2D, x = rocketSeatCenter(0)): void {
  traceRocketCanopy(ctx, x);
  ctx.clip();
}

export function drawRocketCanopy(ctx: CanvasRenderingContext2D, x = rocketSeatCenter(0)): void {
  ctx.save();
  ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
  traceRocketCanopy(ctx, x);
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.beginPath();
  ctx.ellipse(x - 9, -29, 1.3, 4, .4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawRocketPetCanopy(ctx: CanvasRenderingContext2D): void {
  drawRocketCanopy(ctx, ROCKET_PET_CANOPY.x);
}