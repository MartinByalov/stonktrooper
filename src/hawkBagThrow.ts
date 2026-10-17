// Shared local pose keeps the held bag and its release point in sync.
export function hawkBagThrowPose(timer: number, direction = 1, hats = 0) {
  const elapsed = 16 - Math.max(0, Math.min(16, timer));
  const swing = Math.min(1, elapsed / 8);
  const recovery = Math.max(0, (elapsed - 8) / 8);
  const clearance = Math.max(0, hats - 1) * 10;
  const bagX = 8 + direction * (-12 + 36 * swing);
  const bagY = -78 - clearance + 10 * swing;
  return {
    bagX, bagY,
    holding: timer > 8,
    farHandX: bagX - direction * 6,
    nearHandX: bagX + direction * 6,
    handY: bagY + 8 + recovery * (27 + clearance),
    elbowX: 8 + direction * (-20 + 44 * swing),
    elbowY: -52 - clearance * 0.5 + recovery * (14 + clearance * 0.5),
  };
}