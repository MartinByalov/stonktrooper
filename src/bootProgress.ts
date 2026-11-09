// Real startup progress for the boot screen. Each completed stage moves the
// briefcase further along its track; the flight never loops. Both boot screens
// (static HTML and React) read the same --boot-progress variable.
export const BOOT_STAGES = {
  script: 0.3,
  network: 0.42,
  player: 0.58,
  recovery: 0.72,
  save: 0.9,
  ready: 1,
} as const;
export type BootStage = keyof typeof BOOT_STAGES;

let current = 0;
const apply = (value: number) => {
  current = value;
  document.documentElement.style.setProperty('--boot-progress', String(value));
};

export function reportBootStage(stage: BootStage): void {
  const value = BOOT_STAGES[stage];
  if (value > current) apply(value);
}

// A new connection attempt (for example after returning online) starts the
// flight again from the point where the app itself is already loaded.
export function restartBootProgress(): void {
  apply(BOOT_STAGES.script);
}

// How long the flight takes to reach the end before the boot screen hides.
export const BOOT_FINISH_MS = 380;
