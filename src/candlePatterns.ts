// Headless OHLC pattern sampling shared by browser and Node; the caller owns the random stream.
type Pattern = readonly [string, number, (volatility: number, random: () => number) => [number, number, number]];
export const CANDLE_PATTERNS: readonly Pattern[] = [
  ['Candle', 35, (v, r) => [v * (.35 + r() * .65), r() * .5 * v, r() * .5 * v]],
  ['Marubozu', 10, (v, r) => [(.8 + r() * .8) * v, 0, 0]],
  ['Doji', 8, (v, r) => [0, 3 + r() * .5 * v, 3 + r() * .5 * v]],
  ['Long-legged Doji', 4, (v, r) => [0, (.5 + r() * .5) * v, (.5 + r() * .5) * v]],
  ['Dragonfly Doji', 3, (v, r) => [0, 0, (.6 + r() * .6) * v]],
  ['Gravestone Doji', 3, (v, r) => [0, (.6 + r() * .6) * v, 0]],
  ['Hammer', 7, (v, r) => [2 + r() * .3 * v, r() * 1.2, (1.1 + r() * .7) * v]],
  ['Shooting Star', 6, (v, r) => [2 + r() * .3 * v, (1.1 + r() * .7) * v, r() * 1.2]],
  ['Spinning Top', 6, (v, r) => [2 + r() * .25 * v, (.4 + r() * .4) * v, (.4 + r() * .4) * v]],
  ['Engulfing', 7, (v, r) => [(1.2 + r() * .7) * v, r() * .3 * v, r() * .3 * v]],
];

export function pickCandlePattern(crash: boolean, random: () => number): Pattern {
  const weights = CANDLE_PATTERNS.map(pattern => pattern[1]
    * (crash && (pattern[0] === 'Marubozu' || pattern[0] === 'Engulfing') ? 3 : 1));
  let roll = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return CANDLE_PATTERNS[i];
  }
  return CANDLE_PATTERNS[0];
}