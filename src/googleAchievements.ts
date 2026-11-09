import { MOBILE_ACHIEVEMENTS, type Progress } from './progression';

export const GOOGLE_ACHIEVEMENTS: Readonly<Record<string, string>> = {
  butterfingers: 'CgkI-9aO79cREAIQBA',
  'coin-flipper': 'CgkI-9aO79cREAIQBQ',
  'paper-hands': 'CgkI-9aO79cREAIQDg',
  stomp: 'CgkI-9aO79cREAIQEA',
  bagholder: 'CgkI-9aO79cREAIQEg',
  mage: 'CgkI-9aO79cREAIQEw',
  apes: 'CgkI-9aO79cREAIQGg',
  'tender-enjoyer': 'CgkI-9aO79cREAIQBw',
  'stick-around': 'CgkI-9aO79cREAIQDw',
  printer: 'CgkI-9aO79cREAIQCg',
  'hat-collector': 'CgkI-9aO79cREAIQCw',
  'bull-market': 'CgkI-9aO79cREAIQDA',
  'bear-market': 'CgkI-9aO79cREAIQGQ',
  'whale-rider': 'CgkI-9aO79cREAIQFQ',
  'dumpster-enjoyer': 'CgkI-9aO79cREAIQGw',
  'emotional-baggage': 'CgkI-9aO79cREAIQBg',
  boss: 'CgkI-9aO79cREAIQDQ',
  'all-time-high': 'CgkI-9aO79cREAIQFw',
  'title-hedgelock': 'CgkI-9aO79cREAIQGA',
  'title-copiumancer': 'CgkI-9aO79cREAIQCA',
  'title-wickzard': 'CgkI-9aO79cREAIQFA',
  'title-bagsquire': 'CgkI-9aO79cREAIQEQ',
  'title-stonksworn': 'CgkI-9aO79cREAIQFg',
  'title-coinqueror': 'CgkI-9aO79cREAIQCQ',
};

// Only call with a cloud-confirmed account snapshot, never the live run UI.
export function createGoogleAchievementSync(unlock: (playerId: string, achievementId: string) => Promise<void>) {
  const confirmed = new Set<string>();
  const pending = new Map<string, Promise<void>>();
  return async (playerId: string, progress: Progress) => {
    if (!playerId) return;
    for (const item of MOBILE_ACHIEVEMENTS) {
      if (item.value(progress) < item.target && !progress.rewardedAchievements.includes(item.id)) continue;
      const id = GOOGLE_ACHIEVEMENTS[item.id];
      if (!id) continue;
      const key = `${playerId}:${id}`;
      if (confirmed.has(key)) continue;
      let request = pending.get(key);
      if (!request) {
        request = Promise.resolve().then(() => unlock(playerId, id)).then(() => { confirmed.add(key); }).finally(() => { pending.delete(key); });
        pending.set(key, request);
      }
      // A failed Google mirror never invalidates a cloud save; retry at the next save or attachment.
      try { await request; } catch { /* No wallet or progression mutation. */ }
    }
  };
}