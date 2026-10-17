import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
const landscape = css.slice(css.indexOf('/* Landscape mobile uses the portrait guide styling'), css.indexOf('/* Desktop keeps its columns'));

test('landscape mobile landing keeps desktop artwork and controls left with scrollable instructions right', () => {
  const landing = css.slice(css.indexOf('/* Mobile landscape landing uses'), css.indexOf('/* Pause guide spacing must not grow'));
  assert.match(landing, /@media \(orientation: landscape\) and \(pointer: coarse\)/);
  assert.match(landing, /\.desktop-initial-guide\s*\{\s*display: flex;/);
  assert.match(landing, /\.game-overlay\.how-to-play-overlay\s*\{\s*top: var\(--live-feed-height, calc\(100% \* 48 \/ 840\)\);\s*padding: 0;/);
  assert.match(landing, /\.mobile-portrait-guide\s*\{\s*display: none;/);
  assert.match(landing, /\.how-to-aside\s*\{\s*flex: 0 0 28%;/);
  assert.match(landing, /\.desktop-initial-guide > \.how-to-layout\s*\{[^}]*flex-direction: row !important;/);
  assert.match(landing, /\.landing-guide-section > \.mechanics-guide\s*\{[^}]*min-height: 0;[^}]*overflow-y: auto;/);
});

test('landing How to Play title is its own section above descriptions, after the left sidebar', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const landing = app.slice(app.indexOf('/* INITIAL START BRIEFING MODAL'), app.indexOf('className="mobile-portrait-guide'));
  assert.match(landing, /<\/aside>\s*<section className="landing-guide-section" aria-labelledby="landing-guide-title">\s*<div className="how-to-guide-header landing-guide-heading[^]*?<h2 id="landing-guide-title"[^]*?How to Play<\/h2>\s*<\/div>\s*<MechanicsGuide theme=\{theme\} \/>\s*<\/section>/);
});

test('desktop landing keeps its original one-to-three sidebar and instructions proportions', () => {
  const proportions = css.slice(css.indexOf('/* Preserve the desktop\'s original one-to-three'), css.indexOf('/* Pause guide spacing must not grow'));
  assert.match(proportions, /@media \(orientation: landscape\) and \(pointer: fine\)/);
  assert.match(proportions, /\.game-app \.how-to-layout > \.landing-guide-section\s*\{\s*flex: 3 1 0;/);
  assert.doesNotMatch(proportions, /pointer: coarse/);
});

test('portrait landing anchors nonshrinking actions below an image that fills the remainder', () => {
  const portrait = css.slice(css.indexOf('@media (orientation: portrait) and (pointer: coarse) {'), css.indexOf('/* Portrait menu controls'));
  assert.match(portrait, /\.mobile-portrait-guide\s*\{[^}]*justify-content: flex-end;[^}]*gap: 8px;\s*padding: 0;/);
  assert.match(portrait, /\.mobile-portrait-guide > \.mobile-portrait-action-button\s*\{\s*flex: 0 0 clamp\(44px, 6dvh, 64px\);/);
  assert.match(portrait, /\.mobile-portrait-hero\s*\{\s*flex: 1 1 0;\s*min-height: 0;/);
  assert.match(portrait, /\.game-overlay\.how-to-play-overlay\s*\{[^}]*padding: max\(8px, env\(safe-area-inset-top\), env\(safe-area-inset-right\), env\(safe-area-inset-bottom\), env\(safe-area-inset-left\)\);/);
});

test('desktop and landscape landing align the image and heading within equal outer insets', () => {
  const shared = css.slice(css.indexOf('/* The title belongs to the description column'), css.indexOf('/* Preserve the desktop'));
  assert.match(shared, /\.desktop-initial-guide\s*\{\s*padding: max\(8px, env\(safe-area-inset-top\), env\(safe-area-inset-right\), env\(safe-area-inset-bottom\), env\(safe-area-inset-left\)\);/);
  assert.match(shared, /\.how-to-aside > \.how-to-controls\s*\{\s*gap: 8px;\s*margin: 0;/);
  assert.match(shared, /\.landing-guide-section\s*\{\s*align-self: stretch;\s*box-sizing: border-box;/);
  assert.match(shared, /\.landing-guide-heading\s*\{[^}]*margin: 0;/);
});

test('Pause guide gutters do not depend on the theme control position or following controls', () => {
  const spacing = css.slice(css.indexOf('.game-app .mobile-how-to-panel {', css.indexOf('/* Pause guide spacing must not grow')));
  assert.match(spacing, /--pause-guide-gutter: max\(8px, env\(safe-area-inset-top\), env\(safe-area-inset-right\), env\(safe-area-inset-bottom\), env\(safe-area-inset-left\)\);/);
  assert.doesNotMatch(spacing, /--mobile-theme-control-right|@media/);
  assert.match(spacing, /\.game-app \.mobile-how-to-panel\s*\{[^}]*padding: var\(--pause-guide-gutter\);/);
  assert.match(spacing, /> \.mobile-how-to-header\s*\{[^}]*width: 100%;[^}]*box-sizing: border-box;[^}]*flex: 0 0 2rem;[^}]*margin: 0;/);
  assert.match(spacing, /> \.mechanics-guide\s*\{[^}]*margin: var\(--pause-guide-gutter\) 0 0;/);
});

test('mobile description sections use equal safe-area-aware outer gutters and title spacing', () => {
  const spacing = css.slice(css.indexOf('/* Keep the mobile description area equally inset'));
  assert.match(spacing, /@media \(pointer: coarse\)/);
  assert.match(spacing, /--mobile-guide-gutter: max\(8px, var\(--mobile-theme-control-right, 1rem\), env\(safe-area-inset-top\), env\(safe-area-inset-right\), env\(safe-area-inset-bottom\), env\(safe-area-inset-left\)\);/);
  assert.match(spacing, /\.game-app \.mobile-how-to-panel\s*\{[^}]*padding: var\(--mobile-guide-gutter\);/);
  assert.match(spacing, /> \.mobile-how-to-header\s*\{\s*margin-bottom: 0;/);
  assert.match(spacing, /> \.mechanics-guide\s*\{\s*margin: var\(--mobile-guide-gutter\) 0 0;/);
});

test('wide touch tablets retain the mobile guide and Live Feed instead of desktop overrides', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /max-width: 1024px\) and[^\{]*pointer: coarse/);
  assert.doesNotMatch(css, /\(pointer: fine\), \(min-width: 1025px\)/);
  assert.match(app, /const feedHeight = feedInHeader \? 0 : headerHeight > 0 \? headerHeight/);
  assert.match(game, /const mobile = window\.matchMedia\('\(pointer: coarse\)'\)\.matches;/);
  assert.match(app, /setMobileGuideOpen\(true\);/);
});

test('desktop shares the landscape mobile Pause guide and physical header dimensions', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const shared = css.slice(css.indexOf('/* Desktop and touch layouts share physical'));
  assert.match(landscape, /@media \(orientation: landscape\) and \(pointer: coarse\), \(pointer: fine\)/);
  assert.match(shared, /\.game-app header\s*\{[^}]*--mobile-header-gutter: max\(8px,[^}]*padding: var\(--mobile-header-gutter\) var\(--mobile-header-gutter\) var\(--mobile-header-gutter\)/);
  assert.match(shared, /\.header-controls > button\s*\{[^}]*width: 2rem;[^}]*height: 2rem;[^}]*padding: 0;/);
  assert.match(shared, /\.game-overlay\s*\{[^}]*top: var\(--live-feed-height,/);
  assert.match(shared, /\.mobile-how-to-dialog\.fixed\.inset-0\.z-50\s*\{[^}]*top: var\(--live-feed-bottom, 0px\);[^}]*bottom: var\(--footer-inset-bottom, 0px\);[^}]*padding: 0;/);
  const pauseAction = app.slice(app.indexOf("{state === 'paused' && <button type=\"button\" onClick"), app.indexOf('{state === \'over\' && <button type="button" onClick={() => setShareDDOpen'));
  assert.match(pauseAction, /setMobileGuideOpen\(true\);/);
  assert.doesNotMatch(pauseAction, /matchMedia|setPausedGuideOpen/);
});

test('both mobile orientations share header geometry and measured Live Feed height', () => {
  const header = css.slice(css.indexOf('/* One header geometry'), css.indexOf('/* Keep landscape touch controls'));
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(header, /@media \(pointer: coarse\)/);
  assert.doesNotMatch(header, /orientation:/);
  assert.match(header, /--mobile-header-gutter: max\(8px, env\(safe-area-inset-top\), env\(safe-area-inset-right\)\);/);
  assert.match(header, /padding: var\(--mobile-header-gutter\) var\(--mobile-header-gutter\) var\(--mobile-header-gutter\) max\(20px, env\(safe-area-inset-left\)\);/);
  assert.match(header, /\.mobile-header-control\s*\{[^}]*width: 2rem;[^}]*height: 2rem;[^}]*padding: 0;/);
  assert.doesNotMatch(header, /:not\(\.mobile-header-control\)/);
  assert.match(css, /@media \(orientation: portrait\) and \(pointer: coarse\)\s*\{\s*\.game-app \.header-controls > :not\(\.mobile-header-control\)\s*\{\s*display: none;/);
  assert.match(app, /const feedHeight = feedInHeader \? 0 : headerHeight > 0 \? headerHeight :/);
  assert.match(app, /if \(header\) observer\.observe\(header\);/);
});

test('landscape touch header orders info, theme, sound and fullscreen before optional pause', () => {
  const order = css.slice(css.indexOf('/* Keep landscape touch controls'), css.indexOf('/* Landscape mobile uses'));
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(order, /@media \(orientation: landscape\) and \(pointer: coarse\)/);
  const controls = ['mobile-header-about-control', 'mobile-header-theme-control', 'header-sound-control', 'desktop-fullscreen-control', 'mobile-header-pause-control'];
  controls.forEach((control, index) => {
    assert.match(order, new RegExp(`> \\.${control} \\{ order: ${index + 1}; \\}`));
  });
  assert.match(app, /onClick=\{toggleSound\}\s*className="header-sound-control /);
  assert.doesNotMatch(order, /display: none/);
});

test('landscape mobile applies portrait guide styling to menu, pause and rotated dialogs', () => {
  assert.match(landscape, /@media \(orientation: landscape\) and \(pointer: coarse\)/);
  assert.match(landscape, /:is\(\.desktop-initial-guide, \.paused-guide-dialog, \.mobile-how-to-panel\)\s*\{[^}]*--landscape-guide-gap: var\(--mobile-theme-control-right, 1rem\);[^}]*height: 100%;[^}]*border: 0;[^}]*border-radius: 0;/);
  assert.match(landscape, /html\[data-theme="light"\][^{]*\{[^}]*background: #fff !important;/);
  assert.match(landscape, /html:not\(\[data-theme="light"\]\)[^{]*\{[^}]*background: #000 !important;/);
  assert.match(landscape, /\.game-app \.paused-guide-overlay\s*\{\s*inset: 0;/);
});

test('landscape mobile keeps a portrait-sized title and close control with scrollable readable cards', () => {
  assert.match(landscape, /:is\(\.how-to-guide-header, \.mobile-how-to-header\)\s*\{[^}]*height: 2rem;[^}]*margin: 0 0 var\(--landscape-guide-gap\);[^}]*border: 0;/);
  assert.match(landscape, /\.mobile-dialog-close\s*\{[^}]*position: absolute;[^}]*top: 50%;[^}]*right: 0;[^}]*width: 2rem;[^}]*height: 2rem;/);
  assert.match(landscape, /\.mechanics-guide\s*\{[^}]*overflow-y: auto;[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);[^}]*font-size: 0\.75rem;/);
  assert.match(landscape, /\.mechanics-guide-title\s*\{[^}]*height: 3em;[^}]*margin-bottom: 0\.5rem;/);
  assert.match(landscape, /min-height: 72px;/);
});