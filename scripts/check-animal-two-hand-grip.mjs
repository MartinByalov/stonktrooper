import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { resolve } from 'node:path';

const server = await createServer({ root: resolve(import.meta.dirname, '..'), server: { middlewareMode: true }, logLevel: 'error' });
try {
  const { animalWeaponPose, bullGripShoulder } = await server.ssrLoadModule('/src/animalWeaponPose.ts');
  const { drawAnimalCharacter } = await server.ssrLoadModule('/src/animalRenderer.ts');
  let checks = 0;
  for (const bear of [false, true]) for (const phase of [0, .8, 2, 4]) for (const attack of [0, 4, 7, 12, 20]) for (const seated of [false, true]) for (const lowered of [false, true]) {
    const pose = animalWeaponPose(bear, phase, attack, lowered);
    for (const [hand, expected] of [[pose.far, bear ? [-7, -7] : [0, -9]], [pose.near, bear ? [15, 6] : [0, -2]]]) {
      const dx = hand.x - pose.x, dy = hand.y - pose.y;
      assert.ok(Math.abs(dx * Math.cos(pose.angle) + dy * Math.sin(pose.angle) - expected[0]) < 1e-9);
      assert.ok(Math.abs(-dx * Math.sin(pose.angle) + dy * Math.cos(pose.angle) - expected[1]) < 1e-9, 'Grip stays attached throughout rotation');
    }
    let depth = 0; const ends = []; let paws = 0; let tail = false;
    const layers = [];
    const ctx = new Proxy({}, {
      get: (_, key) => (...args) => {
        if (key === 'save') depth++;
        if (key === 'restore') assert.ok(--depth >= 0);
        if (key === 'lineTo') ends.push(args);
        if (key === 'ellipse' && args[0] === 0 && args[1] === 0 && [3.5, 4.2].includes(args[2])) { paws++; layers.push(args[2] === 4.2 ? 'near-paw' : 'far-paw'); }
        if (key === 'ellipse' && args[0] === 2 && args[1] === 3 && args[2] === 3) tail = true;
        if (key === 'bezierCurveTo' && args[0] === 10 && args[1] === 1) tail = true;
        if (key === 'lineTo' && args[0] === pose.near.x && args[1] === pose.near.y) layers.push('near-arm');
        if (key === 'fillRect' && args[0] === -10 && args[1] === 0) layers.push('weapon');
        if (key === 'moveTo' && args[0] === 0 && args[1] === 3) layers.push('weapon');
        for (const arg of args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg));
        if (String(key).includes('Gradient')) return { addColorStop() {} };
      }, set: () => true,
    });
    drawAnimalCharacter(ctx, { type: bear ? 'bear' : 'bull', phase, attackTimer: attack, x: 0, y: 0, feet: 0, dead: false }, lowered, seated);
    assert.equal(depth, 0);
    assert.equal(paws, 2, 'Both paws visibly wrap the weapon');
    assert.ok(tail, 'Species-specific tail is drawn behind the torso');
    if (!bear && attack === 0) {
      assert.ok(pose.x >= -17 && pose.x <= -14, 'Resting bat is carried close to the torso');
    } else {
      assert.ok(pose.x < -20, 'Chainsaw and swinging bat stay in front of the chest');
    }
    assert.ok(layers.indexOf('near-arm') > layers.indexOf('weapon'), 'Near forearm overlaps the weapon in profile');
    assert.ok(layers.indexOf('near-paw') > layers.indexOf('near-arm'), 'Near fingers wrap over the grip');
    for (const hand of [pose.far, pose.near]) assert.ok(ends.some(([x, y]) => x === hand.x && y === hand.y), 'Arm reaches its actual grip');
    if (!bear && (attack === 0 || lowered)) {
      for (const near of [false, true]) {
        const hand = near ? pose.near : pose.far;
        const shoulder = bullGripShoulder(phase, near);
        const index = ends.findIndex(([x, y]) => x === hand.x && y === hand.y);
        const elbow = ends[index - 1];
        assert.ok(elbow, 'Extended arm has an elbow point');
        assert.ok(Math.abs(elbow[0] - (shoulder.x + hand.x) / 2) < 1e-9);
        assert.ok(Math.abs(elbow[1] - (shoulder.y + hand.y) / 2) < 1e-9, 'Carrying arms extend straight to the handle');
      }
    }
    checks++;
  }
  console.log('PASS two-hand bat/chainsaw grips, gait, swing, lowered and seated poses:', checks);
} finally { await server.close(); }