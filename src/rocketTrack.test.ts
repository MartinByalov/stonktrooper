import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { rocketTrackPose } from './track';
import type { Candle } from './types';

const candle = (top: number, hole = false): Candle => ({ o: top + 20, c: top, top, bot: top + 20, h: top - 3, l: top + 23, v: 1, k: 'Candle', hole, doubleJumpBarrier: true });

test('rocket cannot lag inside a tall green candle at either edge of its footprint', () => {
  const candles = [candle(300), candle(300), candle(-200), candle(300)];
  for (const x of [12, 18, 22, 27, 33]) {
    const pose = rocketTrackPose(candles, x, 9, 300);
    assert(pose.solid);
    assert(pose.y <= -200);
  }
});

test('rocket bridges gaps without sampling sentinel heights and identifies safe exit ground', () => {
  const candles = [candle(300), ...Array.from({ length: 10 }, () => candle(1e9, true)), candle(-200)];
  let y = 300;
  for (let x = 5; x < 105; x += 2) {
    const pose = rocketTrackPose(candles, x, 9, y);
    assert(Number.isFinite(pose.y) && Math.abs(pose.y) < 1000);
    y = pose.y;
  }
  assert(!rocketTrackPose(candles, 50, 9, y).solid);
  assert(rocketTrackPose(candles, 103, 9, y).solid);
});

test('runner clears gap state in rocket flight and cannot expire over an empty gap', () => {
  const source = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(source, /g\.p\.rocketTimer > 1 \|\| rocketTrackPose\(g\.C, g\.p\.x, CW, g\.p\.y\)\.solid/);
  assert.match(source, /g\.p\.y = rocketTrackPose\(g\.C, g\.p\.x, CW, g\.p\.y\)\.y;\s*g\.gapAirborne = false/);
});