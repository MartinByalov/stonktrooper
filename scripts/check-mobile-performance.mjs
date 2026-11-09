import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true } });
try {
  const { SoundController } = await server.ssrLoadModule('/src/audio.ts');
  const controller = new SoundController();
  let allocations = 0;
  const context = sampleRate => ({
    sampleRate,
    createBuffer(channels, length, rate) {
      allocations++;
      assert.equal(channels, 1);
      assert.equal(rate, sampleRate);
      const data = new Float32Array(length);
      return { length, sampleRate, getChannelData: () => data };
    },
  });
  const first = context(44100), second = context(48000);
  const buffer = controller.getNoiseBuffer(first, 5292);
  assert.equal(controller.getNoiseBuffer(first, 5292), buffer);
  assert.equal(allocations, 1, 'Repeated noise reuses PCM without another allocation');
  assert.ok(buffer.getChannelData(0).some(value => value !== 0));
  assert.ok(buffer.getChannelData(0).every(value => value >= -1 && value <= 1));
  assert.notEqual(controller.getNoiseBuffer(second, 5292), buffer);
  assert.equal(controller.getNoiseBuffer(second, 5292).sampleRate, 48000);
  for (let length = 1; length <= 30; length++) controller.getNoiseBuffer(first, length);
  assert.equal(controller.noiseBuffers.get(first).size, 24, 'Cache remains bounded');
  assert.notEqual(controller.getNoiseBuffer(first, 5292), buffer, 'Evicted lengths can be regenerated');

  const source = await readFile(new URL('../src/CandleGame.tsx', import.meta.url), 'utf8');
  const sizing = source.match(/const dpr = Math\.min\(window\.devicePixelRatio \|\| 1, 1\.5\);[\s\S]*?if \(headerFeed.height !== height\) headerFeed.height = height;/);
  assert.ok(sizing, 'Exercise the actual header canvas sizing code');
  const refresh = new Function('window', 'rect', 'headerFeed', sizing[0]);
  let width = 150, height = 48, writes = 0;
  const canvas = {
    get width() { return width; },
    set width(value) { width = value; writes++; },
    get height() { return height; },
    set height(value) { height = value; writes++; },
  };
  refresh({ devicePixelRatio: 3 }, { width: 100, height: 32 }, canvas);
  assert.equal(writes, 0, 'Unchanged layout must not reset canvas');
  refresh({ devicePixelRatio: 3 }, { width: 120, height: 32 }, canvas);
  assert.equal(writes, 1, 'Only the changed dimension is assigned');
  assert.equal(width, 180, 'DPR cap is preserved');
  refresh({ devicePixelRatio: 1 }, { width: 120, height: 40 }, canvas);
  assert.equal(width, 120);
  assert.equal(height, 40);
  console.log('PASS bounded noise reuse, context isolation, and guarded header canvas sizing');
} finally {
  await server.close();
}