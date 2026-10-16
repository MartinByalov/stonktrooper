// Regression checks for birdCargo.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { randomBirdCargo, canReleaseBirdCargo } from './birdCargo';
import { animalFallsInGap } from './track';
import { dismountRider } from './gameRules';
import { animalHeight, drawAnimalCharacter } from './animalRenderer';
import type { Animal, Candle } from './types';

test('birds sometimes carry each animal type', () => {
  assert.equal(randomBirdCargo(() => 0.9), undefined);
  for (const [roll, expected] of [[0, 'bull'], [0.4, 'bear'], [0.8, 'whale']] as const) {
    let first = true;
    assert.equal(randomBirdCargo(() => { if (first) { first = false; return 0; } return roll; }), expected);
  }
});

test('cargo releases only on solid track in the right-hand safe zone', () => {
  const candles = Array.from({ length: 220 }, () => ({ top: 320, hole: false })) as Candle[];
  assert(canReleaseBirdCargo(1300, 0, 250, 1856, 9, candles, 0.8));
  assert(!canReleaseBirdCargo(500, 0, 250, 1856, 9, candles, 0.8));
  assert(!canReleaseBirdCargo(1300, 0, 1000, 1856, 9, candles, 0.8));
  candles[Math.floor(1300 / 9)].hole = true;
  assert(!canReleaseBirdCargo(1300, 0, 250, 1856, 9, candles, 0.8));
});

test('bull and bear whale riders render, survive gaps, and detach from their whale', () => {
  for (const type of ['bear', 'bull'] as const) {
    const animal: Animal = { type, mount: 'whale', x: 13, y: 270, feet: 320, phase: 1, dead: false };
    assert(!animalFallsInGap(animal, [{}, { hole: true }] as Candle[], 9));
    assert.equal(animalHeight(animal), 115);
    let saves = 0, restores = 0;
    const ctx = new Proxy({}, {
      get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {
        if (key === 'save') saves++;
        if (key === 'restore') restores++;
      },
      set: () => true,
    }) as CanvasRenderingContext2D;
    drawAnimalCharacter(ctx, animal);
    assert.equal(saves, restores);
    const rider = dismountRider(animal);
    assert.equal(rider?.type, type);
    assert.equal(animal.type, 'whale');
    assert.equal(animal.mount, undefined);
  }
});

test('bull and bear sit low on the whale with short bent legs', () => {
  for (const type of ['bear', 'bull'] as const) {
    const calls: unknown[][] = [];
    const ctx = new Proxy({}, {
      get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} })
        : (...args: unknown[]) => { calls.push([key, ...args]); },
      set: () => true,
    }) as CanvasRenderingContext2D;
    drawAnimalCharacter(ctx, { type, mount: 'whale', phase: 0, jumpAmount: 0 } as Animal);
    const riderStart = calls.findIndex(call => call[0] === 'translate' && call[1] === 0 && call[2] === -55);
    assert(riderStart >= 0);
    const rider = calls.slice(riderStart);
    assert(rider.some(call => call[0] === 'translate' && call[1] === 0 && call[2] === 20));
    for (const [kneeX, footX, footY] of [[-15, -12, -10], [-19, -16, -6]]) {
      assert(rider.some(call => call[0] === 'lineTo' && call[1] === kneeX));
      assert(rider.some(call => call[0] === 'lineTo' && call[1] === footX && call[2] === footY - 3));
      assert(rider.some(call => call[0] === 'fillRect' && call[1] === footX - 7 && call[2] === footY - 4 && call[3] === 10 && call[4] === 4));
    }
    assert(!rider.some(call => call[0] === 'fillRect' && call[2] === -4 && call[3] === 10 && call[4] === 4));
  }
});

test('direct bird collisions use the diamond shield before killing the player', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  const collisionStart = game.indexOf('for (const s of g.swans) {', game.indexOf('// Collisions with Living Enemies'));
  const collisionEnd = game.indexOf('for (const a of g.animals) {', collisionStart);
  assert(collisionStart >= 0 && collisionEnd > collisionStart);
  const birdCollision = game.slice(collisionStart, collisionEnd);
  assert.match(birdCollision, /if \(!s\.dead && !s\.dying && lethalBirdContact\(s, g\.p\)\)/);
  assert.match(birdCollision, /absorbEnemyHit\(g\.p, s\)/);
  assert.match(game.slice(collisionEnd), /absorbEnemyHit\(g\.p, a\)/);
});