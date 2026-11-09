import { getBrowserUser, getBrowserIdentityGeneration } from './browserIdentity';
import { readWorkerConfig } from './workerConfig';
import { readSqueezeEvent } from '../shared/monthlySqueezeConfig';
import { browserSqueezeStorage } from './monthlySqueezeStorage';
import { createMonthlySqueezeClient } from './monthlySqueezeClient';
import { createMonthlySqueezeProgressClient } from './monthlySqueezeProgressClient';
import { createMonthlySqueezeGameplay } from './monthlySqueezeGameplay';

let active: ReturnType<typeof createMonthlySqueezeGameplay> | undefined;
let scope = '';
function current() {
  const env = import.meta.env;
  if (env.VITE_MONTHLY_SQUEEZE_GAMEPLAY_ENABLED !== 'true' || env.VITE_MONTHLY_SQUEEZE_ENABLED !== 'true') return undefined;
  const uid = getBrowserUser()?.uid, generation = getBrowserIdentityGeneration();
  const event = readSqueezeEvent(env.VITE_MONTHLY_SQUEEZE_EVENT), config = readWorkerConfig(env);
  if (!uid || !event || !config.configured) { active = undefined; scope = ''; return undefined; }
  const nextScope = JSON.stringify([uid, generation, event, config.origin]);
  if (nextScope !== scope) {
    scope = nextScope;
    const client = createMonthlySqueezeProgressClient({ env, event });
    const contribution = createMonthlySqueezeClient({ env, event });
    active = createMonthlySqueezeGameplay({ event, uid, origin: config.origin, storage: browserSqueezeStorage(),
      identity: () => ({ uid: getBrowserUser()?.uid ?? null, generation: getBrowserIdentityGeneration() }),
      read: client.read, prepareSave: client.prepareSave, consider: contribution.consider, retryContribution: contribution.retry });
  }
  return active;
}
let runOwner: ReturnType<typeof createMonthlySqueezeGameplay> | undefined;
// Called only by normal browser gameplay; native/Guest/preview paths never call.
export async function prepareMonthlyGameplay() { const controller = current(); if (controller && !controller.status.ready) await controller.restore(); }
export function monthlyGameplayAction(type: 'start' | 'death' | 'revive' | 'finish', id?: string) {
  try {
    const controller = current();
    if (type === 'start') { runOwner = controller; if (id) controller?.start(id); }
    else if (controller && controller === runOwner) {
      if (type === 'death') controller.death();
      else if (type === 'revive') controller.revive();
      else { controller.finish(); runOwner = undefined; }
    }
  } catch { /* Monthly failure never breaks the base game. Inspect explicit debug status. */ }
}
export const monthlyGameplayDebug = {
  status: () => current()?.status,
  flush: () => current()?.flush(),
  restore: () => current()?.restore(true),
  recoverConflict: () => current()?.recoverConflict(),
  retryContribution: () => current()?.retryContribution(),
};
// Opt-in local tester control, absent from production bundles unless DEV.
if (import.meta.env.DEV && import.meta.env.VITE_MONTHLY_SQUEEZE_GAMEPLAY_ENABLED === 'true') {
  Object.assign(window, { monthlySqueezeTest: monthlyGameplayDebug });
}