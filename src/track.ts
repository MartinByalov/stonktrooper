// Browser game module for track.
import type { Candle, Animal } from './types';

// Rocket smoothing must never leave the pilot inside a tall candle. Include
// the whole landing footprint, not just interpolated candle centres.
export function rocketTrackPose(candles: Candle[], x: number, width: number, y: number) {
  let ceiling = Infinity;
  const first = Math.max(0, Math.floor((x - 7) / width));
  const last = Math.min(candles.length - 1, Math.floor((x + 7) / width));
  for (let i = first; i <= last; i++) {
    if (candles[i] && !candles[i].hole) ceiling = Math.min(ceiling, candles[i].top);
  }
  const target = trackHeightAt(candles, x, width, y);
  return { y: Math.min(y + (target - y) * 0.25, ceiling), solid: Number.isFinite(ceiling) };
}

export const animalFallsInGap = (animal: Pick<Animal, 'type' | 'mount' | 'x'>, candles: Candle[], candleWidth: number): boolean =>
  animal.type !== 'whale' && !animal.mount && !!candles[Math.floor(animal.x / candleWidth)]?.hole;

// Ground enemies leap between the solid candle centres bordering each gap.
export const animalTrackHeightAt = (type: Animal['type'], candles: Candle[], x: number, candleWidth: number, fallback: number): number => {
  const base = trackHeightAt(candles, x, candleWidth, fallback);
  const position = x / candleWidth - 0.5;
  let left = Math.floor(position);
  let right = Math.ceil(position);
  while (left >= 0 && candles[left]?.hole) left--;
  while (right < candles.length && candles[right]?.hole) right++;
  if (!candles[left] || !candles[right] || right - left <= 1) return base;
  const progress = Math.max(0, Math.min(1, (position - left) / (right - left)));
  const height = Math.min(100, 35 + (right - left - 1) * 5);
  return base - 4 * height * progress * (1 - progress);
};

// Sample the candle tops, bridging missing candles without using gap sentinel values.
export const trackHeightAt = (candles: Candle[], x: number, candleWidth: number, fallback: number): number => {
  const position = x / candleWidth - 0.5;
  let left = Math.min(candles.length - 1, Math.floor(position));
  let right = Math.max(0, Math.ceil(position));
  while (left >= 0 && (!candles[left] || candles[left].hole)) left--;
  while (right < candles.length && (!candles[right] || candles[right].hole)) right++;
  const before = candles[left];
  const after = candles[right];
  if (!before) return after?.top ?? fallback;
  if (!after) return before.top;
  if (left === right) return before.top;
  const fraction = Math.max(0, Math.min(1, (position - left) / (right - left)));
  return before.top + (after.top - before.top) * fraction;
};