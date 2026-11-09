// Browser game module for candleSurprise.
import type { Candle } from './types';
import { randomDelay } from './randomTiming';

export const SURPRISE_MIN_GAP = 7;
export const SURPRISE_MAX_GAP = 10;
export const SURPRISE_RETRY_FRAMES = 120;
export const candleSurpriseDelay = (random = Math.random): number => randomDelay(240, 600, random);

// Only mutate a quiet, solid stretch with a safe approach and landing.
export function applyCandleSurprise(candles: Candle[], index: number, gap: number, extension: number): boolean {
  if (!Number.isInteger(gap) || gap < SURPRISE_MIN_GAP || gap > SURPRISE_MAX_GAP) return false;
  const candle = candles[index];
  if (!candle || candle.o === candle.c || index < 6) return false;
  const section = candles.slice(index - 6, index + gap + 5);
  if (section.length !== gap + 11 || section.some(c => c.hole || c.doubleJumpBarrier || c.sp || c.shock)) return false;
  const heights = section.map(c => c.top);
  if (Math.max(...heights) - Math.min(...heights) > 12) return false;
  const amount = Math.max(20, Math.min(candle.c < candle.o ? 40 : 120, extension));
  if (candle.c < candle.o) {
    candle.c -= amount;
    candle.top = candle.c;
    candle.h = Math.min(candle.h, candle.top - 3);
    candle.doubleJumpBarrier = true;
  } else {
    candle.c += amount;
    candle.bot = candle.c;
    candle.l = Math.max(candle.l, candle.bot + 3);
  }
  for (let i = index + 1; i <= index + gap; i++) {
    candles[i] = { ...candles[i], hole: true, top: 1e9, bot: -1e9, sp: false, v: 0, k: 'Surprise gap' };
  }
  return true;
}