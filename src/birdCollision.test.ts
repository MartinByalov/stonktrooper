import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { lethalBirdContact } from './birdCollision';
import { createBossArena, stepBossArena } from './boxingRules';
import type { Swan } from './types';

for (const kind of ['swan', 'hawk', 'pigeon'] as const) {
  test(`${kind} kills on body, head and descending foot contact`, () => {
    const bird: Swan = { kind, x: 180, y: 100, baseY: 100, phase: 0, dead: false };
    for (const y of [90, 120, 155]) assert(lethalBirdContact(bird, { x: 180, y }));
    assert(lethalBirdContact(bird, { x: 180, y: 170, previousY: 70 }));
    assert(!lethalBirdContact(bird, { x: 250, y: 120 }));
    assert(!lethalBirdContact(bird, { x: 180, y: 200 }));
    assert(!lethalBirdContact({ ...bird, dead: true }, { x: 180, y: 120 }));
    assert(!lethalBirdContact({ ...bird, dying: true }, { x: 180, y: 120 }));
  });
  test(`${kind} contact ends boss fight even with invulnerability`, () => {
    const arena = createBossArena();
    arena.player.invulnerable = 180;
    arena.birds.push({ kind, x: arena.player.x, y: arena.player.y - 24, baseY: arena.player.y - 24, phase: 0, dead: false });
    stepBossArena(arena, 0);
    assert.equal(arena.player.lives, 0);
    assert.equal(arena.result, 'lose');
  });
}

test('runner resolves rocket and stomp protection before lethal bird contact', () => {
  const source = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert(source.indexOf('// ROCKET IMPACT:') < source.indexOf('// Jump Stomp'));
  assert(source.indexOf('// Jump Stomp') < source.indexOf('lethalBirdContact(s, g.p)'));
  assert.match(source, /if \(absorbEnemyHit\(g\.p, s\)\)/);
});