// Browser game module for tenderFall.
import type { Candle, Pickup } from './types';

// Leave coin-like clearance above the entire icon footprint, including
// neighbouring candle bodies and wicks, not just one narrow candle column.
export function tenderLanding(candles: Candle[], x: number, candleWidth: number): { x: number; y: number } | null {
  const origin = Math.floor(x / candleWidth);
  for (let distance = 0; distance < candles.length; distance++) {
    for (const index of distance === 0 ? [origin] : [origin + distance, origin - distance]) {
      const candle = candles[index];
      if (candle && !candle.hole && Number.isFinite(candle.top)) {
        const radius = Math.ceil(22 / candleWidth);
        const neighbours = candles.slice(Math.max(0, index - radius), index + radius + 1)
          .filter(c => !c.hole && Number.isFinite(c.top));
        const visibleTop = Math.min(...neighbours.map(c =>
          Number.isFinite(c.h) ? Math.min(c.top, c.h) : c.top));
        return { x: index * candleWidth + candleWidth / 2, y: visibleTop - 85 };
      }
    }
  }
  return null;
}

export function stepTenderFall(pickup: Pickup, targetY: number): void {
  if (pickup.vy === undefined) { pickup.y = targetY; return; }
  pickup.vy += 0.3;
  pickup.y = Math.min(targetY, pickup.y + pickup.vy);
  pickup.rotation = (pickup.rotation ?? 0) + 0.16;
  if (pickup.y >= targetY) {
    pickup.vy = undefined;
    pickup.rotation = 0;
  }
}