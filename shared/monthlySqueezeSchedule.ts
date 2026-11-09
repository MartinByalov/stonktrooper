import { googleCalendarMonth } from './googleCalendar';
import type { SqueezeEvent } from './monthlySqueeze';

const november = googleCalendarMonth(2026, 11);
// Explicit owner-selected month; never auto-rotate or enable on import.
export const FIRST_MONTHLY_SQUEEZE = Object.freeze({
  month: november.key,
  event: Object.freeze({ id: 'paper-hands-2026-11', achievementId: 'paper-hands', threshold: 100,
    startsAt: november.startsAt, endsAt: november.endsAt } satisfies SqueezeEvent),
  reward: Object.freeze({ itemId: 'mounts-wednesday', audience: 'everyone', autoEquip: false } as const),
  // Owner-set starting target (07.11.2026): 1000 qualified participants; metadata only for now.
  participantTarget: 1000,
} as const);

// Returns only the strict event contract; implies no flags, rollout, target or reward.
export function firstSqueezeEventSettings() {
  const json = JSON.stringify(FIRST_MONTHLY_SQUEEZE.event);
  return Object.freeze({ MONTHLY_SQUEEZE_EVENT: json, VITE_MONTHLY_SQUEEZE_EVENT: json });
}