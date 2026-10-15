import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('Pips glyph bounds have equal top and left padding below Live Feed', () => {
  const source = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  const start = source.indexOf('const text = `PIPS:');
  assert(start >= 0);
  const block = source.slice(start, source.indexOf('ctx.restore();', start) + 'ctx.restore();'.length);
  const draw = new Function('ctx', 'totalScoreVal', 'TAPE_HEIGHT', block);
  for (const score of [0, 12345, 999999999]) {
    for (const ascent of [10, 12, 15]) {
      const left = 1.5, tapeHeight = 36;
      let position: number[] = [];
      draw({
        save() {}, restore() {},
        measureText: () => ({ actualBoundingBoxLeft: left, actualBoundingBoxAscent: ascent }),
        fillText: (_text: string, x: number, y: number) => { position = [x, y]; },
      }, score, tapeHeight);
      assert.equal(position[0] - left, 14);
      assert.equal(position[1] - ascent - tapeHeight, 14);
    }
  }
});