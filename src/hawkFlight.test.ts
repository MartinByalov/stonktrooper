import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { stepHawkFlight } from './hawkFlight';

test('Hawk approaches the head lane at different chart elevations instead of the screen top', () => {
  for (const y of [-2000, 300, 5000]) {
    const player = { x: 100, y };
    const hawk = { x: 800, y: y - 200, baseY: y - 200, phase: 0, targetY: y - 200, locked: false };
    for (let i = 0; i < 200; i++) stepHawkFlight(hawk, player);
    assert(Math.abs(hawk.baseY - (y - 85)) < 1);
    assert(Math.abs(hawk.y - hawk.baseY) <= 7);
  }
});

test('Hawk locks its approach before passing the player and does not chase a late jump', () => {
  const player = { x: 100, y: 400 };
  const hawk = { x: 290, y: 315, baseY: 315, phase: 0, targetY: 315, locked: false };
  stepHawkFlight(hawk, player);
  assert(hawk.locked);
  player.y -= 100;
  stepHawkFlight(hawk, player);
  assert.equal(hawk.targetY, 315);
  assert.equal(hawk.baseY, 315);
});

test('runner uses head-height Hawk flight and still releases tender from its current position', () => {
  const source = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(source, /const hawkY = g\.p\.y - 85/);
  assert.match(source, /stepHawkFlight\(s, g\.p\)/);
  assert.match(source, /x: s\.x - 24\.8, y: s\.y \+ 1\.6, type: 'tender'/);
});