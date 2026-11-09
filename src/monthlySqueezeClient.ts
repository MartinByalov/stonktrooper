import { getBrowserUser, getBrowserIdentityGeneration } from './browserIdentity';
import { readWorkerConfig } from './workerConfig';
import { createMonthlySqueezeGate } from './monthlySqueezeGate';
import { browserSqueezeStorage, createSqueezeConfirmationStore, type SqueezeStorage } from './monthlySqueezeStorage';
import { qualifyingSqueezeProgress, type SqueezeEvent, type SqueezeReceipt } from '../shared/monthlySqueeze';

export class SqueezeClientError extends Error {
  constructor(public code: 'disabled' | 'identity' | 'invalid' | 'reauth' | 'inactive' | 'unavailable') {
    super(`Monthly Squeeze: ${code}`);
  }
}
interface Options {
  env: Record<string, unknown>;
  event: SqueezeEvent;
  confirmed?: boolean;
  identity?: () => { uid: string | null; generation: number };
  transport?: typeof fetch;
  // null explicitly disables device persistence (isolated tests/private sessions).
  storage?: SqueezeStorage | null;
}

// Detached composition: no App callback or status polling. Local confirmation
// is only an optimization; the server remains authoritative for contributions.
export function createMonthlySqueezeClient(options: Options) {
  const config = readWorkerConfig(options.env);
  if (options.env.VITE_MONTHLY_SQUEEZE_ENABLED !== 'true' || !config.configured) throw new SqueezeClientError('disabled');
  const event = Object.freeze({ ...options.event });
  const identity = options.identity ?? (() => ({ uid: getBrowserUser()?.uid ?? null, generation: getBrowserIdentityGeneration() }));
  const captured = { ...identity() }, transport = options.transport ?? fetch;
  if (!captured.uid || !/^[0-9]{1,255}$/.test(captured.uid) || !Number.isSafeInteger(captured.generation)) throw new SqueezeClientError('identity');
  const confirmations = createSqueezeConfirmationStore(options.storage === undefined ? browserSqueezeStorage() : options.storage ?? undefined,
    config.origin, captured.uid, event);
  const guard = () => {
    const current = identity();
    if (current.uid !== captured.uid || current.generation !== captured.generation) throw new SqueezeClientError('identity');
  };
  // Same negative account precondition as the shared session adapter. Not auth.
  const binding = crypto.subtle.digest('SHA-256', new TextEncoder().encode('drive-client-account-v1:' + captured.uid))
    .then(bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
  return createMonthlySqueezeGate({ enabled: true, event, confirmed: options.confirmed === true || confirmations.read(), identity,
    async submit(input): Promise<SqueezeReceipt> {
      guard();
      if (input.eventId !== event.id || input.achievementId !== event.achievementId
        || !qualifyingSqueezeProgress(input.progress, event.threshold)) throw new SqueezeClientError('invalid');
      const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
      let response: Response | undefined;
      try {
        const account = await binding; guard();
        response = await transport(config.origin + '/monthly-squeeze/contribution', { method: 'POST', credentials: 'include',
          redirect: 'error', cache: 'no-store', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', 'X-Stonktrooper-Client': 'browser', 'X-Stonktrooper-Account': account },
          body: JSON.stringify(input) });
        guard();
        if (response.status !== 200) throw new SqueezeClientError(response.status === 401 ? 'reauth' : response.status === 412 ? 'identity'
          : response.status === 409 ? 'inactive' : response.status === 400 || response.status === 415 ? 'invalid' : 'unavailable');
        if (response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new SqueezeClientError('invalid');
        const reader = response.body?.getReader();
        if (!reader) throw new SqueezeClientError('invalid');
        const chunks: Uint8Array[] = []; let size = 0;
        try {
          for (;;) {
            const { value, done } = await reader.read(); guard();
            if (done) break;
            size += value.byteLength;
            if (size > 512) { await reader.cancel(); throw new SqueezeClientError('invalid'); }
            chunks.push(value);
          }
        } finally { reader.releaseLock(); }
        const bytes = new Uint8Array(size); let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        let receipt: SqueezeReceipt;
        try { receipt = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
        catch { throw new SqueezeClientError('invalid'); }
        guard();
        if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt) || Reflect.ownKeys(receipt).length !== 2
          || receipt.eventId !== event.id || receipt.contributed !== true) throw new SqueezeClientError('invalid');
        guard();
        confirmations.confirm();
        return receipt;
      } catch (error) {
        guard();
        throw error instanceof SqueezeClientError ? error : new SqueezeClientError('unavailable');
      } finally {
        clearTimeout(timeout); controller.abort();
        if (response?.body && !response.body.locked) await response.body.cancel().catch(() => {});
      }
    },
  });
}