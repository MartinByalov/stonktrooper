// Regression checks for candleSurprise.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyCandleSurprise, SURPRISE_MIN_GAP, SURPRISE_MAX_GAP } from './candleSurprise';
import type { Candle } from './types';
import { candleSurpriseDelay, SURPRISE_RETRY_FRAMES } from './candleSurprise';

test('surprises have a four-second minimum, roughly ten-second mean and short safe retries', () => {
  assert.equal(candleSurpriseDelay(() => 0), 240);
  const delays = Array.from({ length: 10000 }, (_, i) => candleSurpriseDelay(() => (i + 0.5) / 10000));
  assert(delays.every(delay => delay >= 240 && delay <= 1680));
  const mean = delays.reduce((sum, delay) => sum + delay, 0) / delays.length;
  assert(mean > 580 && mean < 610);
  assert.equal(SURPRISE_RETRY_FRAMES, 120);
});

const track = (green: boolean): Candle[] => Array.from({ length: 40 }, () => ({
  o: green ? 330 : 320, c: green ? 320 : 330, top: 320, bot: 330,
  h: 317, l: 333, v: 0.5, k: 'Candle',
}));

test('red surprise extends downward without removing the approach or landing', () => {
  const candles = track(false);
  assert(applyCandleSurprise(candles, 12, 10, 100));
  assert.equal(candles[12].top, 320);
  assert.equal(candles[12].bot, 430);
  assert(candles.slice(13, 23).every(c => c.hole));
  assert(!candles[11].hole && !candles[23].hole);
});

test('green surprise remains within single-jump height and creates seven missing candles', () => {
  const candles = track(true);
  assert(applyCandleSurprise(candles, 12, 7, 200));
  assert.equal(candles[12].top, 280);
  assert(candles[12].doubleJumpBarrier);
  assert.equal(candles.filter(c => c.hole).length, 7);
});

test('surprises reject existing hazards, uneven landing terrain and invalid gaps', () => {
  const candles = track(true);
  candles[15].hole = true;
  assert(!applyCandleSurprise(candles, 12, 7, 40));
  for (const gap of [6, 11, 7.5, NaN]) assert(!applyCandleSurprise(track(true), 12, gap, 40));
  const uneven = track(false); uneven[16].top = 250;
  assert(!applyCandleSurprise(uneven, 12, 10, 100));
  const landing = track(false); landing[25].sp = true;
  const before = structuredClone(landing);
  assert(!applyCandleSurprise(landing, 12, 10, 100));
  assert.deepEqual(landing, before, 'unsafe extended landing is rejected without mutation');
});

test('every larger gap retains six approach and four landing candles', () => {
  for (const green of [false, true]) {
    for (let gap = SURPRISE_MIN_GAP; gap <= SURPRISE_MAX_GAP; gap++) {
      const candles = track(green);
      assert(applyCandleSurprise(candles, 12, gap, 100));
      assert.equal(candles.filter(c => c.hole).length, gap);
      assert(candles.slice(6, 12).every(c => !c.hole));
      assert(candles.slice(13 + gap, 17 + gap).every(c => !c.hole));
    }
  }
});

test('largest surprise gap fits within a single unheld jump with landing clearance', () => {
  let y = 0, velocity = -9.2, frames = 0;
  do { velocity += 0.52; y += velocity; frames++; } while (y < 0 && frames < 120);
  // Maximum gap plus the raised green column and one landing candle.
  assert(frames * 3.3 > (SURPRISE_MAX_GAP + 2) * 9);
});