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
  assert.match(game, /const H = 840;\s*const TAPE_HEIGHT = 48;/);
  assert.match(app, /state === 'menu' \? 'how-to-play-overlay' : ''/);
  assert.match(css, /\.how-to-play-overlay\s*\{\s*top: calc\(100% \* 48 \/ 840\);/);
  assert.match(css, /\.game-app \.game-overlay\.how-to-play-overlay\s*\{\s*inset: calc\(100% \* 48 \/ 840\) 0 0;/);
  assert.match(app, /relative flex h-10 items-center justify-center border-b[^>]*>[\s\S]*?id="paused-guide-title"[\s\S]*?top-1\/2 -translate-y-1\/2/);
  assert.match(app, /relative flex h-10 items-center justify-center mb-3[^>]*>[\s\S]*?id="mobile-guide-title"[\s\S]*?mobile-how-to-close/);
});

test('paused How to Play stays below Live Feed and inside the header/footer bounds', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(app, /pausedGuideOpen && <div className="paused-guide-overlay absolute z-40"/);
  assert.doesNotMatch(app, /pausedGuideOpen && <div className="fixed inset-0/);
  assert.match(css, /\.paused-guide-overlay\s*\{[\s\S]*?top: calc\(100% \* 48 \/ 840\);[\s\S]*?right: var\(--header-gutter\);[\s\S]*?bottom: 0;[\s\S]*?left: 0;/);
  assert.match(css, /\.game-app\s*\{\s*--header-gutter: 1rem;/);
  assert.match(css, /@media \(min-width: 640px\)[\s\S]*?--header-gutter: 1\.5rem;/);
  assert.match(css, /\.paused-guide-dialog\s*\{[\s\S]*?width: 100%;[\s\S]*?height: 100%;[\s\S]*?overflow-y: auto;/);
});

test('mobile Margin Call How to Play reuses the fullscreen mobile guide in both orientations', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(app, /setMobileGuideOpen\(true\);/);
  assert.match(app, /mobileGuideOpen && <div className="mobile-how-to-dialog fixed inset-0/);
});

test('Liquidated opens the initial-page How to Play panel without returning to the menu or leaving fullscreen', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const action = app.match(/\{state === 'over' && <button\s+type="button"[^]*?liquidated-how-to-play[^]*?<\/button>\}/)?.[0];
  assert.ok(action);
  assert.match(action, /onClick=\{\(\) => setMobileGuideOpen\(true\)\}/);
  assert.doesNotMatch(action, /handleReturnMenu|setState|setGameKey|exitFullscreen|unlock/);
  const initial = app.slice(app.indexOf('className="mobile-portrait-guide'), app.indexOf('/* PAUSE & GAME OVER WINDOWS */'));
  assert.match(initial, /onClick=\{\(\) => setMobileGuideOpen\(true\)\}/);
  assert.match(app, /mobileGuideOpen && <div className="mobile-how-to-dialog fixed inset-0/);
  assert.match(app, /onClick=\{\(\) => setMobileGuideOpen\(false\)\}/);
});

test('mobile landscape to portrait rotation pauses an active game', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(app, /const previousMobilePortrait = useRef<boolean \| null>\(null\);/);
  assert.match(app, /const wasPortrait = previousMobilePortrait\.current;\s*if \(wasPortrait === false && portrait && state === 'play'\) setState\('paused'\);\s*previousMobilePortrait\.current = portrait;/);
  assert.match(app, /window\.addEventListener\('orientationchange', syncOrientation\)/);
});

test('mobile landscape lock is released only in the menu, not on Liquidated', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(app, /state !== 'menu' \|\| awaitingLandscape/);
  assert.match(app, /orientation\?\.unlock\?\.\(\)/);
  assert.match(app, /document\.fullscreenElement === appRef\.current\) void document\.exitFullscreen\(\)/);
});

test('mobile preserves relative model sizes with one plot transform and unzoomed UI', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /mobileCanvasZoom = \(\): number => 1;/);
  assert.doesNotMatch(game, /ctx\.scale\(zoom, zoom\)/);
  assert.doesNotMatch(game, /modelLayout|modelScale/);
  assert.match(game, /ctx\.translate\(Math\.round\(sx\), Math\.round\(sy\)\);\s*if \(g\.printerTimer/);
  assert.match(game, /ctx\.fillRect\(x \+ 1, c\.top - g\.cy, CW - 3, c\.bot - c\.top\);/);
  assert.match(game, /ctx\.scale\(APE_SCALE, APE_SCALE\);/);
  assert.match(game, /const canvasPoint = zoomCanvasPoint\(/);
  assert.match(game, /screenToChart\(canvasPoint, currentChartViewport\(bounds\)\)/);
  assert.match(game, /pointerToWorld\(chartPoint/);
  assert.match(game, /renderViewport\.current = currentChartViewport\(bounds\);/);
  assert.match(game, /const viewport = renderViewport\.current;/);
  assert.match(game, /ctx\.scale\(viewport\.scaleX, viewport\.scale\);/);
});

test('mobile joystick scales from the smaller viewport dimension', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(css, /\.mobile-joystick\s*\{[\s\S]*?--joystick-size: clamp\(56px, min\(14vw, 18vh\), 78px\);[\s\S]*?--joystick-knob-size: clamp\(26px, min\(6\.5vw, 8\.5vh\), 38px\);/);
});

test('mobile joystick only sends movement in Kangaroo mode', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  const joystick = readFileSync(new URL('./MobileJoystick.tsx', import.meta.url), 'utf8');
  assert.match(game, /<MobileJoystick\s+movementEnabled=\{state === 'boxing'\}/);
  assert.match(joystick, /if \(!movementEnabled\) return;/);
  assert.match(joystick, /onPress\(\)/);
});

test('canvas keeps mobile backing resolution bounded and avoids render storms during catch-up', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /renderBackingSize\(display.width, display.height, W, H, dpr, window.matchMedia\('\(pointer: coarse\)'\).matches\)/);
  assert.match(game, /const \{ width, height \} = canvasBackingSize\(canvas.getBoundingClientRect\(\)\)/);
  assert.match(game, /ctx\.setTransform\(width \/ W, 0, 0, height \/ H, 0, 0\)/);
  assert.match(game, /let simulationSteps = 0/);
  assert.match(game, /simulationSteps\+\+/);
  assert.match(game, /if \(renderMode !== 'none' && \(simulationSteps > 0 \|\| needsDraw\)\)\s*\{\s*loopCallbacks\.current\.draw\(ctx\)/);
  assert.match(game, /if \(document.hidden\)/);
  assert.match(game, /document.removeEventListener\('visibilitychange', resetClock\)/);
  const draw = game.slice(game.indexOf('const draw ='), game.indexOf('// Fresh callbacks'));
  assert.doesNotMatch(draw.slice(0, draw.indexOf('onPointerMove')), /getBoundingClientRect/);
});

test('ticker item widths are measured once instead of every rendered frame', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /feedTextCache\.current\.get\(item\.news\)/);
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

test('bags collected during To the Moon hang from the rocket and reset for each ride', () => {
  const source = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(source, /rocketBags: 0/);
  assert.match(source, /g\.p\.rocketTimer = 420;[\s\S]*?g\.rocketBags = 0;/);
  assert.match(source, /if \(g\.p\.rocketTimer > 0\) g\.rocketBags\+\+;/);
  const rocket = source.slice(source.indexOf('// --- CASE 1: SEATED IN ROCKET'), source.indexOf('// --- STANDARD ON-FOOT RUNNER SPRITE'));
  assert.match(rocket, /for \(let bag = 0; bag < g\.rocketBags; bag\+\+\)/);
  assert.match(rocket, /ctx\.translate\(x, y\); ctx\.scale\(0\.48, 0\.48\)/);
  assert.match(rocket, /type: 'bag'/);
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