// Browser game module for aim.
export interface AimPoint { x: number; y: number }

// Reflection is its own inverse: use the same mapping for drawing and aiming.
export const plotViewY = (y: number, inverted: boolean, top: number, bottom: number): number =>
  inverted ? top + bottom - y : y;

export const aimedVelocity = (origin: AimPoint, target: AimPoint, speed: number): AimPoint => {
  const dx = target.x - origin.x, dy = target.y - origin.y;
  const length = Math.hypot(dx, dy);
  return length < 0.001 ? { x: speed, y: 0 } : { x: dx / length * speed, y: dy / length * speed };
};

export const pointerToWorld = (client: AimPoint, rect: { left: number; top: number; width: number; height: number }, width: number, height: number, camera: AimPoint): AimPoint => ({
  x: (client.x - rect.left) / rect.width * width + camera.x,
  y: (client.y - rect.top) / rect.height * height + camera.y,
});