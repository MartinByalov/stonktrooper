// Verify portable result URLs and encoded social sharing destinations.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resultUrl, sharedScore, socialLinks } from './shareLinks';

test('score links round trip and normalize invalid scores', () => {
  assert.equal(resultUrl(12345.6), 'https://www.stonkrunner.lol/?score=12346');
  assert.equal(sharedScore(new URL(resultUrl(12345.6)).search), 12346);
  assert.equal(resultUrl(NaN), 'https://www.stonkrunner.lol/?score=0');
  assert.equal(sharedScore('?score=0'), 0);
  for (const search of ['', '?score=-1', '?score=NaN', '?score=1.5', '?score=<script>', '?score=9999999999999999']) {
    assert.equal(sharedScore(search), null);
  }
});

test('social share buttons carry the exact result link without remote widgets', () => {
  const links = socialLinks(1234);
  assert.deepEqual(links.map(link => link.name), ['X', 'Facebook', 'WhatsApp', 'Telegram']);
  for (const link of links) {
    const url = new URL(link.href);
    assert.equal(url.protocol, 'https:');
    assert([...url.searchParams.values()].some(value => value.includes(resultUrl(1234))));
  }
});