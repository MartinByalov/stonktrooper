import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('manual mode and music buttons remain in a hidden container, unlike public controls', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const container = app.match(/<div hidden style=\{\{ display: 'none' \}\} data-testid="hidden-mode-controls">([\s\S]*?)<\/div>/);
  assert(container, 'controls are hidden independently of responsive CSS');
  for (const label of ['Candles', 'Hawk', 'Pigeon', 'Inverted', 'Kangaroo', 'Music']) {
    assert(container[1].includes(`${label}</button>`), `${label} stays in the hidden group`);
  }
  assert(!container[1].includes('title="About"'));
  assert.equal((container[1].match(/<button /g) ?? []).length, 6);
});