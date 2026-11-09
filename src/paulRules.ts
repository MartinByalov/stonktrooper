import type { BossArena } from './boxingRules';

type Boss = BossArena['boss'];

// World-sized offsets used by both the renderer and collision detection.
export function paulHookPose(b: Boss): { x: number; y: number } {
  if (b.attackKind !== 'hook' || b.attack <= 0) return { x: 23, y: -44 };
  const elapsed = 44 - b.attack;
  if (elapsed < 16) return { x: 23 - elapsed * 1.8, y: -44 - elapsed * 0.35 };
  const arc = Math.min(1, (elapsed - 16) / 18) * Math.PI;
  return { x: -6 + 57 * Math.sin(arc), y: -48 + 16 * Math.cos(arc) };
}

export function paulTailPose(b: Boss): { x: number; y: number; sweep: number } {
  const elapsed = 60 - b.attack;
  const sweep = b.attackKind === 'tail' && b.attack > 0
    ? Math.max(0, Math.sin(Math.max(0, elapsed - 18) / 42 * Math.PI)) : 0;
  return { x: (-48 + 250 * sweep) * b.attackReachScale, y: -28 - 9 * sweep, sweep };
}

export function paulAttackContact(b: Boss, p: BossArena['player']): boolean {
  if (b.attackKind === 'chase') {
    return b.attack > 0 && b.attack <= 78 && Math.abs(b.x - p.x) < 43
      && b.y > p.y - 55 && b.y - 39 < p.y;
  }
  if (b.attackKind === 'hook') {
    const pose = paulHookPose(b);
    return b.attack <= 28 && b.attack >= 10 && Math.abs(b.x + b.facing * pose.x - p.x) < 24
      && b.y + pose.y > p.y - 65 && b.y + pose.y < p.y;
  }
  if (b.attackKind === 'tail' && b.attack <= 36 && b.attack >= 12) {
    const tip = paulTailPose(b);
    const root = { x: -13, y: -28 };
    const px = (p.x - b.x) * b.facing, py = p.y - 30 - b.y;
    const dx = tip.x - root.x, dy = tip.y - root.y;
    const t = Math.max(0, Math.min(1, ((px - root.x) * dx + (py - root.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - root.x - dx * t, py - root.y - dy * t) < 25;
  }
  return false;
}

export function stepPaul(arena: BossArena): void {
  const b = arena.boss, p = arena.player, previousX = b.x;
  if (!b.attack) {
    b.facing = p.x >= b.x ? 1 : -1;
    const distance = Math.abs(p.x - b.x);
    b.cooldown = Math.max(0, b.cooldown - 1);
    if (!b.cooldown) {
      b.attackKind = distance < 88 ? 'hook' : distance < 260 ? 'tail' : 'chase';
      b.attack = b.attackKind === 'hook' ? 44 : b.attackKind === 'tail' ? 60 : 96;
      b.attackCount++; b.hit = false; b.aimY = p.y - 35;
    } else if (distance > 60) b.x += b.facing * Math.min(1.8, distance - 60);
  } else {
    b.attack--;
    if (b.attackKind === 'chase' && b.attack <= 78 && b.attack > 0) {
      const distance = Math.abs(p.x - b.x);
      if (distance > 40 && (p.x - b.x) * b.facing > 0) b.x += b.facing * Math.min(7.6, distance - 40);
      // No instant turnarounds: jumping over him is a way to dodge the charge.
      if ((p.x - b.x) * b.facing < 0 || distance <= 40) b.attack = Math.min(b.attack, 12);
    }
    if (!b.attack) {
      b.cooldown = b.attackKind === 'hook' ? 24 : b.attackKind === 'tail' ? 50 : 65;
      if (b.attackKind === 'hook') b.arm = 1 - b.arm;
    }
  }
  b.x = Math.max(arena.left, arena.bossLeft, Math.min(arena.right, arena.bossRight, b.x));
  b.moving = b.x !== previousX;
  if (b.moving) b.walkPhase += Math.abs(b.x - previousX) * 0.17;
  const rawFloor = arena.heightAt(b.x), safeFloor = arena.safeHeightAt(b.x);
  const floor = Number.isFinite(rawFloor) ? rawFloor : Number.isFinite(safeFloor) ? safeFloor : b.y;
  const gapAhead = b.attackKind === 'chase' && b.attack > 0
    && [0, 20, 40, 60].some(offset => !Number.isFinite(arena.heightAt(b.x + b.facing * offset)));
  if (b.grounded && gapAhead) { b.grounded = false; b.vy = -7; }
  if (b.grounded) b.y = floor;
  else {
    b.vy += 0.45; b.y += b.vy;
    if (b.vy >= 0 && b.y >= floor) { b.y = floor; b.vy = 0; b.grounded = true; }
  }
}