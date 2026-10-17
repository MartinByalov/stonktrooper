import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { plotViewY } from './aim';
import { chartToScreen, chartViewport } from './chartViewport';
import { PICKUP_RENDER_MARGIN, pickupInRenderBounds, pickupRenderBounds } from './pickupVisibility';

const W = 1920, H = 840, AX = 64, TOP = 48, BOTTOM = 828;

test('desktop pickup bounds include partial assets at all four clip edges', () => {
  const bounds = pickupRenderBounds(chartViewport(false, W, H, AX), W - AX, TOP, BOTTOM, false);
  assert.deepEqual(bounds, { left: -64, right: 1920, top: -16, bottom: 892 });
  for (const [x, y] of [[bounds.left, 400], [bounds.right, 400], [500, bounds.top], [500, bounds.bottom]]) {
    assert.equal(pickupInRenderBounds(x, y, bounds), true);
  }
  for (const [x, y] of [[bounds.left - 1, 400], [bounds.right + 1, 400], [500, bounds.top - 1], [500, bounds.bottom + 1]]) {
    assert.equal(pickupInRenderBounds(x, y, bounds), false);
  }
});

test('pickup culling agrees with the actual transform in portrait, landscape and inverted views', () => {
  for (const mobile of [false, true]) {
    for (const [width, height] of [[390, 700], [844, 300], [1280, 800]]) {
      const view = chartViewport(mobile, W, H, AX, { width, height });
      for (const inverted of [false, true]) {
        const bounds = pickupRenderBounds(view, W - AX, TOP, BOTTOM, inverted);
        for (let x = -2000; x <= 4000; x += 37) {
          for (let y = -400; y <= 1400; y += 41) {
            const screen = chartToScreen({ x, y: plotViewY(y, inverted, TOP, BOTTOM) }, view);
            // A conservative asset-sized box must remain eligible whenever it
            // touches the plot. Account for different scales on the two axes.
            const overlaps = screen.x + PICKUP_RENDER_MARGIN * view.scaleX >= 0
              && screen.x - PICKUP_RENDER_MARGIN * view.scaleX <= W - AX
              && screen.y + PICKUP_RENDER_MARGIN * view.scale >= TOP
              && screen.y - PICKUP_RENDER_MARGIN * view.scale <= BOTTOM;
            assert.equal(pickupInRenderBounds(x, y, bounds), overlaps);
          }
        }
      }
    }
  }
});

test('camera-relative pickup coordinates do not change world positions or loot membership', () => {
  const bounds = pickupRenderBounds(chartViewport(false, W, H, AX), W - AX, TOP, BOTTOM, false);
  const camera = { x: 10000, y: 2000 };
  const pickups = [{ x: 10500, y: 2400 }, { x: 20000, y: 2400 }, { x: 10500, y: 4000 }];
  const before = structuredClone(pickups);
  assert.deepEqual(pickups.map(p => pickupInRenderBounds(p.x - camera.x, p.y - camera.y, bounds)), [true, false, false]);
  assert.deepEqual(pickups, before);
});

test('game skips invisible pickups before issuing any canvas operations', () => {
  const source = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  const draw = source.slice(source.indexOf('const drawPickups ='), source.indexOf('// 3. BLACK SWANS'));
  assert.match(draw, /pickupRenderBounds\(renderViewport.current, W - AX, TAPE_HEIGHT, H - TIME_AXIS_HEIGHT, g.invertedView\)/);
  assert.ok(draw.indexOf('const bounds =') < draw.indexOf('for (const d of g.pickups)'));
  assert.match(draw, /if \(!pickupInRenderBounds\(x, y, bounds\)\) continue;\s+ctx.save\(\);/);
  assert.doesNotMatch(draw, /g.pickups\s*=|\.splice\(|\.filter\(/);
});