import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { popupColor } from '../src/popupColors.ts';

const source = await readFile(new URL('../src/CandleGame.tsx', import.meta.url), 'utf8');
const colours = [...new Set([...source.matchAll(/popups\.push\([^\n]*color: '(#[a-f0-9]{6})'/g)].map(match => match[1]))];
assert.equal(colours.length, 7, 'Cover every current gameplay popup colour');

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(channel => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

for (const colour of colours) {
  const day = popupColor(colour, false);
  assert.equal(popupColor(colour, true), colour, 'Night colour is unchanged');
  assert.notEqual(day, colour, 'Day uses a darker variant');
  assert.ok(luminance(day) < luminance(colour), 'Day colour is darker');
  assert.ok(1.05 / (luminance(day) + 0.05) >= 4.5, `${day} has readable contrast on white`);
  assert.equal(popupColor(colour.toUpperCase(), false), day, 'Palette lookup ignores case');
  console.log(`PASS Night ${colour} -> Day ${day}`);
}

for (const colour of ['#fbbf24', '#fde047', '#facc15']) {
  const day = popupColor(colour, false);
  const [r, g, b] = day.slice(1).match(/../g).map(channel => parseInt(channel, 16));
  assert.ok(r > g && g > b && g / r > 0.7, 'Yellow/gold events remain yellow/gold, not violet or red');
}