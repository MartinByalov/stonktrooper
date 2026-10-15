// Regression checks for marketRandomness.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extendMarketPath, extendMarketRegimes, MARKET_BASELINE, type MarketKnot, type MarketRegime } from './marketPath';
import { randomDelay } from './randomTiming';

const seededRandom = (seed: number) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};

test('independent market runs contain corrections, varied lengths and long-term growth', () => {
  const signatures = new Set<string>();
  for (let seed = 1; seed <= 80; seed++) {
    const knots: MarketKnot[] = [];
    extendMarketPath(knots, 100000, seededRandom(seed));
    assert(knots[knots.length - 1].height < MARKET_BASELINE - 30000);
    assert(knots.some((knot, i) => i > 0 && knot.height > knots[i - 1].height));
    assert(new Set(knots.slice(1).map((knot, i) => knot.index - knots[i].index)).size > 50);
    signatures.add(JSON.stringify(knots.slice(0, 12)));
  }
  assert.equal(signatures.size, 80);
});

test('regime transitions can select any other regime, not a fixed successor', () => {
  const successors = new Set<number>();
  for (const roll of [0, 0.4, 0.9]) {
    const regimes: MarketRegime[] = [{ start: 0, end: 10, level: 1 }];
    extendMarketRegimes(regimes, 10, () => roll);
    successors.add(regimes[1].level);
  }
  assert.deepEqual([...successors].sort(), [0, 2, 3]);
});

test('random event delays preserve safety spacing but include short and long waits', () => {
  const random = seededRandom(42);
  const delays = Array.from({ length: 1000 }, () => randomDelay(80, 400, random));
  assert(delays.every(delay => delay >= 80 && Number.isFinite(delay)));
  assert(Math.min(...delays) < 100);
  assert(Math.max(...delays) > 1000);
  assert(new Set(delays).size > 300);
});