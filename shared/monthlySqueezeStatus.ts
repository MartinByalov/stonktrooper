// Public status of one Monthly Squeeze event: counts and a flag only, no account data.
export interface SqueezeStatus {
  eventId: string;
  participants: number;
  target: number;
  unlocked: boolean;
}

const eventIdPattern = /^[A-Za-z0-9_-]{1,100}$/;

// Strict parse of a response body. Anything unexpected is rejected, never repaired.
export function readSqueezeStatus(value: unknown): SqueezeStatus | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const data = value as Record<string, unknown>;
  const keys = Reflect.ownKeys(data);
  if (keys.length !== 4 || ['eventId', 'participants', 'target', 'unlocked'].some(key => !Object.hasOwn(data, key))) return undefined;
  if (typeof data.eventId !== 'string' || !eventIdPattern.test(data.eventId)) return undefined;
  if (!Number.isSafeInteger(data.participants) || Number(data.participants) < 0) return undefined;
  if (!Number.isSafeInteger(data.target) || Number(data.target) < 1) return undefined;
  if (typeof data.unlocked !== 'boolean' || data.unlocked !== (Number(data.participants) >= Number(data.target))) return undefined;
  return Object.freeze({ eventId: data.eventId, participants: Number(data.participants), target: Number(data.target), unlocked: data.unlocked });
}
