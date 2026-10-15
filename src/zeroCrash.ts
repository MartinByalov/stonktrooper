// Keep the falling hero visible while the candle's fixed opening scrolls up.
// Clamp at the plot's upper edge, then allow the minimum animation time to finish.
export const zeroCrashCamera = (camera: number, feet: number, candleTop: number, height: number, plotTop: number): number => {
  const limit = candleTop - plotTop;
  const target = Math.max(camera, Math.min(limit, feet - height * 0.78));
  return Math.min(limit, camera + Math.max(0, target - camera) * 0.12);
};

export const zeroCrashComplete = (frame: number, candleTop: number, camera: number, plotTop: number): boolean =>
  frame >= 150 && candleTop - camera <= plotTop + 2;