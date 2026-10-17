import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('mobile diagnostics are opt-in, local and distinguish frame samples by game state', () => {
  const source = readFileSync(new URL('./MobileDiagnostics.tsx', import.meta.url), 'utf8');
  assert.match(source, /get\('debug'\) === 'mobile'/);
  assert.match(source, /if \(!enabled\) return;/);
  assert.match(source, /cancelAnimationFrame\(frame\)/);
  assert.match(source, /samples.current.length > 3600/);
  assert.match(source, /sample.state === state/);
  assert.match(source, /safeArea/);
  assert.match(source, /rafFrameTimesMs/);
  assert.match(source, /canvasDrawCpuMs: drawDurationReport\(\)/);
  for (const field of ['joystick', 'pause', 'fullscreenControl', 'footerNav', 'footerCopyright', 'stylesheets']) {
    assert.ok(source.includes(field), `missing diagnostic field: ${field}`);
  }
  assert.match(source, /copyText\(report, navigator, document\)/);
  assert.doesNotMatch(source, /fetch\(|sendBeacon|localStorage/);
});