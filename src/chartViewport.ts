import type { AimPoint } from './aim';

// One transform for terrain, actors and loot. Physics stays in world units.
export const chartViewport = (mobile: boolean, width: number, height: number, axisWidth: number) => ({
  scale: mobile ? 1.15 : 1,
  x: (width - axisWidth) * (mobile ? 0.32 : 0),
  y: height * 0.62,
});

export type ChartViewport = ReturnType<typeof chartViewport>;

export const chartToScreen = (point: AimPoint, view: ChartViewport): AimPoint => ({
  x: view.x + (point.x - view.x) * view.scale,
  y: view.y + (point.y - view.y) * view.scale,
});

export const screenToChart = (point: AimPoint, view: ChartViewport): AimPoint => ({
  x: view.x + (point.x - view.x) / view.scale,
  y: view.y + (point.y - view.y) / view.scale,
});