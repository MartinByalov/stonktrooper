import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('PIPS glyphs fit below Live Feed and use the Liquidated typography', () => {
  const source = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  const start = source.indexOf("const label = 'PIPS: ';");
  assert(start >= 0);
  const blockStart = source.lastIndexOf("ctx.font = '900 15px monospace';", start);
  assert(blockStart >= 0);
  const block = source.slice(start, source.indexOf('ctx.restore();', start) + 'ctx.restore();'.length);
  assert.match(block, /JetBrains Mono/);
  assert.match(block, /Math\.min\(baseFontSize, baseFontSize \* maxScoreWidth/);
  assert.match(block, /ctx\.fillStyle = theme === 'light' \? '#08795c' : '#54d3ac';\s*ctx\.fillText\(label/);
  assert.match(block, /ctx\.fillStyle = theme === 'light' \? '#08795c' : '#54d3ac';\s*ctx\.fillText\(value/);
  assert.match(block, /mobileScore \? 16 \/ scoreScaleY : 15/);
  const draw = new Function('ctx', 'totalScoreVal', 'TAPE_HEIGHT', 'W', 'AX', 'theme', 'canvasDisplay', 'H', 'mobileCanvasZoom', 'feedLayout', 'scoreInset', block);
  for (const score of [0, 12345, 999999999]) {
    for (const [width, height, zoom] of [[1920, 840, 1], [390, 650, 1.2], [844, 280, 1.1]]) {
    for (const ascent of [10, 12, 15]) {
    for (const inset of [15.578125, 46]) {
      const left = 1.5, tapeHeight = 36;
      const positions: number[][] = [];
       let textScaleX = 1;
      draw({
        save() {}, restore() {},
         scale(x: number) { textScaleX = x; },
        measureText: (text: string) => ({ width: text.length * 8, actualBoundingBoxLeft: left, actualBoundingBoxAscent: ascent }),
        fillText: (_text: string, x: number, y: number) => { positions.push([x, y]); },
       }, score, tapeHeight, 1920, 64, 'light', { current: { width, height } }, 840, () => zoom, { current: { mobile: width !== 1920 } }, { current: inset });
      assert.equal(positions.length, 2);
      const leftGap = width / 2 * (1 - zoom) + (positions[0][0] - left) * textScaleX * width / 1920 * zoom;
      const topGap = (positions[0][1] - ascent - tapeHeight) * height / 840 * zoom;
      assert(Math.abs(leftGap - inset) < 0.000001);
      assert(Math.abs(topGap - leftGap) < 0.000001);
      assert.equal(positions[1][1], positions[0][1]);
    }
    }
    }
  }
});