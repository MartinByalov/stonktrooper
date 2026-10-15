// Regression checks for pacing.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { canSpawnEncounter, shouldPlaceBell, chartPrice, marketReachedZero, ZERO_PRICE_DEPTH, WARMUP_CANDLES, difficultyUnlocked } from './pacing';

test('terrain hazards occur more often without removing approach and flat-ground safeguards', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.equal((game.match(/randomDelay\(420, 1200\)/g) ?? []).length, 3);
  assert.match(game, /!tallApproach && i > 65 && i - g.lastHole > 40 && Math.random\(\) < 0\.032 && flat6\(i\)/);
  assert.match(game, /g.nextTallCandle = i \+ randomDelay\(65, 160\)/);
  assert.match(game, /const first = Math.ceil\(\(g.p.x \+ 500\) \/ CW\)/);
});

test('encounters have a shared quiet interval and living enemy cap', () => {
  assert(!canSpawnEncounter(209, 0, 0));
  assert(canSpawnEncounter(210, 0, 3));
  assert(!canSpawnEncounter(1000, 0, 4));
});

test('difficulty starts at six hundred earned pips instead of elapsed time', () => {
  assert(!difficultyUnlocked(599));
  assert(difficultyUnlocked(600));
  assert(difficultyUnlocked(2500));
});

test('harder phase allows denser encounters while retaining a cap and quiet interval', () => {
  assert(canSpawnEncounter(75, 0, 7, true));
  assert(!canSpawnEncounter(74, 0, 0, true));
  assert(!canSpawnEncounter(1000, 0, 8, true));
  assert(!canSpawnEncounter(150, 0, 4, false));
});

test('bell accepts actual tall candles but stays spaced and avoids endless droughts', () => {
  assert(shouldPlaceBell(145, 1300, 0, 0.99));
  assert(!shouldPlaceBell(139, 3000, 0, 0));
  assert(!shouldPlaceBell(165, 500, 0, 0));
  assert(!shouldPlaceBell(165, 1000, 0, 0.9));
  assert(shouldPlaceBell(165, 2200, 0, 0.9));
});

test('price axis stays positive during steep declines and warmup lasts about a minute', () => {
  for (const y of [-1000, 320, 800, 3000, 10000]) assert(chartPrice(y, 320) >= 0);
  assert(chartPrice(800, 320) > chartPrice(1200, 320));
  assert.equal(WARMUP_CANDLES * 9 / (3 * 60), 60);
});

test('zero crash has an exact finite threshold without negative prices', () => {
  const zero = 320 + ZERO_PRICE_DEPTH;
  assert(!marketReachedZero(zero - 1, 320));
  assert(marketReachedZero(zero, 320));
  assert.equal(chartPrice(zero, 320), 0);
  assert.equal(chartPrice(zero + 100, 320), 0);
  assert.equal(chartPrice(320, 320), 25);
});