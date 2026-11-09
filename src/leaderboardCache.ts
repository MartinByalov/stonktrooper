// In-memory only. Keys must include account identity, board and timeframe.
export function createLeaderboardCache<T>(ttl = 60000, retryDelay = 30000, now = Date.now) {
  const entries = new Map<string, { promise: Promise<T>; until: number }>();
  const values = new Map<string, T>();
  return {
    peek(key: string): T | null { return values.get(key) ?? null; },
    get(key: string, load: () => Promise<T>): Promise<T> {
      const cached = entries.get(key);
      if (cached && now() < cached.until) return cached.promise;
      const entry = { promise: undefined as unknown as Promise<T>, until: Infinity };
      entry.promise = Promise.resolve().then(load).then(value => {
        if (entries.get(key) === entry) values.set(key, value);
        entry.until = now() + ttl;
        return value;
      }, error => {
        entry.until = now() + retryDelay;
        throw error;
      });
      entries.set(key, entry);
      return entry.promise;
    },
    clear() { entries.clear(); },
  };
}