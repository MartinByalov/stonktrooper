import type { Candle } from './types';
import type { MarketKnot, MarketRegime } from './marketPath';

// Keep ample history for interpolation, companions, surprises and the camera.
// Multiples of 210 preserve the grid (10), rocket coins (3), and the printer
// gap-bridge decoration (2, 3, 7) across a coordinate translation.
export const CHART_HISTORY = 512;
export const CHART_COMPACT_AT = 2048;

// Fill before physics, including after a mode restores an older chart snapshot.
// Keep the snapshot frontier current until its trailing graph scrolls away.
export function ensureChartAhead(
  g: { C: Candle[]; printerSaved: Candle[] | null },
  x: number, viewportWidth: number, candleWidth: number,
  generate: (index: number) => void,
): void {
  const required = Math.floor(x / candleWidth) + Math.ceil(viewportWidth / 0.65 / candleWidth) + 20;
  while (g.C.length < required) {
    const index = g.C.length;
    generate(index);
    if (g.C.length <= index) throw new Error('Candle generator failed to extend the chart');
  }
  if (g.printerSaved) {
    while (g.printerSaved.length < g.C.length) {
      g.printerSaved.push(g.C[g.printerSaved.length]);
    }
  }
}

const indexKeys = ['lastBig', 'lastSpike', 'lastHole', 'lastShock', 'lastBellIndex',
  'nextZone', 'nextTallCandle', 'bellDescentStart', 'bellDescentEnd', 'volatilityEvent',
  'nextCoinIndex', 'nextBanknoteIndex', 'nextBanana', 'nextFedora', 'hawkStartIndex',
  'hawkFrontier', 'rocketCoinFrontier', 'zeroCrashIndex'] as const;
const positionKeys = ['cx', 'printerStartX', 'printerEndX', 'printerProgress'] as const;

export type ChartWindowState = Record<typeof indexKeys[number] | typeof positionKeys[number], number> & {
  C: Candle[];
  candleOffset: number;
  p: { x: number } | null;
  marketPath: MarketKnot[];
  marketRegimes: MarketRegime[];
  marketEvents: { index: number }[];
  printerSaved: Candle[] | null;
  pickups: { x: number }[];
  swans: { x: number }[];
  animals: { x: number }[];
  cases: { x: number }[];
  popups: { x: number }[];
  spits: { x: number }[];
  pigeonDrops: { x: number }[];
  flyingFedora: { x: number } | null;
};

// Translation only: retained candles are never regenerated or shuffled. Scores,
// timers, velocities and printer-turn distances are deliberately left alone.
export function compactChartWindow(g: ChartWindowState, candleWidth: number): number {
  if (!g.p || g.p.x / candleWidth < CHART_COMPACT_AT) return 0;
  const removed = Math.floor((Math.floor(g.p.x / candleWidth) - CHART_HISTORY) / 210) * 210;
  const shift = removed * candleWidth;
  g.C.splice(0, removed);
  g.printerSaved?.splice(0, removed);
  g.candleOffset += removed;
  g.p.x -= shift;
  for (const key of indexKeys) g[key] -= removed;
  for (const key of positionKeys) g[key] -= shift;
  for (const collection of [g.pickups, g.swans, g.animals, g.cases, g.popups, g.spits, g.pigeonDrops]) {
    for (const entity of collection) entity.x -= shift;
  }
  if (g.flyingFedora) g.flyingFedora.x -= shift;
  for (const event of g.marketEvents) event.index -= removed;

  // Retain the predecessor needed for interpolation and the current regime.
  let firstKnot = 0;
  while (firstKnot + 1 < g.marketPath.length && g.marketPath[firstKnot + 1].index <= removed) firstKnot++;
  g.marketPath.splice(0, firstKnot);
  for (const knot of g.marketPath) knot.index -= removed;
  let firstRegime = 0;
  while (firstRegime + 1 < g.marketRegimes.length && g.marketRegimes[firstRegime].end <= removed) firstRegime++;
  g.marketRegimes.splice(0, firstRegime);
  for (const regime of g.marketRegimes) { regime.start -= removed; regime.end -= removed; }
  return removed;
}