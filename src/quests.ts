import type { Currency, Progress, Wallet } from './progression';
import { googlePeriod } from './googlePeriods';

export type QuestGoal = { kind: 'collect'; currency: Currency; target: number }
  | { kind: 'kills' | 'throws'; target: number };
export interface Quest { id: string; name: string; goals: readonly QuestGoal[]; coins: number }
// Counters at the moment the active Google week was adopted.
export interface QuestCounters { lifetime: Wallet; throws: number; kills: number }
export interface WeeklyQuests { week: string; baseline: QuestCounters; claimed: string[] }
// Catalog for Weekly Quests. Each Google week offers 5–7 of these; progress
// counts lifetime pickups since the week's baseline, not wallet balance.
export const QUESTS: readonly Quest[] = [
  { id: 'q1-coins', name: 'Pocket Change', goals: [{ kind: 'collect', currency: 'coins', target: 50 }], coins: 15 },
  { id: 'q1-diamonds', name: 'Diamond Hunter', goals: [{ kind: 'collect', currency: 'diamonds', target: 5 }], coins: 25 },
  { id: 'q1-lunch', name: 'Lunch Money', goals: [{ kind: 'collect', currency: 'tenders', target: 10 }, { kind: 'collect', currency: 'bananas', target: 10 }], coins: 35 },
  { id: 'q1-bags', name: 'Bag Delivery', goals: [{ kind: 'collect', currency: 'bags', target: 10 }, { kind: 'throws', target: 25 }], coins: 40 },
  { id: 'q1-market', name: 'Market Cleaner', goals: [{ kind: 'kills', target: 25 }], coins: 50 },
  { id: 'q1-bells', name: 'Closing Bell', goals: [{ kind: 'collect', currency: 'bells', target: 5 }, { kind: 'collect', currency: 'hats', target: 10 }], coins: 45 },
  { id: 'q1-combo', name: 'Full Portfolio', goals: [{ kind: 'collect', currency: 'coins', target: 250 }, { kind: 'kills', target: 50 }, { kind: 'throws', target: 100 }], coins: 100 },
  { id: 'q2-hats', name: 'Cap Collector', goals: [{ kind: 'collect', currency: 'hats', target: 15 }], coins: 30 },
  { id: 'q2-bananas', name: 'Banana Standard', goals: [{ kind: 'collect', currency: 'bananas', target: 25 }], coins: 30 },
  { id: 'q2-tenders', name: 'Tender Offer', goals: [{ kind: 'collect', currency: 'tenders', target: 20 }], coins: 35 },
  { id: 'q2-throws', name: 'Return to Sender', goals: [{ kind: 'throws', target: 75 }], coins: 40 },
  { id: 'q2-coins', name: 'Liquid Assets', goals: [{ kind: 'collect', currency: 'coins', target: 150 }], coins: 35 },
  { id: 'q2-diamonds', name: 'Gem Liquidity', goals: [{ kind: 'collect', currency: 'diamonds', target: 15 }], coins: 45 },
  { id: 'q2-bells', name: 'Bell Curve', goals: [{ kind: 'collect', currency: 'bells', target: 10 }], coins: 40 },
  { id: 'q2-bags', name: 'Heavy Baggage', goals: [{ kind: 'collect', currency: 'bags', target: 25 }], coins: 40 },
  { id: 'q2-kills', name: 'Market Correction', goals: [{ kind: 'kills', target: 75 }], coins: 60 },
  { id: 'q2-lunch', name: 'Lunch Break', goals: [{ kind: 'collect', currency: 'tenders', target: 15 }, { kind: 'collect', currency: 'bananas', target: 15 }], coins: 45 },
  { id: 'q2-dressed', name: 'Dress for Distress', goals: [{ kind: 'collect', currency: 'hats', target: 20 }, { kind: 'collect', currency: 'bags', target: 15 }], coins: 50 },
  { id: 'q2-margin', name: 'Margin Delivery', goals: [{ kind: 'collect', currency: 'bags', target: 20 }, { kind: 'throws', target: 50 }], coins: 55 },
  { id: 'q2-blue-chip', name: 'Blue Chip Hunt', goals: [{ kind: 'collect', currency: 'coins', target: 100 }, { kind: 'collect', currency: 'diamonds', target: 10 }], coins: 50 },
  { id: 'q2-bullish', name: 'Bullish Business', goals: [{ kind: 'kills', target: 40 }, { kind: 'collect', currency: 'coins', target: 100 }], coins: 55 },
  { id: 'q2-opening', name: 'Opening Positions', goals: [{ kind: 'collect', currency: 'bells', target: 5 }, { kind: 'throws', target: 40 }], coins: 45 },
  { id: 'q2-diversify', name: 'Diversify the Dip', goals: [{ kind: 'collect', currency: 'coins', target: 100 }, { kind: 'collect', currency: 'bananas', target: 15 }, { kind: 'collect', currency: 'bags', target: 10 }], coins: 65 },
  { id: 'q2-clean-sweep', name: 'Clean Sweep', goals: [{ kind: 'kills', target: 100 }, { kind: 'throws', target: 100 }], coins: 85 },
];
const totalKills = (p: Pick<Progress, 'kills'>) => Object.values(p.kills).reduce((sum, value) => sum + value, 0);
export const questCounters = (p: Progress): QuestCounters => ({ lifetime: { ...p.lifetime }, throws: p.throws, kills: totalKills(p) });
// Google weeks (Sunday, UTC-7), keyed like the leaderboard periods.
export const questWeek = (now: number) => googlePeriod(now, 'weekly').key;
export const validQuestWeek = (week: unknown): week is string => typeof week === 'string'
  && /^weekly:\d{4}-\d{2}-\d{2}$/.test(week) && new Date(Date.parse(week.slice(7))).toISOString().slice(0, 10) === week.slice(7);

// Deterministic 5–7 quests per week, identical on every device.
export function weeklyQuests(week: string): readonly Quest[] {
  let seed = 2166136261;
  for (let i = 0; i < week.length; i++) seed = Math.imul(seed ^ week.charCodeAt(i), 16777619) >>> 0;
  const random = () => {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let t = Math.imul(seed ^ seed >>> 15, seed | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const pool = [...QUESTS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 5 + Math.floor(random() * 3));
}

// Progress of the given week only; a missing or stale week counts nothing.
export const questGoalValue = (p: Progress, goal: QuestGoal, week: string | null) => {
  const weekly = p.weekly;
  if (!weekly || weekly.week !== week) return 0;
  const current = goal.kind === 'collect' ? p.lifetime[goal.currency] : goal.kind === 'throws' ? p.throws : totalKills(p);
  const base = goal.kind === 'collect' ? weekly.baseline.lifetime[goal.currency] : goal.kind === 'throws' ? weekly.baseline.throws : weekly.baseline.kills;
  return Math.max(0, current - base);
};
export const questDone = (p: Progress, quest: Quest, week: string | null) => quest.goals.every(goal => questGoalValue(p, goal, week) >= goal.target);
export const questClaimed = (p: Progress, questId: string, week: string | null) => p.weekly?.week === week && p.weekly.claimed.includes(questId);
export const readyQuests = (p: Progress, week: string | null) => week
  ? weeklyQuests(week).filter(q => questDone(p, q, week) && !questClaimed(p, q.id, week)) : [];