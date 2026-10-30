import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { createServer } from 'vite';

const server = await createServer({ root: resolve(import.meta.dirname, '..'), server: { middlewareMode: true }, logLevel: 'error' });
try {
  const { drawAnimalHead } = await server.ssrLoadModule('/src/animalRenderer.ts');
  for (const type of ['bear', 'bull']) for (const dark of [false, true]) for (const charging of [false, true]) for (const facing of [-1, 1]) {
    const events = []; let depth = 0;
    const ctx = new Proxy({}, {
      get: (_, key) => (...args) => {
        if (key === 'save') depth++;
        if (key === 'restore') assert.ok(--depth >= 0);
        events.push([key, ...args]);
      },
      set: () => true,
    });
    ctx.scale(facing, 1);
    drawAnimalHead(ctx, type, charging, dark, () => events.push(['hat-layer']));
    assert.equal(depth, 0);
    assert.ok(events.some(e=>e[0]==='ellipse'&&e[1]===0&&e[2]===0&&e[3]===(charging?4:2.3)&&e[4]===(charging?2.8:1.4)),`${type}: oval mouth in normal and charging expressions`);
    const clip=events.findIndex(e=>e[0]==='clip');
    const tooth=events.findIndex(e=>e[0]==='roundRect'&&e[1]===-2.3);
    assert.ok(clip>0&&tooth>clip,`${type}: rounded tooth clipped inside the mouth`);
    assert.ok(!events.some(e=>e[0]==='fillRect'),`${type}: no rectangular mouth or tooth`);
    for (const [x,y,radius] of [[-16,2.5,2],[-6.5,-1.5,1.5]]) {
      assert.ok(events.some(e=>e[0]==='arc'&&e[1]===x&&e[2]===y&&e[3]===radius&&e[4]===0&&e[5]===Math.PI*2),`${type}: nose and eye use full circles in every pose`);
    }
    assert.ok(!events.some(e=>e[0]==='fillRect'&&((e[1]===-18&&e[2]===1)||(e[1]===-8&&e[2]===-3))),`${type}: no square nose or eye`);
    const skull = events.findIndex(e => e[0] === 'ellipse' && e[1] === 0 && e[3] === 12);
    assert.ok(skull > 0);
    const hat=events.findIndex(e=>e[0]==='hat-layer');
    assert.ok(hat>skull,'Hat is painted on top of the skull');
    if (type === 'bear') {
      const far = events.findIndex(e => e[0] === 'ellipse' && e[1] === -5 && e[3] === 3);
      const near = events.findIndex(e => e[0] === 'ellipse' && e[1] === 5 && e[3] === 4);
      assert.ok(far < skull && near > skull, 'Far ear behind skull, larger near ear in front');
      assert.ok(near>hat,'Near ear overlaps the hat to preserve head depth');
    } else {
      const far = events.findIndex(e => e[0] === 'moveTo' && e[1] === -5 && e[2] === -6);
      const near = events.findIndex(e => e[0] === 'moveTo' && e[1] === 7 && e[2] === -4);
      const root = events.findIndex(e => e[0] === 'ellipse' && e[1] === 8 && e[2] === -4);
      assert.ok(far < skull && near > skull && root > near, 'Horn roots straddle skull depth, near root is seated in fur');
      assert.ok(near>hat,'Near horn emerges in front of the hat');
      assert.ok(events.some(e=>e[0]==='quadraticCurveTo'&&e[1]===13&&e[3]===9&&e[4]===-20),'Original upright near horn is independent of hats');
    }
  }
  console.log('PASS bear/bull oval mouths with clipped teeth, circular eyes and noses, profile depth, mirrored ride, day/night and charging');
} finally { await server.close(); }