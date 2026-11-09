export const CONNECTION_GRACE_MS = 5_000;

// Epoch changes alone do not disqualify a run: a short network handoff is OK.
export function createRunConnection(now: () => number = Date.now) {
  let lostAt: number | null = null;
  let eligible = true;
  return {
    update(online: boolean) {
      if (lostAt !== null && now() - lostAt >= CONNECTION_GRACE_MS) eligible = false;
      if (online) lostAt = null;
      else lostAt ??= now();
      return { grace: !online && eligible, eligible };
    },
  };
}