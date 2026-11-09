// No live month, timezone, target or reward is chosen here; unimplemented conditions fail closed.
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