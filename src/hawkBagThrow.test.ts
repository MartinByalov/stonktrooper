import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { hawkBagThrowPose } from './hawkBagThrow';
import { drawDumpster } from './dumpsterRenderer';

test('Hawk bag swings from overhead to a forward release then recovers with empty hands', () => {
  const start = hawkBagThrowPose(16);
  const release = hawkBagThrowPose(8);
  const end = hawkBagThrowPose(0);
  assert(start.holding);
  assert(start.bagY < -60);
  assert(start.farHandX < start.bagX && start.nearHandX > start.bagX);
  assert(release.bagX > start.bagX);
  assert(!release.holding);
  assert(end.handY > release.handY);
  assert.equal(hawkBagThrowPose(8, -1).bagX, 16 - release.bagX);
  assert(hawkBagThrowPose(16, 1, 3).bagY < start.bagY);
});

test('dumpster draws two raised hands and only holds a bag before release', () => {
  const render = (timer: number) => {
    const calls: { kind: string; values: number[] }[] = [];
    const ctx = new Proxy({}, {
      get: (_, key) => (...values: number[]) => { calls.push({ kind: String(key), values }); },
      set: () => true,
    }) as CanvasRenderingContext2D;
    drawDumpster(ctx, 0, 0, 0, false, false, 0, 0, false, timer);
    return calls;
  };
  const held = render(16);
  const pose = hawkBagThrowPose(16);
  assert.equal(held.filter(call => call.kind === 'arc' && call.values[1] === pose.handY && call.values[2] === 3).length, 2);
  assert(held.some(call => call.kind === 'translate' && call.values[0] === pose.bagX && call.values[1] === pose.bagY));
  assert(!render(8).some(call => call.kind === 'translate' && call.values[1] === hawkBagThrowPose(8).bagY));
  assert(!render(0).some(call => call.kind === 'arc' && call.values[2] === 3));
});

test('held Hawk bags wait before projectile movement and are not drawn twice', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /b\.windup = \(b\.windup \?\? 0\) - 1;[\s\S]*?continue;\s*\}\s*const prevX = b\.x;/);
  assert.match(game, /if \(bCase\.kind === 'bag' && \(bCase\.windup \?\? 0\) > 0\) continue;/);
  assert.match(game, /g\.hatSoiled, g\.bagThrowAnimTimer, g\.bagThrowDirection\);/);
});