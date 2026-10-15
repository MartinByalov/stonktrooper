// Regression checks for printerTrack.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extendPrinterTurns, twistPrinterCandle, printerCrossingPose, printerLoopPose, printerLoopCandle, printerCorridorCandle, PRINTER_CLEARANCE, printerCeilingCandle, printerFloorAt, PrinterTurn } from './printerTrack';
import type { Candle } from './types';
import { endingPrinterCandle, printerEnemyPose, printerProfileFlip, printerSourceCandle, rightEdgeSpawnX } from './printerTrack';
import { plotViewY } from './aim';
import { readFileSync } from 'node:fs';

test('both Pigeon exits keep a fixed view as the opposite visible boundary ends', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  const activation = game.slice(game.indexOf('const activatePrinter ='), game.indexOf('const awardEnemy ='));
  assert.match(activation, /g\.invertedView = g\.printerExitInverted/);
  const movement = game.slice(game.indexOf('const printerActive ='), game.indexOf('} else if (isRocketMode)'));
  assert.doesNotMatch(movement, /g\.invertedView\s*=/, 'no late whole-screen flip');
  const turns: PrinterTurn[] = [];
  extendPrinterTurns(turns, 2400, () => 0.4);
  const source: Candle = { o: 340, c: 300, top: 300, bot: 340, h: 288, l: 359, v: 0.7, k: 'Original' };
  for (const inverted of [false, true]) {
    for (let x = 1740; x <= 1800; x++) {
      const continuing = endingPrinterCandle(source, x, 0, 1800, turns, 1);
      const ending = endingPrinterCandle(source, x, 0, 1800, turns, -1);
      const view = (y: number) => plotViewY(y, inverted, 44, 828);
      assert.equal(view(continuing.top) < view(ending.top), inverted);
      const pose = printerCrossingPose(continuing, ending);
      const head = pose.y - Math.cos(pose.rotation) * 48;
      assert.equal(view(head) > view(pose.y), inverted, 'runner is below upper boundary only for Inverted');
    }
  }
});

test('inverted Pigeon keeps the visible upper chart and ends the lower chart without an exit view flip', () => {
  const turns: PrinterTurn[] = [];
  extendPrinterTurns(turns, 2400, () => 0.4);
  const source: Candle = { o: 340, c: 300, top: 300, bot: 340, h: 288, l: 359, v: 0.7, k: 'Original' };
  for (const inverted of [false, true]) {
    const continuing = endingPrinterCandle(source, 1800, 0, 1800, turns, 1);
    const tail = endingPrinterCandle(source, 1800, 0, 1800, turns, -1);
    const continuingY = plotViewY(continuing.top, inverted, 44, 828);
    const tailY = plotViewY(tail.top, inverted, 44, 828);
    assert.equal(continuingY < tailY, inverted);
    assert.equal(continuingY, plotViewY(source.top, inverted, 44, 828));
    const before = endingPrinterCandle(source, 1799, 0, 1800, turns, 1);
    assert(Math.abs(plotViewY(before.top, inverted, 44, 828) - continuingY) < 0.1);
  }
});

test('spatial printer exit joins lower candles continuously and sends the upper tail away', () => {
  const turns: PrinterTurn[] = [];
  extendPrinterTurns(turns, 2400, () => 0.4);
  const source: Candle = { o: 340, c: 300, top: 300, bot: 340, h: 288, l: 359, v: 0.7, k: 'Original' };
  const end = 1800;
  const lower = endingPrinterCandle(source, end, 0, end, turns, 1);
  assert.equal(lower.top, source.top);
  assert.equal(lower.c, source.c);
  assert.equal(endingPrinterCandle(source, end, 0, end, turns, -1).top, source.top - 450);
  assert(Math.abs(endingPrinterCandle(source, end - 1, 0, end, turns, 1).top - lower.top) < 0.1);
});

test('flip then rotate preserves hero rightward and enemy leftward profiles on the ceiling', () => {
  for (const rotation of [0, 0.5, Math.PI, -Math.PI, 2.6, -2.6]) {
    const flip = printerProfileFlip(rotation);
    assert(Math.cos(rotation) * flip > 0);
    assert(-Math.cos(rotation) * flip < 0);
  }
});

test('printer bridges source gaps for rendering and movement without changing saved gaps', () => {
  const solid: Candle = { o: 340, c: 300, top: 300, bot: 340, h: 288, l: 359, v: 0.7, k: 'Original' };
  const gap = { ...solid, hole: true, top: 1e9, bot: 1e9 };
  const candles = [solid, gap, gap, { ...solid, top: 360 }];
  assert.equal(printerSourceCandle(candles, 0), solid);
  for (const index of [1, 2]) {
    const filled = printerSourceCandle(candles, index)!;
    assert(!filled.hole);
    assert(filled.top > 300 && filled.top < 360);
    assert(filled.h < filled.top && filled.l > filled.bot);
    assert.equal(candles[index].hole, true);
    assert.equal(candles[index].top, 1e9);
  }
});

test('printer enemies enter beyond the right edge and share the floor/ceiling attachment', () => {
  assert(rightEdgeSpawnX(500, 1800) > 2300);
  const source: Candle = { o: 340, c: 300, top: 300, bot: 340, h: 288, l: 359, v: 0.7, k: 'Original' };
  const low = { ...source, top: 500, bot: 540 };
  const upright = printerEnemyPose(low, source, 80);
  assert.equal(upright.feet, printerCrossingPose(low, source).y);
  assert.equal(upright.centerY, 460);
  const inverted = printerEnemyPose(source, low, 80);
  assert.equal(inverted.rotation, -Math.PI);
  assert.equal(inverted.centerY, 380);
});

test('printer twists vary in length and radius with random input', () => {
  const first: PrinterTurn[] = [], second: PrinterTurn[] = [];
  extendPrinterTurns(first, 3000, () => 0.2);
  extendPrinterTurns(second, 3000, () => 0.8);
  assert.notDeepEqual(first, second);
});

test('crossing changes the tracked strand from floor to ceiling without changing chart geometry', () => {
  const source: Candle = { o: 340, c: 300, top: 300, bot: 340, h: 288, l: 359, v: 0.7, k: 'Original' };
  const upright = printerCrossingPose({ ...source, top: 500, bot: 540 }, source);
  assert.equal(upright.rotation, 0);
  assert.equal(upright.y, 500);
  const inverted = printerCrossingPose(source, { ...source, top: 500, bot: 540 });
  assert.equal(inverted.rotation, Math.PI);
  assert.equal(inverted.y, source.bot);
  assert(inverted.inverted);
  const crossing = printerCrossingPose(source, source);
  assert.equal(crossing.rotation, Math.PI / 2);
  assert.equal(crossing.y, 320);
  assert.equal(source.top, 300);
});

test('stacked graphs never cross and leave clearance for the whole hero at their narrowest point', () => {
  const turns: PrinterTurn[] = [];
  extendPrinterTurns(turns, 4000, () => 0.4);
  const source: Candle = { o: 340, c: 300, top: 300, bot: 340, h: 288, l: 359, v: 0.7, k: 'Original' };
  for (let x = 0; x < 3000; x += 9) {
    const lower = printerCorridorCandle(source, x, 0, turns, 1);
    const upper = printerCorridorCandle(source, x, 0, turns, -1);
    assert(lower.top - upper.l >= PRINTER_CLEARANCE - 1e-9);
    assert(Math.abs(upper.bot - upper.top - 40) < 1e-9);
    assert.deepEqual(upper, printerCorridorCandle(source, x, 0, turns, -1));
  }
  assert.equal(printerCorridorCandle(source, 0, 0, turns, 1).top - printerCorridorCandle(source, 0, 0, turns, -1).l, PRINTER_CLEARANCE);
});

test('loop charts preserve ordinary upright OHLC candles on both crossing strands', () => {
  const turns: PrinterTurn[] = [];
  extendPrinterTurns(turns, 2000, () => 0.4);
  for (const green of [true, false]) {
    const source: Candle = { o: green ? 340 : 300, c: green ? 300 : 340, top: 300, bot: 340, h: 288, l: 359, v: 0.7, k: 'Original' };
    for (const strand of [1, -1] as const) {
      for (let x = 0; x < 1600; x += 9) {
        const { candle } = printerLoopCandle(source, x, 0, 300, turns, strand);
        assert.equal(candle.c < candle.o, green);
        assert(Math.abs(candle.bot - candle.top - 40) < 1e-9);
        assert(Math.abs(candle.top - candle.h - 12) < 1e-9);
        assert(Math.abs(candle.l - candle.bot - 19) < 1e-9);
        assert.deepEqual(printerLoopCandle(source, x, 0, 300, turns, strand).candle, candle);
      }
    }
  }
});

test('rollercoaster path turns backward and inverts the runner on fixed loops', () => {
  const turns: PrinterTurn[] = [{ x: 0, angle: 0, radius: 250 }, { x: 500, angle: Math.PI * 2, radius: 250 }, { x: 1000, angle: Math.PI * 4, radius: 250 }];
  const poses = Array.from({ length: 100 }, (_, i) => printerLoopPose(i * 10, 0, 300, turns, 1, 62));
  assert(poses.some(pose => Math.abs(pose.rotation) > Math.PI / 2));
  assert(poses.some((pose, i) => i > 0 && pose.x < poses[i - 1].x));
  for (let i = 0; i < poses.length; i++) {
    assert.deepEqual(poses[i], printerLoopPose(i * 10, 0, 300, turns, 1, 62));
    const outer = printerLoopPose(i * 10, 0, 300, turns);
    assert(Math.abs(Math.hypot(outer.x - poses[i].x, outer.y - poses[i].y) - 62) < 1e-9);
  }
});

test('spiral corridor accommodates hero height even at crossings and steep neighbours', () => {
  const turns: PrinterTurn[] = [];
  extendPrinterTurns(turns, 2000, () => 0.4);
  const source: Candle = { o: 340, c: 300, top: 300, bot: 340, h: 288, l: 359, v: 0.7, k: 'Original' };
  for (let x = 0; x < 1800; x += 9) {
    const lower = twistPrinterCandle(source, x, 0, turns, 1);
    const upper = twistPrinterCandle(source, x, 0, turns, -1);
    assert(Number.isFinite(lower.top) && Number.isFinite(upper.l));
    const floor = printerFloorAt([lower, { ...lower, top: lower.top - 130 }, lower], 13, 9, 0);
    assert.equal(floor, lower.top - 130);
    const ceiling = printerCeilingCandle(upper, floor);
    assert(floor - ceiling.l >= 68 - 1e-9);
    assert(Math.abs((ceiling.bot - ceiling.top) - (upper.bot - upper.top)) < 1e-9);
  }
});

test('spiral world geometry remains fixed across repeated frames and turn extensions', () => {
  const turns: PrinterTurn[] = [];
  extendPrinterTurns(turns, 3000, () => 0.4);
  const source: Candle = { o: 340, c: 300, top: 300, bot: 340, h: 288, l: 359, v: 0.7, k: 'Original' };
  const original = twistPrinterCandle(source, 300, 0, turns, 1);
  for (let frame = 0; frame < 600; frame++) {
    extendPrinterTurns(turns, 3000 + frame, () => 0.7);
    assert.deepEqual(twistPrinterCandle(source, 300, 0, turns, 1), original);
    const a = twistPrinterCandle(source, frame * 9, 0, turns, 1);
    const b = twistPrinterCandle(source, frame * 9, 0, turns, -1);
    const floor = Math.max(a.top, b.top);
    const ceiling = printerCeilingCandle(a.top < b.top ? a : b, floor);
    assert(floor - ceiling.l >= 68 - 1e-9);
  }
});
test('strands exchange upper and lower sides away from the local hero opening', () => {
  const turns: PrinterTurn[] = [];
  extendPrinterTurns(turns, 4000, () => 0.4);
  const source: Candle = { o: 340, c: 300, top: 300, bot: 340, h: 288, l: 359, v: 0.7, k: 'Original' };
  const separations = Array.from({ length: 350 }, (_, i) => {
    const x = i * 9;
    return twistPrinterCandle(source, x, 0, turns, 1).top
      - twistPrinterCandle(source, x, 0, turns, -1).top;
  });
  assert(separations.some(value => value > 150));
  assert(separations.some(value => value < -150));
  assert(separations.some(value => Math.abs(value) < 10));
});

test('both printer strands preserve candle color, body and wick geometry', () => {
  const turns: PrinterTurn[] = [];
  extendPrinterTurns(turns, 2000, () => 0.4);
  for (const green of [true, false]) {
    const source: Candle = { o: green ? 340 : 300, c: green ? 300 : 340,
      top: 300, bot: 340, h: 288, l: 359, v: 0.7, k: 'Original' };
    const a = twistPrinterCandle(source, 260, 0, turns, 1);
    const b = twistPrinterCandle(source, 260, 0, turns, -1);
    for (const result of [a, b]) {
      assert.equal(result.c < result.o, green);
      assert(Math.abs(result.bot - result.top - 40) < 1e-9);
      assert(Math.abs(result.top - result.h - 12) < 1e-9);
      assert(Math.abs(result.l - result.bot - 19) < 1e-9);
      assert.equal(result.k, source.k);
    }
    assert(Math.abs((a.top + b.top) / 2 - source.top) < 1e-9);
    assert.deepEqual(source.top, 300);
  }
});