// Regression checks for animalGaps.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { animalFallsInGap } from './track';
import type { Candle } from './types';

test('only unmounted bulls and bears fall into gaps; riders and whales survive', () => {
  const candles = [{ top: 300 }, { hole: true, top: 1e9 }, { top: 320 }] as Candle[];
  for (const type of ['bull', 'bear'] as const) {
    assert(animalFallsInGap({ type, x: 13 }, candles, 9));
    assert(!animalFallsInGap({ type, x: 4 }, candles, 9));
    assert(!animalFallsInGap({ type, mount: type === 'bull' ? 'bear' : 'bull', x: 13 }, candles, 9));
  }
  assert(!animalFallsInGap({ type: 'whale', x: 13 }, candles, 9));
});