import type { Progress } from './progression';
import { googlePeriod, type RewardPeriod } from './googlePeriods';
// Initial tuning: all below first PIPS (10K) and Score (1M) achievements.
export const SCORE_REWARD_TIERS = {
  daily: [{ threshold: 1000, coins: 10, diamonds: 0 }, { threshold: 2500, coins: 20, diamonds: 0 }, { threshold: 5000, coins: 30, diamonds: 1 }],
  weekly: [{ threshold: 2500, coins: 25, diamonds: 1 }, { threshold: 5000, coins: 50, diamonds: 1 }, { threshold: 7500, coins: 75, diamonds: 2 }],
  'all-time': [{ threshold: 2500, coins: 30, diamonds: 1 }, { threshold: 5000, coins: 60, diamonds: 2 }, { threshold: 9000, coins: 100, diamonds: 3 }],
} as const;
// Display the highest reached tier beside a ranked score. This is a tier
// preview, not eligibility, claim state, or a separate rank-based payout.
export function scoreRewardForRow(period: RewardPeriod, score: number) {
  if (!Number.isFinite(score) || score < 0) return null;
  return [...SCORE_REWARD_TIERS[period]].reverse().find(tier => score >= tier.threshold) ?? null;
}
export interface ScoreReward {
  id: string; period: RewardPeriod; periodStart: number; threshold: number;
  score: number; coins: number; diamonds: number; claimed: boolean;
}
export type RewardScores = Partial<Record<RewardPeriod, { score: number; timestamp: number }>>;
export function validScoreReward(value: unknown): value is ScoreReward {
  if (!value || typeof value !== 'object') return false;
  const r = value as ScoreReward;
  if (!Object.hasOwn(SCORE_REWARD_TIERS, r.period) || !Number.isSafeInteger(r.periodStart) || r.periodStart < 0
    || !Number.isSafeInteger(r.score) || r.score < r.threshold || typeof r.claimed !== 'boolean') return false;
  const period = googlePeriod(r.periodStart, r.period);
  const tier = SCORE_REWARD_TIERS[r.period].find(t => t.threshold === r.threshold);
  return period.start === r.periodStart && r.id === `${period.key}:${r.threshold}`
    && !!tier && r.coins === tier.coins && r.diamonds === tier.diamonds;
}
// Account-verified Google results bracketed by Google time; never device date.
export function unlockScoreRewards(progress: Progress, scores: RewardScores, before: number, after: number): Progress {
  if (!Number.isFinite(before) || !Number.isFinite(after) || after < before || after - before > 30000) throw new Error('Google reward check expired. Retry.');
  const rewards = [...progress.scoreRewards];
  for (const period of ['daily', 'weekly', 'all-time'] as const) {
    const span = googlePeriod(after, period);
    if (googlePeriod(before, period).key !== span.key) continue;
    const result = scores[period];
    if (!result || !Number.isSafeInteger(result.score) || result.score <= 0
      || !Number.isSafeInteger(result.timestamp) || result.timestamp < span.start
      || result.timestamp >= span.end || result.timestamp > after + 1000) continue;
    for (const tier of SCORE_REWARD_TIERS[period]) {
      const id = `${span.key}:${tier.threshold}`;
      if (result.score >= tier.threshold && !rewards.some(r => r.id === id)) rewards.push({ ...tier, id, period, periodStart: span.start, score: result.score, claimed: false });
    }
  }
  return rewards.length === progress.scoreRewards.length ? progress : { ...progress, scoreRewards: rewards };
}
export function claimScoreReward(progress: Progress, id: string): Progress {
  const reward = progress.scoreRewards.find(r => r.id === id);
  if (!reward || !validScoreReward(reward)) throw new Error('Score reward is unavailable.');
  if (reward.claimed) return progress;
  return { ...progress,
    wallet: { ...progress.wallet, coins: progress.wallet.coins + reward.coins, diamonds: progress.wallet.diamonds + reward.diamonds },
    scoreRewards: progress.scoreRewards.map(r => r.id === id ? { ...r, claimed: true } : r),
  };
}