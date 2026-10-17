import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { drawDiagnosticsEnabled, drawDurationReport, recordDrawDuration } from './drawDiagnostics';

test('CPU draw diagnostics collect nothing during normal sessions', () => {
  assert.equal(drawDiagnosticsEnabled, false);
  recordDrawDuration('play', 20);
  for (const report of Object.values(drawDurationReport())) {
    assert.deepEqual(report, { samples: 0, p50: null, p95: null, p99: null });
  }
});

test('draw timings are opt-in and measured around a single canvas draw', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /drawDiagnosticsEnabled \? performance.now\(\) : 0/);
  assert.match(game, /draw\(ctx\);\s*if \(drawDiagnosticsEnabled\) recordDrawDuration\(g.currentState, performance.now\(\) - drawStarted\)/);
});