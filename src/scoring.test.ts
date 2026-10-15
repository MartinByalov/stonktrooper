// Regression checks for scoring.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { enemyPips, activityMultiplier } from './scoring';
import type { Animal, Swan } from './types';

test('enemy rewards distinguish riders whales and each bird', () => {
  assert.equal(enemyPips({ type: 'bull' } as Animal), 50);
  assert.equal(enemyPips({ type: 'bear', mount: 'bull' } as Animal), 100);
  assert.equal(enemyPips({ type: 'whale' } as Animal), 500);
  assert.equal(enemyPips({ kind: 'swan' } as Swan), 200);
  assert.equal(enemyPips({ kind: 'white' } as Swan), 200);
  assert.equal(enemyPips({ kind: 'pigeon' } as Swan), 150);
  assert.equal(enemyPips({ kind: 'hawk' } as Swan), 150);
});

test('activity multipliers apply at award time with printer taking priority', () => {
  assert.equal(activityMultiplier(0, 0), 1);
  assert.equal(activityMultiplier(0, 600), 2);
  assert.equal(activityMultiplier(600, 0), 10);
  assert.equal(activityMultiplier(600, 600), 10);
  assert.equal(250 * activityMultiplier(600, 0), 2500);
});