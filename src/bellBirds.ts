import type { Swan } from './types';
import type { BossArena } from './boxingRules';
import { lethalBirdContact } from './birdCollision';
import { stepPigeonDrop } from './pigeonEffects';
import { swanBagPose } from './swanBag';

export type BellBird = Swan & { bellLootDropped?: boolean };

export function stepBellBirds(arena: BossArena, random: () => number): void {
  const p = arena.player;
  if (arena.frame >= arena.nextBird && arena.birds.length < 3) {
    arena.nextBird = arena.frame + 180 + Math.floor(random() * 360);
    const kind = (['swan', 'hawk', 'pigeon'] as const)[Math.floor(random() * 3)];
    const cargo = random() < 0.25
      ? (['bull', 'bear', 'whale'] as const)[Math.floor(random() * 3)] : undefined;
    arena.birds.push({ kind, cargo, cargoFlight: !!cargo, cargoRolled: true,
      x: arena.right + 60, y: p.y - 220, baseY: p.y - 220, phase: 0, dead: false });
  }
  for (const bird of arena.birds) {
    if (bird.dead || bird.dying) continue;
    bird.x -= 3; bird.phase += 0.12;
    const releaseX = Math.max(arena.left, Math.min(arena.right, bird.x));
    const canDrop = bird.x <= p.x + 160 && bird.x >= arena.left && bird.x <= arena.right
      && Number.isFinite(arena.heightAt(releaseX));
    // Every species can deliver an enemy or a pickup, independently of its special effect.
    if (!bird.bellLootDropped && canDrop) {
      bird.bellLootDropped = true;
      if (bird.cargo) {
        const feet = bird.y + 84;
        arena.animals.push({ type: bird.cargo, x: releaseX, feet,
          y: feet - 30, phase: 0, dead: false, dropVelocity: 1 });
        bird.cargo = undefined;
      } else {
        const roll = random();
        const kind = roll < 0.45 ? 'life' : roll < 0.725 ? 'bat' : 'chainsaw';
        arena.drops.push({ x: releaseX, y: bird.y + 18, vy: 0, kind, life: 900 });
      }
    }
    if (bird.kind === 'hawk' && !bird.cargo && bird.x < p.x + 260 && !bird.shieldPassed) {
      bird.targetY = p.y - 35;
      bird.y += Math.max(-5, Math.min(5, bird.targetY - bird.y));
    } else {
      const target = bird.baseY + Math.sin(bird.phase) * 5;
      bird.y += Math.max(-5, Math.min(5, target - bird.y));
    }
    const contact = lethalBirdContact(bird, p);
    if (contact && p.invulnerable === 0) {
      p.lives = Math.max(0, p.lives - 1); p.invulnerable = 90;
    }
    if (bird.kind === 'hawk' && !bird.shieldPassed && contact) {
      bird.shieldPassed = true; p.clownHead = true;
      arena.popups.push({ x: p.x, y: p.y - 75, text: 'KEK', life: 70 });
    }
    if (bird.kind === 'pigeon' && !bird.soiledHat && Math.abs(bird.x - p.x) < 18) {
      bird.soiledHat = true;
      arena.pigeonDrops.push({ x: bird.x, y: bird.y + 18, vx: 0, vy: 1.5, life: 180, impactFrames: 30 });
    }
    if (bird.kind === 'swan' && !bird.lootRolled && !bird.cargo && bird.x <= p.x + 40) {
      bird.lootRolled = true;
      const bag = swanBagPose();
      arena.drops.push({ x: bird.x + bag.x, y: bird.y + bag.y, vy: 0, kind: 'bag', life: 900 });
    }
  }
  arena.birds = arena.birds.filter(bird => !bird.dead && bird.x > arena.left - 100);
  for (const drop of arena.pigeonDrops) {
    if (stepPigeonDrop(drop, p.x, p.y - 56)) {
      drop.life = 0; p.soiledHead = true;
      arena.popups.push({ x: p.x, y: p.y - 75, text: 'SPLAT!', life: 60 });
    }
  }
  arena.pigeonDrops = arena.pigeonDrops.filter(drop => drop.life > 0);
}