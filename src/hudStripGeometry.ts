export function hudStripGeometry(options: {
  canvasLeft: number; canvasWidth: number; headerLeft: number;
  controlSize: number; controlGap: number; leftInset: number;
  currencyWidth?: number;
  pauseLeft?: number; controlsRight?: number;
}) {
  const { canvasLeft, canvasWidth, headerLeft, controlSize, controlGap, leftInset, pauseLeft, controlsRight, currencyWidth } = options;
  // The score tab spans exactly two slots and is never narrower than the counter above it.
  const width = Math.max(controlSize * 2 + controlGap, currencyWidth ?? 0);
  return {
    left: headerLeft + leftInset - canvasLeft,
    width,
    livesLeft: pauseLeft !== undefined && controlsRight !== undefined
      ? controlsRight - canvasLeft - width : canvasWidth - leftInset - width,
    livesWidth: width,
  };
}