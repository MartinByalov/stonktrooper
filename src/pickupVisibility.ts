import { plotViewY } from './aim';
import { screenToChart, type ChartViewport } from './chartViewport';

// Covers all current pickup assets, including rotated printers, bell halos,
// bobbing and shine strokes. Keep this conservative when adding new artwork.
export const PICKUP_RENDER_MARGIN = 64;

export const pickupRenderBounds = (
  view: ChartViewport,
  width: number,
  top: number,
  bottom: number,
  inverted: boolean,
) => {
  const first = screenToChart({ x: 0, y: top }, view);
  const last = screenToChart({ x: width, y: bottom }, view);
  // Rendering reflects plot coordinates before applying the viewport zoom.
  const firstY = plotViewY(first.y, inverted, top, bottom);
  const lastY = plotViewY(last.y, inverted, top, bottom);
  return {
    left: Math.min(first.x, last.x) - PICKUP_RENDER_MARGIN,
    right: Math.max(first.x, last.x) + PICKUP_RENDER_MARGIN,
    top: Math.min(firstY, lastY) - PICKUP_RENDER_MARGIN,
    bottom: Math.max(firstY, lastY) + PICKUP_RENDER_MARGIN,
  };
};

export const pickupInRenderBounds = (x: number, y: number, bounds: ReturnType<typeof pickupRenderBounds>): boolean =>
  x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;