// Back-to-front order is anatomy, so menu and game share this pass, with the left arm behind.
export function drawProfileBackLayers(drawLeftArm: () => void, drawLegs: () => void): void {
  drawLeftArm();
  drawLegs();
}