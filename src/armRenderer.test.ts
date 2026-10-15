// Regression checks for armRenderer.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drawJointedArm } from './armRenderer';

test('jointed arms join the elbow and wrist with rounded, tapered segments', () => {
  const calls: unknown[][] = [];
  const ctx = new Proxy({}, {
    get: (_, key) => (...args: unknown[]) => calls.push([key, ...args]),
    set: (_, key, value) => { calls.push(['set', key, value]); return true; },
  }) as CanvasRenderingContext2D;
  drawJointedArm(ctx, { x: 3, y: -32 }, { x: 10, y: -24 }, { x: 18, y: -15 }, '#fed7aa', 4.6, 3.5);
  assert(calls.some(call => call[0] === 'arc' && call[1] === 10 && call[2] === -24 && call[3] === 2.3));
  assert(calls.some(call => call[0] === 'arc' && call[1] === 18 && call[2] === -15 && call[3] === 1.75));
  assert(calls.some(call => call[0] === 'set' && call[1] === 'lineCap' && call[2] === 'round'));
  assert.equal(calls.filter(call => call[0] === 'save').length, calls.filter(call => call[0] === 'restore').length);
});