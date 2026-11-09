// Browser game module for pigeonEffects.
export interface PigeonDrop { x: number; y: number; vx: number; vy: number; life: number; impactFrames?: number }

export const pigeonFlightY = (cameraY: number, tapeHeight: number, phase: number, lane: number, bounds?: { top: number; bottom: number }): number => {
  if (!bounds) return cameraY + tapeHeight + 90 + lane * 100 + Math.sin(phase * 0.45) * 38;
  const clearance = 58;
  const min = bounds.top + clearance, max = Math.max(min, Math.min(bounds.bottom - clearance, bounds.top + (bounds.bottom - bounds.top) * .42));
  const bob = Math.min(20, (max - min) / 4);
  return cameraY + min + bob + Math.max(0, Math.min(1, lane)) * Math.max(0, max - min - bob * 2) + Math.sin(phase * .45) * bob;
};

export const stepPigeonDrop = (drop: PigeonDrop, headX: number, headY: number): boolean => {
  if (drop.impactFrames !== undefined) {
    const remaining = Math.max(1, drop.impactFrames);
    // Track the actual hat through the visible flight, including jumps; the last step hits the target.
    drop.x += (headX - drop.x) / remaining;
    drop.y += (headY - drop.y) / remaining;
    drop.impactFrames = remaining - 1;
    drop.life--;
    return drop.impactFrames === 0;
  }
  const previousY = drop.y;
  drop.vy += 0.3;
  drop.x += drop.vx; drop.y += drop.vy; drop.life--;
  return drop.life > 0 && Math.abs(drop.x - headX) < 13 && previousY <= headY + 5 && drop.y >= headY - 5;
};