import { validSqueezeEvent, type SqueezeEvent } from './monthlySqueeze';

// Explicit JSON configuration only. Never infer a live month from local time.
export function readSqueezeEvent(raw: unknown): SqueezeEvent | undefined {
  try {
    if (typeof raw !== 'string' || raw.length > 1024) return undefined;
    const event = JSON.parse(raw) as SqueezeEvent;
    if (!validSqueezeEvent(event) || Reflect.ownKeys(event).length !== 5) return undefined;
    return Object.freeze({ ...event });
  } catch { return undefined; }
}