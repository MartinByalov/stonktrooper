import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { chartViewport, chartToScreen, screenToChart } from './chartViewport';
import { plotViewY } from './aim';

const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('mobile uniformly enlarges world distances and preserves relative sizes', () => {
  const view = chartViewport(true, 1920, 840, 64);
  const origin = chartToScreen({ x: 400, y: 300 }, view);
  for (const size of [9, 25, 40, 150]) {
    const end = chartToScreen({ x: 400 + size, y: 300 + size }, view);
    close(end.x - origin.x, size * 1.15);
    close(end.y - origin.y, size * 1.15);
  }
  assert.deepEqual(chartToScreen({ x: view.x, y: view.y }, view), { x: view.x, y: view.y });
});

test('aim inversion restores world coordinates in both orientations and inverted mode', () => {
  const view = chartViewport(true, 1920, 840, 64);
  for (const [width, height] of [[390, 700], [844, 300]]) {
    for (const inverted of [false, true]) {
      const point = { x: 700, y: 400 };
      const screen = chartToScreen({ x: point.x, y: plotViewY(point.y, inverted, 70, 828) }, view);
      const client = { x: screen.x / 1920 * width, y: screen.y / 840 * height };
      const restored = screenToChart({ x: client.x / width * 1920, y: client.y / height * 840 }, view);
      close(restored.x, point.x);
      close(plotViewY(restored.y, inverted, 70, 828), point.y);
    }
  }
});

test('visual pickup overlap and world pickup contact share the same anchor', () => {
  const view = chartViewport(true, 1920, 840, 64);
  const camera = { x: 1200, y: 100 };
  const hero = { x: 1800, y: 620 };
  const coin = { x: 1800, y: 595 };
  const heroCenter = chartToScreen({ x: hero.x - camera.x, y: hero.y - 25 - camera.y }, view);
  const coinCenter = chartToScreen({ x: coin.x - camera.x, y: coin.y - camera.y }, view);
  assert.deepEqual(heroCenter, coinCenter);
  const source = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(source, /Math\.hypot\(d\.x - g\.p\.x, d\.y - \(g\.p\.y - 25\)\) < magnetDist/);
  assert.doesNotMatch(source, /mobileHeroRenderOffset|modelLayout|modelScale/);
});

test('desktop coordinates are unchanged', () => {
  const view = chartViewport(false, 1920, 840, 64);
  for (const point of [{ x: 0, y: 0 }, { x: 250, y: 600 }, { x: 1920, y: 840 }]) {
    assert.deepEqual(chartToScreen(point, view), point);
    assert.deepEqual(screenToChart(point, view), point);
  }
});

test('plot magnification does not reduce visible travel per simulation step', () => {
  const desktop = chartViewport(false, 1920, 840, 64);
  const mobile = chartViewport(true, 1920, 840, 64);
  const before = { x: 900, y: 500 };
  const after = { x: 897, y: 500 };
  const travel = (view: typeof mobile) => chartToScreen(before, view).x - chartToScreen(after, view).x;
  close(travel(mobile), travel(desktop) * 1.15);
});