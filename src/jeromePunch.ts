// Shared hand selection for live combat and the How to Play loop.
export const alternatingPunchArm = (attackIndex: number): number => attackIndex % 2 === 0 ? 1 : 0;

export function jeromePreviewPunch(frame: number) {
  const cycle = Math.floor(Math.max(0, frame) / 84);
  const elapsed = Math.max(0, frame) % 84;
  return { arm: alternatingPunchArm(cycle), attack: elapsed < 48 ? 48 - elapsed : 0 };
}