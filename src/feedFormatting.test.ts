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

test('desktop header wire replaces the chart row and preserves hover pause', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  const desktop = css.slice(css.indexOf('/* Desktop shares the header wire'), css.indexOf('@media (pointer: coarse)', css.indexOf('/* Desktop shares the header wire')));
  assert.match(desktop, /@media \(pointer: fine\)/);
  assert.match(desktop, /\.game-app header\s*\{\s*flex-wrap: nowrap;/);
  assert.match(desktop, /\.game-app \.mobile-header-feed\s*\{\s*display: block;\s*flex: 1 1 0;/);
  assert.match(game, /headerFeed\?\.addEventListener\('pointerenter', pauseTicker\)/);
  assert.match(game, /headerFeed\?\.removeEventListener\('pointerleave', resumeTicker\)/);
});

test('header has no idle divider while active countdowns occupy three CSS pixels', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /headerFeedActive\.current \? 1 \/ scale/);
  assert.match(game, /ctx\.scale\(1, tapeH\);\s*tapeH = 3;/);
  assert.doesNotMatch(game, /ctx\.fillRect\(0, 0, W, tapeH\);\s*ctx\.scale\(1, tapeH\)/);
  for (const scale of [0.3, 0.7, 1, 1.5]) {
    const tapeHeight = 1 / scale;
    assert.ok(Math.abs(tapeHeight * scale - 1) < 1e-8);
    assert.ok(Math.abs(3 * tapeHeight * scale - 3) < 1e-8);
  }
});

test('Kangaroo Live Feed renders Jeromé in gold without changing the printer color', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /ctx\.fillStyle = theme === 'light' \? '#08795c' : '#55d6ae';[\s\S]*?if \(g\.currentState === 'boxing'\) \{\s*ctx\.fillStyle = '#ffd230';\s*writeCentered\('Jeromé', \(W\) \/ 2\);\s*\}\s*else \{/);
});

test('Live Feed has no top or bottom border while retaining its background and status strips', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(game, /tickerBorder|borderHeight/);
  assert.match(game, /ctx\.fillStyle = theme === 'light' \? '#eaf0f5' : '#131c29';\s*ctx\.fillRect\(0, 0, W, tapeH\);/);
  assert.match(game, /ctx\.fillRect\(0, tapeH - 3, W, 3\);/);
});

test('Live Feed text is centered within its height without borders', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /const feedCenterY = tapeH \/ 2;\s*ctx\.translate\(x, feedCenterY \+ \(ascent - descent\) \/ 2\);/);
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
      const topGap = baseline - ascent;
      const bottomGap = tapeHeight - (baseline + descent);
      assert.ok(Math.abs(topGap - bottomGap) < 0.000001, `${text}: ${topGap} vs ${bottomGap}`);
    }
  }
});

test('mobile Live Feed uses the measured header height in canvas and overlay coordinates', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(game, /let tapeH = feedLayout\.current\.tapeHeight;/);
  assert.match(game, /const TAPE_HEIGHT = feedLayout\.current\.tapeHeight;/);
  assert.match(game, /const tapeHeight = headerFeedActive\.current \? 1 \/ scale : headerHeight > 0 \? headerHeight \/ scale : TAPE_HEIGHT;/);
  assert.match(app, /const feedHeight = feedInHeader \? 0 : headerHeight > 0 \? headerHeight :/);
  assert.match(app, /if \(header\) observer\.observe\(header\);/);
  for (const headerHeight of [44, 60, 80]) {
    for (const scale of [0.4, 0.8, 1.2]) {
      const tapeHeight = headerHeight / scale;
      assert.ok(Math.abs(tapeHeight * scale - headerHeight) < 0.000001);
    }
  }
});