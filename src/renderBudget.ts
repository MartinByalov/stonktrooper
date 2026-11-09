// Backing pixels follow the displayed canvas, not the monitor's DPR alone.
export function renderPixelRatio(width: number, height: number, worldWidth: number, worldHeight: number, dpr: number, touch: boolean): number {
  const density = Math.min(Number.isFinite(dpr) && dpr > 0 ? dpr : 1, touch ? 1.5 : 2);
  if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) return density;
  return Math.min(density, Math.max(width / worldWidth, height / worldHeight) * density);
}

// The CSS stage can be much narrower than the logical 1920:840 world.
// Independent axes avoid allocating invisible horizontal pixels in portrait.
export function renderBackingSize(width: number, height: number, worldWidth: number, worldHeight: number, dpr: number, touch: boolean) {
  const ratio = renderPixelRatio(width, height, worldWidth, worldHeight, dpr, touch);
  const valid = width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height);
  const density = Math.min(Number.isFinite(dpr) && dpr > 0 ? dpr : 1, 1.5);
  return {
    width: Math.max(1, Math.round(touch && valid ? width * density : worldWidth * ratio)),
    height: Math.max(1, Math.round(touch && valid ? height * density : worldHeight * ratio)),
  };
}