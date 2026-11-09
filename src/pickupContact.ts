// Mount artwork faces right in gameplay; bounds include body and feet, shared by all skins.
export function mountPickupDistance(
  x: number,
  mount: { kind?: 'whale' | 'bear' | 'bull'; feet: number } | undefined,
  pickup: { x: number; y: number },
): number {
  if (!mount) return Infinity;
  const whale = (mount.kind ?? 'whale') === 'whale';
  const left = x - (whale ? 70 : 46);
  const right = x + (whale ? 50 : 46);
  const top = mount.feet - (whale ? 60 : 52);
  const bottom = mount.feet + 4;
  const dx = Math.max(left - pickup.x, 0, pickup.x - right);
  const dy = Math.max(top - pickup.y, 0, pickup.y - bottom);
  return Math.hypot(dx, dy);
}