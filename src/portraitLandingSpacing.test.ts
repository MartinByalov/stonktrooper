import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('device-validated landing gaps override bottom insets only in touch portrait menu', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  const section = css.slice(css.indexOf('/* Device-validated portrait landing gaps'), css.indexOf('/* Landscape gameplay follows'));
  assert.match(section, /@media \(orientation: portrait\) and \(pointer: coarse\)/);
  assert.match(section, /\.game-app\[data-state="menu"\] \.site-footer\s*\{\s*padding-bottom: 4px;/);
  assert.match(section, /\.game-app\[data-state="menu"\] \.game-arena > \.game-overlay\.how-to-play-overlay\s*\{\s*padding-bottom: 8px;/);
});