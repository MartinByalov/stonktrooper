import type { BossArena } from './boxingRules';
export const JANET_SCALE = 0.90;

// Coordinates are world-sized and shared by attack collision and rendering.
export function janetAttackPose(b: BossArena['boss']): { x: number; y: number } {
  const neck = b.attackKind === 'neck';
  const duration = neck ? 48 : 32;
  const reach = b.attack > 0 ? Math.max(0, Math.sin((duration - b.attack) / duration * Math.PI)) : 0;
  return { x: ((neck ? 19 : 22) + reach * (neck ? 175 : 16)) * JANET_SCALE,
    y: (neck ? -57 * JANET_SCALE + (b.aimY - (b.y - 57 * JANET_SCALE)) * reach
      : (-38 - 5 * reach) * JANET_SCALE) };
}

export function stepJanet(arena: BossArena): void {
  const b = arena.boss, p = arena.player;
  const previousX = b.x;
  if (!b.attack) {
    b.facing = p.x >= b.x ? 1 : -1;
    if (Math.abs(p.x - b.x) > 52) b.x = Math.max(arena.left, Math.min(arena.right, b.x + b.facing * 1.7));
    b.cooldown = Math.max(0, b.cooldown - 1);
    if (!b.cooldown) {
      const next = b.attackCount + 1;
      const kind = next % 5 === 0 ? 'spin' : next % 3 === 0 ? 'neck' : 'punch';
      if (kind !== 'punch' || Math.abs(p.x - b.x) < 100) {
        b.attackCount = next; b.attackKind = kind;
        b.attack = kind === 'spin' ? 90 : kind === 'neck' ? 48 : 32;
        b.hit = false; b.uppercut = false; b.aimY = p.y - 35;
      }
    }
  } else {
    b.attack--;
    if (b.attackKind === 'spin' && b.attack <= 72 && b.attack > 0) {
      // Committed charge: the hero can dodge by jumping or moving behind it.
      b.x += b.facing * 8.5; b.spinAngle += b.facing * 0.65;
      if (b.x <= arena.left || b.x >= arena.right) {
        b.x = Math.max(arena.left, Math.min(arena.right, b.x)); b.facing *= -1;
      }
    }
    if (!b.attack) {
      b.cooldown = b.attackKind === 'punch' ? 18 : b.attackKind === 'neck' ? 48 : 85;
      if (b.attackKind === 'punch') b.arm = 1 - b.arm;
    }
  }
  b.moving = b.x !== previousX && !(b.attackKind === 'spin' && b.attack > 0);
  if (b.moving) b.walkPhase += Math.abs(b.x - previousX) * 0.16;
  const rawFloor = arena.heightAt(b.x);
  const safeFloor = arena.safeHeightAt(b.x);
  const floor = Number.isFinite(rawFloor) ? rawFloor : Number.isFinite(safeFloor) ? safeFloor : b.y;
  // Look ahead during the spin and hop across gaps without ever falling in.
  const gapAhead = b.attackKind === 'spin' && b.attack > 0
    && [0, 18, 36, 54].some(offset => !Number.isFinite(arena.heightAt(b.x + b.facing * offset)));
  if (b.grounded && gapAhead) { b.grounded = false; b.vy = -7; }
  if (b.grounded) b.y = floor;
  else {
    b.vy += 0.45; b.y += b.vy;
    if (b.vy >= 0 && b.y >= floor) { b.y = floor; b.vy = 0; b.grounded = true; }
  }
}