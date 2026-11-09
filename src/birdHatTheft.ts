import type { Swan } from './types';
import { lethalBirdContact } from './birdCollision';

export type PlayerHat = 'default' | 'standard' | 'none';

export function restoreStolenHat(owner: { playerHat: PlayerHat; hatSoiled: boolean }, pickup: 'banana' | 'fedora'): void {
  if (owner.playerHat !== 'none') return;
  owner.playerHat = pickup === 'banana' ? 'default' : 'standard';
  owner.hatSoiled = false;
}

interface HatOwner {
  p: { x: number; y: number; previousY?: number; rocketTimer: number } | null;
  playerHat: PlayerHat;
  apeTimer: number;
  fedoraTimer: number;
  fedoraCount: number;
  fedoraWindup: number;
  flyingFedora: unknown;
  hatSoiled: boolean;
}

// A near miss is remembered on approach, but theft happens only after the
// bird clears the lethal horizontal range. Collision resolution takes priority.
export function tryBirdHatTheft(bird: Swan, owner: HatOwner): boolean {
  if (!owner.p || bird.dead || bird.dying || bird.stolenHat || bird.shieldPassed
    || bird.cargo || owner.p.rocketTimer > 0) return false;
  const dx = bird.x - owner.p.x;
  const nearHead = Math.abs(bird.y - (owner.p.y - 48)) <= 40;
  if (Math.abs(dx) <= 45 && nearHead && !lethalBirdContact(bird, owner.p)) {
    bird.hatNearMiss = true;
  }
  if (!bird.hatNearMiss || dx >= -30 || dx < -85 || !nearHead
    || lethalBirdContact(bird, owner.p)) return false;

  if (owner.fedoraTimer > 0) {
    bird.stolenHat = 'fedora';
    owner.fedoraTimer = 0;
    owner.fedoraCount = 0;
    owner.fedoraWindup = 0;
    owner.flyingFedora = null;
    owner.playerHat = 'standard';
  } else {
    if (owner.playerHat === 'none') return false;
    bird.stolenHat = owner.playerHat === 'default' && owner.apeTimer > 0 ? 'captain' : 'standard';
    owner.playerHat = 'none';
  }
  owner.hatSoiled = false;
  bird.isCharging = false;
  return true;
}