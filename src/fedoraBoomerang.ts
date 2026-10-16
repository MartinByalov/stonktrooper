import type { Animal, Candle, Swan } from './types';
import { trackHeightAt } from './track';

export const FEDORA_DURATION = 600;
export const FEDORA_WINDUP = 10;
export const FEDORA_MAX_THROWS = 3;

// Each pickup adds its full duration instead of replacing unused time.
export function addFedoraTime(remaining: number): number {
  return Math.max(0, remaining) + FEDORA_DURATION;
}

// Each remaining pickup's duration contributes a hat; a thrown hat leaves the stack until caught.
export function weaponHatCount(remainingTime: number, windup = 0, flying = false): number {
  return Math.max(0, Math.ceil(remainingTime / FEDORA_DURATION) - (windup > 0 || flying ? 1 : 0));
}

// Each impact decorates the struck character half the time, including riders and mounts.
export function fedoraHit(enemy: Animal | Swan, roll: number, mountHit = false): 'hat' | 'kill' {
  if (roll < 0.5) {
    if (mountHit && 'type' in enemy && enemy.mount) enemy.mountFedoraHats = (enemy.mountFedoraHats ?? 0) + 1;
    else enemy.fedoraHats = (enemy.fedoraHats ?? 0) + 1;
    return 'hat';
  }
  return 'kill';
}

// Mounted heads occupy different heights; classify a swept hit against each body separately.
export function fedoraHitsMount(enemy: Animal, riderDistance: number, mountDistance: number): boolean {
  return !!enemy.mount && mountDistance < (enemy.mount === 'whale' ? 45 : 32)
    && (riderDistance >= 26 || mountDistance < riderDistance);
}

// A lethal hit to the mount separates the rider instead of killing both characters.
export function separateFedoraMount(enemy: Animal): Animal {
  const mount = enemy.mount!;
  const rider: Animal = { ...enemy, mount: undefined, mountFedoraHats: undefined,
    feet: enemy.feet - (mount === 'whale' ? 55 : 38),
    y: enemy.feet - (mount === 'whale' ? 85 : 68), aimedHits: 0, attackTimer: 0, attackHit: false };
  enemy.type = mount;
  enemy.mount = undefined;
  enemy.fedoraHats = enemy.mountFedoraHats;
  enemy.mountFedoraHats = undefined;
  enemy.aimedHits = 0;
  enemy.attackTimer = 0;
  enemy.attackHit = false;
  return rider;
}

// Take the fedora from the head, lower it to the belly, then throw it forward.
export function fedoraArmPose(windup: number): { elbowX: number; elbowY: number; handX: number; handY: number } {
  if (windup <= 0) return { elbowX: -4, elbowY: -23, handX: -9, handY: -12 };
  const progress = 1 - windup / FEDORA_WINDUP;
  if (progress < 0.35) {
    const grab = progress / 0.35;
    return {
      elbowX: 4 - 4 * grab,
      elbowY: -40 + 20 * grab,
      handX: 5 - 9 * grab,
      handY: -48 + 28 * grab,
    };
  }
  const throwProgress = (progress - 0.35) / 0.65;
  return {
    elbowX: -4 + 16 * throwProgress,
    elbowY: -20 + 2 * throwProgress,
    handX: -4 + 42 * throwProgress,
    handY: -20 + 8 * throwProgress,
  };
}

export interface FlyingFedora {
  x: number;
  y: number;
  angle: number;
  returning: boolean;
  hitTargets?: Set<Animal | Swan>;
}

// The hat hugs the candle tops instead of following a ballistic arc.
export function stepFlyingFedora(hat: FlyingFedora, playerX: number, candles: Candle[], candleWidth: number, rightEdge: number): boolean {
  if (!hat.returning && hat.x >= rightEdge - 18) hat.returning = true;
  hat.x = hat.returning ? hat.x - 24 : Math.min(rightEdge - 18, hat.x + 24);
  const targetY = trackHeightAt(candles, hat.x, candleWidth, hat.y + 32) - 32;
  hat.y += Math.max(-32, Math.min(32, targetY - hat.y));
  hat.angle += 0.4;
  if (!hat.returning && hat.x >= rightEdge - 18) hat.returning = true;
  return hat.returning && hat.x <= playerX + 20;
}