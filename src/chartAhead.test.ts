import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ensureChartAhead } from './chartWindow';
import type { Candle } from './types';

test('chart frontier follows jumps forward and survives restoring Pigeon snapshots', () => {
  const make = (i: number): Candle => ({ o: i, c: i + 1, top: i, bot: i + 1, h: i - 1, l: i + 2, v: 1, k: 'Candle' });
  const g = { C: [] as Candle[], printerSaved: [] as Candle[] | null };
  let generated = 0;
  const generate = (index: number) => { g.C.push(make(index)); generated++; };
  for (let step = 0; step < 100; step++) {
    const x = step * 1700;
    ensureChartAhead(g, x, 1920, 9, generate);
    assert(g.C.length * 9 > x + 1920 / 0.65);
    assert.equal(g.printerSaved!.length, g.C.length);
    g.C = g.printerSaved!.slice();
    const before = generated;
    ensureChartAhead(g, x, 1920, 9, generate);
    assert.equal(generated, before, 'restoring must not lose or regenerate the frontier');
  }
});

test('missing frontier after a shortened chart is refilled and broken generators fail explicitly', () => {
  const g = { C: [] as Candle[], printerSaved: null };
  assert.throws(() => ensureChartAhead(g, 10000, 1920, 9, () => {}), /failed to extend/);
});