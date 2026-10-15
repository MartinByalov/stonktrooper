// Regression checks for bossBirds.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBossArena, stepBossArena } from './boxingRules';
import { randomDelay } from './randomTiming';

test('kangaroo fight schedules safe candle surprises and retries unavailable terrain', () => {
  const arena = createBossArena();
  arena.nextCandleSurprise = 0;
  let attempts = 0;
  arena.triggerCandleSurprise = () => { attempts++; return false; };
  stepBossArena(arena, 0, () => 0.5);
  assert.equal(attempts, 1);
  assert.equal(arena.nextCandleSurprise, arena.frame + 120);
  arena.nextCandleSurprise = arena.frame;
  arena.triggerCandleSurprise = () => { attempts++; return true; };
  stepBossArena(arena, 0, () => 0.5);
  assert.equal(attempts, 2);
  assert.equal(arena.nextCandleSurprise, arena.frame + randomDelay(420, 1200, () => 0.5));
});

test('kangaroo fights spawn both hawks and swans', () => {
  for (const [roll, kind] of [[0.2, 'hawk'], [0.8, 'swan']] as const) {
    const arena = createBossArena();
    arena.nextBird = 0;
    stepBossArena(arena, 0, () => roll);
    assert.equal(arena.birds[0].kind, kind);
  }
});

test('boss birds release cargo ahead on solid right-hand track, not above player', () => {
  const arena = createBossArena();
  arena.birds.push({ kind: 'hawk', cargo: 'bear', cargoFlight: true, cargoReleaseRatio: 0.8,
    x: 800, y: 100, baseY: 100, phase: 0, dead: false });
  stepBossArena(arena, 0, () => 0.9);
  assert.equal(arena.animals[0].type, 'bear');
  assert(arena.animals[0].x - arena.player.x >= 420);
  assert(arena.animals[0].dropVelocity !== undefined);
  assert.equal(arena.birds[0].cargo, undefined);
});

test('cargo swans drop their bag after releasing the animal', () => {
  const arena = createBossArena();
  arena.birds.push({ kind: 'swan', cargo: 'bull', cargoFlight: true, cargoReleaseRatio: 0.8,
    x: 800, y: 100, baseY: 100, phase: 0, dead: false });
  stepBossArena(arena, 0, () => 0.9);
  assert(arena.birds[0].lootRolled);
  assert(arena.drops.some(drop => drop.kind === 'bag'));
});

test('boss hawks never release chicken tender, including after cargo release', () => {
  for (const cargo of [undefined, 'bear'] as const) {
    const arena = createBossArena();
    arena.nextBird = Infinity;
    arena.birds.push({ kind: 'hawk', cargo, cargoFlight: !!cargo, cargoReleaseRatio: 0.8,
      x: 800, y: 100, baseY: 100, phase: 0, dead: false });
    for (let frame = 0; frame < 240; frame++) stepBossArena(arena, 0, () => 0.9);
    assert(!arena.drops.some(drop => drop.kind === 'tender'));
  }
});