import { randomDelay } from './randomTiming';

type TrackPickup = 'coin' | 'banana' | 'fedora';

// Distances are in candles, not frames. Event drops and rocket coins have
// their own schedules and are intentionally unaffected.
const spacing: Record<TrackPickup, { first: [number, number]; normal: [number, number]; hard: [number, number] }> = {
  coin: { first: [25, 60], normal: [25, 95], hard: [10, 32] },
  banana: { first: [170, 370], normal: [170, 780], hard: [170, 420] },
  fedora: { first: [180, 350], normal: [280, 630], hard: [280, 630] },
};

export const trackPickupDelay = (type: TrackPickup, phase: 'first' | 'normal' | 'hard', random = Math.random): number =>
  randomDelay(...spacing[type][phase], random);