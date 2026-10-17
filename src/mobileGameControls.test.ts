import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');

test('visible header wire has no idle divider and hidden header wire falls back to the chart', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(app, /<canvas className="mobile-header-feed" aria-label="Live Feed"/);
  assert.match(game, /headerFeedActive\.current = !!headerFeedRef\.current && headerFeedRef\.current\.getBoundingClientRect\(\)\.width > 0;/);
  assert.match(game, /headerFeedActive\.current \? 1 \/ scale/);
  assert.match(game, /ctx = headerCtx;/);
  assert.match(game, /ctx = plotCtx;/);
  assert.match(game, /ctx\.scale\(1, tapeH\);\s*tapeH = 3;/);
  const strip = game.slice(game.indexOf('if (headerFeedActive.current) {', game.indexOf('// Carry effects only tint')), game.indexOf("if (g.currentState === 'boxing'", game.indexOf('// Carry effects only tint')));
  assert.doesNotMatch(strip, /fillRect|fillStyle/);
  assert.match(css, /\.mobile-header-feed\s*\{\s*display: none;/);
});

test('joystick uses a plain pressed fill and clears it on pointer and keyboard interruption', () => {
  const source = readFileSync(new URL('./MobileJoystick.tsx', import.meta.url), 'utf8');
  assert.match(source, /setAttribute\('data-pressed', 'true'\)/);
  assert.match(source, /control.current\?\.removeAttribute\('data-pressed'\)/);
  assert.match(source, /onPointerCancel=\{reset\} onLostPointerCapture=\{reset\}/);
  assert.match(source, /onBlur=\{e =>/);
  assert.match(css, /\.game-app \.mobile-joystick\[data-pressed="true"\]\s*\{\s*background: #182334;/);
  assert.match(css, /html\[data-theme="light"\] \.game-app \.mobile-joystick\[data-pressed="true"\]\s*\{\s*background: #e9eff4;/);
});

test('footer separator is present only in touch portrait', () => {
  const section = css.slice(css.indexOf('/* Only the mobile portrait layout keeps a footer separator. */'), css.indexOf('.game-app .mobile-joystick:focus-visible'));
  assert.match(section, /\.game-app \.site-footer\s*\{\s*border: 0;/);
  assert.match(section, /@media \(orientation: portrait\) and \(pointer: coarse\)\s*\{\s*\.game-app \.site-footer\s*\{\s*border-top: 1px solid var\(--line\);/);
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

test('header feed keeps a transparent inset before fading at both ends without an opaque cover', () => {
  const feed = css.match(/\.game-app \.mobile-header-feed\s*\{([^}]+)\}/)?.[1];
  assert.ok(feed);
  assert.match(feed, /-webkit-mask-image: linear-gradient\(to right, transparent 12px, #000 calc\(12px \+ 15%\), #000 calc\(85% - 12px\), transparent calc\(100% - 12px\)\);/);
  assert.match(feed, /\n\s*mask-image: linear-gradient\(to right, transparent 12px, #000 calc\(12px \+ 15%\), #000 calc\(85% - 12px\), transparent calc\(100% - 12px\)\);/);
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
  assert.match(css, /\.mobile-joystick-knob\s*\{[^}]*border: 1px solid currentColor;[^}]*background: currentColor;/);
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
  const mobile = css.slice(css.indexOf('@media (pointer: coarse) {', css.indexOf('/* Keep the mobile description area')));
  assert.match(mobile, /\.game-app \.game-arena > \.game-overlay\.game-over-overlay\s*\{\s*align-items: center;\s*justify-content: center;\s*overflow: hidden;/);
  assert.match(mobile, /\.game-app \.game-over-overlay > \.game-result-over\s*\{[^}]*height: auto;\s*min-height: 0;\s*max-height: none;[^}]*flex: 0 0 auto;/);
  // The later rule must beat the equally specific generic portrait selector.
  assert.ok(css.indexOf('/* Override portrait\'s generic arena-overlay stretch') > css.indexOf('.game-app .game-arena > .absolute.inset-0'));
  const fit = readFileSync(new URL('./useMobileDialogFit.ts', import.meta.url), 'utf8');
  assert.match(fit, /window\.addEventListener\('resize', schedule\)/);
  assert.match(fit, /resize\.observe\(element\)/);
});

test('mobile Margin Call centers its card and gives its title ten extra pixels on both sides', () => {
  const section = css.slice(css.indexOf('/* Margin Call is an intrinsic-height'), css.indexOf('/* Override portrait\'s generic arena-overlay stretch'));
  assert.match(section, /\.game-app \.game-arena > \.game-overlay\.pause-overlay\s*\{\s*align-items: center;\s*justify-content: center;/);
  assert.match(section, /height: auto;\s*align-self: center;\s*padding: 0 var\(--margin-call-gap\) var\(--margin-call-gap\) !important;/);
  assert.match(section, /> h2\s*\{\s*margin: 0;\s*padding-block: calc\(var\(--margin-call-gap\) \+ 10px\);\s*text-align: center;/);
  assert.match(section, /> \.space-y-2\\\.5\s*\{\s*margin-top: 0;/);
});

test('portrait information spacing and title placement do not change landscape', () => {
  const section = css.slice(css.indexOf('/* Portrait information panels have roomier text'));
  assert.match(section, /@media \(orientation: portrait\) and \(pointer: coarse\)/);
  assert.match(section, /padding-inline: 24px;/);
  assert.match(section, /min-height: 5\.5rem;\s*flex: 0 0 5\.5rem;\s*align-items: flex-end;\s*padding-bottom: 0\.5rem;/);
  assert.match(section, /\.site-info-title\s*\{\s*transform: none;/);
});

test('touch information text balances safe-area gutters and scrollbar space', () => {
  const section = css.slice(css.indexOf('/* Balance text around safe areas'));
  assert.match(section, /@media \(pointer: coarse\)/);
  assert.match(section, /--site-info-side-gutter: max\(8px, env\(safe-area-inset-left\), env\(safe-area-inset-right\)\);/);
  assert.match(section, /padding-inline: var\(--site-info-side-gutter\);/);
  assert.match(section, /padding-inline: 24px;\s*scrollbar-gutter: stable both-edges;/);
});

test('landscape pause guide close follows Fullscreen rather than description-card gutters', () => {
  const section = css.slice(css.indexOf('/* Keep the pause guide close control'));
  assert.match(section, /@media \(orientation: landscape\) and \(pointer: coarse\)/);
  assert.match(section, /\.mobile-how-to-panel\s*\{\s*position: relative;/);
  assert.match(section, /\.mobile-how-to-header\s*\{\s*position: static;/);
  assert.match(section, /right: var\(--fullscreen-control-right, 8px\);/);
  assert.match(section, /top: var\(--pause-guide-gutter\);[^}]*transform: none;/);
});

test('touch footer keeps its centered layout beyond desktop width breakpoints and all portrait states use one bottom inset', () => {
  const section = css.slice(css.indexOf('/* Touch layouts are viewport-sized shells'));
  assert.match(section, /\.game-app \.site-footer\s*\{\s*font-size: 10px;\s*line-height: 15px;\s*display: flex;\s*flex-direction: column;\s*align-items: center;/);
  assert.match(section, /\.site-footer > nav\s*\{\s*justify-content: center;\s*flex-wrap: wrap;/);
  const inset = css.slice(css.indexOf('/* Device-validated portrait landing gaps'), css.indexOf('/* Share DD is the image itself'));
  assert.match(inset, /\.game-app \.site-footer\s*\{\s*padding-bottom: 4px;/);
  assert.doesNotMatch(inset, /data-state="menu"\] \.site-footer/);
});

test('Kangaroo knob uses the joystick theme ink and day Share has a black border', () => {
  assert.match(css, /\.mobile-joystick-knob\s*\{[^}]*background: currentColor;/);
  assert.match(css, /html\[data-theme="light"\] \.game-app \.share-dd-actions > button\.share-dd-copy\s*\{\s*border-color: #000000 !important;/);
});

test('pause control lives in the header immediately before sound during play', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const header = app.slice(app.indexOf('<header'), app.indexOf('</header>'));
  assert.match(header, /\{state === 'play' && <button[^]*?aria-label="Pause game"[^]*?className="mobile-header-control header-pause-control"/);
  assert.match(header, /header-pause-control"[^]*?<\/button>\}\s*<button\s+type="button"\s+onClick=\{toggleSound\}/);
  assert.doesNotMatch(app, /chart-pause-control/);
  assert.doesNotMatch(css, /chart-pause-control/);
});

test('joystick shares the rendered PIPS inset on both edges and in fullscreen', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /logo\.getBoundingClientRect\(\)\.left - bounds\.left\) \+ 2;/);
  assert.match(game, /closest<HTMLElement>\('\.game-stage'\)\?\.style\.setProperty\('--game-hud-inset', `\$\{scoreInset\.current\}px`\)/);
  assert.match(css, /\.game-app \.mobile-joystick,\s*\.game-app:fullscreen \.mobile-joystick\s*\{[^}]*--joystick-edge-gap: var\(--game-hud-inset, 16px\);\s*position: absolute;\s*left: var\(--joystick-edge-gap\);\s*bottom: var\(--joystick-edge-gap\);/);
  assert.doesNotMatch(css, /left: var\(--mobile-control-gap\);\s*bottom: var\(--mobile-control-gap\);/);
});

test('Info is rendered on desktop and hidden during gameplay only on touch layouts', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(app, /<button type="button" title="About"[\s\S]*?className="mobile-header-control mobile-header-about-control/);
  assert.doesNotMatch(app, /state !== 'play' && state !== 'boxing' && <button/);
  assert.match(css, /@media \(pointer: coarse\)\s*\{\s*\.game-app:is\(\[data-state="play"\], \[data-state="boxing"\]\) \.header-controls > \.mobile-header-about-control\s*\{\s*display: none;/);
});
