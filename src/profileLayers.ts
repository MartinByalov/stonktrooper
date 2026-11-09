// Back-to-front order is anatomy, not a cosmetic setting. Both menu and game
// use this pass so the entire left arm (including its palm) is behind the hips.
export function drawProfileBackLayers(drawLeftArm: () => void, drawLegs: () => void): void {
  drawLeftArm();
  drawLegs();
}