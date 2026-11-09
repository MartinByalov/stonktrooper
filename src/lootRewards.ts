import type { Currency } from './progression';

export interface LootReward {
  id: string;
  claimable: boolean;
}
export interface DailyLootReward extends LootReward {
  currency: Currency;
  amount: number;
}
export interface LeaderboardLootReward extends LootReward {
  period: string;
  rank: number;
  threshold?: number;
  score: number;
  coins: number;
  diamonds: number;
}
// Layout fixtures are not authorization to grant currency. Only DEV previews
// mark them ready; production waits for confirmed reward eligibility.
export const dailyLootReward: DailyLootReward = { id: 'daily-preview', currency: 'coins', amount: 20, claimable: import.meta.env.DEV };
export const leaderboardLootRewardFixtures: LeaderboardLootReward[] = [
  { id: 'daily-board-preview', period: 'Daily', rank: 2, score: 28277, coins: 120, diamonds: 3, claimable: import.meta.env.DEV },
  { id: 'weekly-board-preview', period: 'Weekly', rank: 1, score: 78355, coins: 1000, diamonds: 25, claimable: import.meta.env.DEV },
];
// Keep the current screen empty for visual review; fixtures remain test-only.
export const leaderboardLootRewards: LeaderboardLootReward[] = [];
export const countLootRewards = (daily: LootReward | null, leaderboard: readonly LootReward[]) =>
  Number(daily?.claimable ?? false) + leaderboard.filter(reward => reward.claimable).length;