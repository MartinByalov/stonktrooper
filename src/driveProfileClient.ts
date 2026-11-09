import { getBrowserUser, getBrowserIdentityGeneration } from './browserIdentity';
import { readWorkerConfig } from './workerConfig';
type CosmeticSlot = 'candles' | 'hats' | 'suitcase' | 'suits' | 'shoes' | 'pets' | 'mounts';
interface CosmeticProgress { schema: 'cosmetics-v1'; owned: string[]; equipped: Record<CosmeticSlot, string> }

export type ProfileResult = { state: 'existing'; revision: number; progress: CosmeticProgress }
  | { state: 'unprovisioned' | 'recovery-required' };
export type ProfileClientErrorCode = 'disabled' | 'identity' | 'invalid' | 'conflict' | 'reauth' | 'unavailable' | 'busy' | 'limited';
export class ProfileClientError extends Error {
  constructor(public code: ProfileClientErrorCode) {
    super({ disabled: 'Cloud profile is not enabled.', identity: 'Google account changed; reopen the profile.',
      invalid: 'Invalid profile request or response; existing data preserved.', conflict: 'Progress changed; reload before making a new command.',
      reauth: 'Sign in with Google again.', unavailable: 'Profile service unavailable; retry the exact operation.',
      busy: 'Another profile request is in progress.', limited: 'Profile request limit reached; wait at least 60 seconds before retrying.' }[code]);
  }
}
const fail = (code: ProfileClientErrorCode): never => { throw new ProfileClientError(code); };
const slots: readonly CosmeticSlot[] = ['candles', 'hats', 'suitcase', 'suits', 'shoes', 'pets', 'mounts'];
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);
function exact(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('invalid');
  const data = value as Record<string, unknown>;
  if (Reflect.ownKeys(data).length !== keys.length || Reflect.ownKeys(data).some(k => typeof k !== 'string' || !keys.includes(k))) return fail('invalid');
  return data;
}
const revision = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) < Number.MAX_SAFE_INTEGER;

export function driveProfileConfigured(env: Record<string, unknown>) {
  return env.VITE_DRIVE_PROFILE_ENABLED === 'true' && readWorkerConfig(env).configured;
}
interface Dependencies {
  env: Record<string, unknown>;
  // Mandatory audited catalogue codec; never a legacy Progress/defaults decoder.
  validate: (value: unknown) => CosmeticProgress;
  identity?: () => { uid: string | null; generation: number };
  transport?: typeof fetch;
  operationId?: () => string;
}
export interface PreparedProfileCommand {
  readonly operationId: string;
  // Reuse this same object after an ambiguous failure; no auto retries, rebasing, queue or localStorage.
  execute(): Promise<{ revision: number }>;
}

// Detached factory with no App or wallet imports; identity changes invalidate this instance.
export function createDriveProfileClient(dependencies: Dependencies) {
  const config = readWorkerConfig(dependencies.env);
  if (!driveProfileConfigured(dependencies.env) || typeof dependencies.validate !== 'function') return fail('disabled');
  const validate = dependencies.validate;
  const identity = dependencies.identity ?? (() => ({ uid: getBrowserUser()?.uid ?? null, generation: getBrowserIdentityGeneration() }));
  const captured = { ...identity() };
  if (!captured.uid || !/^[0-9]{1,255}$/.test(captured.uid) || !Number.isSafeInteger(captured.generation)) return fail('identity');
  const transport = dependencies.transport ?? fetch;
  const newId = dependencies.operationId ?? (() => crypto.randomUUID());
  const usedIds = new Set<string>();
  let busy = false;
  const guard = () => {
    const current = identity();
    if (current.uid !== captured.uid || current.generation !== captured.generation) return fail('identity');
  };
  const request = async (body?: string) => {
    guard();
    if (busy) return fail('busy');
    busy = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('drive-client-account-v1:' + captured.uid)));
      const accountBinding = btoa(String.fromCharCode(...digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      guard();
      const response = await transport(config.origin + '/profile', {
        method: body === undefined ? 'GET' : 'POST', credentials: 'include', cache: 'no-store', redirect: 'error', signal: controller.signal,
        headers: { 'X-Stonktrooper-Client': 'browser', 'X-Stonktrooper-Account': accountBinding, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body }),
      });
      guard(); // An old 401 must not sign a different account out.
      if (!response.ok) {
        await response.body?.cancel();
        return fail(response.status === 429 ? 'limited' : response.status === 412 ? 'identity' : response.status === 401 ? 'reauth' : response.status === 409 ? 'conflict'
          : response.status === 400 || response.status === 415 ? 'invalid' : 'unavailable');
      }
      if (response.status !== 200 || response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return fail('invalid');
      const reader = response.body?.getReader();
      if (!reader) return fail('invalid');
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          guard();
          if (done) break;
          size += value.byteLength;
          if (size > 65536) { await reader.cancel(); return fail('invalid'); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      let data: unknown;
      try { data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { return fail('invalid'); }
      guard();
      return data;
    } catch (error) {
      guard();
      throw error instanceof ProfileClientError ? error : new ProfileClientError('unavailable');
    } finally { clearTimeout(timeout); controller.abort(); busy = false; }
  };
  const prepare = (command: { type: 'provision' } | { type: 'equip'; revision: number; slot: CosmeticSlot; itemId: string }
    | { type: 'claim-reward'; revision: number; eventId: string }): PreparedProfileCommand => {
    guard();
    // Bound in-memory operation count; no unbounded queue or persistent receipts.
    if (usedIds.size >= 100) return fail('busy');
    const operationId = newId();
    if (typeof operationId !== 'string' || !/^[A-Za-z0-9_-]{16,80}$/.test(operationId) || usedIds.has(operationId)) return fail('invalid');
    usedIds.add(operationId);
    const body = JSON.stringify({ ...command, operationId });
    // An already owned reward is acknowledged without a write, so its receipt keeps the revision.
    const expected = command.type === 'provision' ? [1] : command.type === 'claim-reward' ? [command.revision, command.revision + 1] : [command.revision + 1];
    return Object.freeze({ operationId, async execute() {
      const receipt = exact(await request(body), ['revision']);
      if (!revision(receipt.revision) || !expected.includes(receipt.revision)) return fail('invalid');
      return { revision: receipt.revision };
    } });
  };
  return {
    async read(): Promise<ProfileResult> {
      const value = await request();
      if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('invalid');
      const state = (value as Record<string, unknown>).state;
      if (state === 'unprovisioned' || state === 'recovery-required') {
        exact(value, ['state']); return { state };
      }
      const data = exact(value, ['state', 'revision', 'progress']);
      if (state !== 'existing' || !revision(data.revision)) return fail('invalid');
      let progress: CosmeticProgress;
      try { progress = validate(data.progress); } catch { return fail('invalid'); }
      guard();
      return { state, revision: data.revision, progress };
    },
    prepareProvision() { return prepare({ type: 'provision' }); },
    async resumeProvision(): Promise<{ revision: number }> {
      const receipt = exact(await request(JSON.stringify({ type: 'resume-provision' })), ['revision']);
      if (receipt.revision !== 1) return fail('invalid');
      return { revision: 1 };
    },
    // Claim the Monthly Squeeze reward; the client names only the event and the server decides the rest.
    prepareClaimReward(baseRevision: number, eventId: string) {
      if (!revision(baseRevision) || baseRevision >= Number.MAX_SAFE_INTEGER - 1 || typeof eventId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(eventId)) return fail('invalid');
      return prepare({ type: 'claim-reward', revision: baseRevision, eventId });
    },
    prepareEquip(baseRevision: number, slot: CosmeticSlot, itemId: string) {
      if (!revision(baseRevision) || baseRevision >= Number.MAX_SAFE_INTEGER - 1 || !slots.includes(slot)
        || (!(slot === 'pets' && itemId === '') && !identifier(itemId))) return fail('invalid');
      return prepare({ type: 'equip', revision: baseRevision, slot, itemId });
    },
  };
}