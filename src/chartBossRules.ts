import type { BossArena } from './boxingRules';
import { alternatingPunchArm } from './jeromePunch';
export const BOSS_PLAYER_CLEARANCE = 48;

// Android's attack line is 3% of the plot behind the runner. Desktop uses a
// different camera anchor, so derive this from the player, not a fixed 17% line.
export const bossAttackBoundary = (playerX: number, cameraX: number, plotWidth: number, scaleX: number): number =>
  Math.max(cameraX, playerX - plotWidth * .03 / scaleX);

// Targets are relative to the runner, so chart scrolling never changes an AI
// destination or masquerades as the boss walking across the screen.
const chooseRoamTarget = (arena: BossArena, random: () => number, retreat: boolean): void => {
  const b = arena.boss, p = arena.player;
  const left = Math.max(arena.left, arena.bossLeft, p.x + BOSS_PLAYER_CLEARANCE);
  const right = Math.min(arena.right, arena.bossRight);
  const minimum = Math.min(right, retreat ? Math.max(left, p.x + 300) : left);
  let target = minimum + random() * Math.max(0, right - minimum);
  if (Math.abs(target - b.x) < 90) target = b.x < (minimum + right) / 2 ? right : minimum;
  b.roamOffset = target - p.x;
};

export function stepChartBoss(arena: BossArena, random: () => number): void {
  const b = arena.boss, p = arena.player;
  const left = Math.max(arena.left, arena.bossLeft, p.x + BOSS_PLAYER_CLEARANCE);
  const right = Math.max(left, Math.min(arena.right, arena.bossRight));
  const previousX = b.x;
  const moveTo = (target: number, speed: number) => {
    const destination = Math.max(left, Math.min(right, target));
    const delta = destination - b.x;
    if (Math.abs(delta) > 0.01) {
      b.facing = Math.sign(delta);
      b.x += Math.sign(delta) * Math.min(Math.abs(delta), speed);
    }
  };
  const beginAttack = () => {
    b.behavior = 'attack';
    b.facing = -1;
    b.attackKind = b.kind === 'janet' ? 'spin' : b.kind === 'paul' ? 'tail' : 'punch';
    b.attack = b.kind === 'janet' ? 90 : b.kind === 'paul' ? 60 : 48;
    if (b.kind === 'jerome') b.arm = alternatingPunchArm(b.attackCount);
    b.attackCount++;
    b.hit = false;
    b.uppercut = false;
    if (b.kind !== 'jerome') b.arm = 1 - b.arm;
    b.aimY = p.y - 35;
  };

  if (b.behavior === 'roam' || b.behavior === 'recover') {
    if (b.roamOffset === null) chooseRoamTarget(arena, random, b.behavior === 'recover');
    moveTo(p.x + b.roamOffset!, b.kind === 'paul' ? 2.6 : 2.2);
    if (Math.abs(b.x - (p.x + b.roamOffset!)) < 3) chooseRoamTarget(arena, random, false);
    b.behaviorTimer = Math.max(0, b.behaviorTimer - 1);
    if (!b.behaviorTimer) {
      if (b.behavior === 'recover') {
        b.behavior = 'roam';
        b.behaviorTimer = 45 + Math.floor(random() * 316);
      } else b.behavior = 'approach';
    }
  } else if (b.behavior === 'approach') {
    // Full extension passes slightly behind the runner (the 22% screen line).
    // Rendering and damage still use the same animated glove/tail geometry.
    const overshoot = Math.max(0, p.x - Math.max(arena.left, arena.bossLeft));
    const reach = b.kind === 'paul' ? 202 : 205;
    b.attackReachScale = Math.min(1, Math.max(0, right - left) / reach);
    const distance = b.kind === 'janet' ? 420 : reach * b.attackReachScale - overshoot;
    const target = Math.max(left, Math.min(right, p.x + distance));
    moveTo(target, b.kind === 'paul' ? 8 : b.kind === 'janet' ? 3.5 : 4);
    if (Math.abs(b.x - target) < 1 && b.grounded) beginAttack();
  } else {
    b.attack = Math.max(0, b.attack - 1);
    if (b.kind === 'janet' && b.attack <= 72 && b.attack > 0) {
      b.x += b.facing * 8.5;
      b.spinAngle += b.facing * 0.65;
      if (b.x <= left || b.x >= right) {
        b.x = Math.max(left, Math.min(right, b.x));
        b.facing *= -1;
      }
    }
    if (!b.attack) {
      b.behavior = 'recover';
      b.behaviorTimer = 45 + Math.floor(random() * 196);
      chooseRoamTarget(arena, random, true);
    }
  }

  b.x = Math.max(left, Math.min(right, b.x));
  const spinning = b.kind === 'janet' && b.behavior === 'attack';
  b.moving = b.x !== previousX && !spinning;
  if (b.moving) b.walkPhase += Math.abs(b.x - previousX) * 0.16;
  const rawFloor = arena.heightAt(b.x), safeFloor = arena.safeHeightAt(b.x);
  const floor = Number.isFinite(rawFloor) ? rawFloor : Number.isFinite(safeFloor) ? safeFloor : b.y;
  const gapAhead = b.x !== previousX && [0, 20, 40, 60].some(offset =>
    !Number.isFinite(arena.heightAt(b.x + b.facing * offset)));
  if (b.grounded && gapAhead) { b.grounded = false; b.vy = -7; }
  if (b.grounded) b.y = floor;
  else {
    b.vy += 0.45;
    b.y += b.vy;
    if (b.vy >= 0 && b.y >= floor) { b.y = floor; b.vy = 0; b.grounded = true; }
  }
}