// Regression checks for visualVariants.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { animalHeight, drawAnimalCharacter } from './animalRenderer';
import { briefcaseColors, drawPickupAsset, drawApeAsset, drawCharacterHat } from './assetRenderer';
import { briefcaseArmPose } from './characterPose';
import type { Animal } from './types';
import { enemyMovementSpeed } from './gameRules';

const recordingContext = (calls: unknown[][]): CanvasRenderingContext2D => new Proxy({}, {
  get: (_, key) => key === 'createLinearGradient' || key === 'createRadialGradient'
    ? () => ({ addColorStop() {} })
    : (...args: unknown[]) => calls.push([key, ...args]),
  set: () => true,
}) as CanvasRenderingContext2D;

test('briefcase palette reverses body and clasp between day and night', () => {
  assert.equal(briefcaseColors(false).body, '#05070a');
  assert.equal(briefcaseColors(false).clasp, '#ffffff');
  assert.equal(briefcaseColors(true).body, '#ffffff');
  assert.equal(briefcaseColors(true).clasp, '#64748b');
});

test('fedora ribbon switches immediately when drawing with a different theme', () => {
  for (const darkMode of [false, true, false]) {
    const fills: string[] = [];
    let fillStyle = '';
    const ctx = new Proxy({}, {
      get: (_, key) => key === 'fill' ? () => fills.push(fillStyle) : () => {},
      set: (_, key, value) => { if (key === 'fillStyle') fillStyle = value; return true; },
    }) as CanvasRenderingContext2D;
    drawCharacterHat(ctx, false, false, darkMode);
    assert.equal(fills[0], darkMode ? '#f8fafc' : '#111318');
    assert.equal(fills[3], darkMode ? '#111318' : '#ffffff');
  }
});

test('the hero fedora has level crown ends and only appears higher in front because of its tilt', () => {
  for (const darkMode of [false, true]) {
    const paths: unknown[][][] = [];
    let path: unknown[][] = [];
    const rotations: number[] = [];
    const ctx = new Proxy({}, {
      get: (_, key) => key === 'beginPath' ? () => { path = []; }
        : key === 'rotate' ? (angle: number) => { rotations.push(angle); }
        : key === 'moveTo' || key === 'lineTo' || key === 'quadraticCurveTo'
          ? (...args: number[]) => { path.push([key, ...args]); }
          : key === 'fill' ? () => { paths.push(path); }
            : () => {},
      set: () => true,
    }) as CanvasRenderingContext2D;
    drawCharacterHat(ctx, false, false, darkMode);
    const crown = paths[1];
    const rearTop = crown.find(call => call[0] === 'lineTo' && call[1] === -8);
    const frontTop = crown.find(call => call[0] === 'quadraticCurveTo' && call[3] === 9);
    assert.equal(rearTop?.[2], -21);
    assert.equal(frontTop?.[4], rearTop?.[2]);
    assert(rotations.some(angle => angle < 0));
  }
});

test('tender pickup renders at the slightly enlarged scale', () => {
  const calls: unknown[][] = [];
  drawPickupAsset(recordingContext(calls), { type: 'tender', x: 0, y: 0, taken: false }, 0, 0);
  assert(calls.some(call => call[0] === 'scale' && call[1] === 0.70 && call[2] === 0.70));
  assert(!calls.some(call => call[0] === 'rotate'));
});

test('settled tender rotates at the same rate as banana while falling keeps its physics rotation', () => {
  const settled: unknown[][] = [], falling: unknown[][] = [];
  drawPickupAsset(recordingContext(settled), { type: 'tender', x: 10, y: 0, taken: false }, 10, 0, 100);
  drawPickupAsset(recordingContext(falling), { type: 'tender', x: 10, y: 0, taken: false, vy: 2, rotation: 0.8 }, 10, 0, 100);
  assert(settled.some(call => call[0] === 'rotate' && call[1] === 100 * 0.065 + 10 * 0.03));
  assert(falling.some(call => call[0] === 'rotate' && call[1] === 0.8));
});

test('jumping right arm trails behind and folds upward to lift the case', () => {
  const running = briefcaseArmPose(false, 0, 0);
  for (const velocity of [-12, -4, 0, 8]) {
    const pose = briefcaseArmPose(true, velocity, 1);
    assert(pose.elbowX < 3);
    assert(pose.handX < running.handX);
    assert(pose.handY < pose.elbowY);
    assert(pose.handY < running.handY);
  }
});

test('captain cap uses a distinct right-profile peak and a front-facing falling pose', () => {
  const profile: unknown[][] = [], front: unknown[][] = [];
  drawCharacterHat(recordingContext(profile), true);
  drawCharacterHat(recordingContext(front), true, true);
  assert.notDeepEqual(profile, front);
  // The side-view visor projects forward; avoid coupling the test to one exact width.
  assert(profile.some(call => call[0] === 'quadraticCurveTo' && typeof call[3] === 'number' && call[3] >= 20));
});

test('captain caps have a filled gold emblem in profile and front views', () => {
  for (const frontFacing of [false, true]) {
    const fills: string[] = [];
    let fillStyle = '';
    const ctx = new Proxy({}, {
      get: (_, key) => key === 'fill' ? () => fills.push(fillStyle) : () => {},
      set: (_, key, value) => { if (key === 'fillStyle') fillStyle = value; return true; },
    }) as CanvasRenderingContext2D;
    drawCharacterHat(ctx, true, frontFacing);
    assert(fills.includes('#facc15'));
  }
});

test('rider feet stay fixed through stride charge and jumps while mounted enemies are faster', () => {
  for (const type of ['bull', 'bear'] as const) {
    const poses: unknown[][][] = [];
    for (const phase of [0, 1, 2]) {
      const calls: unknown[][] = [];
      drawAnimalCharacter(recordingContext(calls), { type, phase, jumpAmount: phase * 20, isCharging: phase > 0 } as Animal, false, true);
      poses.push(calls.filter(call => call[0] === 'fillRect' && call[3] === 10 && call[4] === 4));
    }
    assert.equal(poses[0].length, 2);
    assert.deepEqual(poses[0], poses[1]);
    assert.deepEqual(poses[0], poses[2]);
    for (const charging of [false, true]) {
      assert.equal(enemyMovementSpeed(type, charging, true), enemyMovementSpeed(type, charging, false) * 1.5);
    }
  }
});

test('both mounted variants render a four-legged mount and armed rider', () => {
  for (const type of ['bull', 'bear'] as const) {
    const calls: unknown[][] = [];
    const animal = { type, mount: type === 'bull' ? 'bear' : 'bull', phase: 1, jumpAmount: 20 } as Animal;
    drawAnimalCharacter(recordingContext(calls), animal);
    assert.equal(animalHeight(animal), 94);
    assert.equal(animalHeight({ ...animal, mount: undefined }), 60);
    assert(calls.some(call => call[0] === 'translate' && call[2] === -38));
    assert(calls.filter(call => call[0] === 'moveTo' && call[2] === -26).length === 4);
    assert(calls.length > 80);
  }
});

test('mounted charge lowers the head and airborne ape changes body pose', () => {
  const calls: unknown[][] = [];
  const context = recordingContext(calls);
  drawAnimalCharacter(context, { type: 'bull', mount: 'bear', phase: 1, isCharging: true } as Animal);
  assert(calls.some(call => call[0] === 'translate' && call[1] === -28 && call[2] === -34));
  assert(calls.some(call => call[0] === 'rotate' && call[1] === -0.2));
  calls.length = 0;
  drawApeAsset(context, 1, false, 0, 1, true);
  assert(calls.some(call => call[0] === 'scale' && call[1] === 1.04 && call[2] === 0.94));
});

test('diamond is smaller and translucent without leaking opacity to other assets', () => {
  const writes: unknown[][] = [];
  let alpha = 1;
  const stack: number[] = [];
  const context = new Proxy({}, {
    get: (_, key) => key === 'globalAlpha' ? alpha : key === 'save' ? () => stack.push(alpha)
      : key === 'restore' ? () => { alpha = stack.pop() ?? 1; } : () => {},
    set: (_, key, value) => { if (key === 'globalAlpha') { alpha = value; writes.push([key, value]); } return true; },
  }) as CanvasRenderingContext2D;
  drawPickupAsset(context, { type: 'diamond', x: 0, y: 0, taken: false }, 0, 0, 10);
  assert(writes.some(write => write[1] === 0.72));
  assert.equal(alpha, 1);
});

test('pickups animate while coins stay circular and diamonds use projected facets', () => {
  for (const type of ['coin', 'banana', 'diamond'] as const) {
    const first: unknown[][] = [], second: unknown[][] = [];
    const pickup = { type, x: 20, y: 30, taken: false };
    drawPickupAsset(recordingContext(first), pickup, 20, 30, 10);
    drawPickupAsset(recordingContext(second), pickup, 20, 30, 30);
    assert.notDeepEqual(first, second);
    if (type === 'coin') {
      assert(!first.some(call => call[0] === 'rotate' || call[0] === 'scale'));
      assert(first.some(call => call[0] === 'fillText' && call[1] === 'M'));
    } else if (type === 'banana') assert(first.some(call => call[0] === 'rotate'));
    else {
      assert(!first.some(call => call[0] === 'scale'));
      assert(first.filter(call => call[0] === 'closePath').length >= 17);
    }
  }
});