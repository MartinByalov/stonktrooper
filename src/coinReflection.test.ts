import assert from 'node:assert/strict';
import { test } from 'node:test';
import { coinReflectionBounds, drawCoinReflection } from './coinReflection';
import { drawPickupAsset } from './assetRenderer';

test('coin reflection intersects its strip with the circular face', () => {
  for (const sweep of [-20, -14, 14, 20]) assert.equal(coinReflectionBounds(sweep), null);
  assert.deepEqual(coinReflectionBounds(-12), { left: -10, right: -8 });
  assert.deepEqual(coinReflectionBounds(0), { left: -4, right: 4 });
  assert.deepEqual(coinReflectionBounds(12), { left: 8, right: 10 });
});

test('complete coin rendering has balanced state and no per-coin clip', () => {
  const calls: string[] = [];
  const ctx = new Proxy({}, {
    get: (_, key) => key === 'createLinearGradient'
      ? () => ({ addColorStop() {} })
      : () => { calls.push(String(key)); },
    set: () => true,
  }) as CanvasRenderingContext2D;
  const pickup = { type: 'coin' as const, x: 200, y: 300, taken: false };
  const before = { ...pickup };
  drawPickupAsset(ctx, pickup, 0, 0, 30);
  assert.ok(!calls.includes('clip'));
  assert.ok(calls.includes('fillText'));
  assert.equal(calls.filter(name => name === 'save').length, calls.filter(name => name === 'restore').length);
  assert.deepEqual(pickup, before);
});

test('coin reflection emits finite bounded arcs without clipping or state-stack changes', () => {
  for (let sweep = -20; sweep <= 20; sweep += 0.25) {
    const calls: Array<[string, ...number[]]> = [];
    const ctx = new Proxy({}, {
      get: (_, key) => key === 'createLinearGradient'
        ? () => ({ addColorStop() {} })
        : (...args: number[]) => { calls.push([String(key), ...args]); },
      set: () => true,
    }) as CanvasRenderingContext2D;
    drawCoinReflection(ctx, sweep);
    assert.ok(calls.every(call => call.slice(1).every(Number.isFinite)));
    assert.ok(!calls.some(([name]) => ['clip', 'save', 'restore'].includes(name)));
    assert.equal(calls.filter(([name]) => name === 'fill').length, Math.abs(sweep) < 14 ? 1 : 0);
    for (const [, x, y, radius, start, end] of calls.filter(([name]) => name === 'arc')) {
      assert.equal(x, 0); assert.equal(y, 0); assert.equal(radius, 10);
      assert.ok(start <= end);
      assert.ok(end - start <= Math.PI);
    }
  }
});