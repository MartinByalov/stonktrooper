import { newSqueezeProgress, recordSqueezeLiquidation, validSqueezeProgress, type SqueezeProgress } from '../shared/monthlySqueezeProgress';
import { squeezeEventScope, type SqueezeEvent } from '../shared/monthlySqueeze';
import type { SqueezeSave } from './monthlySqueezeProgressClient';
import type { SqueezeStorage } from './monthlySqueezeStorage';
import { ProfileClientError } from './driveProfileClient';

interface Options {
  event: SqueezeEvent; uid: string; origin: string; storage?: SqueezeStorage;
  identity: () => { uid: string | null; generation: number };
  read: () => Promise<{ revision: number; progress: SqueezeProgress }>;
  prepareSave: (input: SqueezeSave) => { execute(): Promise<{ revision: number }> };
  consider: (state: SqueezeProgress) => Promise<unknown>;
  retryContribution: () => Promise<unknown>;
  clock?: () => number; operationId?: () => string;
}

// No polling or retry timer; the journal is scoped per account, API and event, never Guest.
export function createMonthlySqueezeGameplay(options: Options) {
  const event = Object.freeze({ ...options.event }), captured = { ...options.identity() };
  if (captured.uid !== options.uid) throw new Error('Squeeze account changed');
  const key = 'cr_squeeze_actions_v1:' + encodeURIComponent(JSON.stringify([options.origin, options.uid, squeezeEventScope(event)]));
  const clock = options.clock ?? Date.now, operationId = options.operationId ?? (() => crypto.randomUUID());
  let state = newSqueezeProgress(event, options.uid), revision = 0, ready = false, busy = false, blocked = false;
  let queued: { id: string; at: number }[] = [], pending: SqueezeSave | undefined;
  let handle: ReturnType<Options['prepareSave']> | undefined;
  let restoreAttempted = false;
  let error: unknown;
  let run: { id: string; generation: number; phase: number; dead: boolean } | undefined;
  const guard = () => {
    const current = options.identity();
    if (current.uid !== captured.uid || current.generation !== captured.generation) throw new Error('Squeeze account changed');
  };
  const persist = () => {
    guard();
    // Failure stops remote writes rather than claiming crash-safe retry storage.
    if (!options.storage) throw new Error('Monthly journal storage unavailable');
    options.storage.setItem(key, JSON.stringify({ version: 1, state, queued, pending: pending ?? null }));
  };
  const merge = (base: SqueezeProgress) => {
    let result = base;
    for (const action of queued) result = recordSqueezeLiquidation(result, event, options.uid, action, clock());
    return result;
  };
  const flush = async (explicit = false) => {
    guard(); if (!ready || busy || (blocked && !explicit)) return;
    busy = true;
    try {
      if (!pending && !queued.length) {
        if (explicit) { await options.consider(state); guard(); }
        return;
      }
      if (!pending) pending = { operationId: operationId(), revision, actions: queued.map(action => ({ ...action })) };
      persist();
      handle ??= options.prepareSave(pending);
      const receipt = await handle.execute(); guard();
      revision = receipt.revision;
      const savedIds = new Set(pending.actions.map(action => action.id));
      queued = queued.filter(action => !savedIds.has(action.id)); pending = undefined; handle = undefined;
      persist(); blocked = false; error = undefined;
      // Only the normal gate may qualify, and only after Drive acknowledged the monthly batch.
      if (!queued.length) await options.consider(state); guard();
    } catch (failure) { blocked = true; error = failure; throw failure; }
    finally {
      busy = false;
      // Drain only a NEW unsent batch, never retry a failed/ambiguous operation.
      if (!blocked && queued.length && (queued.length >= 10 || state.liquidations.length === event.threshold)) void flush().catch(() => {});
    }
  };
  return {
    async restore(explicit = false) {
      guard(); if (ready || busy || (restoreAttempted && !explicit)) return;
      restoreAttempted = true;
      busy = true;
      try {
        const raw = options.storage?.getItem(key);
        if (raw) {
          const journal = JSON.parse(raw);
          if (!journal || Reflect.ownKeys(journal).length !== 4 || journal.version !== 1
            || !validSqueezeProgress(journal.state, event, options.uid) || !Array.isArray(journal.queued)
            || journal.queued.length > 100 || journal.queued.some((action: { id: string; at: number }) =>
              !action || Reflect.ownKeys(action).length !== 2 || typeof action.id !== 'string'
              || !/^[A-Za-z0-9_-]{1,100}$/.test(action.id) || !Number.isSafeInteger(action.at)
              || action.at < event.startsAt || action.at >= event.endsAt)
            || new Set(journal.queued.map((action: { id: string }) => action.id)).size !== journal.queued.length) throw new Error('Invalid monthly journal; existing data preserved');
          state = journal.state; queued = journal.queued;
          if (journal.pending !== null) {
            const candidate = journal.pending as SqueezeSave;
            if (!candidate || Reflect.ownKeys(candidate).length !== 3 || !Array.isArray(candidate.actions)
              || candidate.actions.some(action => !queued.some(item => item.id === action.id && item.at === action.at))) throw new Error('Invalid pending monthly operation');
            handle = options.prepareSave(candidate); pending = structuredClone(candidate); blocked = true;
          }
        }
        const cloud = await options.read(); guard();
        if (!validSqueezeProgress(cloud.progress, event, options.uid)) throw new Error('Invalid monthly restore');
        revision = cloud.revision; state = merge(cloud.progress); ready = true; persist();
        if (!pending && !queued.length) await options.consider(state);
      } catch (failure) { blocked = true; error = failure; throw failure; }
      finally { busy = false; }
    },
    async recoverConflict() {
      guard();
      // A timeout is not permission to abandon an exact payload; retry it explicitly after reload.
      if (!ready || busy || !pending || !blocked || !(error instanceof ProfileClientError) || error.code !== 'conflict') {
        throw new Error('Confirmed monthly conflict required; retry the exact pending operation first');
      }
      busy = true;
      const previous = { state, revision, queued, pending, handle, error };
      try {
        const cloud = await options.read(); guard();
        if (!Number.isSafeInteger(cloud.revision) || cloud.revision <= pending.revision
          || !validSqueezeProgress(cloud.progress, event, options.uid)) throw new Error('Invalid monthly conflict restore');
        const saved = new Map(cloud.progress.liquidations.map(action => [action.id, action.at]));
        if (queued.some(action => saved.has(action.id) && saved.get(action.id) !== action.at)) {
          throw new Error('Monthly action identity mismatch; existing journal preserved');
        }
        queued = queued.filter(action => !saved.has(action.id));
        state = merge(cloud.progress); revision = cloud.revision;
        pending = undefined; handle = undefined;
        // Retire the rejected payload only after its replacement journal is durable.
        persist(); blocked = false; error = undefined;
      } catch (failure) {
        state = previous.state; revision = previous.revision; queued = previous.queued;
        pending = previous.pending; handle = previous.handle;
        blocked = true; error = previous.error;
        throw failure;
      } finally { busy = false; }
      // No automatic flush, contribution or run reset. Caller decides when to save.
    },
    start(id: string) { guard(); run = ready ? { id, generation: captured.generation, phase: 0, dead: false } : undefined; },
    revive() { guard(); if (run?.dead) { run.dead = false; run.phase++; } },
    death() {
      guard(); if (!ready || !run || run.dead) return;
      run.dead = true;
      const now = clock();
      const id = run.id + '-' + run.phase;
      const next = recordSqueezeLiquidation(state, event, options.uid, { id, at: now }, now);
      if (next === state) return;
      state = next; queued.push({ id, at: now });
      try { persist(); } catch (failure) { blocked = true; error = failure; return; }
      if (queued.length >= 10 || state.liquidations.length === event.threshold) void flush().catch(() => {});
    },
    finish() { guard(); run = undefined; },
    // Explicit tester/recovery controls; never called by a retry timer.
    flush: () => flush(true),
    retryContribution: () => { guard(); return options.retryContribution(); },
    get status() { return { ready, busy, blocked, error, count: state.liquidations.length, queued: queued.length, pending: !!pending }; },
  };
}