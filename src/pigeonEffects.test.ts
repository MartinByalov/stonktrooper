// Regression checks for pigeonEffects.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { pigeonFlightY, stepPigeonDrop } from './pigeonEffects';
import { drawPigeonStain } from './pigeonStain';

test('pigeon flight has varied lanes and a broad upper-screen flight band', () => {
  const values = Array.from({ length: 100 }, (_, i) => pigeonFlightY(200, 40, i, i % 2));
  assert(Math.max(...values) - Math.min(...values) > 150);
  assert(values.every(y => y > 280 && y < 480));
});

test('pigeon drop falls visibly before hitting the hat and can miss', () => {
  const drop = { x: 100, y: 50, vx: 0, vy: 1.5, life: 180 };
  assert(!stepPigeonDrop(drop, 100, 250));
  let hit = false;
  for (let i = 0; i < 60 && !hit; i++) hit = stepPigeonDrop(drop, 100, 250);
  assert(hit);
  const miss = { x: 50, y: 230, vx: 0, vy: 20, life: 10 };
  assert(!stepPigeonDrop(miss, 100, 250));
});

test('pigeon stains contrast with the topmost hat or white clown head', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /drawPigeonStain\(ctx, captain \? 6 : 3, stainY, !captain && theme === 'light'\)/);
  assert.match(game, /g\.hawkBags, g\.globalFrame, g\.hatSoiled/);
  const dumpster = readFileSync(new URL('./dumpsterRenderer.ts', import.meta.url), 'utf8');
  assert.match(dumpster, /fedoraHats > 0 && !darkMode/);
  for (const white of [false, true]) {
    const colors: string[] = [];
    const ctx = new Proxy({}, {
      get: () => () => {},
      set: (_, key, value) => { if (key === 'fillStyle') colors.push(value); return true; },
    }) as CanvasRenderingContext2D;
    drawPigeonStain(ctx, 3, -65, white);
    assert.deepEqual(colors, [white ? '#ffffff' : '#000000']);
  }
  const drops = game.slice(game.indexOf('for (const drop of g.pigeonDrops) {', game.indexOf('const draw =')));
  assert.match(drops, /ctx\.strokeStyle = theme === 'dark' \? 'rgba\(255,255,255,0\.45\)' : 'rgba\(0,0,0,0\.45\)'/);
  assert.match(drops, /ctx\.fillStyle = theme === 'dark' \? '#ffffff' : '#000000'; ctx\.beginPath\(\); ctx\.ellipse\(x, y, 3\.5, 6/);
});

test('overhead pigeon drop always reaches a moving and jumping player after visible flight', () => {
  const drop = { x: 100, y: 50, vx: 0, vy: 1.5, life: 180, impactFrames: 30 };
  for (let frame = 0; frame < 30; frame++) {
    const x = 100 + frame * 5;
    const y = 250 + Math.sin(frame / 4) * 100;
    assert.equal(stepPigeonDrop(drop, x, y), frame === 29);
    if (frame === 29) {
      assert.equal(drop.x, x);
      assert.equal(drop.y, y);
    }
  }
});