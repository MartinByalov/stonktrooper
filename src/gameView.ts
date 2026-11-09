import type { AimPoint } from './aim';

// Framing is a gameplay choice, calibrated in CSS pixels per world unit, not by device or DPR.
export const RUNNER_HEIGHT = 62;
export const MIN_VIEW_HEIGHT = 360;
export const MIN_PLOT_WIDTH = 650;
export const HERO_ZONE_FRACTION = .20;
export const BOSS_ATTACK_ZONE_FRACTION = .17;
// The hero line is also the boundary between jumping and shooting.
export const JUMP_ZONE_FRACTION = HERO_ZONE_FRACTION;
const DEFAULT_DISPLAY = { width: 1920, height: 840 };

export function gameView(display = DEFAULT_DISPLAY) {
  const valid = Number.isFinite(display.width) && Number.isFinite(display.height) && display.width > 0 && display.height > 0;
  const pixels = valid ? display : DEFAULT_DISPLAY;
  const axisPixels = Math.min(48, pixels.width * .08);
  // Readability grows gently on larger stages; extra space mostly reveals world.
  const runnerPixels = Math.min(64, Math.max(44, 44 * Math.sqrt(pixels.height / 312)));
  // On constrained screens keep jump clearance and approach distance, accepting a smaller runner.
  const scale = Math.min(runnerPixels / RUNNER_HEIGHT,
    pixels.height / MIN_VIEW_HEIGHT, (pixels.width - axisPixels) / MIN_PLOT_WIDTH);
  const height = pixels.height / scale;
  const width = pixels.width / scale;
  // Chrome is measured in CSS pixels, never in world-sized artwork units.
  const axisWidth = axisPixels / scale;
  const timeAxisHeight = 16 / scale;
  const right = width - axisWidth;
  const bottom = height - timeAxisHeight;
  return {
    width, height, scale, axisWidth, timeAxisHeight,
    priceFontSize: 11 / scale, timeFontSize: 10 / scale,
    left: 0, right, top: 0, bottom,
    heroX: right * HERO_ZONE_FRACTION, heroY: bottom * .62,
    spawnMargin: right * .08,
    displayWidth: pixels.width, displayHeight: pixels.height,
  };
}

export type GameView = ReturnType<typeof gameView>;
// Terrain following must never let a fast rocket or climb outrun the view; clearance in world units.
export function followCameraY(cameraY: number, feet: number, view: GameView, top = view.top): number {
  const smooth = cameraY + (feet - view.heroY - cameraY) * .08;
  return Math.max(feet - view.bottom + 120, Math.min(feet - top - 120, smooth));
}
export const worldBounds = (view: GameView, camera: AimPoint, top = view.top) => ({
  left: camera.x + view.left, right: camera.x + view.right,
  top: camera.y + top, bottom: camera.y + view.bottom,
});

export function clientToWorld(client: AimPoint, rect: { left: number; top: number; width: number; height: number }, view: GameView, camera: AimPoint, inverted = false, top = view.top): AimPoint {
  const x = (client.x - rect.left) / rect.width * view.width;
  const y = (client.y - rect.top) / rect.height * view.height;
  return { x: camera.x + x, y: camera.y + (inverted ? top + view.bottom - y : y) };
}

export const isJumpZone = (x: number, width: number, axisWidth: number): boolean =>
  x >= 0 && x < (width - axisWidth) * JUMP_ZONE_FRACTION;
// Android cargo/loot release waits until the carrier is in the actual field.
export function actorInPlayfield(x: number, y: number, cameraX: number, cameraY: number, bounds: {left:number;right:number;top:number;bottom:number}, margin = 0): boolean {
  return x-cameraX >= bounds.left+margin && x-cameraX <= bounds.right-margin
    && y-cameraY >= bounds.top+margin && y-cameraY <= bounds.bottom-margin;
}

// Player briefcases stop at 80% of the plot, excluding the price column.
export const BRIEFCASE_END_FRACTION = .80;
export const briefcaseRightEdge = (cameraX: number, plotWidth: number): number =>
  cameraX + plotWidth * BRIEFCASE_END_FRACTION;

/** Clip the last movement segment before collision checks, preventing far hits. */
export function clipBriefcaseStep(x: number, y: number, nextX: number, nextY: number, right: number) {
  if (x >= right) return { x: right, y, expired: true };
  if (nextX < right) return { x: nextX, y: nextY, expired: false };
  const fraction = (right - x) / (nextX - x);
  return { x: right, y: y + (nextY - y) * fraction, expired: true };
}
