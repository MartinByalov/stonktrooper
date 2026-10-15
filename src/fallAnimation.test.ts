// Regression checks for fallAnimation.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drawFallingCharacter } from './assetRenderer';
import { drawAnimalCharacter } from './animalRenderer';
import type { Animal } from './types';

test('front-facing fall alternates hands for human and ape without changing feet', () => {
  for (const [ape, companion] of [[false, false], [true, false], [true, true]]) {
    const hands: number[][] = [];
    const context = new Proxy({}, {
      get: (_, key) => key === 'roundRect' ? (...args: number[]) => hands.push(args) : () => {},
      set: () => true,
    }) as CanvasRenderingContext2D;
    drawFallingCharacter(context, 0, ape, companion);
    const first = hands.map(point => [...point]);
    hands.length = 0;
    drawFallingCharacter(context, 10, ape, companion);
    assert.notDeepEqual(first, hands);
    assert.equal(first[0][1], hands[2][1]);
    assert.equal(first[2][1], hands[0][1]);
  }
});

test('falling normal animals and detached riders render the same unarmed gesture pose', () => {
  for (const type of ['bull', 'bear'] as const) {
    const render = (mount?: 'bull' | 'bear') => {
      const calls: unknown[][] = [];
      const context = new Proxy({}, {
        get: (_, key) => (...args: unknown[]) => { calls.push([key, ...args]); },
        set: () => true,
      }) as CanvasRenderingContext2D;
      drawAnimalCharacter(context, { type, mount, dying: true, attackTimer: 10, phase: 2 } as Animal);
      return calls;
    };
    const normal = render();
    assert.deepEqual(render(type === 'bull' ? 'bear' : 'bull'), normal);
    assert.equal(normal.filter(call => call[0] === 'fillRect').length, 2, 'only shoes, no weapon rectangles');
    assert.equal(normal.filter(call => call[0] === 'roundRect').length, 6, 'two fists and two outlined extended fingers');
  }
});

test('dying bulls and bears keep both gesture hands raised during their spin', () => {
  for (const type of ['bull', 'bear'] as const) {
    const hands: number[][] = [];
    const context = new Proxy({}, {
      get: (_, key) => key === 'roundRect' ? (...args: number[]) => hands.push(args) : () => {},
      set: () => true,
    }) as CanvasRenderingContext2D;
    const animal = { type, dying: true, dieAngle: 0, phase: 0 } as Animal;
    drawAnimalCharacter(context, animal);
    const first = hands.map(point => [...point]);
    hands.length = 0;
    drawAnimalCharacter(context, { ...animal, dieAngle: 8 * 0.22 });
    assert.equal(hands.length, 6);
    assert.deepEqual(first, hands);
    assert.equal(hands[0][1], -65);
    assert.equal(hands[3][1], -65);
    assert.equal(hands[1][1], -78);
    assert.equal(hands[4][1], -78);
    assert.equal(hands[1][2], 4);
    assert.equal(hands[4][2], 4);
  }
});