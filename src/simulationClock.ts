export interface SimulationClock { previousTime: number; accumulator: number }
export const SIMULATION_STEP_SECONDS = 1 / 60;
export const MAX_FRAME_SECONDS = .1;

// DOM-free fixed-step scheduler; the host resets the clock for hidden tabs instead of simulating.
export function resetSimulationClock(clock: SimulationClock): void {
  clock.previousTime = 0; clock.accumulator = 0;
}
export function advanceSimulationClock(clock: SimulationClock, now: number, step: () => void): number {
  if (!Number.isFinite(now) || now < 0 || !Number.isFinite(clock.previousTime)
    || !Number.isFinite(clock.accumulator) || clock.accumulator < 0) throw new Error('Invalid simulation clock');
  const delta = clock.previousTime ? Math.max(0, Math.min((now - clock.previousTime) / 1000, MAX_FRAME_SECONDS)) : 0;
  clock.previousTime = now;
  clock.accumulator += delta;
  let steps = 0;
  while (clock.accumulator >= SIMULATION_STEP_SECONDS) {
    step(); steps++;
    clock.accumulator -= SIMULATION_STEP_SECONDS;
  }
  return steps;
}