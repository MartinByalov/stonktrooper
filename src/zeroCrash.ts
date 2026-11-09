// Keep the falling hero visible while the candle opening scrolls up; clamp at the plot's upper edge.
export const zeroCrashCamera = (camera: number, feet: number, candleTop: number, height: number, plotTop: number): number => {
  const limit = candleTop - plotTop;
  const target = Math.max(camera, Math.min(limit, feet - height * 0.78));
  return Math.min(limit, camera + Math.max(0, target - camera) * 0.12);
};

export const zeroCrashComplete = (frame: number, candleTop: number, camera: number, plotTop: number): boolean =>
  frame >= 150 && candleTop - camera <= plotTop + 2;