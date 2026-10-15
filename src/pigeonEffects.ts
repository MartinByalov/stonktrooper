// Browser game module for pigeonEffects.
export interface PigeonDrop { x: number; y: number; vx: number; vy: number; life: number; impactFrames?: number }

export const pigeonFlightY = (cameraY: number, tapeHeight: number, phase: number, lane: number): number =>
  cameraY + tapeHeight + 90 + lane * 100 + Math.sin(phase * 0.45) * 38;

export const stepPigeonDrop = (drop: PigeonDrop, headX: number, headY: number): boolean => {
  if (drop.impactFrames !== undefined) {
    const remaining = Math.max(1, drop.impactFrames);
    // Track the actual hat throughout the visible flight, including jumps and
    // inverted printer sections. The last step lands exactly on the target.
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