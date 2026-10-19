import assert from 'node:assert/strict';
import { drawChartGridLine } from '../src/chartGridRenderer.ts';
import { marketClockLabel, marketClockStep } from '../src/marketClock.ts';

for (const pixels of [0.5, 2, 9, 20, 100]) {
  const step = marketClockStep(pixels, 48);
  assert.ok(step >= 10 && step % 10 === 0, 'Time ticks always use ten-minute multiples');
}
assert.equal(marketClockStep(9, 48), 10, 'Startup ticks are ten minutes apart');
assert.equal(marketClockLabel(200), '12:50');
assert.equal(marketClockLabel(210), '13:00');
assert.equal(marketClockLabel(220), '13:10');

for (const scale of [0.35, 0.7, 1, 1.3, 2]) {
  for (const direction of [-1, 1]) {
    for (let frame = 0; frame < 100; frame++) {
      const rectangles = [];
      let saved = 0;
      const ctx = {
        strokeStyle: '#303640', fillStyle: '',
        getTransform: () => ({a:scale, d:scale*direction, e:frame*0.17, f:frame*0.23}),
        save: () => saved++, restore: () => saved--,
        resetTransform() {}, fillRect: (...args) => rectangles.push(args),
      };
      drawChartGridLine(ctx, 0, 50, 1920, 50);
      drawChartGridLine(ctx, 100, 0, 100, 840);
      assert.equal(saved, 0, 'Canvas transform and clipping state are restored');
      assert.ok(rectangles.flat().every(Number.isInteger), 'All edges align to backing pixels');
      assert.equal(rectangles[0][3], 1, 'Horizontal coverage stays one pixel during motion');
      assert.equal(rectangles[1][2], 1, 'Vertical coverage stays one pixel during motion');
      ctx.globalAlpha = 1;
      drawChartGridLine(ctx, 0, 50, 1920, 50, true);
      drawChartGridLine(ctx, 100, 0, 100, 840, true);
      assert.equal(rectangles[2][3], 2, 'Night horizontal lines maintain a two-pixel core');
      assert.equal(rectangles[3][2], 2, 'Night vertical lines maintain a two-pixel core');
      assert.ok(rectangles.slice(2).flat().every(Number.isFinite), 'Night soft edges have valid continuous positions');
    }
  }
}
console.log('PASS grid pixel alignment and constant thickness across motion, zoom and inversion');