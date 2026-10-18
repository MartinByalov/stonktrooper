import assert from 'node:assert/strict';
import { drawChartGridLine } from '../src/chartGridRenderer.ts';

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
    }
  }
}
console.log('PASS grid pixel alignment and constant thickness across motion, zoom and inversion');