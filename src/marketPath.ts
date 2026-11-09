// Browser game module for marketPath.
export interface MarketKnot { index: number; height: number; volatility: number }
export const MARKET_BASELINE = 320;

export interface MarketRegime { start: number; end: number; level: number }

export const extendMarketRegimes = (segments: MarketRegime[], index: number, random = Math.random): void => {
  while (!segments.length || segments[segments.length - 1].end <= index) {
    const previous = segments[segments.length - 1];
    const start = previous?.end ?? 0;
    const choices = [0, 1, 2, 3].filter(level => level !== previous?.level);
    const level = choices[Math.floor(random() * choices.length)];
    segments.push({ start, end: start + 20 + Math.floor(random() * random() * 300), level });
  }
};

export const marketRegimeAt = (segments: MarketRegime[], index: number): number => {
  const segment = segments[intervalAt(segments, index, segment => segment.start)];
  return segment && index < segment.end ? segment.level : 0;
};

// Last boundary at or before index. Avoid a history-sized scan on every frame.
const intervalAt = <T>(items: T[], index: number, boundary: (item: T) => number): number => {
  let left = 0, right = items.length;
  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    if (boundary(items[middle]) <= index) left = middle + 1;
    else right = middle;
  }
  return left - 1;
};

// A volatility window scales patterns, never replaces them with a flat runway.
export const candleVolatilityBoost = (index: number, eventIndex: number): number => {
  const distance = index - eventIndex;
  return distance >= -12 && distance <= 24 ? 2.2 : 1;
};

export const extendMarketPath = (knots: MarketKnot[], index: number, random = Math.random): void => {
  if (!knots.length) knots.push({ index: 0, height: MARKET_BASELINE, volatility: 1 });
  while (knots[knots.length - 1].index <= index + 1) {
    const previous = knots[knots.length - 1];
    const length = 18 + Math.floor(random() * 150);
    // Independent shocks permit both corrections and rallies. Drift is per
    // candle, rather than the same rise repeated at every knot boundary.
    const drift = 0.35 + random() * 0.65;
    const shock = (random() - 0.5) * Math.min(360, length * 8);
    knots.push({
      index: previous.index + length,
      // Canvas Y decreases as price rises. A positive long-run bias still allows corrections.
      height: previous.height - length * drift + shock,
      volatility: 0.7 + random() * 1.8,
    });
  }
};

export const sampleMarketPath = (knots: MarketKnot[], index: number): { height: number; volatility: number } => {
  if (!knots.length) return { height: MARKET_BASELINE, volatility: 1 };
  const left = Math.max(0, intervalAt(knots, index, knot => knot.index));
  const before = knots[left];
  const after = knots[left + 1] ?? before;
  const t = Math.max(0, Math.min(1, (index - before.index) / (after.index - before.index || 1)));
  const smooth = t * t * (3 - 2 * t);
  return { height: before.height + (after.height - before.height) * smooth,
    volatility: before.volatility + (after.volatility - before.volatility) * smooth };
};