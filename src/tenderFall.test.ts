// Regression checks for tenderFall.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stepTenderFall, tenderLanding } from './tenderFall';
import type { Candle, Pickup } from './types';

test('tender keeps floating clearance above higher neighbouring candles', () => {
  const candles = [{ top: 200 }, { top: 400 }, { top: 250 }] as Candle[];
  assert.deepEqual(tenderLanding(candles, 8, 9), { x: 4.5, y: 115 });
  assert.deepEqual(tenderLanding(candles, 13, 9), { x: 13.5, y: 115 });
});

test('tender over a gap moves to a solid candle instead of settling inside the chart', () => {
  const candles = [{ top: 200 }, { top: 1e9, hole: true }, { top: 240 }] as Candle[];
  assert.deepEqual(tenderLanding(candles, 13.5, 9), { x: 22.5, y: 115 });
  assert.equal(tenderLanding([], 0, 9), null);
});

test('tender stays above long wicks and follows changed candle geometry', () => {
  const candles = [{ top: 320, h: 250 }, { top: 320, h: 315 }] as Candle[];
  assert.equal(tenderLanding(candles, 13.5, 9)?.y, 165);
  candles[0].h = 180;
  assert.equal(tenderLanding(candles, 13.5, 9)?.y, 95);
});

test('tender spins while falling and settles at the floating banana and coin height', () => {
  for (const offset of [85]) {
    const tender: Pickup = { type: 'tender', x: 0, y: 100, taken: false, vy: 1, rotation: 0 };
    stepTenderFall(tender, 320 - offset);
    assert(tender.y > 100);
    assert((tender.rotation ?? 0) > 0);
    for (let frame = 0; frame < 120; frame++) stepTenderFall(tender, 320 - offset);
    assert.equal(tender.y, 320 - offset);
    assert.equal(tender.vy, undefined);
    assert.equal(tender.rotation, 0);
  }
});