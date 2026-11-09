import { getBrowserUser, getBrowserIdentityGeneration } from './browserIdentity';
import { readWorkerConfig } from './workerConfig';
import { validSqueezeEvent, type SqueezeEvent } from '../shared/monthlySqueeze';
import { validSqueezeProgress } from '../shared/monthlySqueezeProgress';
import { ProfileClientError } from './driveProfileClient';

export interface SqueezeSave { operationId: string; revision: number; actions: { id: string; at: number }[] }
export function createMonthlySqueezeProgressClient(options: {
  env: Record<string, unknown>; event: SqueezeEvent;
  identity?: () => { uid: string | null; generation: number }; transport?: typeof fetch;
}) {
  const config = readWorkerConfig(options.env), event = Object.freeze({ ...options.event });
  const fail = (code: ConstructorParameters<typeof ProfileClientError>[0]): never => { throw new ProfileClientError(code); };
  if (!config.configured || options.env.VITE_MONTHLY_SQUEEZE_ENABLED !== 'true' || !validSqueezeEvent(event)) return fail('disabled');
  const identity = options.identity ?? (() => ({ uid: getBrowserUser()?.uid ?? null, generation: getBrowserIdentityGeneration() }));
  const captured = { ...identity() }, transport = options.transport ?? fetch;
  if (!captured.uid || !/^[0-9]{1,255}$/.test(captured.uid)) return fail('identity');
  const guard = () => { const current = identity(); if (current.uid !== captured.uid || current.generation !== captured.generation) fail('identity'); };
  let busy = false;
  const request = async (body: string): Promise<Record<string, unknown>> => {
    guard(); if (busy) return fail('busy'); busy = true;
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
    let response: Response | undefined;
    try {
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('drive-client-account-v1:' + captured.uid)));
      const binding = btoa(String.fromCharCode(...digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      guard();
      response = await transport(config.origin + '/monthly-squeeze/progress', { method: 'POST', credentials: 'include', redirect: 'error', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-Stonktrooper-Client': 'browser', 'X-Stonktrooper-Account': binding }, body });
      guard();
      if (response.status !== 200) return fail(response.status === 401 ? 'reauth' : response.status === 412 ? 'identity'
        : response.status === 409 ? 'conflict' : response.status === 429 ? 'limited' : response.status === 400 ? 'invalid' : 'unavailable');
      if (response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return fail('invalid');
      const reader = response.body?.getReader(); if (!reader) return fail('invalid');
      let size = 0; const chunks: Uint8Array[] = [];
      try {
        for (;;) {
          const { done, value } = await reader.read(); guard(); if (done) break;
          size += value.byteLength; if (size > 32768) { await reader.cancel(); return fail('invalid'); } chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const result: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); guard();
      if (!result || typeof result !== 'object' || Array.isArray(result)) return fail('invalid');
      return result as Record<string, unknown>;
    } catch (error) { guard(); throw error instanceof ProfileClientError ? error : new ProfileClientError('unavailable'); }
    finally { clearTimeout(timeout); controller.abort(); busy = false; if (response?.body && !response.body.locked) await response.body.cancel().catch(() => {}); }
  };
  return {
    async read() {
      const result = await request(JSON.stringify({ type: 'read' }));
      if (Reflect.ownKeys(result).length !== 2 || !Number.isSafeInteger(result.revision) || Number(result.revision) < 1
        || !validSqueezeProgress(result.progress, event, captured.uid!)) return fail('invalid');
      return { revision: Number(result.revision), progress: result.progress };
    },
    prepareSave(input: SqueezeSave) {
      guard();
      if (!input || !/^[A-Za-z0-9_-]{16,80}$/.test(input.operationId) || !Number.isSafeInteger(input.revision) || input.revision < 1
        || !Array.isArray(input.actions) || !input.actions.length || input.actions.length > 100
        || input.actions.some(action => !action || !/^[A-Za-z0-9_-]{1,100}$/.test(action.id) || !Number.isSafeInteger(action.at)
          || action.at < event.startsAt || action.at >= event.endsAt)
        || new Set(input.actions.map(action => action.id)).size !== input.actions.length) return fail('invalid');
      const body = JSON.stringify({ operationId: input.operationId, revision: input.revision, actions: input.actions.map(({ id, at }) => ({ id, at })) });
      const expectedRevision = input.revision + 1;
      return Object.freeze({ async execute() {
        const receipt = await request(body);
        if (Reflect.ownKeys(receipt).length !== 1 || receipt.revision !== expectedRevision) return fail('invalid');
        return { revision: Number(receipt.revision) };
      } });
    },
  };
}