import type { Animal, Briefcase, Player, Swan } from './types';

export function nearestHawkEnemy(player: Pick<Player, 'x' | 'y'>, enemies: readonly (Animal | Swan)[]): Animal | Swan | undefined {
  let nearest: Animal | Swan | undefined;
  let distance = Infinity;
  for (const enemy of enemies) {
    if (enemy.dead || enemy.dying) continue;
    const candidate = Math.hypot(enemy.x - player.x, enemy.y - (player.y - 24));
    if (candidate < distance) { nearest = enemy; distance = candidate; }
  }
  return nearest;
}

// Keep the chosen enemy locked through windup and motion, rather than mouse aim.
export function steerHawkBag(bag: Briefcase, player: Pick<Player, 'x' | 'y'>, enemies: readonly (Animal | Swan)[]): void {
  if (!bag.target || bag.target.dead || bag.target.dying || !enemies.includes(bag.target)) {
    bag.target = nearestHawkEnemy(player, enemies);
  }
  if (!bag.target) return;
  const dx = bag.target.x - bag.x;
  const dy = bag.target.y - bag.y;
  const distance = Math.hypot(dx, dy);
  // Reach distant targets before expiry without overshooting nearby ones.
  const speed = Math.min(distance, Math.max(bag.homingSpeed ?? 14, distance / Math.max(1, bag.life - 5)));
  bag.vx = distance > 0 ? dx / distance * speed : 0;
  bag.vy = distance > 0 ? dy / distance * speed : 0;
}

// Shared local pose keeps the held bag and its release point in sync.
export function hawkBagThrowPose(timer: number, direction = 1, hats = 0) {
  const elapsed = 16 - Math.max(0, Math.min(16, timer));
  const swing = Math.min(1, elapsed / 8);
  const recovery = Math.max(0, (elapsed - 8) / 8);
  const clearance = Math.max(0, hats - 1) * 10;
  const bagX = 8 + direction * (-12 + 36 * swing);
  const bagY = -78 - clearance + 10 * swing;
  return {
    bagX, bagY,
    holding: timer > 8,
    farHandX: bagX - direction * 6,
    nearHandX: bagX + direction * 6,
    handY: bagY + 8 + recovery * (27 + clearance),
    elbowX: 8 + direction * (-20 + 44 * swing),
    elbowY: -52 - clearance * 0.5 + recovery * (14 + clearance * 0.5),
  };
}