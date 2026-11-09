import type { Animal, Candle, Swan } from './types';
import { trackHeightAt } from './track';
import { actionArmPose } from './characterPose';

export const FEDORA_DURATION = 600;
export const FEDORA_WINDUP = 10;
export const FEDORA_MAX_THROWS = 3;
export const FEDORA_HAT_CHANCE = 0.35;

export function fedoraBossHit(boss: { health: number; fedoraHats: number }, roll: number): 'hat' | 'damage' {
  if (roll < FEDORA_HAT_CHANCE) { boss.fedoraHats++; return 'hat'; }
  boss.health = Math.max(0, boss.health - 8);
  return 'damage';
}

// Each pickup adds its full duration instead of replacing unused time.
export function addFedoraTime(remaining: number): number {
  return Math.max(0, remaining) + FEDORA_DURATION;
}

// Each remaining pickup's duration contributes a hat; a thrown hat leaves the stack until caught.
export function weaponHatCount(remainingTime: number, windup = 0, flying = false): number {
  return Math.max(0, Math.ceil(remainingTime / FEDORA_DURATION) - (windup > 0 || flying ? 1 : 0));
}

// Each impact has a 35% chance to decorate the struck character, including riders and mounts.
export function fedoraHit(enemy: Animal | Swan, roll: number, mountHit = false): 'hat' | 'kill' {
  if (roll < FEDORA_HAT_CHANCE) {
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

// Reach to the scalp, draw back, then extend forward within natural arm reach.
export function fedoraArmPose(windup: number): { elbowX: number; elbowY: number; handX: number; handY: number } {
  if (windup <= 0) return { elbowX: -4, elbowY: -23, handX: -9, handY: -12 };
  const progress=Math.max(0,Math.min(1,1-windup/FEDORA_WINDUP));
  const ease=(t:number)=>t*t*(3-2*t);
  const t=ease(progress<.4?progress/.4:(progress-.4)/.6);
  const target=progress<.4?{x:3-7*t,y:-46+18*t}:{x:-4+19*t,y:-28};
  const arm=actionArmPose(true,target);
  return {elbowX:arm.elbow.x,elbowY:arm.elbow.y,handX:arm.hand.x,handY:arm.hand.y};
}

export function fedoraReleasePose() {
  return fedoraArmPose(.000001);
}

export interface FlyingFedora {
  x: number;
  y: number;
  angle: number;
  returning: boolean;
  hitTargets?: Set<Animal | Swan>;
  hitBoss?: object;
}

// The hat hugs the candle tops instead of following a ballistic arc.
export function stepFlyingFedora(hat: FlyingFedora, playerX: number, candles: Candle[], candleWidth: number, rightEdge: number): boolean {
  // Follow the current price-axis divider as the camera scrolls.
  const turnX = rightEdge;
  if (!hat.returning && hat.x >= turnX) hat.returning = true;
  hat.x = hat.returning ? hat.x - 24 : Math.min(turnX, hat.x + 24);
  const targetY = trackHeightAt(candles, hat.x, candleWidth, hat.y + 32) - 32;
  hat.y += Math.max(-32, Math.min(32, targetY - hat.y));
  hat.angle += 0.4;
  if (!hat.returning && hat.x >= turnX) hat.returning = true;
  return hat.returning && hat.x <= playerX + 20;
}