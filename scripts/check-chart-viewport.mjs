import assert from 'node:assert/strict';
import { chartViewport, chartToScreen, screenToChart, mobileWorldScale } from '../src/chartViewport.ts';

for (const display of [{width:667,height:260},{width:740,height:250},{width:844,height:290},{width:915,height:320},{width:1280,height:650},{width:1600,height:720},{width:390,height:844}]) {
  const view = chartViewport(true, 1200, 700, 60, display);
  assert.equal(view.scale, mobileWorldScale(display) * 700 / display.height);
  const cssX = view.scaleX * display.width / 1200;
  const cssY = view.scale * display.height / 700;
  assert.ok(Math.abs(cssX-cssY)<1e-10, 'Models preserve proportions in CSS pixels');
  const runnerPixels = Math.min(64, Math.max(44, 44 * Math.sqrt(display.height / 312)));
  const androidScale = Math.min(runnerPixels / 62, display.height / 360,
    (display.width - Math.min(48, display.width * .08)) / 650);
  assert.ok(Math.abs(cssY-androidScale)<1e-10, 'Mobile CSS world scale matches Android gameView');
  assert.ok(display.height / cssY >= 360 - 1e-9, 'Jumping clearance is preserved');
  assert.ok((display.width - Math.min(48, display.width * .08)) / cssX >= 650 - 1e-9, 'Approach distance is preserved');
  for (const point of [{x:0,y:0},{x:350,y:400},{x:1200,y:700}]) {
    const roundTrip = screenToChart(chartToScreen(point, view), view);
    assert.ok(Math.abs(roundTrip.x-point.x)<1e-9 && Math.abs(roundTrip.y-point.y)<1e-9, 'Aim transform remains invertible');
  }
  assert.deepEqual(chartToScreen({x:view.x,y:view.y}, view), {x:view.x,y:view.y});
}
assert.equal(chartViewport(false,1200,700,60).scale,1, 'Desktop zoom is unchanged');
assert.ok(mobileWorldScale({width:1280,height:650}) > mobileWorldScale({width:740,height:250}), 'Larger stages grow models gently');
for (const display of [{width:0,height:0},{width:NaN,height:360}]) {
  const view=chartViewport(true,1920,840,64,display);
  assert.ok(Number.isFinite(view.scale) && view.scale > 0 && Number.isFinite(view.scaleX));
}
console.log('PASS Android-calibrated adaptive mobile scale, clearance, proportions, stable anchor and inverse aiming; desktop unchanged');