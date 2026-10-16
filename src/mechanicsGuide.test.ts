import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { drawPickupAsset } from './assetRenderer';
import { drawAnimalCharacter } from './animalRenderer';
import type { Animal } from './types';

test('guide descriptions preserve explicit newlines', () => {
  const guide = readFileSync(new URL('./MechanicsGuide.tsx', import.meta.url), 'utf8');
  assert.match(guide, /<p className="m-0 whitespace-pre-line">/);
});

test('Fedora guide preview uses the chart pickup orientation', () => {
  const preview = readFileSync(new URL('./AssetPreview.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(preview, /if \(asset === 'fedora'\) ctx\.scale\(-1, 1\)/);
});

test('guide titles occupy a separate top row above descriptions', () => {
  const guide = readFileSync(new URL('./MechanicsGuide.tsx', import.meta.url), 'utf8');
  assert.match(guide, /<h3 className="[^"]*shrink-0 min-h-\[3em\]"/);
  assert.match(guide, /<h3 className="[^\"]*pt-2 pb-1[^\"]*">/);
  assert.match(guide, /<h3 className="[^\"]*pt-2 pb-1[^\"]*">/);
  assert.doesNotMatch(guide, /flex-col items-center justify-center text-center/);
});

test('Shoot guide shows theme-aware fedora above briefcase and explains current hat behavior', () => {
  const guide = readFileSync(new URL('./MechanicsGuide.tsx', import.meta.url), 'utf8');
  const preview = readFileSync(new URL('./AssetPreview.tsx', import.meta.url), 'utf8');
  assert.match(guide, /asset: 'fedora', below: 'briefcase', title: 'Shoot/);
  assert.match(guide, /Collect and throw a hat at your enemies but beware, there is a 50% chance they might like your style/);
  assert.match(preview, /drawPickupAsset\(ctx, \{ type: asset, x: 0, y: 0, taken: false \}, 0, 0, 0, theme === 'dark'\)/);
  for (const darkMode of [false, true]) {
    const fills: string[] = [];
    let color = '';
    const ctx = new Proxy({}, {
      get: (_, key) => key === 'fill' ? () => { fills.push(color); } : () => {},
      set: (_, key, value) => { if (key === 'fillStyle') color = value as string; return true; },
    }) as CanvasRenderingContext2D;
    drawPickupAsset(ctx, { type: 'fedora', x: 0, y: 0, taken: false }, 0, 0, 0, darkMode);
    assert(fills.includes(darkMode ? '#f8fafc' : '#111318'));
  }
});

test('Bull and Bull rider guide previews point the bat ahead without changing in-game pose', () => {
  const preview = readFileSync(new URL('./AssetPreview.tsx', import.meta.url), 'utf8');
  assert.match(preview, /asset === 'bull' \|\| asset === 'bull-rider'/);
  for (const mount of [undefined, 'bear'] as const) {
    const rotations: number[] = [];
    const ctx = new Proxy({}, {
      get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} })
        : key === 'rotate' ? (angle: number) => { rotations.push(angle); } : () => {},
      set: () => true,
    }) as CanvasRenderingContext2D;
    const animal = { type: 'bull', mount, phase: 0.8, attackTimer: 0 } as Animal;
    drawAnimalCharacter(ctx, animal, false, false, false, true);
    assert(rotations.includes(-Math.PI / 2 + 0.2));
    rotations.length = 0;
    drawAnimalCharacter(ctx, animal);
    assert(!rotations.includes(-Math.PI / 2 + 0.2));
  }
});