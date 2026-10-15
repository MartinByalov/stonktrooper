import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shareScoreImage } from './shareScore';

const file = new File(['score'], 'score.png', { type: 'image/png' });
const url = 'https://example.com/';

test('native share sends the PNG and clean website URL together', async () => {
  const calls: ShareData[] = [];
  assert.equal(await shareScoreImage(file, 1234, url, {
    canShare: data => !!data?.files?.length,
    share: async data => { calls.push(data!); },
  }), true);
  assert.deepEqual(calls, [{ title: 'Stonktrooper — Best Score', text: 'My best score: 1,234', url, files: [file] }]);
});

test('unsupported file sharing requests fallback rather than sharing only a link', async () => {
  let shared = false;
  assert.equal(await shareScoreImage(file, 1, url, {
    canShare: () => false,
    share: async () => { shared = true; },
  }), false);
  assert.equal(shared, false);
  assert.equal(await shareScoreImage(file, 1, url, {} as Navigator), false);
});

test('user cancellation and other share errors propagate without silently falling back', async () => {
  for (const name of ['AbortError', 'NotAllowedError']) {
    await assert.rejects(shareScoreImage(file, 1, url, {
      canShare: () => true,
      share: async () => { throw new DOMException('Share interrupted', name); },
    }), { name });
  }
});