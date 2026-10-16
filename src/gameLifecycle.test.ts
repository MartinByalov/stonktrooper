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
  assert.match(game, /const H = 840;\s*const TAPE_HEIGHT = 56;/);
  assert.match(app, /state === 'menu' \? 'how-to-play-overlay' : ''/);
  assert.match(css, /\.how-to-play-overlay\s*\{\s*top: calc\(100% \* 56 \/ 840\);/);
  assert.match(css, /\.game-app \.game-overlay\.how-to-play-overlay\s*\{\s*inset: calc\(100% \* 56 \/ 840\) 0 0;/);
});

test('paused How to Play stays below Live Feed and inside the header/footer bounds', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(app, /pausedGuideOpen && <div className="paused-guide-overlay absolute z-40"/);
  assert.doesNotMatch(app, /pausedGuideOpen && <div className="fixed inset-0/);
  assert.match(css, /\.paused-guide-overlay\s*\{[\s\S]*?top: calc\(100% \* 56 \/ 840\);[\s\S]*?right: var\(--header-gutter\);[\s\S]*?bottom: 0;[\s\S]*?left: 0;/);
  assert.match(css, /\.game-app\s*\{\s*--header-gutter: 1rem;/);
  assert.match(css, /@media \(min-width: 640px\)[\s\S]*?--header-gutter: 1\.5rem;/);
  assert.match(css, /\.paused-guide-dialog\s*\{[\s\S]*?width: 100%;[\s\S]*?height: 100%;[\s\S]*?overflow-y: auto;/);
});

test('mobile Margin Call How to Play reuses the fullscreen mobile guide', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(app, /portraitMobile = window\.matchMedia\('\(max-width: 1024px\) and \(orientation: portrait\) and \(pointer: coarse\)'\)\.matches/);
  assert.match(app, /portraitMobile\) setMobileGuideOpen\(true\);/);
  assert.match(app, /mobileGuideOpen && <div className="mobile-how-to-dialog fixed inset-0/);
});

test('mobile landscape to portrait rotation pauses an active game', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(app, /const previousMobilePortrait = useRef<boolean \| null>\(null\);/);
  assert.match(app, /const wasPortrait = previousMobilePortrait\.current;\s*if \(wasPortrait === false && portrait && state === 'play'\) setState\('paused'\);\s*previousMobilePortrait\.current = portrait;/);
  assert.match(app, /window\.addEventListener\('orientationchange', syncOrientation\)/);
});

test('mobile canvas zoom enlarges the game and keeps pointer aiming inverse-mapped', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(game, /const mobileCanvasZoom = \(\): number =>/);
  assert.match(game, /feedLayout\.current = \{ mobile, fontSize: mobile \? Math\.min\(50, Math\.max\(11, 14 \/ scale\)\) : 11 \}/);
  assert.match(app, /rect\.height \* 56 \/ 840 \* mobileCanvasZoom\(\)/);
  assert.match(game, /window\.matchMedia\('\(max-width: 1024px\) and \(pointer: coarse\)'\)/);
  assert.match(game, /const shortSide = Math\.min\(window\.innerWidth, window\.innerHeight\)/);
  assert.match(game, /return Math\.min\(1\.34, orientationBoost \+ 1 \+ sizeBoost\)/);
  assert.match(game, /const mobileHeroRenderOffset = \(\): number =>/);
  assert.match(game, /g\.p\.x - g\.cx \+ mobileHeroRenderOffset\(\)/);
  assert.match(game, /ctx\.translate\(W \/ 2, 0\);\s*ctx\.scale\(zoom, zoom\);\s*ctx\.translate\(-W \/ 2, 0\)/);
  assert.match(game, /return \{ x: \(x - W \/ 2\) \/ zoom \+ W \/ 2, y: y \/ zoom \}/);
  assert.match(game, /const canvasPoint = zoomCanvasPoint\(/);
  assert.match(game, /pointerToWorld\(canvasPoint, \{ left: 0, top: 0, width: W, height: H \}/);
});

test('mobile joystick scales from the smaller viewport dimension', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(css, /\.mobile-joystick\s*\{[\s\S]*?--joystick-size: clamp\(56px, min\(14vw, 18vh\), 78px\);[\s\S]*?--joystick-knob-size: clamp\(26px, min\(6\.5vw, 8\.5vh\), 38px\);/);
});

test('canvas keeps mobile backing resolution bounded and avoids render storms during catch-up', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /const canvasPixelRatio = \(\): number =>/);
  assert.match(game, /Math\.min\(dpr, 1\.5\)/);
  assert.match(game, /canvas\.width = Math\.round\(W \* ratio\)/);
  assert.match(game, /canvas\.height = Math\.round\(H \* ratio\)/);
  assert.match(game, /ctx\.setTransform\(ratio, 0, 0, ratio, 0, 0\)/);
  assert.match(game, /let simulationSteps = 0/);
  assert.match(game, /simulationSteps\+\+/);
  assert.match(game, /if \(simulationSteps < 4\) loopCallbacks\.current\.draw\(ctx\)/);
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