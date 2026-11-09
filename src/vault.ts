import type { Progress } from './progression';

// Monthly Vault: Games Played count from each UTC month start; missing the target misses the reward.
export interface MonthlyVault { month: string; baselineRuns: number }
export const VAULT_TARGET = 100;
export const vaultMonth = (now: number) => `monthly:${new Date(now).toISOString().slice(0, 7)}`;
export const validVaultMonth = (month: unknown): month is string => typeof month === 'string'
  && /^monthly:\d{4}-(0[1-9]|1[0-2])$/.test(month);
// One reward for now; future months rotate through this list in order.
const VAULT_REWARDS = ['shoes-moon'] as const;
export const VAULT_REWARD_IDS: readonly string[] = VAULT_REWARDS;
export function vaultReward(month: string): string {
  const [year, index] = month.slice(8).split('-').map(Number);
  return VAULT_REWARDS[(year * 12 + index - 1) % VAULT_REWARDS.length];
}
// Games Played in the given month; a missing or stale month counts nothing.
export const vaultRuns = (p: Progress, month: string | null) =>
  p.vault && p.vault.month === month ? Math.max(0, p.runs - p.vault.baselineRuns) : 0;
