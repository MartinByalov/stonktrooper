import type { Progress, ProgressCommand } from './progression';

export function finalGoogleScore(progress: Progress): number | null {
  const run = progress.run;
  if (!run || run.status !== 'finished') return null;
  const score = Math.round(run.ath);
  return Number.isSafeInteger(score) && score > 0 ? score : null;
}

// First death remains revivable. Death after revive is already final, so a
// later finish command is a no-op and cannot be the only submission trigger.
export function completesRun(action: ProgressCommand, progress: Progress): boolean {
  return progress.run?.status === 'finished' && (
    action.type === 'finish' || action.type === 'death'
    || action.type === 'reward' && action.kind === 'doubleCoins'
  );
}