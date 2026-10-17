import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';
import { chartViewport } from './chartViewport';

const source = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
const start = source.indexOf('const heroCameraOffset =');
const code = stripTypeScriptTypes(source.slice(start, source.indexOf('\n};', start) + 3));
const offset = new Function('window', 'currentChartViewport', 'HX', `${code}; return heroCameraOffset();`);

test('mobile runner is anchored at 32 percent without a sprite-only collision offset', () => {
  const view = chartViewport(true, 1920, 840, 64);
  const cameraOffset = offset({ matchMedia: () => ({ matches: true }) }, () => view, 250);
  assert.ok(Math.abs(cameraOffset / (1920 - 64) - 0.32) < 1e-10);
  assert.doesNotMatch(source, /mobileHeroRenderOffset/);
  assert.match(source, /const sx = g\.p\.x - g\.cx \+ \(g\.zeroCrash \? 32 : 0\);/);
});

test('desktop camera offset is unchanged and mobile anchoring is used at start and during play', () => {
  assert.equal(offset({ matchMedia: () => ({ matches: false }) }, () => chartViewport(false, 1920, 840, 64), 250), 250);
  assert.match(source, /g\.cx = g\.p\.x - heroCameraOffset\(\);/);
  assert.match(source, /g\.cx = \(g\.printerTimer > 0 \? g\.printerProgress : g\.p\.x\) - heroCameraOffset\(\);/);
});