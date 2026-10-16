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