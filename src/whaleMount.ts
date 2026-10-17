import type { Animal, Candle } from './types';
import { animalTrackHeightAt, trackHeightAt } from './track';

export const WHALE_MOUNT_CHANCE = 0.30;
export const WHALE_MOUNT_DURATION = 480; // Eight seconds at 60 simulation ticks per second.
export const WHALE_SEAT_HEIGHT = 40;
export const WHALE_SPEED_MULTIPLIER = 1.15;
export interface WhaleMount { timer: number; feet: number; previousFeet: number; vy: number; jumps?: number; launchFeet?: number; phase?: number; bags?: number }

// Swept underside contact: only a descent from above counts as a stomp.
// No automatic bounce or extra jump charge is granted by hitting an enemy.
export function whaleStompsEnemy(mount: WhaleMount, x: number, enemyX: number, top: number, radius: number): boolean {
  return Math.abs(enemyX - x) < radius
    && mount.feet > mount.previousFeet
    && mount.previousFeet <= top + 5 && mount.feet >= top;
}

const WHALE_GRAVITY = 0.35;
const NORMAL_JUMP_HEIGHT = 9.2 * 9.2 / (2 * WHALE_GRAVITY);

// Jump heights are measured from the initial takeoff, not from the second
// button press. The second press reaches 4x a held normal jump in total.
export function jumpWhaleMount(mount: WhaleMount): boolean {
  const jumps = mount.jumps ?? 0;
  if (jumps >= 2) return false;
  if (jumps === 0) mount.launchFeet = mount.feet;
  const target = (mount.launchFeet ?? mount.feet) - NORMAL_JUMP_HEIGHT * (jumps === 0 ? 2 : 4);
  const rise = Math.max(0, mount.feet - target);
  // Semi-implicit integration applies gravity before movement each tick.
  mount.vy = -(Math.sqrt(2 * WHALE_GRAVITY * rise) + WHALE_GRAVITY / 2);
  mount.jumps = jumps + 1;
  return true;
}

export function canMountWhale(special: boolean, roll: number): boolean {
  // Increasing run difficulty is not a separate game mode.
  return !special && roll >= 0 && roll < WHALE_MOUNT_CHANCE;
}

export const WHALE_CONTACT_RADIUS = 65;

export function touchesWhale(
  player: { x: number; y: number; previousY: number },
  whale: Pick<Animal, 'x' | 'feet' | 'previousFeet'>,
): boolean {
  const previousFeet = whale.previousFeet ?? whale.feet;
  const relativeBefore = player.previousY - previousFeet;
  const relativeNow = player.y - whale.feet;
  // Any overlapping or swept body contact, including the side and underside.
  return Math.abs(whale.x - player.x) < WHALE_CONTACT_RADIUS
    && Math.max(relativeBefore, relativeNow) >= -60
    && Math.min(relativeBefore, relativeNow) <= 48;
}

export function stepWhaleMount(mount: WhaleMount, candles: Candle[], x: number, width: number): void {
  mount.previousFeet = mount.feet;
  mount.phase = (mount.phase ?? 0) + 0.16;
  mount.timer--;
  const ground = trackHeightAt(candles, x, width, mount.feet);
  if ((mount.jumps ?? 0) > 0 || mount.vy !== 0) {
    mount.vy += WHALE_GRAVITY;
    mount.feet += mount.vy;
    if (mount.vy > 0 && mount.feet >= ground) {
      mount.feet = ground; mount.vy = 0; mount.jumps = 0; mount.launchFeet = undefined;
    }
  } else {
    mount.feet = animalTrackHeightAt('whale', candles, x, width, ground);
  }
}