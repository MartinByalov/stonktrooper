import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { trackPickupDelay } from './pickupTiming';

test('regular track pickups have longer minimum and typical gaps in both phases', () => {
  const former = {
    coin: { normal: [15, 52], hard: [5, 16] },
    banana: { normal: [100, 560], hard: [100, 290] },
    fedora: { normal: [180, 420], hard: [180, 420] },
  } as const;
  for (const type of ['coin', 'banana', 'fedora'] as const) {
    for (const phase of ['normal', 'hard'] as const) {
      assert(trackPickupDelay(type, phase, () => 0) > former[type][phase][0]);
      assert(trackPickupDelay(type, phase, () => 1 - Math.exp(-1)) > former[type][phase][1]);
      assert(trackPickupDelay(type, phase, () => 0.95) > trackPickupDelay(type, phase, () => 0.2));
    }
  }
});

test('first pickups stay available and regular generation uses the spacing schedule', () => {
  for (const type of ['coin', 'banana', 'fedora'] as const) {
    assert(trackPickupDelay(type, 'first', () => 0) > 0);
  }
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  for (const type of ['coin', 'banana', 'fedora'] as const) {
    assert.match(game, new RegExp(`trackPickupDelay\\('${type}', g\\.difficultyActive \\? 'hard' : 'normal'\\)`));
    assert.match(game, new RegExp(`trackPickupDelay\\('${type}', 'first'\\)`));
  }
  assert.match(game, /g\.nextCoinIndex = Math\.min\(g\.nextCoinIndex, g\.C\.length \+ 25\)/);
  assert.match(game, /if \(i % 3 !== 0\) continue;/);
});