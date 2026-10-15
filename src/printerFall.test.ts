// Regression checks for printerFall.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { printerFallRotation } from './printerFall';

test('printer spins while falling, settles near the track and lands upright', () => {
  assert(printerFallRotation(1, 100) > 1);
  assert(printerFallRotation(1, 5) < 1);
  assert.equal(printerFallRotation(5, 0), 0);
  assert.equal(printerFallRotation(0, 0), 0);
});