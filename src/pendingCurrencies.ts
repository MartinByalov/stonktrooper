import { decodeCloudSave, encodeCloudSave, type AccountSave } from './accountSave';
import { CURRENCIES, type Progress } from './progression';

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const key = (playerId: string) => `cr_pending_currencies_v1:${encodeURIComponent(playerId)}`;
export const hasPendingCurrencies = (storage: Store, playerId: string) => storage.getItem(key(playerId)) !== null;
interface Receipt { version: 1; playerId: string; runId: string; base: string | null; data: string }

// A currency-only recovery payload, never a Practice save or deferred Score.
// Use exact snapshot compare-and-swap, not wallet merging across devices.
export function retainRunCurrencies(storage: Store, save: AccountSave, progress: Progress) {
  if (!progress.run) return;
  const previous = storage.getItem(key(save.playerId));
  if (previous && (JSON.parse(previous) as Receipt).runId !== progress.run.id) {
    throw new Error('Pending currencies must be restored before starting another online run.');
  }
  const next = structuredClone(save.progress);
  next.run = null;
  for (const currency of CURRENCIES) {
    next.wallet[currency] += progress.run.collected[currency];
    // A live Claim may already have confirmed the pickup counters, while its
    // stash is still unbanked. Recovery must not count those pickups twice.
    next.lifetime[currency] = Math.max(next.lifetime[currency], progress.lifetime[currency]);
  }
  const receipt: Receipt = { version: 1, playerId: save.playerId, runId: progress.run.id,
    base: save.base, data: encodeCloudSave({ ...save, progress: next }) };
  storage.setItem(key(save.playerId), JSON.stringify(receipt));
}
export function clearRunCurrencies(storage: Store, playerId: string) { storage.removeItem(key(playerId)); }

export async function restoreRunCurrencies(storage: Store, playerId: string,
  read: () => Promise<{ data: string | null; conflict: boolean }>,
  write: (id: string, expected: string | null, data: string) => Promise<{ data: string | null; conflict: boolean }>) {
  const raw = storage.getItem(key(playerId));
  if (!raw) return;
  const receipt = JSON.parse(raw) as Receipt;
  if (receipt.version !== 1 || receipt.playerId !== playerId || typeof receipt.runId !== 'string'
    || !(receipt.base === null || typeof receipt.base === 'string') || typeof receipt.data !== 'string') throw new Error('Invalid pending currencies. Recovery data was preserved.');
  decodeCloudSave(receipt.data, playerId);
  const cloud = await read();
  if (cloud.conflict) throw new Error('Google save conflict. Pending currencies were preserved.');
  if (cloud.data !== receipt.data) {
    if (cloud.data !== receipt.base) throw new Error('Google progress changed on another session. Pending currencies were preserved for recovery; no wallets were merged.');
    const result = await write(playerId, receipt.base, receipt.data);
    if (result.data !== receipt.data) throw new Error('Currencies are retained locally until Google confirms the save.');
  }
  // Safe after a crash between remote commit and local receipt removal.
  clearRunCurrencies(storage, playerId);
}