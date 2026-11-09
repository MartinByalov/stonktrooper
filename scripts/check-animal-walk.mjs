import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const server = await createServer({ root: resolve(import.meta.dirname, '..'), server: { middlewareMode: true }, logLevel: 'error' });
try {
  const { animalWalkPose } = await server.ssrLoadModule('/src/animalWalkPose.ts');
  const { animalWeaponPose, bullGripShoulder } = await server.ssrLoadModule('/src/animalWeaponPose.ts');
  const renderer = readFileSync(new URL('../src/animalRenderer.ts', import.meta.url), 'utf8');
  assert.ok(!renderer.includes('ctx.ellipse(-1, -23, 10, 8'), 'No separate pelvis lobe over the thighs');
  assert.ok(!renderer.includes('ctx.ellipse(-2, -35, 13, 18'), 'Torso and rump are a single outline');
  assert.ok(renderer.includes('ctx.bezierCurveTo(4, -16, -3, -16, -7, -19)'), 'Continuous lower body covers both hip attachments');
  assert.ok(renderer.includes("ctx.lineJoin = 'round'"), 'Bent thick limbs cannot create miter spikes at the rump');
  let checks = 0;
  for (const near of [false, true]) for (const tuck of [0, .5, 1]) for (const charging of [false, true]) for (let i = 0; i < 360; i++) {
    const phase = i * Math.PI / 180;
    const { hip, knee, foot, upper, lower } = animalWalkPose(phase, near, tuck, charging);
    assert.ok(Math.abs(Math.hypot(knee.x - hip.x, knee.y - hip.y) - upper) < 1e-9, 'Thigh does not stretch');
    assert.ok(Math.abs(Math.hypot(foot.x - knee.x, foot.y - knee.y) - lower) < 1e-9, 'Shin does not stretch');
    assert.ok(Math.abs(hip.x + 1) <= 1 && hip.y === -22, 'Both thighs attach inside the pelvis');
    const other = animalWalkPose(phase, !near, tuck, charging);
    assert.ok(Math.abs(foot.x - other.foot.x) <= (charging ? 14 : 11), 'Stride does not split the legs apart');
    for (const direction of [-1, 1]) {
      const adjacent = animalWalkPose(phase + direction * .00001, near, tuck, charging);
      assert.ok(Math.hypot(adjacent.knee.x - knee.x, adjacent.knee.y - knee.y) < .001, 'Knee remains continuous walking forwards or backwards');
    }
    const next = animalWalkPose(phase + .00001, near, tuck, charging);
    assert.ok(Math.hypot(next.foot.x - foot.x, next.foot.y - foot.y) < .001, 'Continuous foot trajectory');
    if (!tuck) {
      const opposite = animalWalkPose(phase, !near, tuck, charging);
      assert.ok(foot.y === -2 || opposite.foot.y === -2, 'At least one foot remains planted');
    }
    checks++;
  }
  for (const phase of [0, 1, 2, 3, 4, 5]) for (const attack of [0, 4, 7, 12]) for (const lowered of [false, true]) {
    const weapon = animalWeaponPose(false, phase, attack, lowered);
    assert.ok(Math.abs(Math.hypot(weapon.near.x - weapon.far.x, weapon.near.y - weapon.far.y) - 7) < 1e-9, 'Bat fists stay adjacent along one handle');
    for (const near of [false, true]) {
      const hand = near ? weapon.near : weapon.far;
      const shoulder = bullGripShoulder(phase, near);
      assert.ok(Math.hypot(hand.x - shoulder.x, hand.y - shoulder.y) < (near ? 33 : 38), 'Bat grip stays within shortened projected arm reach');
      const otherShoulder = bullGripShoulder(phase, !near);
      assert.equal(Math.abs(shoulder.x - otherShoulder.x), 3, 'Profile shoulders overlap in projection');
    }
  }
  const tips = [];
  for (let i = 0; i < 360; i++) {
    const weapon = animalWeaponPose(false, i * Math.PI / 180, 0);
    const tip = { x: weapon.x + 35 * Math.sin(weapon.angle), y: weapon.y - 35 * Math.cos(weapon.angle) };
    assert.ok(tip.x < weapon.x && tip.y < 2 && tip.y > -5, 'Walking bat slopes forward and only lifts slightly off the ground');
    tips.push(tip.y);
  }
  assert.ok(Math.max(...tips) - Math.min(...tips) > 3, 'Walking bat visibly lifts and taps with the stride');
  assert.ok(Math.abs(animalWeaponPose(false, 0, 0).angle - animalWeaponPose(false, Math.PI / 2, 0).angle) > .1, 'Bat moves while the bull walks');
  console.log('PASS biped gait, shortened reachable left arm and two-handed ground-level bat:', checks);
} finally { await server.close(); }