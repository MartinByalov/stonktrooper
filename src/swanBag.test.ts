// Regression checks for swanBag.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drawSwanAsset } from './assetRenderer';
import { swanBagPose } from './swanBag';

test('swans carry a bag until release and use mirrored beak anchors', () => {
  for (const charging of [false, true]) {
    const black = swanBagPose(charging), white = swanBagPose(charging, true);
    assert.equal(black.x, white.x);
    assert.equal(black.y, -white.y);
  }
  for (const kind of ['swan', 'white'] as const) {
    const render = (lootRolled: boolean) => {
      let bagFills = 0;
      let fillStyle = '';
      const ctx = new Proxy({}, {
        get: (_, key) => key === 'fill' ? () => { if (fillStyle === '#b98b54') bagFills++; } : () => {},
        set: (_, key, value) => { if (key === 'fillStyle') fillStyle = value; return true; },
      }) as CanvasRenderingContext2D;
      drawSwanAsset(ctx, { kind, lootRolled, x: 0, y: 0, baseY: 0, phase: 0.8, dead: false });
      return bagFills;
    };
    assert.equal(render(false), 1);
    assert.equal(render(true), 0);
  }
});