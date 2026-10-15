// Regression checks for shareCard.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { drawShareCard, formatShareScore, shareCardBackground, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from './shareCard';

test('share card draws the provided background and centers the score inside the case', () => {
  const labels: { text: string; x: number; y: number; maxWidth?: number; font: string }[] = [];
  const backgrounds: unknown[][] = [];
  let saves = 0, restores = 0;
  const state = { font: '' };
  const ctx = new Proxy(state, {
    get: (target, key) => key === 'measureText' ? (value: string) => ({ width: value.length * 40 })
      : key === 'fillText' ? (text: string, x: number, y: number, maxWidth?: number) => labels.push({ text, x, y, maxWidth, font: target.font })
      : key === 'drawImage' ? (...args: unknown[]) => backgrounds.push(args)
      : () => { if (key === 'save') saves++; if (key === 'restore') restores++; },
    set: (target, key, value) => { Reflect.set(target, key, value); return true; },
  }) as CanvasRenderingContext2D;
  const background = {} as HTMLImageElement;
  drawShareCard(ctx, 12345.6, background);
  assert.deepEqual(backgrounds, [[background, 0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT]]);
  assert.deepEqual(labels.map(label => label.text), ['BEST SCORE', '12,346']);
  assert(labels.every(label => label.x === 912 && label.y >= 528 && label.y <= 760));
  assert.equal(labels[1].maxWidth, 390);
  assert.equal(labels[1].font, 'bold 86px sans-serif');
  assert.equal(saves, restores);
  assert.equal(formatShareScore(NaN), '0');
});

test('long scores fit inside a clipped case, and extreme scores remain readable', () => {
  const labels: { text: string; font: string; maxWidth?: number }[] = [];
  const clips: { x: number; y: number; width: number; height: number }[] = [];
  let clipCount = 0;
  const state = { font: '' };
  const ctx = new Proxy(state, {
    get: (target, key) => key === 'measureText' ? (text: string) => ({ width: text.length * parseFloat(target.font.slice(5)) * 0.6 })
      : key === 'fillText' ? (text: string, _x: number, _y: number, maxWidth?: number) => { labels.push({ text, font: target.font, maxWidth }); }
      : key === 'rect' ? (x: number, y: number, width: number, height: number) => { clips.push({ x, y, width, height }); }
      : key === 'clip' ? () => { clipCount++; }
      : () => {},
    set: (target, key, value) => { Reflect.set(target, key, value); return true; },
  }) as CanvasRenderingContext2D;
  const background = {} as HTMLImageElement;
  drawShareCard(ctx, 123456789, background);
  assert.equal(labels[1].text, '123,456,789');
  assert(parseFloat(labels[1].font.slice(5)) < 86);
  assert(labels[1].text.length * parseFloat(labels[1].font.slice(5)) * 0.6 <= 390);

  drawShareCard(ctx, Number.MAX_SAFE_INTEGER, background);
  assert.equal(labels[3].text, '9,007,199,254,740,991');
  drawShareCard(ctx, 1e100, background);
  assert.equal(labels[5].text, '1.000e+100');
  assert(parseFloat(labels[5].font.slice(5)) >= 32);
  assert(clips.every(({ x, y, width, height }) => x >= 675 && x + width <= 1150 && y >= 528 && y + height <= 760));
  assert.equal(clipCount, 3);
  assert(labels.filter(label => label.maxWidth === 390).length === 3);
});

test('share card uses theme-specific backgrounds and preview/export use the same canvas', () => {
  assert.equal(shareCardBackground('light', '/stonks/'), '/stonks/images/score-back.png');
  assert.equal(shareCardBackground('dark', '/stonks/'), '/stonks/images/score-back-inverted.png');
  const component = readFileSync(new URL('./ShareDD.tsx', import.meta.url), 'utf8');
  assert.match(component, /drawShareCard\(ctx, score, background\)/);
  assert.match(component, /canvas\.current\.toBlob\(/);
  assert.match(component, /\[score, theme\]/);
  assert.match(component, /const url = resultUrl\(score\)/);
  assert.match(component, /await copyText\(url, navigator, document, dialog.current \?\? document.body\);\s*setCopied\(true\)/);
  assert.doesNotMatch(component, /<span aria-live="polite">/);
  assert.match(component, /copied \? <Check[^]*?: <Share2/);
  assert.doesNotMatch(component, /Share this score link:|Score link copied\. Ready to share\.|await navigator.share\(|This browser cannot share images/);
  assert.match(component, /void shareSocial\(platform.name\)/);
  assert.match(component, /window\.open\(destination\.href, '_blank', 'noopener,noreferrer'\)/);
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

test('header actions and Liquidated buttons follow the requested order', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const header = app.slice(app.indexOf('title="Music styles"'), app.indexOf('</header>'));
  assert(header.indexOf('Day mode (N)') < header.indexOf('HODL (P)'));
  assert(header.indexOf('HODL (P)') < header.indexOf('Sound Off (M)'));
  assert(header.indexOf('Sound Off (M)') < header.indexOf('Fullscreen (F)'));
  const actions = app.slice(app.indexOf('space-y-2.5 mt-5'));
  assert(actions.indexOf("'New Game'") < actions.indexOf('>Share DD</button>'));
  assert(actions.indexOf('>Share DD</button>') < actions.indexOf('onClick={handleReturnMenu}'));
});

test('game-over score sharing opens with the final result', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(app, /state === 'over' && <button type="button" onClick=\{\(\) => setShareDDOpen\(true\)\}[^>]*>Share DD<\/button>/);
  assert.match(app, /\{shareDDOpen && state === 'over' && <ShareDD score=\{currentResult\}/);
});