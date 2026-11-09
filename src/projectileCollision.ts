// DOM-free swept projectile geometry. Callers retain their own hit radii and
// strict/inclusive comparisons so extraction does not change contact policy.
export function segmentPointDistance(
  startX: number, startY: number, endX: number, endY: number,
  centerX: number, centerY: number,
): number {
  const dx = endX - startX, dy = endY - startY;
  const t = Math.max(0, Math.min(1,
    ((centerX - startX) * dx + (centerY - startY) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(startX + t * dx - centerX, startY + t * dy - centerY);
}