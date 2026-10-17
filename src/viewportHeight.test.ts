import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { observeViewportHeight } from './viewportHeight';

function setup(withVisualViewport = true) {
  const viewport = Object.assign(new EventTarget(), { height: 640, scale: 1 });
  const win = Object.assign(new EventTarget(), {
    innerHeight: 720,
    visualViewport: withVisualViewport ? viewport : null,
  });
  const doc = Object.assign(new EventTarget(), { fullscreenElement: null as object | null });
  const properties = new Map<string, string>();
  const app = { style: {
    setProperty: (name: string, value: string) => properties.set(name, value),
    removeProperty: (name: string) => { properties.delete(name); return ''; },
  } } as unknown as Pick<HTMLElement, 'style'>;
  const stop = observeViewportHeight(app, win as unknown as Window, doc as unknown as Document);
  return { viewport, win, doc, properties, stop };
}

test('app height uses the visible viewport immediately and follows browser chrome resizing', () => {
  const { viewport, properties, stop } = setup();
  assert.equal(properties.get('--app-viewport-height'), '640px');
  viewport.height = 680;
  viewport.dispatchEvent(new Event('resize'));
  assert.equal(properties.get('--app-viewport-height'), '680px');
  stop();
  viewport.height = 700;
  viewport.dispatchEvent(new Event('resize'));
  assert.equal(properties.has('--app-viewport-height'), false);
});

test('fullscreen uses the window height and restores the visible height on exit', () => {
  const { win, doc, properties, stop } = setup();
  doc.fullscreenElement = {};
  win.innerHeight = 390;
  doc.dispatchEvent(new Event('fullscreenchange'));
  assert.equal(properties.get('--app-viewport-height'), '390px');
  doc.fullscreenElement = null;
  doc.dispatchEvent(new Event('fullscreenchange'));
  assert.equal(properties.get('--app-viewport-height'), '640px');
  stop();
});

test('viewport height falls back to innerHeight and refreshes on page restoration', () => {
  const { win, properties, stop } = setup(false);
  assert.equal(properties.get('--app-viewport-height'), '720px');
  win.innerHeight = 600;
  win.dispatchEvent(new Event('pageshow'));
  assert.equal(properties.get('--app-viewport-height'), '600px');
  win.innerHeight = 580;
  win.dispatchEvent(new Event('resize'));
  assert.equal(properties.get('--app-viewport-height'), '580px');
  stop();
});

test('pinch zoom and invalid measurements do not resize the shell', () => {
  const { viewport, properties, stop } = setup();
  viewport.scale = 2;
  viewport.height = 320;
  viewport.dispatchEvent(new Event('resize'));
  assert.equal(properties.get('--app-viewport-height'), '640px');
  viewport.scale = 1;
  for (const height of [0, -1, NaN, Infinity]) {
    viewport.height = height;
    viewport.dispatchEvent(new Event('resize'));
    assert.equal(properties.get('--app-viewport-height'), '640px');
  }
  stop();
});

test('touch shell bounds the document and reserves header/footer space before sizing the canvas', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  const shell = css.slice(css.indexOf('/* Touch layouts are viewport-sized shells'), css.indexOf('/* Mobile landscape landing uses'));
  assert.match(shell, /@media \(pointer: coarse\)/);
  assert.match(shell, /html, body, #root\s*\{[^}]*min-height: 0;[^}]*overflow: hidden;/);
  assert.match(shell, /height: var\(--app-viewport-height, 100dvh\);\s*min-height: 0;/);
  assert.match(shell, /\.game-app > div\s*\{\s*height: 100%;\s*min-height: 0;/);
  assert.match(shell, /\.site-footer\s*\{\s*flex-shrink: 0;/);
  assert.match(shell, /\.game-arena\s*\{\s*flex: 1 1 0;\s*min-height: 0;\s*container-type: size;/);
  assert.match(shell, /body\s*\{\s*position: fixed;\s*inset: 0;/);
  assert.match(shell, /\.game-app header\s*\{\s*padding-top: max\(8px, env\(safe-area-inset-top\)\);\s*padding-bottom: 8px;/);
  assert.match(shell, /\.stonktrooper-logo\s*\{\s*height: 32px;/);
  assert.match(shell, /\.site-footer\s*\{\s*font-size: 10px;\s*line-height: 15px;/);
  assert.match(shell, /\.mobile-portrait-hero\s*\{\s*touch-action: pinch-zoom;/);
});

test('only returning to the menu releases mobile fullscreen and orientation, not Liquidated', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const release = app.slice(app.indexOf('const [awaitingLandscape,'), app.indexOf('const [gameKey,'));
  assert.match(release, /state !== 'menu' \|\| awaitingLandscape\) return;/);
  assert.match(release, /orientation\?\.unlock\?\.\(\)/);
  assert.match(release, /document\.exitFullscreen\(\)/);
  assert.doesNotMatch(release, /state === 'over'/);
  assert.doesNotMatch(release, /state === 'paused'/);
  assert.match(app, /useLayoutEffect\(\(\) => \{\s*if \(appRef.current\) return observeViewportHeight\(appRef.current\);/);
});

test('manual mobile fullscreen exit pauses play without requesting fullscreen again', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const sync = app.slice(app.indexOf('let wasFullscreen ='), app.indexOf('const toggleFullscreen ='));
  assert.match(sync, /if \(wasFullscreen && !fullscreen && window.matchMedia\('\(pointer: coarse\)'\).matches\)/);
  assert.match(sync, /orientation\?\.unlock\?\.\(\)/);
  assert.match(sync, /setState\(current => current === 'play' \? 'paused' : current\)/);
  assert.doesNotMatch(sync, /requestFullscreen|requestMobileLandscape|exitFullscreen/);
});