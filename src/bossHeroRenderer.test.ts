// Regression checks for bossHeroRenderer.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drawBossHero } from './bossHeroRenderer';
import { readFileSync } from 'node:fs';

test('boss limbs blend into shoulders and both human legs use the same skin and width', () => {
  const hero = readFileSync(new URL('./bossHeroRenderer.ts', import.meta.url), 'utf8');
  const boss = readFileSync(new URL('./bossRenderer.ts', import.meta.url), 'utf8');
  assert.equal((hero.match(/ctx.strokeStyle = '#fed7aa'; ctx.lineWidth = 4.5;/g) ?? []).length, 2);
  assert.match(hero, /quadraticCurveTo\(-2 \+ backFoot/);
  assert.match(hero, /quadraticCurveTo\(3 \+ frontFoot/);
  assert.doesNotMatch(hero, /ellipse\(-2, -36/);
  assert.match(hero, /const shoulderX = 3, shoulderY = -36/);
  assert.doesNotMatch(boss, /ellipse\(shoulderX|ellipse\(side \* 20, -72/);
  assert.match(boss, /const armColor = fur/);
});

test('boss hero retains profile face and animates near arm and case without a hat', () => {
  const record = (stride: number, airborne: boolean, velocity: number, timer: number) => {
    const calls: { method: string; args: unknown[] }[] = [];
    const ctx = new Proxy({}, {
      get: (_, method) => (...args: unknown[]) => { calls.push({ method: String(method), args }); },
      set: () => true,
    }) as CanvasRenderingContext2D;
    drawBossHero(ctx, stride, airborne, velocity, timer);
    assert.equal(calls.filter(c => c.method === 'save').length, calls.filter(c => c.method === 'restore').length);
    // One profile eye; no hat ellipse or crown geometry.
    assert(calls.some(c => c.method === 'arc' && c.args[0] === 5 && c.args[1] === -3));
    assert(!calls.some(c => c.method === 'ellipse' && c.args[2] === 20));
    return calls;
  };
  const running = record(0.8, false, 0, 0);
  const jumping = record(0.8, true, -12, 0);
  const throwing = record(0.8, false, 0, 25);
  assert.notDeepEqual(running, jumping);
  assert(running.some(c => c.method === 'fillRect' && c.args[0] === -2 && c.args[1] === 0));
  assert(!throwing.some(c => c.method === 'fillRect' && c.args[0] === -2 && c.args[1] === 0));
});