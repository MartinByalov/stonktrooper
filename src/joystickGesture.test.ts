import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { joystickSwipe } from './joystickGesture';

test('upward joystick swipes jump once and rearm after returning down without lifting', () => {
  let latched = false;
  const jumps: number[] = [];
  for (const distance of [0, 5, 11, 12, 20, 40, 18, 5, 4, 10, 15, 25]) {
    const result = joystickSwipe(distance, 20, latched);
    latched = result.latched;
    if (result.jump) jumps.push(distance);
  }
  assert.deepEqual(jumps, [12, 15]);
});

test('sideways, downward and small accidental movements do not trigger swipe jumps', () => {
  for (const radius of [16, 22.62, 30]) {
    for (const distance of [-100, -10, 0, 3, 8]) {
      assert.deepEqual(joystickSwipe(distance, radius, false), { jump: false, latched: false });
    }
    assert.equal(joystickSwipe(radius, radius, false).jump, true);
  }
});

test('only Kangaroo renders the knob and enables swipe detection while horizontal motion continues', () => {
  const source = readFileSync(new URL('./MobileJoystick.tsx', import.meta.url), 'utf8');
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /movementEnabled=\{state === 'boxing'\}/);
  assert.match(source, /movementEnabled && <span className="mobile-joystick-knob/);
  assert.match(source, /if \(!movementEnabled\) return;[\s\S]*?joystickSwipe\(gesture\.current\.startY - e\.clientY/);
  assert.match(source, /if \(swipe\.jump\) onPress\(\);[\s\S]*?onMove\(x \/ radius, y \/ radius\);/);
  assert.match(source, /startY: e\.clientY, latched: false/);
  assert.match(source, /onPointerCancel=\{reset\} onLostPointerCapture=\{reset\}/);
  assert.match(source, /gesture\.current\.latched, e\.clientX - gesture\.current\.startX/);
});

test('upper diagonals trigger jumps while shallow sideways drags do not', () => {
  for (const direction of [-1, 1]) {
    assert.equal(joystickSwipe(10, 20, false, direction * 10).jump, true);
    assert.equal(joystickSwipe(10, 20, true, direction * 10).jump, false);
    assert.deepEqual(joystickSwipe(2, 20, false, direction * 20), { jump: false, latched: false });
    assert.deepEqual(joystickSwipe(-10, 20, false, direction * 20), { jump: false, latched: false });
    assert.equal(joystickSwipe(0, 20, true, direction * 20).latched, false);
  }
});