import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');

test('visible header wire uses a thin idle divider and hidden header wire falls back to the chart', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(app, /<canvas className="mobile-header-feed" aria-label="Live Feed"/);
  assert.match(game, /headerFeedActive\.current = !!headerFeedRef\.current && headerFeedRef\.current\.getBoundingClientRect\(\)\.width > 0;/);
  assert.match(game, /headerFeedActive\.current \? 1 \/ scale/);
  assert.match(game, /ctx = headerCtx;/);
  assert.match(game, /ctx = plotCtx;/);
  assert.match(game, /ctx\.scale\(1, tapeH\);\s*tapeH = 3;/);
  assert.match(css, /\.mobile-header-feed\s*\{\s*display: none;/);
});

test('touch header wire is state-independent except for the portrait phone layout', () => {
  const start = css.indexOf('@media (pointer: coarse)', css.indexOf('/* Desktop shares the header wire'));
  const touch = css.slice(start, css.indexOf('/* Portrait phones keep the wire', start));
  assert.match(touch, /\.game-app \.mobile-header-feed\s*\{\s*display: block;\s*flex: 1 1 0;/);
  assert.match(touch, /\.game-app \.header-controls\s*\{\s*flex: 0 0 auto;\s*margin-left: 0;/);
  assert.doesNotMatch(touch, /data-state|orientation:/);
  const phone = css.slice(css.indexOf('/* Portrait phones keep the wire'), css.indexOf('.mobile-joystick:active'));
  assert.match(phone, /@media \(max-width: 767px\) and \(orientation: portrait\) and \(pointer: coarse\)/);
  assert.match(phone, /\.game-app \.mobile-header-feed\s*\{\s*display: none;/);
  assert.doesNotMatch(phone, /data-state/);
});

test('mobile header news is frameless between the visible logo and controls', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  const header = app.slice(app.indexOf('<header'), app.indexOf('</header>'));
  assert.ok(header.indexOf('stonktrooper-logo') < header.indexOf('mobile-header-feed'));
  assert.ok(header.indexOf('mobile-header-feed') < header.indexOf('header-controls'));
  assert.match(css, /header > div:first-child\s*\{\s*flex: 0 0 auto;/);
  assert.match(css, /@media \(pointer: coarse\)\s*\{\s*\.game-app header\s*\{\s*flex-wrap: nowrap;\s*gap: 16px;/);
  assert.match(game, /if \(header\) \{\s*\/\/[^\n]*\n\s*ctx\.clearRect\(0, 0, W, tapeH\);\s*\} else \{/);
});

test('mobile header feed fades into transparency at both ends without an opaque cover', () => {
  const feed = css.match(/\.game-app \.mobile-header-feed\s*\{([^}]+)\}/)?.[1];
  assert.ok(feed);
  assert.match(feed, /-webkit-mask-image: linear-gradient\(to right, transparent, #000 15%, #000 85%, transparent\);/);
  assert.match(feed, /\n\s*mask-image: linear-gradient\(to right, transparent, #000 15%, #000 85%, transparent\);/);
  assert.doesNotMatch(feed, /background\s*:/);
});

test('landscape touch keeps header Live Feed visible for pause, guides and score sharing', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const landscape = css.slice(css.indexOf('/* Landscape touch keeps the wire'), css.indexOf('/* Mobile landscape landing uses'));
  assert.match(landscape, /@media \(orientation: landscape\) and \(pointer: coarse\)/);
  assert.match(landscape, /\.game-app \.mobile-header-feed\s*\{\s*display: block;\s*flex: 1 1 0;/);
  assert.doesNotMatch(landscape, /data-state/);
  assert.match(app, /const feedInHeader = !!headerFeed && headerFeed.getBoundingClientRect\(\).width > 0;/);
  assert.match(app, /const feedHeight = feedInHeader \? 0 :/);
});

test('joystick visibility follows touch input rather than tablet viewport width', () => {
  const joystick = readFileSync(new URL('./MobileJoystick.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(joystick, /min-\[1025px\]:hidden|(?:min|max)-\[[^\]]+\]:hidden/);
  assert.match(css, /\.game-app \.mobile-joystick\s*\{\s*display: none;/);
  assert.match(css, /@media \(pointer: coarse\)\s*\{\s*\.game-app \.mobile-joystick\s*\{\s*display: flex;/);
});

test('joystick uses monochrome button borders in both themes without a blur layer', () => {
  assert.match(css, /\.game-app \.mobile-joystick\s*\{[^}]*color: #fff;[^}]*border: 1px solid currentColor;[^}]*background: transparent;[^}]*backdrop-filter: none;/);
  assert.match(css, /html\[data-theme="light"\] \.game-app \.mobile-joystick\s*\{\s*color: #000;/);
  assert.match(css, /\.mobile-joystick-knob\s*\{[^}]*border: 1px solid currentColor;[^}]*background: var\(--alt\);/);
});

test('Liquidated scales as a whole on all touch sizes without internal scrolling', () => {
  const fit = readFileSync(new URL('./useMobileDialogFit.ts', import.meta.url), 'utf8');
  assert.match(fit, /matchMedia\('\(pointer: coarse\)'\)/);
  assert.match(fit, /const selector = '\.game-result,/);
  assert.match(fit, /height \/ Math\.max\(1, dialog\.offsetHeight\)/);
  assert.match(css, /\.game-app \.game-over-overlay > \.game-result-over\s*\{[^}]*display: block;[^}]*max-height: none;[^}]*transform: scale\(var\(--mobile-dialog-scale, 1\)\);/);
  assert.match(css, /\.game-app \.game-over-overlay > \.game-result-over > \.game-result-content\s*\{[^}]*max-height: none;[^}]*overflow: hidden;/);
});

test('Liquidated overrides portrait overlay stretching and remains an intrinsic-height card after rotation', () => {
  const mobile = css.slice(css.indexOf('@media (pointer: coarse) {', css.indexOf('.game-app .chart-pause-control {')));
  assert.match(mobile, /\.game-app \.game-arena > \.game-overlay\.game-over-overlay\s*\{\s*align-items: center;\s*justify-content: center;\s*overflow: hidden;/);
  assert.match(mobile, /\.game-app \.game-over-overlay > \.game-result-over\s*\{[^}]*height: auto;\s*min-height: 0;\s*max-height: none;[^}]*flex: 0 0 auto;/);
  // The later rule must beat the equally specific generic portrait selector.
  assert.ok(css.indexOf('/* Override portrait\'s generic arena-overlay stretch') > css.indexOf('.game-app .game-arena > .absolute.inset-0'));
  const fit = readFileSync(new URL('./useMobileDialogFit.ts', import.meta.url), 'utf8');
  assert.match(fit, /window\.addEventListener\('resize', schedule\)/);
  assert.match(fit, /resize\.observe\(element\)/);
});

test('mobile Margin Call centers its card and gives its title six extra pixels on both sides', () => {
  const section = css.slice(css.indexOf('/* Margin Call is an intrinsic-height'), css.indexOf('/* Override portrait\'s generic arena-overlay stretch'));
  assert.match(section, /\.game-app \.game-arena > \.game-overlay\.pause-overlay\s*\{\s*align-items: center;\s*justify-content: center;/);
  assert.match(section, /height: auto;\s*align-self: center;\s*padding: 0 var\(--margin-call-gap\) var\(--margin-call-gap\) !important;/);
  assert.match(section, /> h2\s*\{\s*margin: 0;\s*padding-block: calc\(var\(--margin-call-gap\) \+ 6px\);\s*text-align: center;/);
  assert.match(section, /> \.space-y-2\\\.5\s*\{\s*margin-top: 0;/);
});

test('pause control is only shown during play and uses transparent theme colors', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(app.slice(0, app.indexOf('</header>')), /chart-pause-control|mobile-header-pause-control/);
  assert.match(app, /\{state === 'play' && <button[^]*?onClick=\{\(\) => setState\('paused'\)\}[^]*?aria-label="Pause game"[^]*?className="chart-pause-control"/);
  const pause = app.slice(app.indexOf("{state === 'play' && <button"), app.indexOf('/* OVERLAYS:'));
  assert.doesNotMatch(pause, /<Play\b|Resume game/);
  assert.match(game, /const axisLeft = bounds.width \/ 2 \+ \(W \/ 2 - AX\) \* horizontalScale;/);
  assert.match(css, /\.game-app \.chart-pause-control\s*\{[^}]*right: calc\(var\(--chart-axis-right, 64px\) \+ 8px\);[^}]*border: 1px solid #fff;[^}]*background: transparent;[^}]*color: #fff;/);
  assert.match(css, /html\[data-theme="light"\] \.game-app \.chart-pause-control\s*\{[^}]*border-color: #000;[^}]*background: transparent;[^}]*color: #000;/);
});

test('mobile pause uses the same safe-area-aware gap below and before the price axis', () => {
  assert.match(css, /\.game-app \.chart-pause-control\s*\{\s*--pause-control-gap: var\(--mobile-control-gap\);\s*right: calc\(var\(--chart-axis-right, 64px\) \+ var\(--pause-control-gap\)\);\s*bottom: var\(--pause-control-gap\);/);
  assert.match(css, /--mobile-control-gap: max\(8px, env\(safe-area-inset-top\), env\(safe-area-inset-right\), env\(safe-area-inset-bottom\), env\(safe-area-inset-left\)\);/);
  assert.match(css, /padding-top: var\(--mobile-control-gap\);\s*padding-right: var\(--mobile-control-gap\);\s*padding-bottom: var\(--mobile-control-gap\);/);
  assert.match(css, /\.game-app:fullscreen \.mobile-joystick\s*\{\s*position: absolute;\s*left: var\(--mobile-control-gap\);\s*bottom: var\(--mobile-control-gap\);/);
});

test('Info is rendered on desktop and hidden during gameplay only on touch layouts', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(app, /<button type="button" title="About"[\s\S]*?className="mobile-header-control mobile-header-about-control/);
  assert.doesNotMatch(app, /state !== 'play' && state !== 'boxing' && <button/);
  assert.match(css, /@media \(pointer: coarse\)\s*\{\s*\.game-app:is\(\[data-state="play"\], \[data-state="boxing"\]\) \.header-controls > \.mobile-header-about-control\s*\{\s*display: none;/);
});