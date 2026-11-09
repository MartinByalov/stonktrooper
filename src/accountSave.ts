import { readProgress, type Progress } from './progression';

export interface AccountSave {
  version: 1;
  playerId: string;
  progress: Progress;
  base: string | null;
  dirty: boolean;
}
export const accountSaveKey = (id: string) => `cr_google_save_v1:${encodeURIComponent(id)}`;
export function loadAccountSave(storage: Pick<Storage, 'getItem'>, playerId: string): AccountSave | null {
  const raw = storage.getItem(accountSaveKey(playerId));
  if (raw === null) return null;
  const save = JSON.parse(raw) as AccountSave;
  if (save.version !== 1 || save.playerId !== playerId || typeof save.dirty !== 'boolean'
    || !(save.base === null || typeof save.base === 'string') || !save.progress) {
    throw new Error('Invalid account save. Existing data was preserved.');
  }
  return { ...save, progress: readProgress(JSON.stringify(save.progress), true) };
}
export function decodeCloudSave(raw: string, playerId: string): Progress {
  const data = JSON.parse(raw);
  if (data.version !== 1 || data.playerId !== playerId || !data.progress || typeof data.progress !== 'object') {
    throw new Error('Google save does not match this account or version.');
  }
  return readProgress(JSON.stringify(data.progress), true);
}
export const encodeCloudSave = (save: AccountSave) => JSON.stringify({
  version: 1, playerId: save.playerId, progress: save.progress,
});
export function persistAccountSave(storage: Pick<Storage, 'setItem'>, save: AccountSave) {
  storage.setItem(accountSaveKey(save.playerId), JSON.stringify(save));
}