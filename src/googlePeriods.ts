import { GOOGLE_RESET_OFFSET_MS as OFFSET } from '../shared/googleCalendar';
const DAY = 86400000;
export type RewardPeriod = 'daily' | 'weekly' | 'all-time';
// Fixed UTC-7; Google weeks begin on Sunday, not ISO Monday.
export function googlePeriod(now: number, period: RewardPeriod) {
  if (!Number.isFinite(now) || now < 0) throw new Error('Invalid Google time.');
  if (period === 'all-time') return { key: 'alltime', start: 0, end: Infinity };
  const day = Math.floor((now - OFFSET) / DAY) * DAY;
  const start = day + OFFSET - (period === 'weekly' ? new Date(day).getUTCDay() * DAY : 0);
  return { key: `${period}:${new Date(start).toISOString().slice(0, 10)}`, start, end: start + DAY * (period === 'weekly' ? 7 : 1) };
}