import { googleCalendarMonth } from './googleCalendar';
import type { SqueezeEvent } from './monthlySqueeze';

const november = googleCalendarMonth(2026, 11);
// Explicit owner-selected month; never auto-rotate or enable on import.
export const FIRST_MONTHLY_SQUEEZE = Object.freeze({
  month: november.key,
  event: Object.freeze({ id: 'paper-hands-2026-11', achievementId: 'paper-hands', threshold: 100,
    startsAt: november.startsAt, endsAt: november.endsAt } satisfies SqueezeEvent),
  reward: Object.freeze({ itemId: 'mounts-wednesday', audience: 'everyone', autoEquip: false } as const),
  // Owner-set starting target (07.11.2026): 1000 qualified participants. Metadata
  // only; the shared-unlock mechanism that reads it is not implemented yet.
  participantTarget: 1000,
} as const);

// Return only the existing strict event contract. No flags, rollout, target or
// reward entitlement is implied by producing matching browser/Worker settings.
export function firstSqueezeEventSettings() {
  const json = JSON.stringify(FIRST_MONTHLY_SQUEEZE.event);
  return Object.freeze({ MONTHLY_SQUEEZE_EVENT: json, VITE_MONTHLY_SQUEEZE_EVENT: json });
}