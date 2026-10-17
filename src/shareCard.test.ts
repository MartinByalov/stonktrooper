// Regression checks for shareCard.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { drawShareCard, formatShareScore, shareCardBackground, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from './shareCard';

test('share card draws the provided background and centers the score inside the case', () => {
  const labels: { text: string; x: number; y: number; maxWidth?: number; font: string; fillStyle: unknown }[] = [];
  const backgrounds: unknown[][] = [];
  let saves = 0, restores = 0;
  const state: { font: string; fillStyle?: unknown } = { font: '' };
  const ctx = new Proxy(state, {
    get: (target, key) => key === 'measureText' ? (value: string) => ({ width: value.length * 40 })
      : key === 'fillText' ? (text: string, x: number, y: number, maxWidth?: number) => labels.push({ text, x, y, maxWidth, font: target.font, fillStyle: target.fillStyle })
      : key === 'drawImage' ? (...args: unknown[]) => backgrounds.push(args)
      : () => { if (key === 'save') saves++; if (key === 'restore') restores++; },
    set: (target, key, value) => { Reflect.set(target, key, value); return true; },
  }) as CanvasRenderingContext2D;
  const background = {} as HTMLImageElement;
  drawShareCard(ctx, 12345.6, background);
  assert.deepEqual(backgrounds, [[background, 0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT]]);
  assert.deepEqual(labels.map(label => label.text), ['BEST SCORE', '12,346']);
  assert(labels.every(label => label.x === 912 && label.y >= 528 && label.y <= 760));
  assert.equal(labels[0].y, 580);
  assert.equal(labels[1].y, 650);
  assert.equal(labels[0].font, '700 28px "Space Grotesk", sans-serif');
  assert.equal(labels[1].maxWidth, undefined);
  assert.equal(labels[1].font, '700 86px "Space Grotesk", sans-serif');
  assert.equal(labels[1].fillStyle, '#54d3ac');
  drawShareCard(ctx, 12345.6, background, 'dark');
  assert.equal(labels[3].fillStyle, '#54d3ac');
  assert.equal(saves, restores);
  assert.equal(formatShareScore(NaN), '0');
});

test('long scores fit inside a clipped case, and extreme scores remain readable', () => {
  const labels: { text: string; font: string; maxWidth?: number }[] = [];
  const clips: { x: number; y: number; width: number; height: number }[] = [];
  let clipCount = 0;
  const state = { font: '' };
  const ctx = new Proxy(state, {
    get: (target, key) => key === 'measureText' ? (text: string) => ({ width: text.length * parseFloat(target.font.slice(4)) * 0.6 })
      : key === 'fillText' ? (text: string, _x: number, _y: number, maxWidth?: number) => { labels.push({ text, font: target.font, maxWidth }); }
      : key === 'rect' ? (x: number, y: number, width: number, height: number) => { clips.push({ x, y, width, height }); }
      : key === 'clip' ? () => { clipCount++; }
      : () => {},
    set: (target, key, value) => { Reflect.set(target, key, value); return true; },
  }) as CanvasRenderingContext2D;
  const background = {} as HTMLImageElement;
  drawShareCard(ctx, 123456789, background);
  assert.equal(labels[1].text, '123,456,789');
  assert(parseFloat(labels[1].font.slice(4)) < 86);
  assert(labels[1].text.length * parseFloat(labels[1].font.slice(4)) * 0.6 <= 390);

  drawShareCard(ctx, Number.MAX_SAFE_INTEGER, background);
  assert.equal(labels[3].text, '9,007,199,254,740,991');
  drawShareCard(ctx, 1e100, background);
  assert.equal(labels[5].text, '1.000e+100');
  assert(parseFloat(labels[5].font.slice(4)) >= 32);
  assert.equal(clips.length, 0);
  assert.equal(clipCount, 0);
  assert(labels.every(label => label.maxWidth === undefined));
});

test('share card uses theme-specific backgrounds and preview/export use the same canvas', () => {
  assert.equal(shareCardBackground('light', '/stonks/'), '/stonks/images/score-back.png');
  assert.equal(shareCardBackground('dark', '/stonks/'), '/stonks/images/score-back-inverted.png');
  const component = readFileSync(new URL('./ShareDD.tsx', import.meta.url), 'utf8');
  assert.match(component, /drawShareCard\(ctx, score, background, scoreTheme\)/);
  assert.match(component, /canvas\.current\.toBlob\(/);
  assert.match(component, /\[score, theme, scoreTheme\]/);
  assert.match(component, /const url = resultUrl\(score\)/);
  assert.match(component, /await copyText\(url, navigator, document, dialog.current \?\? document.body\);\s*setCopied\(true\)/);
  assert.doesNotMatch(component, /<span aria-live="polite">/);
  assert.match(component, /copied \? <Check[^]*?: <Share2/);
  assert.doesNotMatch(component, /Share this score link:|Score link copied\. Ready to share\.|await navigator.share\(|This browser cannot share images/);
  assert.match(component, /void shareSocial\(platform.name\)/);
  assert.match(component, /window\.open\(destination\.href, '_blank', 'noopener,noreferrer'\)/);
  assert.doesNotMatch(component.slice(component.indexOf('const shareSocial'), component.indexOf('return <div')), /copyText/);
  assert.match(component, /Share score link to \$\{platform\.name\}/);
  assert.doesNotMatch(component, /Download PNG|link.download|createObjectURL|const download/);
  assert.doesNotMatch(component, /score-share-link|linkInput|<input/);
  assert.match(component, /disabled=\{sharing\}/);
});

test('score dialog keeps its image and actions usable on mobile landscape screens', () => {
  const component = readFileSync(new URL('./ShareDD.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(component, /className="share-dd-overlay fixed inset-0/);
  assert.match(component, /className="share-dd-dialog w-full/);
  assert.match(component, /className="share-dd-canvas block/);
  assert.match(component, /className="share-dd-actions flex/);
  assert.match(css, /\.share-dd-overlay \{[\s\S]*?overflow-y: auto;/);
  assert.match(css, /\.share-dd-canvas \{[\s\S]*?max-width: 100%;[\s\S]*?height: auto;/);
  assert.match(css, /\.share-dd-dialog \{[\s\S]*?max-height: calc\(100dvh/);
  assert.match(css, /\.share-dd-canvas \{[\s\S]*?max-height: min\(58dvh, 62vw\);/);
});

test('Liquidated and Share DD controls use the requested theme colors', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const component = readFileSync(new URL('./ShareDD.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(app, /className="share-dd-open[^>]*>Share DD<\/button>/);
  assert.match(app, /className="how-to-play-action liquidated-how-to-play[^>]*>\s*How to Play\s*<\/button>/);
  assert.match(css, /\.game-result-over \.liquidated-how-to-play\s*\{[\s\S]*?border-color: #ffffff !important;/);
  assert.match(css, /\.game-result-over \.share-dd-open\s*\{[\s\S]*?color: #facc15 !important;[\s\S]*?border-color: #facc15 !important;/);
  assert.match(css, /html\[data-theme="dark"\] \.share-dd-social-button\s*\{\s*background: #131c29 !important;/);
  assert.match(css, /html\[data-theme="light"\] \.share-dd-social-button\s*\{\s*background: #eaf0f5 !important;/);
  assert.doesNotMatch(css, /\.share-dd-close:hover/);
  assert.doesNotMatch(component, />SCORE<\/h2>/);
});

test('header actions and Liquidated buttons follow the requested order', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const header = app.slice(app.indexOf('title="Music styles"'), app.indexOf('</header>'));
  assert(header.indexOf('Day mode (N)') < header.indexOf('Sound Off (M)'));
  assert.doesNotMatch(header, /HODL \(P\)|chart-pause-control/);
  assert(header.indexOf('Sound Off (M)') < header.indexOf('Fullscreen (F)'));
  const actions = app.slice(app.indexOf('space-y-2.5 mt-5'));
  assert(actions.indexOf("'New Game'") < actions.indexOf('>Share DD</button>'));
  assert(actions.indexOf('>Share DD</button>') < actions.indexOf('className="how-to-play-action liquidated-how-to-play'));
});

test('mobile Share DD fills the feed-to-footer space with an unscaled panel and a fixed close row', () => {
  const component = readFileSync(new URL('./ShareDD.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  const section = css.slice(css.indexOf('/* Mobile sharing reuses Liquidated'), css.indexOf('/* Information headings sit below'));
  assert.match(section, /@media \(pointer: coarse\)/);
  assert.match(section, /\.share-dd-overlay\.fixed\.inset-0\.z-50\s*\{\s*top: var\(--live-feed-bottom, 0px\);\s*bottom: var\(--footer-inset-bottom, 0px\);\s*padding: 0;\s*overflow: hidden;\s*background: transparent;/);
  assert.match(section, /\.share-dd-dialog\[role="dialog"\]\s*\{[^}]*width: 100%;[^}]*height: 100%;[^}]*padding: var\(--share-dd-gutter\);[^}]*background: transparent;[^}]*transform: none;/);
  assert.match(section, /--share-dd-gutter: max\(8px, env\(safe-area-inset-top\), env\(safe-area-inset-right\), env\(safe-area-inset-bottom\), env\(safe-area-inset-left\)\);/);
  assert.doesNotMatch(section, /--mobile-theme-control-right/);
  assert.match(section, /\.share-dd-header\s*\{[^}]*flex: 0 0 2rem;[^}]*height: 2rem;/);
  assert.match(section, /\.share-dd-close\s*\{[^}]*top: 50%;\s*right: 0;\s*transform: translateY\(-50%\);[^}]*width: 2rem;[^}]*height: 2rem;/);
  assert.match(section, /\.share-dd-close\s*\{[^}]*display: inline-flex;\s*align-items: center;\s*justify-content: center;\s*box-sizing: border-box;[^}]*border-color: currentColor;/);
  assert.match(section, /:has\(\.share-dd-overlay\) \.game-over-overlay > \.game-result-over\s*\{\s*visibility: hidden;/);
  assert.match(section, /\.share-dd-content\s*\{[^}]*min-height: 0;[^}]*overflow-y: auto;/);
  assert.match(component, /className="share-dd-header /);
  assert.match(component, /className="dialog-close mobile-dialog-close share-dd-close /);
  assert.match(component, /className="share-dd-content"/);
});

test('Share DD centers the card and actions together and sizes the image from available arena space', () => {
  const component = readFileSync(new URL('./ShareDD.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(component, /className="share-dd-content">\s*<div className="share-dd-group">/);
  assert.match(css, /\.game-app \.share-dd-overlay\.fixed\.inset-0\.z-50\s*\{\s*top: var\(--live-feed-bottom, 0px\);\s*bottom: var\(--footer-inset-bottom, 0px\);/);
  assert.match(css, /\.share-dd-dialog > \.share-dd-content\s*\{[^}]*margin-bottom: calc\(2rem \+ var\(--share-dd-gutter\)\);[^}]*container-type: size;/);
  assert.match(css, /\.share-dd-content > \.share-dd-group\s*\{[^}]*margin-block: auto;/);
  assert.match(css, /\.share-dd-group > \.share-dd-canvas\s*\{[^}]*width: min\(100%, max\(0px, calc\(\(100cqh - 76px\) \* 4 \/ 3\)\)\);[^}]*height: auto;[^}]*max-height: none;/);
});

test('game-over score sharing opens with the final result', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(app, /state === 'over' && <button type="button" onClick=\{\(\) => setShareDDOpen\(true\)\}[^>]*>Share DD<\/button>/);
  assert.match(app, /\{shareDDOpen && state === 'over' && <ShareDD score=\{currentResult\}/);
});