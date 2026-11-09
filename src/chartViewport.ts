import type { AimPoint } from './aim';

// Android gameView calibration, in CSS pixels per world unit. Keep this
// independent of backing resolution/DPR and leave browser desktop framing alone.
export function mobileWorldScale(display: { width: number; height: number }) {
  const valid = Number.isFinite(display.width) && Number.isFinite(display.height)
    && display.width > 0 && display.height > 0;
  const pixels = valid ? display : { width: 1920, height: 840 };
  const axisPixels = Math.min(48, pixels.width * .08);
  const runnerPixels = Math.min(64, Math.max(44, 44 * Math.sqrt(pixels.height / 312)));
  return Math.min(runnerPixels / 62, pixels.height / 360, (pixels.width - axisPixels) / 650);
}

// One transform for terrain, actors and loot. Physics stays in world units.
export const chartViewport = (mobile: boolean, width: number, height: number, axisWidth: number, display = { width, height }) => {
  const valid = Number.isFinite(display.width) && Number.isFinite(display.height)
    && display.width > 0 && display.height > 0;
  const pixels = valid ? display : { width, height };
  const worldScale = mobileWorldScale(pixels);
  return {
  scale: mobile ? worldScale * height / pixels.height : 1,
  // Cancel CSS stretching of the fixed-resolution canvas. Both world axes
  // then occupy the same CSS pixels per unit, using height as the reference.
  scaleX: mobile ? worldScale * width / pixels.width : (pixels.height / height) / (pixels.width / width),
  x: (width - axisWidth) * (mobile ? 0.20 : 0),
  y: height * 0.62,
  };
};

export type ChartViewport = ReturnType<typeof chartViewport>;

export const chartToScreen = (point: AimPoint, view: ChartViewport): AimPoint => ({
  x: view.x + (point.x - view.x) * view.scaleX,
  y: view.y + (point.y - view.y) * view.scale,
});

export const screenToChart = (point: AimPoint, view: ChartViewport): AimPoint => ({
  x: view.x + (point.x - view.x) / view.scaleX,
  y: view.y + (point.y - view.y) / view.scale,
});