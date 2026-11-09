import { newProgress, type Progress } from './progression';
import { accountSaveKey, decodeCloudSave, persistAccountSave, type AccountSave } from './accountSave';

export async function initializeAccount(options: {
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  playerId: string;
  readCloud: () => Promise<{ data: string | null; conflict: boolean }>;
}): Promise<AccountSave> {
  const { storage, playerId, readCloud } = options;
  // A failed read is never evidence of absence.
  const cloud = await readCloud();
  if (cloud.conflict) throw new Error('Conflicting Google saves require resolution. No new save was created.');
  let progress: Progress;
  if (cloud.data !== null) progress = decodeCloudSave(cloud.data, playerId);
  else progress = newProgress();
  // Preserve old local/offline data as an archive, never as the login authority.
  const previous = storage.getItem(accountSaveKey(playerId));
  if (previous !== null) {
    const prefix = `cr_retired_local_v1:${encodeURIComponent(playerId)}:`;
    let index = 0;
    while (storage.getItem(prefix + index) !== null) index++;
    // Archive once per distinct payload; clean cloud mirrors need no archive.
    const incoming = JSON.stringify({ version: 1, playerId, progress, base: cloud.data, dirty: cloud.data === null });
    if (previous !== incoming) storage.setItem(prefix + index, previous);
  }
  const save: AccountSave = { version: 1, playerId, progress, base: cloud.data, dirty: cloud.data === null };
  persistAccountSave(storage, save);
  return save;
}