import type { Animal } from './types';

export function bellAnimalBounds(animal: Animal): { left: number; right: number; top: number; bottom: number } {
  const wide = animal.type === 'whale' || animal.mount === 'whale';
  const halfWidth = wide ? 60 : animal.mount ? 42 : 25;
  const height = animal.mount === 'whale' ? 115 : animal.mount ? 94 : 60;
  return { left: animal.x - halfWidth, right: animal.x + halfWidth,
    top: animal.feet - height, bottom: animal.feet };
}

// Return the first point along the projectile's path that enters the target.
export function bellSegmentHit(x: number, y: number, nextX: number, nextY: number,
  bounds: { left: number; right: number; top: number; bottom: number }): number | null {
  let enter = 0, exit = 1;
  for (const [origin, delta, min, max] of [
    [x, nextX - x, bounds.left - 8, bounds.right + 8],
    [y, nextY - y, bounds.top - 6, bounds.bottom + 6],
  ]) {
    if (delta === 0) {
      if (origin < min || origin > max) return null;
    } else {
      const a = (min - origin) / delta, b = (max - origin) / delta;
      enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
      if (enter > exit) return null;
    }
  }
  return enter;
}