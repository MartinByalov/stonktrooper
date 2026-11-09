import { clipBriefcaseStep } from './gameView';
import { candleSurpriseDelay, SURPRISE_RETRY_FRAMES } from './candleSurprise';
// Browser game module for boxingRules.
import { aimedVelocity, AimPoint } from './aim';
import type { Animal, Swan } from './types';
import { aimedHitDefeatsEnemy, dismountRider } from './gameRules';
import { stepBellBirds } from './bellBirds';
import type { BellBird } from './bellBirds';
import type { PigeonDrop } from './pigeonEffects';
import { randomDelay } from './randomTiming';
import { stepJanet, janetAttackPose } from './janetRules';
import { stepPaul, paulHookPose, paulAttackContact } from './paulRules';
import { bellAnimalBounds, bellSegmentHit } from './bellCombat';
import { emitBellBlood, stepBellBlood, type BellBlood } from './bellBlood';
import { stepChartBoss, BOSS_PLAYER_CLEARANCE } from './chartBossRules';
import { alternatingPunchArm } from './jeromePunch';
export const BELL_MAX_LIVES = 3;
export type BossKind = 'jerome' | 'janet' | 'paul';
export const bossMaxHealth = (kind: BossKind): number =>
  kind === 'janet' ? 100 : kind === 'jerome' ? 200 : 300;
export const bossWinPips = (kind: BossKind): number =>
  kind === 'janet' ? 1000 : kind === 'jerome' ? 2000 : 3000;
export const bossName = (kind: BossKind): string => kind === 'paul' ? 'Pául' : kind === 'janet' ? 'Janét' : 'Jeromé';
export const randomBossKind = (random = Math.random): BossKind =>
  (['jerome', 'janet', 'paul'] as const)[Math.floor(random() * 3)];
export const BOXING_INTERVAL = 500; // Test balance; production target: 50_000.
export const nextBoxingMilestone = (pips: number): number =>
  (Math.floor(pips / BOXING_INTERVAL) + 1) * BOXING_INTERVAL;

export const arenaHeightAt = (x: number): number => {
  const phase = ((x % 360) + 360) % 360;
  return 410 - Math.min(phase, 360 - phase) * 0.55;
};

export const bossArmExtension = (attack: number): number =>
  attack > 0 ? Math.max(0, Math.sin((48 - attack) / 48 * Math.PI)) * 175 : 0;

// Unequal swings bounded around a baseline, with candle-scale noise.
export const sidewaysTops = (count: number, base: number, random = Math.random): number[] => {
  const tops: number[] = [];
  let current = base, target = base, remaining = 0;
  for (let i = 0; i < count; i++) {
    if (remaining <= 0) {
      remaining = 6 + Math.floor(random() * 39);
      target = base + (random() - 0.5) * 280;
      if (Math.abs(target - current) < 30) target = base + (current > base ? -1 : 1) * (35 + random() * 50);
    }
    current += (target - current) / remaining + (random() - 0.5) * 9;
    remaining--;
    tops.push(current + (random() - 0.5) * 5);
  }
  return tops;
};

export const createBossArena = (kind: BossKind = 'jerome') => ({
  left: 25, right: 1175,
  bossLeft: -Infinity, bossRight: Infinity,
  runnerOffset: null as number | null,
  externalPlayer: false,
  absorbBossHit: (): boolean => false,
  onEnemyDefeated: (_enemy: Animal | Swan): void => {},
  cameraX: 0,
  briefcaseRight: Infinity,
  lifeBirds: new WeakSet<object>(),
  heightAt: arenaHeightAt,
  aim: null as AimPoint | null,
  attackRequested: false,
  jumpRequested: false,
  joystickJumpHeld: false,
  joystickX: 0,
  doubleJumpAt: (_x: number): boolean => false,
  safeHeightAt: arenaHeightAt,
  triggerCandleSurprise: (_random: () => number): boolean => false,
  nextCandleSurprise: candleSurpriseDelay(),
  popups: [] as { x: number; y: number; text: string; life: number }[],
  blood: [] as BellBlood[],
  player: { x: 180, y: arenaHeightAt(180), vy: 0, grounded: true, facing: 1, lives: 3, invulnerable: 0, throwTimer: 0, walkPhase: 0, moving: false, coyote: 6, jumpBuffer: 0, jumps: 0, doubleReady: false, fallFrames: 0, clownHead: false, soiledHead: false },
  boss: { kind, attackKind: 'punch' as 'punch' | 'neck' | 'spin' | 'hook' | 'tail' | 'chase', attackCount: 0, spinAngle: 0, moving: false, walkPhase: 0, jumps: 0, chaseJump: false,
    behavior: 'roam' as 'roam' | 'approach' | 'attack' | 'recover', behaviorTimer: 120, roamOffset: null as number | null, attackReachScale: 1,
    x: 900, y: arenaHeightAt(900), vy: 0, grounded: true, hopTimer: 45, facing: -1, health: bossMaxHealth(kind), fedoraHats: 0, attack: 0, cooldown: 80, hit: false, arm: 0, uppercut: false, aimY: arenaHeightAt(900) - 60 },
  cases: [] as { x: number; y: number; vx: number; vy: number; life: number }[],
  drops: [] as { x: number; y: number; vy: number; kind: 'bat' | 'chainsaw' | 'bag' | 'tender' | 'life'; life: number }[],
  weapon: null as 'bat' | 'chainsaw' | null,
  uses: 0, swing: 0, bagTimer: 0, nextDrop: 180,
  birds: [] as BellBird[],
  pigeonDrops: [] as PigeonDrop[],
  animals: [] as Animal[],
  nextBird: 240,
  frame: 0,
  result: 'fight' as 'fight' | 'win' | 'lose',
});
export type BossArena = ReturnType<typeof createBossArena>;

export const bossGlovePose = (boss: BossArena['boss']): { x: number; y: number } => {
  if (boss.kind === 'janet') return janetAttackPose(boss);
  if (boss.kind === 'paul') return paulHookPose(boss);
  const progress = bossArmExtension(boss.attack) / 175;
  if (boss.uppercut) return { x: 26 + progress * 9, y: -29 - progress * 40 };
  return { x: (30 + progress * 175) * boss.attackReachScale, y: -60 + (boss.aimY - (boss.y - 60)) * progress };
};

export const jumpBossPlayer = (arena: BossArena): boolean => {
  if (arena.result !== 'fight') return false;
  arena.player.jumpBuffer = 8;
  if (!arena.player.grounded && arena.player.coyote <= 0) {
    if (arena.player.jumps !== 1 || !arena.player.doubleReady) return false;
    arena.player.jumps = 2; arena.player.doubleReady = false;
    arena.player.vy = -13; arena.player.jumpBuffer = 0;
    return true;
  }
  arena.player.jumps = 1;
  arena.player.doubleReady = arena.doubleJumpAt(arena.player.x);
  arena.player.grounded = false; arena.player.vy = -13; arena.player.coyote = 0; arena.player.jumpBuffer = 0;
  return true;
};

// Bell hits retain the normal run's defeat state and mounted-rider separation.
export const defeatBellEnemy = (arena: BossArena, enemy: Animal | Swan): void => {
  if (enemy.dead || enemy.dying) return;
  if ('type' in enemy && !aimedHitDefeatsEnemy(enemy)) {
    const rider = dismountRider(enemy);
    if (rider) { arena.animals.push(rider); arena.onEnemyDefeated(rider); }
    return;
  }
  enemy.dying = true;
  enemy.dieTimer = 25;
  enemy.dieVx = 3.5;
  enemy.dieVy = -5;
  enemy.dieAngle = 0;
  arena.onEnemyDefeated(enemy);
};

export const throwBossCase = (arena: BossArena): boolean => {
  const p = arena.player;
  if (arena.result !== 'fight' || p.throwTimer > 0 || arena.bagTimer > 0) return false;
  // Chart-owned runners can shoot too; pickups are routed by CandleGame.
  p.throwTimer = 28;
  if (arena.aim) p.facing = arena.aim.x >= p.x ? 1 : -1;
  if (arena.weapon) {
    arena.swing = 18;
    arena.uses--;
    for (const animal of arena.animals) {
      if (animal.dead || animal.dying) continue;
      const bounds = bellAnimalBounds(animal);
      const left = p.facing > 0 ? p.x - 10 : p.x - 85;
      const right = p.facing > 0 ? p.x + 85 : p.x + 10;
      if (bounds.right >= left && bounds.left <= right && bounds.bottom >= p.y - 65 && bounds.top <= p.y + 5) {
        defeatBellEnemy(arena, animal);
      }
    }
    const b = arena.boss;
    if ((b.x - p.x) * p.facing >= -10 && Math.abs(b.x - p.x) < 85 && Math.abs((b.y - 35) - (p.y - 30)) < 65) {
      b.health = Math.max(0, b.health - 16);
      emitBellBlood(arena.blood, b.x - p.facing * 12, b.y - 45, p.facing,
        arena.weapon === 'chainsaw' ? 2.5 : 1.7);
      if (b.health === 0) arena.result = 'win';
    }
    return true;
  }
  const origin = { x: p.x + p.facing * 20, y: p.y - 35 };
  const velocity = arena.aim ? aimedVelocity(origin, arena.aim, 12) : { x: p.facing * 12, y: -1 };
  arena.cases.push({ ...origin, vx: velocity.x, vy: velocity.y, life: 100 });
  return true;
};

// Fixed 60 Hz physics; damage is based on contact rather than a repeating timer.
export const stepBossArena = (arena: BossArena, direction: number, random = Math.random): void => {
  if (arena.result !== 'fight') return;
  const p = arena.player, b = arena.boss;
  p.lives = Math.min(BELL_MAX_LIVES, p.lives);
  arena.frame++;
  stepBellBlood(arena.blood, arena.heightAt);
  for (const popup of arena.popups) { popup.y -= 0.5; popup.life--; }
  arena.popups = arena.popups.filter(popup => popup.life > 0);
  if (arena.frame >= arena.nextCandleSurprise) {
    const applied = arena.triggerCandleSurprise(random);
    arena.nextCandleSurprise = arena.frame + (applied ? candleSurpriseDelay(random) : SURPRISE_RETRY_FRAMES);
  }
  arena.swing = Math.max(0, arena.swing - 1);
  if (arena.swing === 0 && arena.uses === 0) arena.weapon = null;
  arena.bagTimer = Math.max(0, arena.bagTimer - 1);
  if (!arena.externalPlayer) stepBellBirds(arena, random);
  for (const animal of arena.externalPlayer ? [] : arena.animals) {
    if (animal.dead) continue;
    if (animal.dying) {
      animal.dieTimer = (animal.dieTimer ?? 25) - 1;
      animal.x += animal.dieVx ?? 0;
      animal.feet += animal.dieVy ?? 0;
      animal.y = animal.feet - 30;
      animal.dieVy = (animal.dieVy ?? 0) + 0.35;
      animal.dieAngle = (animal.dieAngle ?? 0) + 0.22;
      if (animal.dieTimer <= 0) animal.dead = true;
      continue;
    }
    const floor = animal.type === 'whale' ? arena.safeHeightAt(animal.x) : arena.heightAt(animal.x);
    animal.phase += 0.12;
    if (animal.dropVelocity !== undefined) {
      animal.dropVelocity += 0.35;
      animal.feet += animal.dropVelocity;
      if (Number.isFinite(floor) && animal.feet >= floor) { animal.feet = floor; animal.dropVelocity = undefined; }
      if (animal.feet > arena.safeHeightAt(animal.x) + 300) animal.dead = true;
    } else {
      animal.x -= animal.type === 'whale' ? 0.9 : 1.5;
      if (Number.isFinite(floor)) animal.feet = floor;
      else animal.dropVelocity = 0;
    }
    animal.y = animal.feet - 30;
    if (!animal.dead && p.invulnerable === 0 && Math.abs(animal.x - p.x) < (animal.type === 'whale' ? 55 : 25)
      && p.y > animal.feet - 60 && p.y - 48 < animal.feet) {
      p.lives--; p.invulnerable = 90;
    }
  }
  arena.animals = arena.animals.filter(animal => !animal.dead && animal.x > arena.left - 100);
  if (!arena.externalPlayer && arena.runnerOffset === null && arena.frame >= arena.nextDrop) {
    arena.nextDrop = arena.frame + 180 + Math.floor(random() * 180);
    const roll = random();
    if (roll < 0.55) arena.drops.push({ x: Math.max(arena.left, Math.min(arena.right, p.x + (random() - 0.5) * 220)), y: p.y - 260, vy: 0, kind: random() < 0.5 ? 'bat' : 'chainsaw', life: 900 });
    else if (roll < 0.9 && arena.birds.length < 3) arena.birds.push({ kind: 'swan', x: arena.right + 60,
      y: p.y - 160, baseY: p.y - 160, phase: 0, dead: false });
  }
  for (const drop of arena.drops) {
    drop.vy += 0.3; drop.y = Math.min(arena.heightAt(drop.x) - 12, drop.y + drop.vy); drop.life--;
    if (Math.hypot(drop.x - p.x, drop.y - (p.y - 25)) < 30) {
      if (drop.kind === 'bag') { arena.bagTimer = 240; arena.swing = 0; p.throwTimer = 0; }
      else if (drop.kind === 'life') {
        if (p.lives < BELL_MAX_LIVES) {
          p.lives++;
          arena.popups.push({ x: p.x, y: p.y - 75, text: '+1 LIFE', life: 70 });
        }
      }
      else if (drop.kind !== 'tender') { arena.weapon = drop.kind; arena.uses = 3; arena.swing = 0; }
      drop.life = 0;
    }
  }
  arena.drops = arena.drops.filter(d => d.life > 0);
  p.invulnerable = Math.max(0, p.invulnerable - 1);
  p.throwTimer = Math.max(0, p.throwTimer - 1);
  if (!arena.externalPlayer) {
  const previousX = p.x;
  p.x = Math.max(arena.left, Math.min(arena.right, p.x + direction * 4.5));
  p.moving = p.x !== previousX;
  if (p.moving) p.walkPhase += Math.abs(p.x - previousX) * 0.04;
  if (direction) p.facing = Math.sign(direction);
  const floor = arena.heightAt(p.x);
  if (!Number.isFinite(floor)) p.fallFrames++;
  else p.fallFrames = 0;
  if (p.fallFrames > 90) {
    p.lives--;
    if (p.lives <= 0) {
      p.lives = 0;
      arena.result = 'lose';
      return;
    }
    // Find real solid ground rather than respawning over the same gap.
    let respawnX: number | null = null;
    for (let distance = 0; distance <= arena.right - arena.left + 1; distance++) {
      for (const x of [p.x - distance, p.x + distance]) {
        if (x >= arena.left && x <= arena.right && Number.isFinite(arena.heightAt(x))) {
          respawnX = x;
          break;
        }
      }
      if (respawnX !== null) break;
    }
    if (respawnX === null) {
      // Invalid arenas with no landing surface cannot support a respawn.
      arena.result = 'lose';
      return;
    }
    p.x = respawnX;
    p.y = arena.heightAt(respawnX) - 240;
    p.vy = 0; p.grounded = false; p.fallFrames = 0;
    p.coyote = 0; p.jumpBuffer = 0; p.jumps = 0; p.doubleReady = false;
    p.invulnerable = 180; p.throwTimer = 0; p.moving = false;
    arena.jumpRequested = false;
    arena.attackRequested = false;
    return;
  }
  p.coyote = p.grounded ? 6 : Math.max(0, p.coyote - 1);
  p.jumpBuffer = Math.max(0, p.jumpBuffer - 1);
  if (p.grounded && floor > p.y + 5) { p.grounded = false; p.vy = 0; }
  if (p.grounded) p.y = floor;
  else {
    p.vy += 0.48; p.y += p.vy;
    if (p.vy >= 0 && p.y >= floor) { p.y = floor; p.vy = 0; p.grounded = true; p.jumps = 0; p.doubleReady = arena.doubleJumpAt(p.x); }
  }
  if ((p.jumpBuffer > 0 || arena.joystickJumpHeld) && p.grounded) jumpBossPlayer(arena);
  }
  if (arena.runnerOffset !== null) stepChartBoss(arena, random);
  else if (b.kind === 'janet') stepJanet(arena);
  else if (b.kind === 'paul') stepPaul(arena);
  else {
  if (!b.attack) {
    b.facing = p.x >= b.x ? 1 : -1;
    const distance = Math.abs(p.x - b.x);
    if (distance > 42) b.x = Math.max(arena.left, Math.min(arena.right,
      b.x + b.facing * Math.min(distance - 42, b.chaseJump ? 5.8 : 2.2)));
    b.cooldown = Math.max(0, b.cooldown - 1);
    if (!b.cooldown && !b.chaseJump && Math.abs(p.x - b.x) < 270) {
      b.attack = 48; b.hit = false; b.arm = alternatingPunchArm(b.attackCount++);
      b.uppercut = Math.abs(p.x - b.x) < 85; b.aimY = p.y - 35;
    }
  } else { b.attack--; if (!b.attack) b.cooldown = 65; }
  const rawBossFloor = arena.heightAt(b.x);
  const bossFloor = Number.isFinite(rawBossFloor) ? rawBossFloor : arena.safeHeightAt(b.x);
  b.hopTimer--;
  if (b.grounded && b.hopTimer <= 0 && !b.attack) {
    b.chaseJump = Math.abs(p.x - b.x) > 270;
    b.jumps = 1; b.grounded = false; b.vy = b.chaseJump ? -9 : -6.5;
    b.hopTimer = b.chaseJump ? 120 : 45 + Math.floor(random() * 40);
  }
  // One aerial boost near the apex closes long distances without unlimited jumps.
  if (!b.grounded && b.chaseJump && b.jumps === 1 && b.vy >= -1 && Math.abs(p.x - b.x) > 100) {
    b.vy = -8; b.jumps = 2;
  }
  if (b.grounded) b.y = bossFloor;
  else {
    b.vy += 0.45; b.y += b.vy;
    if (b.vy >= 0 && b.y >= bossFloor) {
      b.y = bossFloor; b.vy = 0; b.grounded = true; b.jumps = 0; b.chaseJump = false;
    }
  }
  }
  b.x = Math.max(arena.bossLeft, Math.min(arena.bossRight, b.x));
  if (arena.runnerOffset !== null) b.x = Math.max(p.x + BOSS_PLAYER_CLEARANCE, b.x);
  const glove = bossGlovePose(b);
  const gloveX = b.x + b.facing * glove.x;
  const gloveY = b.y + glove.y;
  const contact = b.kind === 'paul' ? paulAttackContact(b, p) : b.kind === 'janet' && b.attackKind === 'spin'
    ? b.attack > 0 && b.attack <= 72 && Math.abs(b.x - p.x) < 40 && b.y > p.y - 55 && b.y - 45 < p.y
    : b.attack > 8 && b.attack < (b.kind === 'janet' && b.attackKind === 'punch' ? 24 : 30)
      && Math.abs(gloveX - p.x) < 28 && gloveY > p.y - 65 && gloveY < p.y;
  // Body proximity alone is safe; damage requires a glove, neck strike or active shell spin.
  if (p.invulnerable === 0 && contact && !b.hit) {
    b.hit = true;
    if (!arena.absorbBossHit()) {
      p.lives--; p.invulnerable = 90;
      if (arena.runnerOffset === null) p.x = Math.max(arena.left, Math.min(arena.right, p.x + b.facing * 25));
    }
  }
  for (const c of arena.cases) {
    if (c.life <= 0) continue;
    const previousX = c.x, previousY = c.y;
    if (previousX >= arena.briefcaseRight) { c.life = 0; continue; }
    c.x += c.vx; c.y += c.vy; c.vy += 0.045; c.life--;
    const clipped = clipBriefcaseStep(previousX, previousY, c.x, c.y, arena.briefcaseRight);
    c.x = clipped.x; c.y = clipped.y;
    if (clipped.expired) c.life = 0;
    let firstHit = bellSegmentHit(previousX, previousY, c.x, c.y,
      { left: b.x - 22, right: b.x + 22, top: b.y - 85, bottom: b.y });
    let target: Animal | null = null;
    let birdTarget: BellBird | null = null;
    for (const animal of arena.animals) {
      if (animal.dead || animal.dying) continue;
      const hit = bellSegmentHit(previousX, previousY, c.x, c.y, bellAnimalBounds(animal));
      if (hit !== null && (firstHit === null || hit < firstHit)) { firstHit = hit; target = animal; }
    }
    for (const bird of arena.birds) {
      if (bird.dead || bird.dying) continue;
      const hit = bellSegmentHit(previousX, previousY, c.x, c.y,
        { left: bird.x - 18, right: bird.x + 18, top: bird.y - 18, bottom: bird.y + 18 });
      if (hit !== null && (firstHit === null || hit < firstHit)) { firstHit = hit; target = null; birdTarget = bird; }
    }
    if (firstHit !== null) {
      if (birdTarget) defeatBellEnemy(arena, birdTarget);
      else if (target) defeatBellEnemy(arena, target);
      else {
        emitBellBlood(arena.blood, previousX + (c.x - previousX) * firstHit,
          previousY + (c.y - previousY) * firstHit, c.vx, 1);
        b.health = Math.max(0, b.health - 8);
      }
      c.life = 0;
    }
  }
  arena.animals = arena.animals.filter(animal => !animal.dead);
  arena.cases = arena.cases.filter(c => c.life > 0 && c.x > arena.left - 60 && c.x < arena.right + 60 && c.y < arena.heightAt(c.x) + 180);
  if (p.lives <= 0) arena.result = 'lose';
  else if (b.health <= 0) arena.result = 'win';
};