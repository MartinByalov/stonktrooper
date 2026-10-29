export const JUMP_ZONE_FRACTION = .20;

export function touchAction(clientX: number, left: number, width: number, axisFraction: number): 'jump' | 'shoot' | null {
  const plotWidth = width * (1 - axisFraction);
  const x = clientX - left;
  if (x < 0 || x >= plotWidth) return null;
  return x < plotWidth * JUMP_ZONE_FRACTION ? 'jump' : 'shoot';
}