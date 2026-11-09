import { squeezeEventScope, validSqueezeEvent, type SqueezeEvent } from './monthlySqueeze';

// Serializable detached state for a future Drive document; never seed it from Guest counters.
export interface SqueezeProgress {
  version: 1;
  scope: string;
  accountId: string;
  liquidations: ReadonlyArray<Readonly<{ id: string; at: number }>>;
}

export function newSqueezeProgress(event: SqueezeEvent, accountId: string): SqueezeProgress {
  if (!validSqueezeEvent(event) || !/^[0-9]{1,255}$/.test(accountId)) throw new Error('Invalid Squeeze progress scope');
  return { version: 1, scope: squeezeEventScope(event), accountId, liquidations: [] };
}

export function validSqueezeProgress(value: unknown, event: SqueezeEvent, accountId: string): value is SqueezeProgress {
  if (!validSqueezeEvent(event) || !value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as SqueezeProgress;
  if (Reflect.ownKeys(data).length !== 4 || data.version !== 1 || data.scope !== squeezeEventScope(event)
    || !/^[0-9]{1,255}$/.test(accountId) || data.accountId !== accountId || !Array.isArray(data.liquidations)
    || data.liquidations.length > event.threshold) return false;
  return data.liquidations.every(item => !!item && typeof item === 'object' && Reflect.ownKeys(item).length === 2
    && typeof item.id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(item.id)
    && Number.isSafeInteger(item.at) && item.at >= event.startsAt && item.at < event.endsAt)
    && new Set(data.liquidations.map(item => item.id)).size === data.liquidations.length;
}

// Call once per accepted gameplay death; the caller owns action IDs, identity and CAS.
export function recordSqueezeLiquidation(state: SqueezeProgress, event: SqueezeEvent, accountId: string,
  action: Readonly<{ id: string; at: number }>, now: number): SqueezeProgress {
  if (!validSqueezeProgress(state, event, accountId)) throw new Error('Invalid Squeeze progress');
  if (!action || typeof action.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(action.id)
    || !Number.isSafeInteger(action.at) || !Number.isSafeInteger(now)) throw new Error('Invalid Squeeze liquidation');
  if (now < event.startsAt || now >= event.endsAt || action.at < event.startsAt || action.at >= event.endsAt
    || action.at > now || state.liquidations.length >= event.threshold || state.liquidations.some(item => item.id === action.id)) return state;
  return { ...state, liquidations: [...state.liquidations, { id: action.id, at: action.at }] };
}