import type { Candle } from './types';

// Render-only market history. Never insert it into the playable chart or its
// event/pickup generators; negative indices must not affect run progression.
export function chartHistory(candles: Candle[], index: number): Candle | undefined {
  if (index >= 0) return candles[index];
  const count = Math.min(28, candles.length);
  if (!count) return undefined;
  const slot = ((index % count) + count) % count;
  const source = candles[slot];
  const shift = Math.floor(index / count) * (candles[count - 1].c - candles[0].o);
  return {
    ...source,
    o: source.o + shift, c: source.c + shift,
    h: source.h + shift, l: source.l + shift,
    top: source.top + shift, bot: source.bot + shift,
    hole: false, sp: false, shock: false, doubleJumpBarrier: false,
  };
}