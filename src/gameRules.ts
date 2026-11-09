// Browser game module for gameRules.
export const WHALE_BANKNOTE_CHANCE = 0.05;
export const PIGEON_PRINTER_CHANCE = 1; // Temporary guaranteed drop for gameplay testing.
export const pigeonDropsPrinter = (roll: number): boolean => roll < PIGEON_PRINTER_CHANCE;
export const printerTrackOffset = (x: number): number => Math.sin(x / 90) * 65;
export const BAG_PIPS_PENALTY = 100;
export const bagDrainPenalty = (previousRaw: number, currentRaw: number, penalty: number, drain: number): number =>
  Math.min(currentRaw, penalty + Math.max(0, currentRaw - previousRaw) + drain);
export const APE_DURATION = 600;
export const APE_THROW_INTERVAL = 45;

// Arcade profit, not a real-world trading P&L formula.
export const arcadeProfit = (pips: number, currentPrice: number): number =>
  Math.round(Math.max(0, pips) * Math.max(0, currentPrice) * 100) / 100;
export const ROCKET_SPEED_MULTIPLIER = 1.7;

export const dismountRider = (enemy: import('./types').Animal): import('./types').Animal | null => {
  if (!enemy.mount) return null;
  const rider = {
    ...enemy, mount: undefined, mountFedoraHats: undefined, aimedHits: 0, dying: true, dead: false,
    feet: enemy.feet - (enemy.mount === 'whale' ? 55 : 38), y: enemy.feet - (enemy.mount === 'whale' ? 85 : 68),
    dieTimer: 60, dieVx: 2.5, dieVy: -5, dieAngle: 0,
    attackHit: true,
  };
  enemy.type = enemy.mount;
  enemy.fedoraHats = enemy.mountFedoraHats;
  enemy.mountFedoraHats = undefined;
  enemy.mount = undefined;
  enemy.aimedHits = 0;
  enemy.y = enemy.feet - 30;
  enemy.attackTimer = 0;
  enemy.attackHit = false;
  return rider;
};

export const aimedHitDefeatsEnemy = (enemy: { mount?: 'bear' | 'bull' | 'whale'; aimedHits?: number }): boolean => {
  enemy.aimedHits = (enemy.aimedHits ?? 0) + 1;
  return enemy.aimedHits >= (enemy.mount ? 2 : 1);
};

// The terrain makes the bell challenging to reach; contact must not depend on
// jump counters or velocity, which can be reset by landing before pickups run.
export const canCatchBossBell = (rocketTimer: number, distance: number): boolean =>
  rocketTimer <= 0 && distance < 26;

// Continuous lower candles beneath the bell, with irregular steps rather than a gap.
export const bellDescentTop = (launchTop: number, step: number, roll: number): number =>
  launchTop + Math.min(step, 28) / 28 * 180 + (roll - 0.5) * Math.min(step * 2, 24);
export const enemyMovementSpeed = (type: 'bull' | 'bear' | 'whale', charging: boolean, mounted: boolean): number => {
  const base = type === 'bull' ? (charging ? 2.4 : 1.5) : (charging ? 1.6 : 0.9);
  return base * (mounted ? 1.5 : 1);
};

// Grounded runners follow connected steps; airborne runners use swept landing.
export const canLandOnTrack = (air: boolean, velocity: number, previousY: number, y: number, top: number): boolean =>
  !air || (velocity >= 0 && previousY <= top + 20 && y >= top - 4);

export const canRecoverSolidLanding = (barrier: boolean | undefined, velocity: number, feet: number, top: number, crossedGap = false): boolean =>
  !crossedGap && !barrier && velocity >= 0 && feet >= top;

// Refresh the extra-jump charge on every landing; a previous yellow zone must
// not grant a double jump after landing on unmarked ground.
export const doubleJumpChargeOnLanding = (candles: readonly { hole?: boolean; sp?: boolean }[], first: number, last: number): boolean =>
  candles.slice(first, last + 1).some(candle => candle && !candle.hole && candle.sp);

export const whaleDropsBanknote = (roll: number): boolean => roll < WHALE_BANKNOTE_CHANCE;

export const isBlockedByTallCandle = (barrier: boolean | undefined, feetY: number, top: number): boolean =>
  !!barrier && feetY > top + 4;

// Relative swept feet/head contact also handles enemies moving vertically on the chart.
export const canStompEnemy = (player: { x: number; y: number; previousY: number },
  enemyX: number, top: number, previousTop: number, radius: number): boolean =>
  Math.abs(enemyX - player.x) < radius
  && player.y > player.previousY
  && player.previousY <= previousTop + 5
  && player.y >= top;

// Only the enemy whose hit was absorbed may pass through; no global invulnerability.
export const absorbEnemyHit = (player: { carry: number; shieldKind?: string }, enemy: { shieldPassed?: boolean }): boolean => {
  if (enemy.shieldPassed) return true;
  if (player.carry <= 0 || player.shieldKind === 'bag') return false;
  player.carry = 0;
  enemy.shieldPassed = true;
  return true;
};