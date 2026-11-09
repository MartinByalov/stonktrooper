// Browser game module for scoring.
import type { Animal, Swan } from './types';
export const activityMultiplier = (printer: number, hawk: number) => printer > 0 ? 10 : hawk > 0 ? 2 : 1;
export const enemyPips = (enemy: Animal | Swan): number => 'type' in enemy
  ? enemy.type === 'whale' ? 500 : enemy.mount ? 100 : 50
  : enemy.kind === 'pigeon' || enemy.kind === 'hawk' ? 150 : 200;