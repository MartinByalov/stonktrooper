// Browser game module for companions.
export interface ApeCompanion { timer: number; cooldown: number; throwTimer: number; direction: number }
export const MAX_APES = 2;
export const addCompanion = (apes: ApeCompanion[], duration: number): boolean => {
  if (apes.length >= MAX_APES) return false;
  apes.push({ timer: duration, cooldown: 0, throwTimer: 0, direction: 1 });
  return true;
};
export const tickCompanions = (apes: ApeCompanion[], rocket: boolean): ApeCompanion[] => {
  for (const ape of apes) {
    if (!rocket) ape.timer--;
    ape.cooldown = Math.max(0, ape.cooldown - 1);
    ape.throwTimer = Math.max(0, ape.throwTimer - 1);
  }
  return apes.filter(ape => ape.timer > 0);
};