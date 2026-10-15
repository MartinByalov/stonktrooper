// Fade the spin out over the final 45 pixels; landing always leaves the asset upright.
export const printerFallRotation = (angle: number, remainingHeight: number): number => {
  if (remainingHeight <= 0) return 0;
  const weight = Math.min(1, remainingHeight / 45);
  return (angle + 0.16) * weight;
};