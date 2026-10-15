import type { Swan } from './types';

// Player coordinates are at the feet; bird coordinates are at the body center.
export function lethalBirdContact(bird: Swan, player: { x: number; y: number; previousY?: number }): boolean {
  if (bird.dead || bird.dying || bird.kind === 'white') return false;
  const previousY = player.previousY ?? player.y;
  return Math.abs(bird.x - player.x) < 30
    && bird.y + 16 > Math.min(previousY, player.y) - 48
    && bird.y - 16 < Math.max(previousY, player.y);
}