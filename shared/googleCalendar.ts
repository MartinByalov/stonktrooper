// Fixed UTC-7 reset convention like the Google leaderboard periods, not a time fetch or IANA zone.
export const GOOGLE_RESET_OFFSET_MS = 7 * 3600000;

export function googleCalendarMonth(year: number, month: number) {
  if (!Number.isInteger(year) || year < 1970 || year > 9998
    || !Number.isInteger(month) || month < 1 || month > 12) throw new Error('Invalid Google calendar month');
  return Object.freeze({ key: `${year}-${String(month).padStart(2, '0')}`,
    startsAt: Date.UTC(year, month - 1, 1) + GOOGLE_RESET_OFFSET_MS,
    endsAt: Date.UTC(year, month, 1) + GOOGLE_RESET_OFFSET_MS });
}