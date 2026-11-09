import type { GameView } from './gameView';

// Conservative artwork bounds; simulation is never culled with rendering.
export const PICKUP_RENDER_MARGIN = 64;
export const pickupRenderBounds = (view: GameView, top = view.top) => ({
  left: view.left - PICKUP_RENDER_MARGIN, right: view.right + PICKUP_RENDER_MARGIN,
  top: top - PICKUP_RENDER_MARGIN, bottom: view.bottom + PICKUP_RENDER_MARGIN,
});

export const pickupInRenderBounds = (x: number, y: number, bounds: ReturnType<typeof pickupRenderBounds>): boolean =>
  x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;