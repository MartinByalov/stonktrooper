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

test('Share DD uses only the image dialog and overlays its controls without visible status text', () => {
  const component = readFileSync(new URL('./ShareDD.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(component, /className="share-dd-dialog"/);
  assert.doesNotMatch(component, /share-dd-header|share-dd-content|share-dd-group|share-dd-status|<p\b|setMessage/);
  assert.match(component, /className="share-dd-actions"/);
  assert(component.indexOf('className="share-dd-copy ') > component.indexOf('{socialLinks(score).map'));
  const section = css.slice(css.indexOf('/* Share DD is the image itself'));
  assert.match(section, /aspect-ratio: 4 \/ 3;/);
  assert.match(section, /\.share-dd-close\s*\{[^}]*top: 8px;[^}]*right: 8px;/);
  assert.match(section, /\.share-dd-actions\s*\{[^}]*left: calc\(4\.4% \+ 8px\);[^}]*bottom: calc\(7\.3% \+ 16px\);[^}]*flex-direction: column;/);
  assert.match(section, /padding: 0;[^}]*border: 0;[^}]*background: transparent;[^}]*box-shadow: none;/);
});
test('Liquidated and Share DD controls use the requested theme colors', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const component = readFileSync(new URL('./ShareDD.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(app, /className="share-dd-open[^>]*>Share DD<\/button>/);
  assert.match(app, /className="how-to-play-action liquidated-how-to-play[^>]*>\s*How to Play\s*<\/button>/);
  assert.match(css, /\.game-result-over \.liquidated-how-to-play\s*\{[\s\S]*?border-color: #ffffff !important;/);
  assert.match(css, /\.game-result-over \.share-dd-open\s*\{[\s\S]*?color: #facc15 !important;[\s\S]*?border-color: #facc15 !important;/);
  assert.doesNotMatch(css, /\.share-dd-close:hover/);
  assert.doesNotMatch(component, />SCORE<\/h2>/);
});

test('square header, pause and close controls share the same theme and interaction colors', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  const section = css.slice(css.indexOf('/* Square controls share'));
  assert.match(section, /:is\(\.header-controls > button, \.chart-pause-control, \.dialog-close, \.share-dd-actions > button\)/);
  assert.match(section, /color: var\(--square-control-ink\) !important;/);
  assert.match(section, /background: var\(--square-control-fill\) !important;/);
  assert.match(section, /border-color: currentColor !important;/);
  assert.match(section, /:is\(:hover, :focus-visible\)\s*\{\s*background: var\(--square-control-hover\) !important;/);
  assert.match(section, /:root\s*\{\s*--square-control-ink: #ffffff;\s*--square-control-fill: #182334;\s*--square-control-hover: #000000;/);
  assert.match(section, /html\[data-theme="light"\]\s*\{\s*--square-control-ink: #000000;\s*--square-control-fill: #eaf0f5;\s*--square-control-hover: #ffffff;/);
  assert.match(section, /svg\s*\{\s*color: inherit !important;/);
  assert.match(section, /\.chart-pause-control:not\(:hover\):not\(:focus-visible\)\s*\{\s*background: transparent !important;/);
  assert.match(section, /\.share-dd-actions > button\.share-dd-copy\s*\{\s*color: #ffffff !important;\s*background: #08795c !important;/);
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

test('game-over score sharing opens with the final result', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(app, /state === 'over' && <button type="button" onClick=\{\(\) => setShareDDOpen\(true\)\}[^>]*>Share DD<\/button>/);
  assert.match(app, /\{shareDDOpen && state === 'over' && <ShareDD score=\{currentResult\}/);
});