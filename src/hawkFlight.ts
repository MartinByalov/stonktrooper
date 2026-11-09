// Approach the runner's head lane smoothly, then commit so jumps can dodge it.
export function stepHawkFlight(
  hawk: { x: number; y: number; baseY: number; phase: number; targetY?: number; locked?: boolean },
  player: { x: number; y: number },
): void {
  hawk.x -= 2.2;
  hawk.phase += 0.12;
  if (!hawk.locked) {
    hawk.targetY = player.y - 85;
    if (hawk.x - player.x < 190) hawk.locked = true;
  }
  const target = hawk.targetY ?? hawk.baseY;
  hawk.baseY += Math.max(-2, Math.min(2, (target - hawk.baseY) * 0.05));
  hawk.y = hawk.baseY + Math.sin(hawk.phase) * 7;
}