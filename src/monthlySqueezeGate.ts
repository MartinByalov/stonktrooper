import { validSqueezeEvent, type SqueezeEvent, type SqueezeReceipt } from '../shared/monthlySqueeze';
import { validSqueezeProgress } from '../shared/monthlySqueezeProgress';

interface Identity { uid: string | null; generation: number }
interface Options {
  enabled: boolean;
  event: SqueezeEvent;
  identity: () => Identity;
  // Future transport owns authenticated HTTP/account-binding. Not a public route.
  submit: (input: Readonly<{ eventId: string; achievementId: 'paper-hands'; progress: number }>) => Promise<SqueezeReceipt>;
  // Restored only from this account/event's confirmed status, never achievement data.
  confirmed?: boolean;
  clock?: () => number;
}

// Detached, no App/Score callback wiring, storage, polling, automatic retries or UI.
export function createMonthlySqueezeGate(options: Options) {
  if (!validSqueezeEvent(options.event)) throw new Error('Invalid Squeeze event');
  const event = Object.freeze({ ...options.event });
  const captured = { ...options.identity() };
  const submit = options.submit, identity = options.identity, clock = options.clock ?? Date.now;
  const enabled = options.enabled;
  let confirmed = options.confirmed === true, pending: Readonly<{ eventId: string; achievementId: 'paper-hands'; progress: number }> | undefined, busy = false;
  const guard = () => {
    const current = identity();
    if (!captured.uid || current.uid !== captured.uid || current.generation !== captured.generation) throw new Error('Squeeze account changed');
  };
  const execute = async (): Promise<'confirmed'> => {
    guard();
    if (busy || !pending) throw new Error('Squeeze request unavailable');
    busy = true;
    try {
      const receipt = await submit(pending);
      guard();
      if (!receipt || Reflect.ownKeys(receipt).length !== 2 || receipt.eventId !== event.id || receipt.contributed !== true) throw new Error('Invalid Squeeze receipt');
      confirmed = true; pending = undefined;
      return 'confirmed';
    } finally { busy = false; }
  };
  return {
    async consider(progress: unknown): Promise<'skipped' | 'confirmed'> {
      if (!enabled) return 'skipped';
      guard();
      const now = clock();
      if (confirmed || pending || busy || now < event.startsAt || now >= event.endsAt
        || !validSqueezeProgress(progress, event, captured.uid!) || progress.liquidations.length !== event.threshold
        || progress.liquidations.some(item => item.at > now)) return 'skipped';
      pending = Object.freeze({ eventId: event.id, achievementId: event.achievementId, progress: progress.liquidations.length });
      return execute();
    },
    // Only an explicit user/recovery action retries an ambiguous request. New
    // scores cannot replace the pending payload. Idempotence is event + account.
    retry() { return execute(); },
    get status(): 'confirmed' | 'pending' | 'idle' { return confirmed ? 'confirmed' : pending ? 'pending' : 'idle'; },
  };
}