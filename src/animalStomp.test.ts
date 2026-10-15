import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { animalHeight } from './animalRenderer';

test('descending edge landings stomp Bull/Bear before their wider weapon contact', () => {
  const source = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  const start = source.indexOf('// Jump Stomp on Enemies');
  const end = source.indexOf('// Collisions with Living Enemies', start);
  const resolve = new Function('g', 'animalHeight', 'sound', 'awardEnemy', source.slice(start, end));
  for (const type of ['bull', 'bear']) {
    for (const distance of [0, 29, 31, 49, ...(type === 'bull' ? [54] : [])]) {
      for (const vy of [0, 12]) {
        const enemy = { type, x: 100, feet: 300, y: 270, dead: false, dying: false };
        const g = { p: { x: 100 - distance, previousY: 230, y: 250, vy, rocketTimer: 0, air: true }, swans: [], animals: [enemy] };
        let awards = 0;
        resolve(g, animalHeight, { playHit() {} }, () => awards++);
        assert(enemy.dying, `${type} edge landing at ${distance}px must stomp even after landing resets velocity`);
        assert.equal(awards, 1);
        assert.equal(g.p.vy, -7.5);
      }
    }
    for (const [previousY, y] of [[250, 230], [270, 280], [220, 230]]) {
      const enemy = { type, x: 100, feet: 300, y: 270, dead: false, dying: false };
      resolve({ p: { x: 100, previousY, y, rocketTimer: 0 }, swans: [], animals: [enemy] }, animalHeight, { playHit() {} }, () => {});
      assert(!enemy.dying, 'rising, side contact, and passing above without touching are not stomps');
    }
  }
});