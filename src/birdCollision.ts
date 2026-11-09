import type { Swan } from './types';
import { canStompEnemy } from './gameRules';

export const BIRD_CONTACT_RADIUS = 30;

// Use the same horizontal footprint as lethal contact, and sweep both actors.
export function canStompBird(bird: Swan, player: { x: number; y: number; previousY: number }): boolean {
  return !bird.dead && !bird.dying && bird.kind !== 'white'
    && canStompEnemy(player, bird.x, bird.y - 16, (bird.previousY ?? bird.y) - 16, BIRD_CONTACT_RADIUS);
}

// Player coordinates are at the feet; bird coordinates are at the body center.
export function lethalBirdContact(bird: Swan, player: { x: number; y: number; previousY?: number }): boolean {
  if (bird.dead || bird.dying || bird.kind === 'white') return false;
  const previousY = player.previousY ?? player.y;
  return Math.abs(bird.x - player.x) < BIRD_CONTACT_RADIUS
    && bird.y + 16 > Math.min(previousY, player.y) - 48
    && bird.y - 16 < Math.max(previousY, player.y);
}