import { decodeCloudSave, encodeCloudSave, type AccountSave } from './accountSave';

export interface OnlineState { online: boolean; epoch: number }
export function requireOnline(state: OnlineState, epoch?: number) {
  if (!state.online || epoch !== undefined && state.epoch !== epoch) {
    throw new Error('Connection changed. Online save requires a validated connection; retained currencies are preserved locally.');
  }
}
// No queue or offline fallback. A divergent Google version always wins.
export async function commitOnlineProgress(options: {
  save: AccountSave;
  epoch: number;
  online: () => Promise<OnlineState>;
  write: (id: string, expected: string | null, data: string) => Promise<{ data: string | null; conflict: boolean }>;
}): Promise<AccountSave> {
  const { save, epoch, online, write } = options;
  requireOnline(await online(), epoch);
  const data = encodeCloudSave(save);
  const result = await write(save.playerId, save.base, data);
  requireOnline(await online(), epoch);
  if (result.conflict && result.data !== data) {
    // No cloud data is not evidence that overwriting is safe.
    if (result.data === null) throw new Error('Google progress changed. Log in again to reload it.');
    return { ...save, progress: decodeCloudSave(result.data, save.playerId), base: result.data, dirty: false };
  }
  if (result.data !== data) throw new Error('Google did not confirm the saved progress.');
  return { ...save, base: data, dirty: false };
}