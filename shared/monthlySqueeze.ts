// No live month, timezone, group target or rewards are selected here.
// Fail closed for unimplemented Achievement conditions; do not treat them as Score.
export interface SqueezeEvent { id: string; achievementId: 'paper-hands'; threshold: number; startsAt: number; endsAt: number }
export interface SqueezeReceipt { eventId: string; contributed: true }
export function validSqueezeEvent(value: SqueezeEvent): boolean {
  return !!value && /^[a-z][a-z0-9-]{0,63}$/.test(value.id)
    && value.achievementId === 'paper-hands' && value.threshold === 100
    && Number.isSafeInteger(value.startsAt) && value.startsAt >= 0
    && Number.isSafeInteger(value.endsAt) && value.endsAt > value.startsAt;
}
export function qualifyingSqueezeProgress(progress: unknown, threshold: number): progress is number {
  return typeof progress === 'number' && Number.isSafeInteger(progress) && progress >= threshold;
}

export const squeezeEventScope = (event: SqueezeEvent): string => JSON.stringify([
  event.id, event.achievementId, event.threshold, event.startsAt, event.endsAt,
]);