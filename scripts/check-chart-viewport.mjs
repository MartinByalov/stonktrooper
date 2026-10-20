import assert from 'node:assert/strict';
import { chartViewport, chartToScreen, screenToChart } from '../src/chartViewport.ts';

for (const display of [{width:844,height:390},{width:390,height:844},{width:740,height:360}]) {
  const view = chartViewport(true, 1200, 700, 60, display);
  assert.equal(view.scale, 1.5);
  const cssX = view.scaleX * display.width / 1200;
  const cssY = view.scale * display.height / 700;
  assert.ok(Math.abs(cssX-cssY)<1e-10, 'Models preserve proportions in CSS pixels');
  for (const point of [{x:0,y:0},{x:350,y:400},{x:1200,y:700}]) {
    const roundTrip = screenToChart(chartToScreen(point, view), view);
    assert.ok(Math.abs(roundTrip.x-point.x)<1e-9 && Math.abs(roundTrip.y-point.y)<1e-9, 'Aim transform remains invertible');
  }
  assert.deepEqual(chartToScreen({x:view.x,y:view.y}, view), {x:view.x,y:view.y});
}
assert.equal(chartViewport(false,1200,700,60).scale,1, 'Desktop zoom is unchanged');
console.log('PASS mobile world zoom, undistorted proportions, stable anchor and inverse aiming');