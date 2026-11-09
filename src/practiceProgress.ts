import { emptyWallet, type Progress, type ProgressCommand } from './progression';

// Practice pickups are a run-local display, never a wallet or achievement input.
export function applyPracticeCommand(previous: Progress, action: ProgressCommand): Progress {
  if (action.type === 'start') {
    return { ...previous, wallet: emptyWallet(), run: {
      id: action.id, startedAt: action.now, collected: emptyWallet(), pips: 0, ath: 0,
      status: 'playing', revived: false, doubled: false, settled: false,
    } };
  }
  if (!previous.run || previous.run.status !== 'playing') return previous;
  if (action.type === 'collect' && (action.currency === 'coins' || action.currency === 'diamonds')) {
    return { ...previous, run: { ...previous.run, collected: {
      ...previous.run.collected, [action.currency]: previous.run.collected[action.currency] + 1,
    } } };
  }
  if (action.type === 'death' || action.type === 'finish') {
    return { ...previous, run: { ...previous.run, pips: action.pips ?? previous.run.pips, ath: action.ath ?? 0, status: 'finished' } };
  }
  return previous;
}