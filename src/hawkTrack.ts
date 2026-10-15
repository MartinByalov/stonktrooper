// Browser game module for hawkTrack.
import type { Candle } from './types';

export const HAWK_DOWN_SLOPE = 8;
export const HAWK_ROUTE_CANDLES = 200;
export const hawkDropBudget = (feet: number, zeroY: number): number =>
  Math.max(0, Math.min(HAWK_ROUTE_CANDLES * HAWK_DOWN_SLOPE, (zeroY - feet - 180) * 0.65));

// Tilt the existing irregular market rather than forcing each top below the
// previous top. Bodies, colours, wicks, yellow zones and gaps stay unchanged.
export const hawkCandle = (source: Candle, distance: number, budget = HAWK_ROUTE_CANDLES * HAWK_DOWN_SLOPE): Candle => {
  if (source.hole) return source;
  // Beyond the timed section only translate the old chart: no further tilt.
  const shift = Math.min(HAWK_ROUTE_CANDLES, Math.max(0, distance)) / HAWK_ROUTE_CANDLES * budget;
  return { ...source, o: source.o + shift, c: source.c + shift,
    top: source.top + shift, bot: source.bot + shift, h: source.h + shift, l: source.l + shift };
};