// Backing pixels follow the displayed canvas, not the monitor's DPR alone.
export function renderPixelRatio(width: number, height: number, worldWidth: number, worldHeight: number, dpr: number, touch: boolean): number {
  const density = Math.min(Number.isFinite(dpr) && dpr > 0 ? dpr : 1, touch ? 1.5 : 2);
  if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) return density;
  return Math.min(density, Math.max(width / worldWidth, height / worldHeight) * density);
}