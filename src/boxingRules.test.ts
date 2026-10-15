// Regression checks for boxingRules.
import assert from 'node:assert/strict';

test('yellow zones grant one extra jump and gap falls cost one life before respawning above solid ground', () => {
  const arena = createBossArena();
  arena.doubleJumpAt = () => true;
  assert(jumpBossPlayer(arena));
  assert(jumpBossPlayer(arena));
  assert(!jumpBossPlayer(arena));
  arena.heightAt = x => x >= 150 && x <= 210 ? Infinity : 320;
  for (let i = 0; i < 91; i++) stepBossArena(arena, 0, () => 0.99);
  assert.equal(arena.player.lives, 2);
  assert.equal(arena.result, 'fight');
  assert(Number.isFinite(arena.heightAt(arena.player.x)));
  assert.equal(arena.player.y, 80);
  assert.equal(arena.player.grounded, false);
  assert.equal(arena.player.fallFrames, 0);
  assert(arena.player.invulnerable > 0);
  assert(Number.isFinite(arena.player.y));
  for (let i = 0; i < 40; i++) stepBossArena(arena, 0, () => 0.99);
  assert(arena.player.grounded);
  assert.equal(arena.player.lives, 2);
});

test('falling into a gap on the last life ends the kangaroo fight', () => {
  const arena = createBossArena();
  arena.player.lives = 1;
  arena.heightAt = () => Infinity;
  arena.player.grounded = false;
  for (let i = 0; i < 91; i++) stepBossArena(arena, 0, () => 0.99);
  assert.equal(arena.player.lives, 0);
  assert.equal(arena.result, 'lose');
});

test('crossing a boss gap before falling out does not liquidate the player', () => {
  const arena = createBossArena();
  const floor = arena.player.y;
  arena.heightAt = () => Infinity;
  assert(jumpBossPlayer(arena));
  for (let i = 0; i < 15; i++) stepBossArena(arena, 1, () => 0.99);
  assert.equal(arena.result, 'fight');
  arena.heightAt = () => floor;
  for (let i = 0; i < 60; i++) stepBossArena(arena, 1, () => 0.99);
  assert.equal(arena.result, 'fight');
  assert.equal(arena.player.lives, 3);
  assert(arena.player.grounded);
  assert.equal(arena.player.fallFrames, 0);
});
import { sidewaysTops, bossGlovePose } from './boxingRules';

test('weapons allow exactly three swings then restore briefcase, even on misses', () => {
  for (const weapon of ['bat', 'chainsaw'] as const) {
    const a = createBossArena(); a.weapon = weapon; a.uses = 3;
    for (let i = 0; i < 3; i++) {
      a.player.throwTimer = 0;
      assert(throwBossCase(a));
      assert.equal(a.uses, 2 - i);
      assert.equal(a.cases.length, 0);
    }
    for (let i = 0; i < 28; i++) stepBossArena(a, 0, () => 0.5);
    assert.equal(a.weapon, null);
    assert(throwBossCase(a));
    assert.equal(a.cases.length, 1);
  }
});

test('bag pickup prevents attacks temporarily without consuming weapon charges', () => {
  const a = createBossArena(); a.weapon = 'bat'; a.uses = 3;
  a.drops.push({ x: a.player.x, y: a.player.y - 25, vy: 0, kind: 'bag', life: 100 });
  stepBossArena(a, 0);
  assert.equal(a.bagTimer, 240);
  assert(!throwBossCase(a));
  assert.equal(a.uses, 3);
  a.bagTimer = 1; stepBossArena(a, 0);
  assert(throwBossCase(a));
});

test('rare events produce falling weapons or a harmless bag-dropping swan', () => {
  const a = createBossArena(); a.nextDrop = 1;
  stepBossArena(a, 0, () => 0.1);
  assert.equal(a.drops[0].kind, 'bat');
  const b = createBossArena(); b.nextDrop = 1;
  stepBossArena(b, 0, () => 0.7);
  assert(b.swan);
  b.swan.x = b.player.x + 42;
  stepBossArena(b, 0, () => 0.5);
  assert(b.drops.some(d => d.kind === 'bag'));
  assert.equal(b.player.lives, 3);
});
import { test } from 'node:test';
import { BOXING_INTERVAL, nextBoxingMilestone, arenaHeightAt, createBossArena, stepBossArena, jumpBossPlayer, throwBossCase, bossArmExtension } from './boxingRules';

test('boxing milestones are every 500 test pips and advance beyond crossed bonuses', () => {
  assert.equal(BOXING_INTERVAL, 500);
  assert.equal(nextBoxingMilestone(500), 1000);
  assert.equal(nextBoxingMilestone(1250), 1500);
});

test('sideways arena rises and falls without long term growth', () => {
  assert(arenaHeightAt(180) < arenaHeightAt(0));
  assert.equal(arenaHeightAt(0), arenaHeightAt(360));
  assert.equal(arenaHeightAt(0), arenaHeightAt(720));
});

test('sideways sections vary with random input and keep traversable steps', () => {
  const first = sidewaysTops(210, 400, () => 0.2);
  const second = sidewaysTops(210, 400, () => 0.8);
  assert.notDeepEqual(first, second);
  assert(first.every(Number.isFinite));
  assert(first.slice(1).every((y, i) => Math.abs(y - first[i]) < 50));
});

test('boss randomly selects either arm and uses compact uppercuts nearby', () => {
  for (const [roll, arm] of [[0.1, 0], [0.9, 1]]) {
    const arena = createBossArena();
    arena.boss.x = arena.player.x + 50; arena.boss.cooldown = 0;
    stepBossArena(arena, 0, () => roll);
    assert.equal(arena.boss.arm, arm);
    assert(arena.boss.uppercut);
    arena.boss.attack = 24;
    const glove = bossGlovePose(arena.boss);
    assert(glove.x <= 35);
    assert(glove.y < -60);
  }
  const distant = createBossArena();
  distant.boss.x = distant.player.x + 200; distant.boss.cooldown = 0;
  stepBossArena(distant, 0, () => 0.1);
  assert(!distant.boss.uppercut);
});

test('player jumps and lands with exactly three starting lives', () => {
  const arena = createBossArena();
  assert.equal(arena.player.lives, 3);
  assert(jumpBossPlayer(arena));
  assert(!jumpBossPlayer(arena));
  arena.player.jumpBuffer = 0;
  for (let i = 0; i < 65; i++) stepBossArena(arena, 1);
  assert(arena.player.grounded);
  assert.equal(arena.player.y, arenaHeightAt(arena.player.x));
});

test('coyote time permits a jump just after leaving a descending candle', () => {
  const a = createBossArena(); a.heightAt = () => a.player.y + 15;
  stepBossArena(a, 1);
  assert(!a.player.grounded);
  assert(jumpBossPlayer(a));
  assert(a.player.vy < 0);
});

test('early jump input is buffered until landing', () => {
  const a = createBossArena(); a.heightAt = () => 400;
  a.player.y = 398; a.player.vy = 3; a.player.grounded = false; a.player.coyote = 0;
  assert(!jumpBossPlayer(a));
  stepBossArena(a, 0);
  assert(a.player.vy < 0 && !a.player.grounded);
});

test('kangaroo hops with gravity and lands back on the candles', () => {
  const arena = createBossArena();
  arena.heightAt = () => 400;
  arena.boss.y = 400; arena.boss.hopTimer = 0;
  stepBossArena(arena, 0, () => 0.5);
  assert(!arena.boss.grounded);
  assert(arena.boss.y < 400);
  for (let i = 0; i < 35; i++) stepBossArena(arena, 0, () => 0.5);
  assert(arena.boss.grounded);
  assert.equal(arena.boss.y, 400);
});

test('player falls naturally down a candle depression instead of snapping downward', () => {
  const arena = createBossArena();
  arena.heightAt = () => 400;
  arena.player.y = 320;
  stepBossArena(arena, 0);
  assert(!arena.player.grounded);
  assert(arena.player.y > 320 && arena.player.y < 400);
});

test('walk animation advances only with actual player movement, not idle time or arena edge', () => {
  const arena = createBossArena();
  for (let i = 0; i < 10; i++) stepBossArena(arena, 0);
  assert.equal(arena.player.walkPhase, 0);
  assert(!arena.player.moving);
  stepBossArena(arena, 1);
  assert(arena.player.walkPhase > 0 && arena.player.moving);
  const phase = arena.player.walkPhase;
  stepBossArena(arena, 0);
  assert.equal(arena.player.walkPhase, phase);
  arena.player.x = arena.right;
  stepBossArena(arena, 1);
  assert(!arena.player.moving);
  assert.equal(arena.player.walkPhase, phase);
});

test('briefcase requires physical contact and can defeat boss', () => {
  const arena = createBossArena();
  assert(throwBossCase(arena));
  assert(!throwBossCase(arena));
  stepBossArena(arena, 0);
  assert.equal(arena.boss.health, 100);
  arena.cases = [];
  arena.boss.health = 10;
  arena.cases.push({ x: arena.boss.x - 30, y: arena.boss.y - 40, vx: 12, vy: 0, life: 10 });
  stepBossArena(arena, 0);
  assert.equal(arena.result, 'win');
});

test('extending glove costs one life with recovery time and no automatic damage', () => {
  const arena = createBossArena();
  arena.boss.x = 500; arena.boss.facing = -1; arena.boss.attack = 25;
  arena.player.x = 500 - 30 - bossArmExtension(24);
  arena.player.y = arenaHeightAt(arena.player.x);
  arena.boss.aimY = arena.player.y - 35;
  stepBossArena(arena, 0);
  assert.equal(arena.player.lives, 2);
  stepBossArena(arena, 0);
  assert.equal(arena.player.lives, 2);
  const distant = createBossArena();
  for (let i = 0; i < 60; i++) stepBossArena(distant, 0);
  assert.equal(distant.player.lives, 3);
});

test('touching kangaroo without an attack never costs a life', () => {
  const a = createBossArena();
  a.heightAt = () => 400;
  a.player.x = a.boss.x; a.player.y = 400; a.boss.y = 400;
  a.boss.cooldown = 100; a.boss.hopTimer = 100;
  for (let i = 0; i < 20; i++) stepBossArena(a, 0);
  assert.equal(a.player.lives, 3);
});

test('close uppercut costs a life only when glove actually reaches the player', () => {
  const a = createBossArena(); a.heightAt = () => 400;
  a.boss.x = 500; a.boss.y = 400; a.boss.facing = -1;
  a.boss.uppercut = true; a.boss.attack = 25;
  a.player.x = 465; a.player.y = 400;
  stepBossArena(a, 0);
  assert.equal(a.player.lives, 3, 'glove above the head misses');
  a.boss.attack = 29;
  a.player.y = 375; a.player.grounded = false; a.player.vy = 0;
  stepBossArena(a, 0);
  assert.equal(a.player.lives, 2, 'jumping into the uppercut glove is a hit');
});