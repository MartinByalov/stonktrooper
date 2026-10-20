import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
try {
  const { sharedScore, resultUrl, socialLinks } = await server.ssrLoadModule('/src/shareLinks.ts');
  for (const value of ['<script>alert(1)</script>', '-1', '1e3', '1.5', 'Infinity', '9007199254740992', '9'.repeat(1000)]) {
    assert.equal(sharedScore('?score=' + encodeURIComponent(value)), null, value);
  }
  assert.equal(sharedScore(''), null);
  for (const score of [0, 123, Number.MAX_SAFE_INTEGER]) {
    assert.equal(sharedScore(new URL(resultUrl(score)).search), score);
  }
  for (const score of [NaN, Infinity, -1]) {
    const url = new URL(resultUrl(score));
    assert.equal(url.origin, 'https://stonktrooper.lol');
    assert.equal(url.searchParams.get('score'), '0');
  }
  for (const link of socialLinks(123)) assert.equal(new URL(link.href).protocol, 'https:');

  const popup = await readFile(new URL('../stonks/nft-popup.js', import.meta.url), 'utf8');
  assert.ok(popup.includes('${esc(info.rarityRank)} / ${esc(info.totalSupply)}'));
  assert.ok(popup.includes('${esc(typeof info.rarityScore'));
  const workflow = await readFile(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
  assert.ok(!workflow.split('  deploy:')[0].includes('pages: write'));
  assert.ok(!workflow.split('  deploy:')[0].includes('id-token: write'));
  const footer = await readFile(new URL('../src/SiteFooter.tsx', import.meta.url), 'utf8');
  assert.ok(footer.includes('If you find any in-game bugs, it may be a feature!'));
  console.log('PASS share input validation, escaped rarity fields, deployment permissions and disclaimer copy');
} finally {
  await server.close();
}