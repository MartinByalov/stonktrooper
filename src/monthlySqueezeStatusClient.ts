import { readWorkerConfig } from './workerConfig';
import { browserSqueezeStorage, type SqueezeStorage } from './monthlySqueezeStorage';
import { validSqueezeEvent, type SqueezeEvent } from '../shared/monthlySqueeze';
import { readSqueezeStatus, type SqueezeStatus } from '../shared/monthlySqueezeStatus';

export class SqueezeStatusError extends Error {
  constructor(public code: 'disabled' | 'unavailable') { super(`Monthly Squeeze status: ${code}`); }
}
// The last known number is shown immediately on load; the network is asked at most
// this often, and never again once the goal is reached.
export const STATUS_TTL_MS = 10 * 60_000;
// After a failed request, do not ask again for this long.
export const STATUS_RETRY_MS = 5 * 60_000;
const MAX_BODY = 512;

export interface SqueezeStatusView { status?: SqueezeStatus; ownCounted: boolean }
interface Options {
  env: Record<string, unknown>;
  event: SqueezeEvent;
  transport?: typeof fetch;
  // null disables device persistence (isolated tests / private sessions).
  storage?: SqueezeStorage | null;
  clock?: () => number;
}
interface Saved { version: 1; status: SqueezeStatus | null; fetchedAt: number; attemptAt: number; ownCounted: boolean }

// Public group progress for the Home card. Works for Guests: no identity, no cookie,
// no custom header (so no CORS preflight). Frequency is bounded by design:
//   - the cached value is shown at load with zero requests;
//   - a request is made only when the cache is older than STATUS_TTL_MS;
//   - the browser's own HTTP cache (max-age=60) answers repeats within a minute;
//   - once unlocked, no request is ever made again;
//   - the player's own contribution is added locally, with no extra request.
export function createSqueezeStatusClient(options: Options) {
  const config = readWorkerConfig(options.env);
  if (options.env.VITE_MONTHLY_SQUEEZE_ENABLED !== 'true' || !config.configured || !validSqueezeEvent(options.event)) throw new SqueezeStatusError('disabled');
  const event = Object.freeze({ ...options.event });
  const transport = options.transport ?? fetch, clock = options.clock ?? Date.now;
  const storage = options.storage === undefined ? browserSqueezeStorage() : options.storage ?? undefined;
  const key = 'cr_squeeze_status_v1:' + encodeURIComponent(JSON.stringify([config.origin, event.id, event.achievementId, event.threshold, event.startsAt, event.endsAt]));
  let state: Saved = { version: 1, status: null, fetchedAt: 0, attemptAt: 0, ownCounted: false };
  try {
    const raw = storage?.getItem(key);
    if (raw) {
      const saved = JSON.parse(raw) as Saved, status = saved.status === null ? undefined : readSqueezeStatus(saved.status);
      if (saved.version === 1 && Reflect.ownKeys(saved).length === 5 && (saved.status === null || status?.eventId === event.id)
        && Number.isSafeInteger(saved.fetchedAt) && Number.isSafeInteger(saved.attemptAt) && typeof saved.ownCounted === 'boolean') {
        state = { version: 1, status: status ?? null, fetchedAt: saved.fetchedAt, attemptAt: saved.attemptAt, ownCounted: saved.ownCounted };
      }
    }
  } catch { /* A damaged cache is ignored; the next refresh rebuilds it. */ }
  const listeners = new Set<(view: SqueezeStatusView) => void>();
  let inflight: Promise<SqueezeStatusView> | undefined;
  const view = (): SqueezeStatusView => ({ status: state.status ?? undefined, ownCounted: state.ownCounted });
  const commit = () => {
    try { storage?.setItem(key, JSON.stringify(state)); } catch { /* Memory copy still serves this page. */ }
    for (const listener of listeners) listener(view());
  };
  const build = (participants: number, target: number): SqueezeStatus =>
    Object.freeze({ eventId: event.id, participants, target, unlocked: participants >= target });

  async function fetchStatus(): Promise<SqueezeStatus> {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10000);
    try {
      // credentials omitted and no custom headers: a simple request, no preflight.
      const response = await transport(config.origin + '/monthly-squeeze/status', { method: 'GET', credentials: 'omit',
        redirect: 'error', cache: 'default', signal: controller.signal });
      if (response.status !== 200 || response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new SqueezeStatusError('unavailable');
      const text = await response.text();
      if (text.length > MAX_BODY) throw new SqueezeStatusError('unavailable');
      const status = readSqueezeStatus(JSON.parse(text));
      if (!status || status.eventId !== event.id) throw new SqueezeStatusError('unavailable');
      return status;
    } catch (error) { throw error instanceof SqueezeStatusError ? error : new SqueezeStatusError('unavailable'); }
    finally { clearTimeout(timeout); }
  }

  return {
    // Synchronous, no network: what the card shows the moment the page loads.
    read: view,
    subscribe(listener: (view: SqueezeStatusView) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    refresh(force = false): Promise<SqueezeStatusView> {
      const now = clock();
      if (state.status?.unlocked) return Promise.resolve(view());
      if (inflight) return inflight;
      if (!force && state.status && now >= state.fetchedAt && now - state.fetchedAt < STATUS_TTL_MS) return Promise.resolve(view());
      if (!force && now >= state.attemptAt && now - state.attemptAt < STATUS_RETRY_MS && state.attemptAt > state.fetchedAt) return Promise.resolve(view());
      state = { ...state, attemptAt: now };
      inflight = fetchStatus().then(fetched => {
        // Counts only grow: never show fewer than already shown (this keeps the
        // player's own locally added contribution until the server catches up).
        const participants = Math.max(fetched.participants, state.status?.participants ?? 0);
        state = { ...state, status: build(participants, fetched.target), fetchedAt: clock() };
        commit(); return view();
      }, error => { commit(); throw error; }).finally(() => { inflight = undefined; });
      inflight.catch(() => {});
      return inflight;
    },
    // The player's own contribution was just confirmed by the server: show it at once,
    // without another request. A later server count replaces it when it includes it.
    noteOwnContribution(): SqueezeStatusView {
      if (!state.ownCounted && state.status && !state.status.unlocked) {
        state = { ...state, ownCounted: true, status: build(state.status.participants + 1, state.status.target) };
        commit();
      } else if (!state.ownCounted) { state = { ...state, ownCounted: true }; commit(); }
      return view();
    },
  };
}
