// Regression checks for dismount.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aimedHitDefeatsEnemy, dismountRider } from './gameRules';
import { animalFallsInGap } from './track';
import { enemyPips } from './scoring';
import type { Animal, Candle } from './types';

test('first projectile knocks off either rider and leaves its mount as a normal enemy', () => {
  for (const type of ['bull', 'bear'] as const) {
    const mount = type === 'bull' ? 'bear' : 'bull';
    const enemy: Animal = { type, mount, x: 15, feet: 200, y: 153, phase: 1, dead: false, attackTimer: 12 };
    assert.equal(aimedHitDefeatsEnemy(enemy), false);
    const rider = dismountRider(enemy)!;
    assert.equal(rider.type, type);
    assert.equal(rider.mount, undefined);
    assert.equal(rider.dying, true);
    assert.equal(rider.feet, 162);
    assert.equal(enemy.type, mount);
    assert.equal(enemy.mount, undefined);
    assert.equal(enemy.feet, 200);
    assert.equal(enemy.dying, undefined);
    assert.equal(enemy.attackTimer, 0);
    assert.equal(enemyPips(rider) + enemyPips(enemy), 100);
    assert(animalFallsInGap(enemy, [{ top: 100 }, { hole: true }] as Candle[], 10));
    assert(aimedHitDefeatsEnemy(enemy));
    assert.equal(dismountRider(enemy), null);
  }
});