// Regression checks for gameLifecycle.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('animation loop does not reinitialize on score callbacks or theme changes', () => {
  const source = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  const loop = source.slice(source.indexOf('let animationFrameId: number;'));
  assert.match(loop, /loopCallbacks\.current\.update\(\)/);
  assert.match(loop, /loopCallbacks\.current\.draw\(ctx\)/);
  assert.match(loop, /\}, \[initGame\]\);/);
  assert.doesNotMatch(loop, /\}, \[initGame, update, draw\]\);/);
  assert.match(loop, /disposed = true;/);
  assert.match(loop, /cancelAnimationFrame\(animationFrameId\)/);
});

test('How to Play starts below the unblurred Live Feed strip', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /const H = 840;\s*const TAPE_HEIGHT = 44;/);
  assert.match(app, /state === 'menu' \? 'how-to-play-overlay' : ''/);
  assert.match(css, /\.how-to-play-overlay\s*\{\s*top: 5\.238095238%;/);
});

test('mobile canvas zoom enlarges the game and keeps pointer aiming inverse-mapped', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /const mobileCanvasZoom = \(\): number =>/);
  assert.match(game, /window\.innerWidth > window\.innerHeight \? 1\.08 : 1\.12/);
  assert.match(game, /ctx\.translate\(W \/ 2, H \/ 2\);\s*ctx\.scale\(zoom, zoom\);\s*ctx\.translate\(-W \/ 2, -H \/ 2\)/);
  assert.match(game, /const canvasPoint = zoomCanvasPoint\(/);
  assert.match(game, /pointerToWorld\(canvasPoint, \{ left: 0, top: 0, width: W, height: H \}/);
});

test('collecting a tender activates hawk mode rather than adding a companion', () => {
  const source = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  const tender = source.slice(source.indexOf("} else if (d.type === 'tender')"), source.indexOf("} else if (d.type === 'banana')"));
  assert.match(tender, /activateHawk\(\)/);
  assert.doesNotMatch(tender, /addCompanion/);
  assert.match(source, /y: s.y \+ 1.6, type: 'tender', taken: false, isAir, vy: 1/);
  assert.match(source, /const landing = tenderLanding\(g.C, d.x, CW\);/);
  assert.match(source, /stepTenderFall\(d, landing.y\)/);
  assert.match(source, /const activateHawk = useCallback[\s\S]*?g\.hawkTimer = 600;/);
});

test('printer ticker shows its prefix once and repeats only trailing R letters', () => {
  const source = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(source, /const prefix = 'MONEY PRINTER GO B';/);
  assert.match(source, /writeCentered\(prefix, g.printerTickerX\)/);
  assert.match(source, /writeCentered\('R'\.repeat\(count\), visibleTailX\)/);
  assert.doesNotMatch(source, /g\.printerTickerX \+=/);
  assert.doesNotMatch(source, /'R'\.repeat\(240\)/);
});

test('header candle demo is a toggle and uses the safe surprise generator', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(app, /aria-pressed=\{candleDemo\}/);
  assert.match(app, /candleDemo=\{candleDemo\}/);
  assert.match(game, /g.nextCandleSurprise = candleDemo \? g.globalFrame/);
  assert.match(game, /applyCandleSurprise\(g.C, index/);
  assert.match(game, /onScoreUpdate, candleDemo\]/);
});

test('parent supplies a stable state callback while retaining boxing guard', () => {
  const source = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(source, /const handleStateChange = useCallback/);
  assert.match(source, /if \(boxingActive\.current\) return;/);
  assert.match(source, /if \(nextState === 'boxing'\) boxingActive\.current = true;/);
  assert.match(source, /onStateChange=\{handleStateChange\}/);
});

test('bell enters boss mode immediately and boss ticker shows a gold health strip', () => {
  const source = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(source, /g\.currentState = 'boxing';\s+onStateChange\('boxing'\)/);
  assert.match(source, /updateEntities\(\);\s+if \(g\.currentState !== 'play'\) return;/);
  assert.match(source, /writeCentered\('Jeromé'/);
  assert.match(source, /ctx\.fillStyle = '#facc15'; ctx\.fillRect\(0, tapeH - 3/);
});

test('monkey countdown uses a banana-yellow ticker strip', () => {
  const source = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(source, /else if \(g\.apeTimer > 0\) \{\s*ctx\.fillStyle = '#713f12'; ctx\.fillRect\(0, tapeH - 3, W, 3\);\s*ctx\.fillStyle = '#fde047'; ctx\.fillRect\(0, tapeH - 3, W \* Math\.min\(1, g\.apeTimer \/ APE_DURATION\), 3\);/);
});

test('boss uses main chart canvas rather than a separate arena canvas', () => {
  const overlay = readFileSync(new URL('./BoxingGame.tsx', import.meta.url), 'utf8');
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(overlay, /<canvas/);
  assert.match(game, /drawBossEncounter\(ctx, encounter, theme === 'dark'\)/);
  assert.match(game, /g\.C = bossTrack\.current\.candles/);
  assert.match(game, /drawHero\(ctx\); ctx\.restore\(\)/);
  assert.doesNotMatch(game, /bossScale|bossOffset/);
});