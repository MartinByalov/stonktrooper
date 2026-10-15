// Regression checks for news.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MEME_HEADLINES, TICKER_AGENCIES, getTickerNews } from './news';

test('ticker has at least one hundred new distinct stories and varied fictional agencies', () => {
  assert(MEME_HEADLINES.length >= 110);
  assert.equal(new Set(MEME_HEADLINES).size, MEME_HEADLINES.length);
  assert(TICKER_AGENCIES.length >= 20);
  let previous = '';
  for (let i = 0; i < 200; i++) {
    const news = getTickerNews(previous);
    assert.notEqual(news.headline, previous);
    assert(TICKER_AGENCIES.includes(news.source));
    assert.equal(news.spawnType, undefined);
    previous = news.headline;
  }
});