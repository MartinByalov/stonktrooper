import type { AimPoint } from './aim';

// One transform for terrain, actors and loot. Physics stays in world units.
export const chartViewport = (mobile: boolean, width: number, height: number, axisWidth: number, display = { width, height }) => ({
  scale: mobile ? 1.30 : 1,
  // Cancel CSS stretching of the fixed-resolution canvas. Both world axes
  // then occupy the same CSS pixels per unit, using height as the reference.
  scaleX: (mobile ? 1.30 : 1) * (display.width > 0 && display.height > 0 ? (display.height / height) / (display.width / width) : 1),
  x: (width - axisWidth) * (mobile ? 0.28 : 0),
  y: height * 0.62,
});

export type ChartViewport = ReturnType<typeof chartViewport>;

export const chartToScreen = (point: AimPoint, view: ChartViewport): AimPoint => ({
  x: view.x + (point.x - view.x) * view.scaleX,
  y: view.y + (point.y - view.y) * view.scale,
});

export const screenToChart = (point: AimPoint, view: ChartViewport): AimPoint => ({
  x: view.x + (point.x - view.x) / view.scaleX,
  y: view.y + (point.y - view.y) / view.scale,
});