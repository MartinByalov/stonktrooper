import { candleSurpriseDelay, SURPRISE_RETRY_FRAMES } from './candleSurprise';
// Browser game module for boxingRules.
import { aimedVelocity, AimPoint } from './aim';
import { swanBagPose } from './swanBag';
import type { Animal, Swan } from './types';
import { randomBirdCargo } from './birdCargo';
import { randomDelay } from './randomTiming';
import { lethalBirdContact } from './birdCollision';
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

export const createBossArena = () => ({
  left: 25, right: 1175,
  heightAt: arenaHeightAt,
  aim: null as AimPoint | null,
  attackRequested: false,
  jumpRequested: false,
  joystickX: 0,
  doubleJumpAt: (_x: number): boolean => false,
  safeHeightAt: arenaHeightAt,
  triggerCandleSurprise: (_random: () => number): boolean => false,
  nextCandleSurprise: candleSurpriseDelay(),
  popups: [] as { x: number; y: number; text: string; life: number }[],
  player: { x: 180, y: arenaHeightAt(180), vy: 0, grounded: true, facing: 1, lives: 3, invulnerable: 0, throwTimer: 0, walkPhase: 0, moving: false, coyote: 6, jumpBuffer: 0, jumps: 0, doubleReady: false, fallFrames: 0 },
  boss: { x: 900, y: arenaHeightAt(900), vy: 0, grounded: true, hopTimer: 45, facing: -1, health: 100, attack: 0, cooldown: 80, hit: false, arm: 0, uppercut: false, aimY: arenaHeightAt(900) - 60 },
  cases: [] as { x: number; y: number; vx: number; vy: number; life: number }[],
  drops: [] as { x: number; y: number; vy: number; kind: 'bat' | 'chainsaw' | 'bag' | 'tender'; life: number }[],
  weapon: null as 'bat' | 'chainsaw' | null,
  uses: 0, swing: 0, bagTimer: 0, nextDrop: 180,
  swan: null as { x: number; y: number; dropped: boolean } | null,
  birds: [] as Swan[],
  animals: [] as Animal[],
  nextBird: 240,
  frame: 0,
  result: 'fight' as 'fight' | 'win' | 'lose',
});
export type BossArena = ReturnType<typeof createBossArena>;

export const bossGlovePose = (boss: BossArena['boss']): { x: number; y: number } => {
  const progress = bossArmExtension(boss.attack) / 175;
  if (boss.uppercut) return { x: 26 + progress * 9, y: -29 - progress * 40 };
  return { x: 30 + progress * 175, y: -60 + (boss.aimY - (boss.y - 60)) * progress };
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

export const throwBossCase = (arena: BossArena): boolean => {
  const p = arena.player;
  if (arena.result !== 'fight' || p.throwTimer > 0 || arena.bagTimer > 0) return false;
  p.throwTimer = 28;
  if (arena.aim) p.facing = arena.aim.x >= p.x ? 1 : -1;
  if (arena.weapon) {
    arena.swing = 18;
    arena.uses--;
    const b = arena.boss;
    if ((b.x - p.x) * p.facing >= -10 && Math.abs(b.x - p.x) < 85 && Math.abs((b.y - 35) - (p.y - 30)) < 65) {
      b.health = Math.max(0, b.health - 20);
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
  if (arena.birds.some(bird => lethalBirdContact(bird, p))) {
    p.lives = 0;
    arena.result = 'lose';
    return;
  }
  arena.frame++;
  for (const popup of arena.popups) { popup.y -= 0.5; popup.life--; }
  arena.popups = arena.popups.filter(popup => popup.life > 0);
  if (arena.frame >= arena.nextCandleSurprise) {
    const applied = arena.triggerCandleSurprise(random);
    arena.nextCandleSurprise = arena.frame + (applied ? candleSurpriseDelay(random) : SURPRISE_RETRY_FRAMES);
  }
  arena.swing = Math.max(0, arena.swing - 1);
  if (arena.swing === 0 && arena.uses === 0) arena.weapon = null;
  arena.bagTimer = Math.max(0, arena.bagTimer - 1);
  if (arena.frame >= arena.nextBird && arena.birds.length < 3) {
    arena.nextBird = arena.frame + 180 + Math.floor(random() * 360);
    const kind = random() < 0.5 ? 'hawk' : 'swan';
    const cargo = randomBirdCargo(random);
    arena.birds.push({ kind, cargo, cargoFlight: !!cargo, cargoRolled: true,
      cargoReleaseRatio: 0.65 + random() * 0.25, x: arena.right + 60,
      y: p.y - 260, baseY: p.y - 260, phase: 0, dead: false });
  }
  for (const bird of arena.birds) {
    bird.x -= 3; bird.phase += 0.12;
    bird.y = bird.baseY + Math.sin(bird.phase) * 5;
    const ratio = (bird.x - arena.left) / (arena.right - arena.left);
    if (bird.cargo && ratio >= 0.55
      && ratio <= (bird.cargoReleaseRatio ?? 0.75) && bird.x - p.x >= 420
      && Number.isFinite(arena.heightAt(bird.x))) {
      const feet = bird.y + 84;
      arena.animals.push({ type: bird.cargo, x: bird.x, feet, y: feet - 30,
        phase: 0, dead: false, dropVelocity: 1 });
      bird.cargo = undefined;
    }
    if (bird.cargo && ratio < 0.60) {
      bird.x = arena.left + (arena.right - arena.left) * 0.60;
    }
    if (bird.kind === 'swan' && !bird.cargo && !bird.lootRolled && (bird.cargoFlight || bird.x <= p.x + 40)) {
      bird.lootRolled = true;
      const bag = swanBagPose();
      arena.drops.push({ x: bird.x + bag.x, y: bird.y + bag.y, vy: 0, kind: 'bag', life: 900 });
    }
    if (bird.kind === 'hawk' && !bird.cargo && !bird.lootRolled && ratio <= 0.85) {
      bird.lootRolled = true;
    }
  }
  arena.birds = arena.birds.filter(bird => bird.x > arena.left - 100);
  for (const animal of arena.animals) {
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
    for (const c of arena.cases) {
      if (c.life > 0 && Math.abs(c.x - animal.x) < (animal.type === 'whale' ? 55 : 25)
        && c.y > animal.feet - 60 && c.y < animal.feet) { animal.dead = true; c.life = 0; break; }
    }
  }
  arena.animals = arena.animals.filter(animal => !animal.dead && animal.x > arena.left - 100);
  if (arena.frame >= arena.nextDrop) {
    arena.nextDrop = arena.frame + 180 + Math.floor(random() * 180);
    const roll = random();
    if (roll < 0.55) arena.drops.push({ x: Math.max(arena.left, Math.min(arena.right, p.x + (random() - 0.5) * 220)), y: p.y - 260, vy: 0, kind: random() < 0.5 ? 'bat' : 'chainsaw', life: 900 });
    else if (roll < 0.9 && !arena.swan) arena.swan = { x: arena.right + 60, y: p.y - 160, dropped: false };
  }
  if (arena.swan) {
    const s = arena.swan; s.x -= 4;
    if (!s.dropped && s.x <= p.x + 40) {
      s.dropped = true;
      const bag = swanBagPose();
      arena.drops.push({ x: s.x + bag.x, y: s.y + bag.y, vy: 0, kind: 'bag', life: 900 });
    }
    if (s.x < arena.left - 80) arena.swan = null;
  }
  for (const drop of arena.drops) {
    drop.vy += 0.3; drop.y = Math.min(arena.heightAt(drop.x) - 12, drop.y + drop.vy); drop.life--;
    if (Math.hypot(drop.x - p.x, drop.y - (p.y - 25)) < 30) {
      if (drop.kind === 'bag') { arena.bagTimer = 240; arena.swing = 0; p.throwTimer = 0; }
      else if (drop.kind !== 'tender') { arena.weapon = drop.kind; arena.uses = 3; arena.swing = 0; }
      drop.life = 0;
    }
  }
  arena.drops = arena.drops.filter(d => d.life > 0);
  p.invulnerable = Math.max(0, p.invulnerable - 1);
  p.throwTimer = Math.max(0, p.throwTimer - 1);
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
  if (p.jumpBuffer > 0 && p.grounded) jumpBossPlayer(arena);
  if (!b.attack) {
    b.facing = p.x >= b.x ? 1 : -1;
    if (Math.abs(p.x - b.x) > 42) b.x += b.facing * 2.2;
    b.cooldown = Math.max(0, b.cooldown - 1);
    if (!b.cooldown && Math.abs(p.x - b.x) < 270) {
      b.attack = 48; b.hit = false; b.arm = random() < 0.5 ? 0 : 1;
      b.uppercut = Math.abs(p.x - b.x) < 85; b.aimY = p.y - 35;
    }
  } else { b.attack--; if (!b.attack) b.cooldown = 65; }
  const rawBossFloor = arena.heightAt(b.x);
  const bossFloor = Number.isFinite(rawBossFloor) ? rawBossFloor : arena.safeHeightAt(b.x);
  b.hopTimer--;
  if (b.grounded && b.hopTimer <= 0 && !b.attack) {
    b.grounded = false; b.vy = -6.5; b.hopTimer = 45 + Math.floor(random() * 40);
  }
  if (b.grounded) b.y = bossFloor;
  else {
    b.vy += 0.45; b.y += b.vy;
    if (b.vy >= 0 && b.y >= bossFloor) { b.y = bossFloor; b.vy = 0; b.grounded = true; }
  }
  const glove = bossGlovePose(b);
  const gloveX = b.x + b.facing * glove.x;
  const gloveY = b.y + glove.y;
  const contact = b.attack > 8 && b.attack < 30 && Math.abs(gloveX - p.x) < 28 && gloveY > p.y - 65 && gloveY < p.y;
  // Standing next to or passing the boss is safe; only the attacking glove hurts.
  if (p.invulnerable === 0 && contact && !b.hit) {
    p.lives--; p.invulnerable = 90; b.hit = true;
    p.x = Math.max(arena.left, Math.min(arena.right, p.x + b.facing * 25));
  }
  for (const c of arena.cases) {
    const previousX = c.x;
    c.x += c.vx; c.y += c.vy; c.vy += 0.045; c.life--;
    if (Math.min(previousX, c.x) <= b.x + 22 && Math.max(previousX, c.x) >= b.x - 22 && c.y > b.y - 85 && c.y < b.y) {
      b.health = Math.max(0, b.health - 10); c.life = 0;
    }
  }
  arena.cases = arena.cases.filter(c => c.life > 0 && c.x > arena.left - 60 && c.x < arena.right + 60 && c.y < arena.heightAt(c.x) + 180);
  if (p.lives <= 0) arena.result = 'lose';
  else if (b.health <= 0) arena.result = 'win';
};