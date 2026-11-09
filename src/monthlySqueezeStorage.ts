import { validSqueezeEvent, type SqueezeEvent } from '../shared/monthlySqueeze';

export type SqueezeStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function browserSqueezeStorage(): SqueezeStorage | undefined {
  try { return typeof window === 'undefined' ? undefined : window.localStorage; }
  catch { return undefined; }
}

// Device-local request suppression only, NOT eligibility or a reward credential.
// API + account + full event definition prevent cross-account/environment reuse.
export function createSqueezeConfirmationStore(storage: SqueezeStorage | undefined, origin: string, uid: string, event: SqueezeEvent) {
  if (!/^[0-9]{1,255}$/.test(uid) || !validSqueezeEvent(event)) throw new Error('Invalid Squeeze storage scope');
  const key = 'cr_squeeze_confirmed_v2:' + encodeURIComponent(JSON.stringify([
    origin, uid, event.id, event.achievementId, event.threshold, event.startsAt, event.endsAt,
  ]));
  return {
    read(): boolean {
      try { return storage?.getItem(key) === 'confirmed-v2'; }
      catch { return false; }
    },
    confirm(): void {
      try { storage?.setItem(key, 'confirmed-v2'); }
      catch { /* Keep the in-memory confirmation even if persistence is blocked. */ }
    },
  };
}