import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { drawDumpster } from './dumpsterRenderer';

test('Hawk diamond shields the entire cart while only its smaller top peeks over the near wall', () => {
  const events: { kind: string; values: number[] }[] = [];
  const ctx = new Proxy({}, {
    get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} })
      : (...values: number[]) => { events.push({ kind: String(key), values }); },
    set: () => true,
  }) as CanvasRenderingContext2D;
  drawDumpster(ctx, 2, 0, 0, false, true, 0, 25);
  assert(events.some(event => event.kind === 'ellipse' && event.values[2] > 35 && event.values[3] === 46));
  const diamond = events.findIndex(event => event.kind === 'translate' && event.values[0] === 19 && event.values[1] === -34);
  const wall = events.findIndex(event => event.kind === 'roundRect' && event.values[1] === -34 && event.values[3] === 27);
  assert(diamond >= 0 && wall > diamond);
  assert(events.slice(diamond, wall).some(event => event.kind === 'scale' && event.values[0] === 0.65 && event.values[1] === 0.65));
  const withoutShield: { kind: string; values: number[] }[] = [];
  const plain = new Proxy({}, {
    get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} })
      : (...values: number[]) => { withoutShield.push({ kind: String(key), values }); },
    set: () => true,
  }) as CanvasRenderingContext2D;
  drawDumpster(plain, 2, 0);
  assert(!withoutShield.some(event => event.kind === 'ellipse' && event.values[3] === 46));
});

test('Hawk bags hang from near wall hooks and scale with the collected count', () => {
  const render = (count: number) => {
    const calls: { kind: string; values: number[] }[] = [];
    const ctx = new Proxy({}, {
      get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} })
        : (...values: number[]) => { calls.push({ kind: String(key), values }); },
      set: () => true,
    }) as CanvasRenderingContext2D;
    drawDumpster(ctx, 2, 0, 0, false, false, count);
    return calls;
  };
  assert.equal(render(0).filter(call => call.kind === 'scale' && call.values[0] === 0.48).length, 0);
  const bags = render(3);
  assert.equal(bags.filter(call => call.kind === 'scale' && call.values[0] === 0.48).length, 3);
  assert.equal(bags.filter(call => call.kind === 'lineTo' && call.values[1] === -23).length, 3);
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /if \(g\.hawkTimer > 0\) g\.hawkBags\+\+;/);
  assert.match(game, /g\.p\.carry > 0 && g\.p\.shieldKind === 'diamond', g\.hawkBags, g\.globalFrame/);
  assert.match(game, /g\.hawkTimer = 600;\s*g\.hawkBags = 0;/);
  assert.match(game, /if \(g\.hawkTimer === 0\) \{\s*g\.hawkBags = 0;/);
});

test('Hawk throws one carried bag toward aim and removes it from the dumpster', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /if \(g\.hawkTimer > 0\) \{\s*if \(g\.p\.carry <= 0 \|\| g\.p\.shieldKind !== 'bag' \|\| g\.hawkBags <= 0\) return;/);
  assert.match(game, /g\.cases\.push\(\{ x, y, vx: velocity\.x, vy: velocity\.y, life: 70, angle: 0, kind: 'bag' \}\);/);
  assert.match(game, /g\.hawkBags--;/);
  assert.match(game, /g\.p\.carry = 0;\s*g\.p\.shieldKind = undefined;/);
  assert.match(game, /g\.bagThrowAnimTimer = 16;/);
  assert.match(game, /if \(bCase\.kind === 'bag'\)/);
});

test('Hawk throws one carried bag toward aim and removes it from the dumpster', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /if \(g\.hawkTimer > 0\) \{\s*if \(g\.p\.carry <= 0 \|\| g\.p\.shieldKind !== 'bag' \|\| g\.hawkBags <= 0\) return;/);
  assert.match(game, /g\.cases\.push\(\{ x, y, vx: velocity\.x, vy: velocity\.y, life: 70, angle: 0, kind: 'bag' \}\);/);
  assert.match(game, /g\.hawkBags--;/);
  assert.match(game, /g\.p\.carry = 0;\s*g\.p\.shieldKind = undefined;/);
  assert.match(game, /g\.bagThrowAnimTimer = 16;/);
  assert.match(game, /if \(bCase\.kind === 'bag'\)/);
});