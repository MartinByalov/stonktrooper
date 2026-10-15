// Regression checks for companions.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addCompanion, tickCompanions, ApeCompanion } from './companions';
import { canRecoverSolidLanding, bagDrainPenalty } from './gameRules';

test('bag makes net pips decrease despite track and pickup gains, without negative pips', () => {
  let raw = 1000, penalty = 0;
  for (let frame = 1; frame <= 300; frame++) {
    const previous = raw;
    raw += frame % 2 === 0 ? 1 : 0;
    if (frame === 50) raw += 10;
    penalty = bagDrainPenalty(previous, raw, penalty, frame % 3 === 0 ? 1 : 0);
    assert.equal(raw - penalty, 1000 - Math.floor(frame / 3));
  }
  assert.equal(bagDrainPenalty(0, 0, 0, 1), 0);
});

test('solid candles recover a descending runner but never a rising jump or tall barrier', () => {
  assert(canRecoverSolidLanding(false, 15, 450, 300));
  assert(!canRecoverSolidLanding(false, -5, 450, 300));
  assert(!canRecoverSolidLanding(true, 15, 450, 300));
  assert(!canRecoverSolidLanding(false, 15, 250, 300));
  assert(!canRecoverSolidLanding(false, 15, 450, 300, true), 'gap falls cannot snap back up onto the far bank');
});

test('two helpers have independent timers and a third banana cannot refresh either', () => {
  let apes: ApeCompanion[] = [];
  assert(addCompanion(apes, 600));
  for (let frame = 0; frame < 100; frame++) apes = tickCompanions(apes, false);
  assert(addCompanion(apes, 600));
  assert.deepEqual(apes.map(ape => ape.timer), [500, 600]);
  assert(!addCompanion(apes, 600));
  assert.deepEqual(apes.map(ape => ape.timer), [500, 600]);
  for (let frame = 0; frame < 500; frame++) apes = tickCompanions(apes, false);
  assert.deepEqual(apes.map(ape => ape.timer), [100]);
  assert(addCompanion(apes, 600));
  assert.equal(apes.length + 1, 3);
});

test('rocket preserves both independent timers while throwing animations continue', () => {
  const apes = [{ timer: 123, cooldown: 10, throwTimer: 5, direction: 1 }, { timer: 456, cooldown: 0, throwTimer: 2, direction: -1 }];
  const result = tickCompanions(apes, true);
  assert.deepEqual(result.map(ape => ape.timer), [123, 456]);
  assert.deepEqual(result.map(ape => ape.throwTimer), [4, 1]);
});