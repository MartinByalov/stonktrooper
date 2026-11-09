export function hudStripGeometry(options: {
  canvasLeft: number; canvasWidth: number; headerLeft: number;
  controlSize: number; controlGap: number; leftInset: number;
  currencyWidth?: number;
  pauseLeft?: number; controlsRight?: number;
}) {
  const { canvasLeft, canvasWidth, headerLeft, controlSize, controlGap, leftInset, pauseLeft, controlsRight, currencyWidth } = options;
  // Pause can insert Achievements between Resume and Settings. The score tab
  // must still span exactly two slots, just like Leaderboard/Loot and the HUD.
  // Never narrower than the coin/diamond counter above it, so the score tab lines up with it.
  const width = Math.max(controlSize * 2 + controlGap, currencyWidth ?? 0);
  return {
    left: headerLeft + leftInset - canvasLeft,
    width,
    livesLeft: pauseLeft !== undefined && controlsRight !== undefined
      ? controlsRight - canvasLeft - width : canvasWidth - leftInset - width,
    livesWidth: width,
  };
}