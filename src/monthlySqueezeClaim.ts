import { getBrowserUser, getBrowserIdentityGeneration } from './browserIdentity';
import { readWorkerConfig } from './workerConfig';
import { browserSqueezeStorage, type SqueezeStorage } from './monthlySqueezeStorage';
import { FIRST_MONTHLY_SQUEEZE } from '../shared/monthlySqueezeSchedule';
import { validSqueezeEvent, type SqueezeEvent } from '../shared/monthlySqueeze';

export type SqueezeClaimResult = 'claimed' | 'already-owned';
export class SqueezeClaimError extends Error {
  // Results: not-unlocked, retry (unknown outcome, safe to repeat), or a transport or account state.
  constructor(public code: 'disabled' | 'identity' | 'not-unlocked' | 'retry' | 'reauth' | 'unavailable') {
    super(`Monthly Squeeze claim: ${code}`);
  }
}
interface Options {
  env: Record<string, unknown>;
  event: SqueezeEvent;
  // The player's own game save: does it already hold the reward, and add it (and save it).
  owned: () => boolean;
  grant: (itemId: string) => Promise<void>;
  identity?: () => { uid: string | null; generation: number };
  transport?: typeof fetch;
  storage?: SqueezeStorage | null;
  // The reward granted by this event; defaults to the scheduled one.
  itemId?: string;
}

// Device-local only: remembers an account already claimed; not a credential, the save is the record.
export function claimedMarker(storage: SqueezeStorage | undefined, origin: string, uid: string, eventId: string) {
  const key = 'cr_squeeze_claimed_v1:' + encodeURIComponent(JSON.stringify([origin, uid, eventId]));
  return {
    read(): boolean { try { return storage?.getItem(key) === 'claimed'; } catch { return false; } },
    write(): void { try { storage?.setItem(key, 'claimed'); } catch { /* Memory state still serves this page. */ } },
  };
}

// Claim the shared reward: the Worker only reports the goal, then the game adds the item to the save.
export function createSqueezeClaim(options: Options) {
  const config = readWorkerConfig(options.env);
  if (options.env.VITE_MONTHLY_SQUEEZE_ENABLED !== 'true' || options.env.VITE_DRIVE_PROFILE_ENABLED !== 'true' || !config.configured
    || !validSqueezeEvent(options.event)) throw new SqueezeClaimError('disabled');
  const event = Object.freeze({ ...options.event });
  const identity = options.identity ?? (() => ({ uid: getBrowserUser()?.uid ?? null, generation: getBrowserIdentityGeneration() }));
  const captured = { ...identity() };
  if (!captured.uid || !/^[0-9]{1,255}$/.test(captured.uid)) throw new SqueezeClaimError('identity');
  const itemId = options.itemId ?? FIRST_MONTHLY_SQUEEZE.reward.itemId;
  const transport = options.transport ?? fetch;
  const marker = claimedMarker(options.storage === undefined ? browserSqueezeStorage() : options.storage ?? undefined, config.origin, captured.uid, event.id);
  let claimed = marker.read(), busy = false;
  const same = () => { const now = identity(); return now.uid === captured.uid && now.generation === captured.generation; };
  const done = () => { claimed = true; marker.write(); };
  return {
    get claimed() { return claimed; },
    async claim(): Promise<SqueezeClaimResult> {
      if (busy) throw new SqueezeClaimError('unavailable');
      busy = true;
      try {
        if (!same()) throw new SqueezeClaimError('identity');
        if (options.owned()) { done(); return 'already-owned'; }
        let response: Response;
        try {
          response = await transport(config.origin + '/monthly-squeeze/claim', {
            method: 'POST', credentials: 'include', cache: 'no-store', redirect: 'error',
            headers: { 'Content-Type': 'application/json', 'X-Stonktrooper-Client': 'browser' },
            body: JSON.stringify({ eventId: event.id }),
          });
        } catch { throw new SqueezeClaimError('retry'); }
        if (!same()) throw new SqueezeClaimError('identity');
        if (response.status === 401) throw new SqueezeClaimError('reauth');
        if (response.status === 409) throw new SqueezeClaimError('not-unlocked');
        if (response.status === 503 || response.status === 429 || response.status >= 500) throw new SqueezeClaimError('retry');
        let body: unknown = null;
        try { body = await response.json(); } catch { /* Handled below. */ }
        if (!response.ok || !body || (body as Record<string, unknown>).eligible !== true) throw new SqueezeClaimError('unavailable');
        try { await options.grant(itemId); } catch { if (!options.owned()) throw new SqueezeClaimError('retry'); }
        done();
        return 'claimed';
      } catch (error) { throw error instanceof SqueezeClaimError ? error : new SqueezeClaimError('unavailable'); }
      finally { busy = false; }
    },
  };
}
