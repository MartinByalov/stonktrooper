// Shared Bell projectile clipping; independent of Android services and framing.
export function clipBriefcaseStep(x: number, y: number, nextX: number, nextY: number, right: number) {
  if (x >= right) return { x: right, y, expired: true };
  if (nextX < right) return { x: nextX, y: nextY, expired: false };
  const fraction = (right - x) / (nextX - x);
  return { x: right, y: y + (nextY - y) * fraction, expired: true };
}