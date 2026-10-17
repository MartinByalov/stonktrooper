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

test('Live Feed borders are black in day mode and white in night mode', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /const tickerBorder = theme === 'light' \? '#000000' : '#ffffff';/);
  assert.match(game, /ctx\.fillStyle = tickerBorder;\s*ctx\.fillRect\(0, 0, W, borderHeight\);\s*ctx\.fillRect\(0, tapeH - borderHeight, W, borderHeight\);/);
  assert.match(game, /const borderHeight = H \/ Math\.max\(1, canvasRef\.current\?\.getBoundingClientRect\(\)\.height \?\? H\);/);
  for (const height of [240, 390, 840]) {
    assert.equal((840 / height) * (height / 840), 1);
  }
});

test('Live Feed text is centered between its top and bottom borders', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /const feedCenterY = \(1 \+ tapeH - 1\) \/ 2;\s*ctx\.translate\(x, feedCenterY \+ \(ascent - descent\) \/ 2\);/);
  const start = game.indexOf('const writeCentered = (text: string, x: number) => {');
  assert.ok(start >= 0);
  const body = game.slice(game.indexOf('{', start) + 1, game.indexOf('\n    };', start));
  assert.match(body, /ctx\.measureText\(text\)/);
  assert.doesNotMatch(body, /measureText\('Hg'\)/);
  const draw = new Function('ctx', 'text', 'x', 'tapeH', 'textScaleX', body);
  for (const tapeHeight of [32, 48, 64]) {
    for (const [text, ascent, descent] of [['NEWS', 10, 0], ['Jeromé', 12, 2], ['Jumping', 10, 3]] as const) {
      let baseline = Number.NaN;
      draw({
        measureText: (value: string) => {
          assert.equal(value, text);
          return { actualBoundingBoxAscent: ascent, actualBoundingBoxDescent: descent };
        },
        save() {}, restore() {}, scale() {}, fillText() {},
        translate: (_x: number, y: number) => { baseline = y; },
      }, text, 100, tapeHeight, 0.75);
      const topGap = baseline - ascent - 1;
      const bottomGap = tapeHeight - 1 - (baseline + descent);
      assert.ok(Math.abs(topGap - bottomGap) < 0.000001, `${text}: ${topGap} vs ${bottomGap}`);
    }
  }
});

test('mobile Live Feed uses the measured header height in canvas and overlay coordinates', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(game, /let tapeH = feedLayout\.current\.tapeHeight;/);
  assert.match(game, /const TAPE_HEIGHT = feedLayout\.current\.tapeHeight;/);
  assert.match(game, /const tapeHeight = headerFeedActive\.current \? 3 \/ scale : headerHeight > 0 \? headerHeight \/ scale : TAPE_HEIGHT;/);
  assert.match(app, /const feedHeight = headerHeight > 0 \? headerHeight :/);
  assert.match(app, /if \(header\) observer\.observe\(header\);/);
  for (const headerHeight of [44, 60, 80]) {
    for (const scale of [0.4, 0.8, 1.2]) {
      const tapeHeight = headerHeight / scale;
      assert.ok(Math.abs(tapeHeight * scale - headerHeight) < 0.000001);
    }
  }
});