import type { SqueezeStorage } from './monthlySqueezeStorage';
import { squeezeEventScope, type SqueezeEvent } from '../shared/monthlySqueeze';

// A Guest has no account and contributes nothing to the shared count. The only Guest state is
// the request to claim, so the reward can be credited after they sign in. Nothing is sent anywhere.
const intentKey = (origin: string, eventId: string) => 'cr_squeeze_claim_intent_v1:' + encodeURIComponent(JSON.stringify([origin, eventId]));

// What the Guest asked for: show the sign-in message now, credit the reward after sign-in.
export function claimIntent(storage: SqueezeStorage | undefined, origin: string, eventId: string) {
  const key = intentKey(origin, eventId);
  return {
    read(): boolean { try { return storage?.getItem(key) === 'requested'; } catch { return false; } },
    write(): void { try { storage?.setItem(key, 'requested'); } catch { /* Without storage the Guest simply presses Claim again after signing in. */ } },
    clear(): void { try { (storage as Storage | undefined)?.removeItem?.(key); } catch { /* ignore */ } },
  };
}

// The signed-in player's own liquidations this month, read from the account's local
// journal (the same one the gameplay controller keeps), with no network request.
// The controller restores/merges the cloud record into this journal when a run starts.
export function readAccountEffort(storage: SqueezeStorage | undefined, origin: string, uid: string, event: SqueezeEvent): number {
  try {
    const raw = storage?.getItem('cr_squeeze_actions_v1:' + encodeURIComponent(JSON.stringify([origin, uid, squeezeEventScope(event)])));
    if (!raw) return 0;
    const journal = JSON.parse(raw) as { version?: number; state?: { liquidations?: unknown[] } };
    const count = journal.version === 1 && Array.isArray(journal.state?.liquidations) ? journal.state!.liquidations!.length : 0;
    return Number.isSafeInteger(count) && count >= 0 ? Math.min(count, event.threshold) : 0;
  } catch { return 0; }
}
