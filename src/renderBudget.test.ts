import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { renderPixelRatio } from './renderBudget';

test('phone raster budget follows display size in landscape and portrait, regardless of DPR', () => {
  for (const [width, height] of [[844, 318], [390, 525], [1024, 600]]) {
    const ratio = renderPixelRatio(width, height, 1920, 840, 3, true);
    assert(ratio <= 1.5);
    assert(ratio * 1920 >= width * 1.5 - 1e-8);
    assert(ratio * 840 >= height * 1.5 - 1e-8);
    assert(ratio * ratio < 2.25);
  }
});

test('desktop keeps its density cap and invalid display measurements are safe', () => {
  assert.equal(renderPixelRatio(1920, 840, 1920, 840, 3, false), 2);
  assert.equal(renderPixelRatio(3840, 1680, 1920, 840, 3, false), 2);
  for (const invalid of [0, -1, NaN, Infinity]) {
    assert.equal(renderPixelRatio(invalid, 0, 1920, 840, 3, true), 1.5);
  }
  assert.equal(renderPixelRatio(1920, 840, 1920, 840, NaN, false), 1);
});

test('joystick movement avoids React renders and releases held input when interrupted', () => {
  const source = readFileSync(new URL('./MobileJoystick.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /useState|setOffset/);
  assert.match(source, /knob.current.style.transform = `translate/);
  assert.match(source, /window.addEventListener\('blur', release\)/);
  assert.match(source, /document.removeEventListener\('visibilitychange', visibility\)/);
  assert.match(source, /callbacks.current.onRelease\(\)/);
});

test('scroll-managed panels never enter the shrink-to-fit observer', () => {
  const source = readFileSync(new URL('./useMobileDialogFit.ts', import.meta.url), 'utf8');
  assert.match(source, /:not\(\.site-info-dialog\):not\(\.share-dd-dialog\)/);
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(app, /new ResizeObserver\(scheduleBoundary\)/);
  assert.match(app, /cancelAnimationFrame\(boundaryFrame\)/);
});