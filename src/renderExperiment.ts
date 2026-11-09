export const renderModes = ['full', 'chart', 'actors', 'ui', 'hero', 'pickups', 'enemies', 'effects', 'none'] as const;
export type RenderMode = typeof renderModes[number];
let mode: RenderMode = 'full';

export const renderExperimentEnabled = (search: string): boolean => new URLSearchParams(search).get('debug') === 'render';
export const getRenderMode = (): RenderMode => mode;
export const setRenderMode = (next: RenderMode): void => { mode = next; };
export const renderLayers = (value: RenderMode) => ({
  chart: value === 'full' || value === 'chart',
  actors: ['full', 'actors', 'hero', 'pickups', 'enemies', 'effects'].includes(value),
});

export const actorLayers = (value: RenderMode) => ({
  hero: value === 'full' || value === 'actors' || value === 'hero',
  pickups: value === 'full' || value === 'actors' || value === 'pickups',
  enemies: value === 'full' || value === 'actors' || value === 'enemies',
  effects: value === 'full' || value === 'actors' || value === 'effects',
});

export const frameIntervalSummary = (values: number[]) => {
  if (!values.length) return 'waiting';
  const sorted = [...values].sort((a, b) => a - b);
  const hz = 1000 * values.length / values.reduce((total, value) => total + value, 0);
  return `${hz.toFixed(1)} callbacks/s · p95 ${sorted[Math.floor(sorted.length * .95)].toFixed(1)} ms · n=${values.length}`;
};