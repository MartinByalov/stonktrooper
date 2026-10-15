// Regression checks for feedFormatting.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { formatFeedHeadline } from './news';

test('feed separates sentences with periods instead of semicolons', () => {
  assert.equal(formatFeedHeadline('BULL DENIES CHARGING; CLAIMS HE IS NETWORKING QUICKLY'), 'BULL DENIES CHARGING. CLAIMS HE IS NETWORKING QUICKLY.');
  assert.equal(formatFeedHeadline('BRRR!'), 'BRRR!');
  assert.equal(formatFeedHeadline('ALREADY DONE.'), 'ALREADY DONE.');
});

test('Kangaroo Live Feed renders Jeromé in gold without changing the printer color', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /ctx\.fillStyle = theme === 'light' \? '#08795c' : '#55d6ae';[\s\S]*?if \(g\.currentState === 'boxing'\) \{\s*ctx\.fillStyle = '#ffd230';\s*writeCentered\('Jeromé', \(W\) \/ 2\);\s*\}\s*else \{/);
});