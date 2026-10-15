// Browser game module for pacing.
export const canSpawnEncounter = (frame: number, lastFrame: number, living: number, harder = false): boolean =>
  living < (harder ? 8 : 4) && frame - lastFrame >= (harder ? 75 : 210);

export const WARMUP_CANDLES = 1200; // 60 s at 3 px/frame, 60 Hz and 9 px/candle.
export const DIFFICULTY_PIPS = 600;
export const difficultyUnlocked = (pips: number): boolean => pips >= DIFFICULTY_PIPS;

export const ZERO_PRICE_DEPTH = 1600;
export const marketReachedZero = (y: number, baseline: number): boolean => y >= baseline + ZERO_PRICE_DEPTH;

// Finite zero boundary, with no negative axis prices.
export const chartPrice = (y: number, baseline: number): number =>
  Math.max(0, 25 * (Math.exp(Math.max(-20, Math.min(20, (baseline - y) / 400))) - Math.exp(-4)) / (1 - Math.exp(-4)));

export const shouldPlaceBell = (rise: number, index: number, lastBell: number, roll: number): boolean =>
  rise >= 140 && index >= WARMUP_CANDLES && index - lastBell >= 850 && (lastBell === 0 || roll < 0.08 || index - lastBell >= 2200);