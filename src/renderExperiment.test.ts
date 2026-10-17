import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { actorLayers, frameIntervalSummary, getRenderMode, renderExperimentEnabled, renderLayers, renderModes, setRenderMode } from './renderExperiment';

test('render experiments require explicit opt-in and start with normal rendering', () => {
  assert.equal(getRenderMode(), 'full');
  for (const search of ['', '?debug=mobile', '?render=none']) assert.equal(renderExperimentEnabled(search), false);
  assert.equal(renderExperimentEnabled('?debug=render'), true);
});

test('each render mode has explicit layer isolation', () => {
  assert.deepEqual(renderLayers('full'), { chart: true, actors: true });
  assert.deepEqual(renderLayers('chart'), { chart: true, actors: false });
  assert.deepEqual(renderLayers('actors'), { chart: false, actors: true });
  assert.deepEqual(renderLayers('none'), { chart: false, actors: false });
  for (const mode of renderModes) { setRenderMode(mode); assert.equal(getRenderMode(), mode); }
  setRenderMode('full');
});

test('frame summary reports callback frequency rather than display FPS without changing samples', () => {
  assert.equal(frameIntervalSummary([]), 'waiting');
  const samples = [20, 10, 30];
  assert.equal(frameIntervalSummary(samples), '50.0 callbacks/s · p95 30.0 ms · n=3');
  assert.deepEqual(samples, [20, 10, 30]);
});

test('actor subgroups isolate drawing and UI baseline has no world layers', () => {
  assert.deepEqual(renderLayers('ui'), { chart: false, actors: false });
  for (const mode of ['hero', 'pickups', 'enemies', 'effects'] as const) {
    assert.deepEqual(renderLayers(mode), { chart: false, actors: true });
    for (const [group, enabled] of Object.entries(actorLayers(mode))) assert.equal(enabled, group === mode);
  }
  for (const mode of ['full', 'actors'] as const) assert.ok(Object.values(actorLayers(mode)).every(Boolean));
  for (const mode of ['ui', 'chart', 'none'] as const) assert.ok(Object.values(actorLayers(mode)).every(value => !value));
  const source = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(source, /if \(actors.pickups\) drawPickups\(ctx\)/);
  assert.match(source, /if \(actors.enemies\) \{\s+drawSwans\(ctx\);\s+drawAnimals\(ctx\)/);
  assert.match(source, /else if \(actors.hero\) drawHero\(ctx\)/);
  assert.match(source, /encounter \|\| !actors.effects \? \[\] : g.cases/);
});

test('no-canvas mode skips drawing, not simulation, and normal sessions ignore experiment state', () => {
  const source = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(source, /const renderMode = experiment \? getRenderMode\(\) : 'full'/);
  assert.match(source, /renderMode !== 'none' && \(simulationSteps > 0 \|\| needsDraw\)/);
  assert.ok(source.indexOf('loopCallbacks.current.update();') < source.indexOf("renderMode !== 'none' &&"));
  assert.match(source, /if \(layers.chart && g.zeroCrash/);
  const panel = readFileSync(new URL('./RenderExperimentPanel.tsx', import.meta.url), 'utf8');
  assert.match(panel, /state === 'play' \|\| state === 'boxing'/);
  assert.match(panel, /\[mode\]/);
  assert.match(panel, /cancelAnimationFrame\(frame\)/);
  assert.doesNotMatch(panel, /fetch\(|localStorage|sendBeacon/);
});