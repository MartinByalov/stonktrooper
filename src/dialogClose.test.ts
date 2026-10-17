// Verify shared close-button feedback across all modal windows.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('every modal X uses the shared theme-aware close style', () => {
  for (const file of ['App.tsx', 'ShareDD.tsx', 'SiteFooter.tsx']) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
    const buttons = source.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
    const closeButtons = buttons.filter(button => /<X\b/.test(button));
    assert(closeButtons.length > 0, file);
    for (const button of closeButtons) assert.match(button, /className="dialog-close /, file);
  }
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(css, /:root\s*\{[^}]*--dialog-close-hover: #facc15;/);
  assert.match(css, /html\[data-theme="light"\]\s*\{[^}]*--dialog-close-hover: #0b1426;/);
  assert.match(css, /\.dialog-close:hover,\s*\.dialog-close:focus-visible\s*\{\s*color: var\(--dialog-close-hover\);\s*border-color: var\(--dialog-close-hover\);/);
  assert.match(css, /\.dialog-close:hover svg,\s*\.dialog-close:focus-visible svg\s*\{\s*color: var\(--dialog-close-hover\);/);
});

test('desktop X hover and keyboard focus remain white or black instead of yellow', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  const desktop = css.slice(css.indexOf('/* Desktop close feedback stays monochrome'), css.indexOf('/* Pause guide spacing must not grow'));
  assert.match(desktop, /@media \(pointer: fine\)/);
  assert.match(desktop, /html:not\(\[data-theme="light"\]\) \.game-app \.dialog-close:is\(:hover, :focus-visible\)\s*\{\s*color: #fff;\s*border-color: #fff;/);
  assert.match(desktop, /html\[data-theme="light"\] \.game-app \.dialog-close:is\(:hover, :focus-visible\)\s*\{\s*color: #000;\s*border-color: #000;/);
  assert.match(desktop, /html \.game-app \.dialog-close:is\(:hover, :focus-visible\) svg\s*\{\s*color: inherit;/);
});