// Regression checks for hawkTrack.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hawkCandle, HAWK_DOWN_SLOPE, HAWK_ROUTE_CANDLES, hawkDropBudget, hawkSpeedMultiplier } from './hawkTrack';
import type { Candle } from './types';
import { readFileSync } from 'node:fs';
import { plotViewY } from './aim';

test('Hawk cargo reduces empty-cart speed by ten percent per bag with a sixty percent cap', () => {
  const empty = hawkSpeedMultiplier(600, 0);
  assert.equal(empty, 1.35);
  for (let bags = 1; bags <= 6; bags++) {
    assert(Math.abs(hawkSpeedMultiplier(600, bags) - empty * (1 - bags * 0.1)) < 1e-12);
    assert(hawkSpeedMultiplier(600, bags) < hawkSpeedMultiplier(600, bags - 1));
  }
  assert.equal(hawkSpeedMultiplier(600, 100), hawkSpeedMultiplier(600, 6));
  assert(hawkSpeedMultiplier(600, 100) > 0);
  assert.equal(hawkSpeedMultiplier(600, -1), empty);
});

test('leaving Hawk restores normal speed even with stale cargo and rocket keeps its own speed', () => {
  for (const bags of [0, 1, 6, 100]) {
    assert.equal(hawkSpeedMultiplier(0, bags), 1);
    assert.equal(hawkSpeedMultiplier(-1, bags), 1);
  }
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /const sp = speedAt\(currentIdx\) \* \(isRocketMode \? ROCKET_SPEED_MULTIPLIER : hawkSpeedMultiplier\(g\.hawkTimer, g\.hawkBags\)\);/);
});

test('chicken tender preserves the view or commits the chosen Pigeon exit when interrupting', () => {
  const source = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  const start = source.indexOf('const activateHawk = useCallback(() => {');
  assert(start >= 0);
  const bodyStart = source.indexOf('{', start) + 1;
  const bodyEnd = source.indexOf('}, []);', bodyStart);
  const activate = new Function('gameRef', 'aimRef', 'CW', 'hawkDropBudget', 'MARKET_BASELINE', source.slice(bodyStart, bodyEnd));
  const candle: Candle = { o: 320, c: 300, top: 300, bot: 320, h: 290, l: 325, v: 0.7, k: 'Original' };
  for (const inverted of [false, true]) {
    for (const pigeon of [false, true]) {
      const saved = [candle];
      const g = {
        p: { x: 900, y: 300 }, hawkTimer: 0, invertedView: inverted,
        printerExitInverted: !inverted, printerSaved: pigeon ? saved : null,
        C: [candle], printerTimer: pigeon ? 300 : 0, printerRotation: pigeon ? 1 : 0,
        hawkBudget: 0, hawkStartIndex: 0, hawkFrontier: 0, hawkBags: 2,
        cases: [{}], throwAnimTimer: 10,
      };
      const aim = { current: { x: 100, y: 200 } as { x: number; y: number } | null };
      activate({ current: g }, aim, 9, hawkDropBudget, 320);
      const expected = pigeon ? !inverted : inverted;
      assert.equal(g.invertedView, expected);
      assert.equal(g.printerExitInverted, expected);
      assert.equal(g.hawkTimer, 600);
      assert.equal(g.printerTimer, 0);
      assert.equal(g.printerSaved, null);
      assert.equal(g.printerRotation, 0);
      assert.equal(aim.current, null);
      assert.deepEqual(g.C, saved);
      const shifted = hawkCandle(candle, 50, g.hawkBudget);
      const delta = plotViewY(shifted.top, g.invertedView, 44, 828) - plotViewY(candle.top, g.invertedView, 44, 828);
      assert(expected ? delta < 0 : delta > 0, 'Hawk slides up only in Inverted');
    }
  }
});

test('hawk tilts irregular connected candles without flattening or removing gaps', () => {
  const source: Candle = { o: 320, c: 300, top: 300, bot: 320, h: 290, l: 325, v: 0.7, sp: true, k: 'Original' };
  const result = hawkCandle(source, 10);
  assert.equal(result.top, 380);
  assert.equal(result.c - result.o, source.c - source.o);
  assert.equal(result.top - result.h, 10);
  assert.equal(result.sp, true);
  const gap = { ...source, hole: true, top: 1e9 };
  assert.equal(hawkCandle(gap, 10), gap);
  const rebound = hawkCandle({ ...source, top: 270 }, 11);
  assert(rebound.top < result.top);
  assert.equal(source.top, 300);
});

test('hawk keeps the stronger downhill bias across the whole ten-second route', () => {
  const source: Candle = { o: 320, c: 300, top: 300, bot: 320, h: 290, l: 325, v: 0.7, k: 'Original' };
  // At 3 px/frame and 9 px/candle, ten seconds covers 200 candles.
  for (const distance of [1, 50, 100, 150, 200, 250]) {
    assert.equal(hawkCandle(source, distance).top - source.top, Math.min(distance, HAWK_ROUTE_CANDLES) * HAWK_DOWN_SLOPE);
  }
  assert.equal(HAWK_DOWN_SLOPE, 8);
});

test('after the hawk section the random upward trend continues without accumulating decline', () => {
  const source: Candle = { o: 320, c: 300, top: 300, bot: 320, h: 290, l: 325, v: 0.7, k: 'Original' };
  const budget = hawkDropBudget(300, 1920);
  assert(300 + budget < 1920 - 180);
  const end = hawkCandle(source, 200, budget);
  const future = hawkCandle({ ...source, top: 250 }, 600, budget);
  assert.equal(end.top - future.top, 50);
  assert.equal(hawkCandle(source, 2000, budget).top, end.top);
  assert.equal(hawkDropBudget(1900, 1920), 0);
});