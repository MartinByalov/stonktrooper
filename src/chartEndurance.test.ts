import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { stripTypeScriptTypes } from 'node:module';
import * as market from './marketPath';
import * as pacing from './pacing';
import * as rules from './gameRules';
import { randomDelay } from './randomTiming';
import { candleSurpriseDelay } from './candleSurprise';
import { trackPickupDelay } from './pickupTiming';
import { endingPrinterCandle, printerSourceCandle } from './printerTrack';
import { hawkCandle } from './hawkTrack';
import { compactChartWindow, CHART_COMPACT_AT } from './chartWindow';
import type { ChartWindowState } from './chartWindow';

// Execute the actual production generator/reset, not a simplified simulation.
// React is replaced only by identity useCallback and a plain ref; no DOM needed.
const source = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
function generator() {
  const constants = source.slice(source.indexOf('const W ='), source.indexOf('export const CandleGame:'))
    .replace(/^export\s+/gm, '');
  const state = source.slice(source.indexOf('  const gameRef = useRef({'), source.indexOf('  const lvOf ='))
    .replace('useRef({', '({ current: {').replace(/\}\);\s*$/, '} });');
  const functions = source.slice(source.indexOf('  const lvOf ='), source.indexOf('  const die ='));
  const dependencies = { ...market, ...pacing, ...rules, randomDelay, trackPickupDelay, candleSurpriseDelay };
  const code = stripTypeScriptTypes(`function create() { ${constants}\nconst state = 'play';
    const useCallback = (fn: unknown) => fn; ${state}\n${functions}
    initGame(); return { g: gameRef.current, genCandle }; }`);
  return new Function(...Object.keys(dependencies), `${code}; return create();`)(...Object.values(dependencies)) as {
    g: ChartWindowState & { lastC: number; lastTop: number; difficultyActive: boolean; score: number; nextTallCandle: number };
    genCandle: (index: number) => void;
  };
}

const seededRandom = (seed: number) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};

const enduranceCandles = Number(process.env.STONKS_ENDURANCE_CANDLES ?? 1_000_000);
if (!Number.isSafeInteger(enduranceCandles) || enduranceCandles < 1_000_000) {
  throw new Error('STONKS_ENDURANCE_CANDLES must be a safe integer of at least 1000000');
}

test('production candles remain valid, fresh and bounded through an extended run', () => {
  const originalRandom = Math.random;
  try {
    Math.random = seededRandom(8731);
    const { g, genCandle } = generator();
    g.difficultyActive = true;
    g.nextTallCandle = g.C.length + 60;
    const signatures = new Set<string>();
    const shapes = new Set<string>();
    let compacted = 0, barriers = 0, gaps = 0;
    let maxCandles = 0, maxKnots = 0, maxRegimes = 0, maxPickups = 0, maxEvents = 0;
    let block: string[] = [];
    for (let n = 0; n < enduranceCandles; n++) {
      const i = g.C.length;
      genCandle(i);
      const c = g.C[i];
      assert(c && [c.o, c.c, c.h, c.l, c.top, c.bot, c.v].every(Number.isFinite));
      if (c.hole) gaps++;
      else {
        assert(c.h <= c.top && c.top <= c.bot && c.bot <= c.l);
        assert.equal(c.top, Math.min(c.o, c.c));
        assert.equal(c.bot, Math.max(c.o, c.c));
        shapes.add(c.k);
      }
      if (c.doubleJumpBarrier) barriers++;
      // Translation-independent shape signature, including colour and wicks.
      block.push([c.k, c.hole, c.c - c.o, c.top - c.h, c.l - c.bot].join(','));
      if (block.length === 32) {
        const signature = block.join('|');
        assert(!signatures.has(signature), `repeated 32-candle segment at ${n}`);
        signatures.add(signature);
        block = [];
      }
      // Keep the production look-ahead distance while advancing a virtual runner.
      g.p!.x = (g.C.length - 350) * 9;
      g.cx = g.p!.x - 250;
      const beforeX = g.p!.x, beforeCamera = g.cx;
      const frontier = g.C.at(-1);
      const absoluteIndex = g.candleOffset + Math.floor(g.p!.x / 9);
      const removed = compactChartWindow(g, 9);
      if (removed) {
        compacted++;
        assert.equal(g.C.at(-1), frontier);
        assert.equal(g.p!.x - g.cx, beforeX - beforeCamera);
        assert.equal(g.candleOffset + Math.floor(g.p!.x / 9), absoluteIndex);
      }
      // Production entity cleanup is separate from terrain generation.
      g.pickups = g.pickups.filter(p => p.x >= g.p!.x - 100);
      g.marketEvents = g.marketEvents.filter(e => e.index * 9 >= g.p!.x - 150);
      maxCandles = Math.max(maxCandles, g.C.length);
      maxKnots = Math.max(maxKnots, g.marketPath.length);
      maxRegimes = Math.max(maxRegimes, g.marketRegimes.length);
      maxPickups = Math.max(maxPickups, g.pickups.length);
      maxEvents = Math.max(maxEvents, g.marketEvents.length);
      assert(g.C.length < CHART_COMPACT_AT + 351);
      assert(g.marketPath.length < 150 && g.marketRegimes.length < 150);
      assert(g.pickups.length < 1000 && g.marketEvents.length < 100);
    }
    assert(compacted > 600 && barriers > 1000 && gaps > 100);
    assert(signatures.size > 30_000);
    assert(shapes.size >= 10);
    assert.equal(signatures.size, Math.floor(enduranceCandles / 32));
    console.log(`Endurance: ${enduranceCandles} candles; ${signatures.size} unique 32-candle blocks; ${compacted} compactions; ${barriers} barriers; ${gaps} gap candles.`);
    console.log(`Peak retained objects: ${maxCandles} candles, ${maxKnots} market knots, ${maxRegimes} regimes, ${maxPickups} pickups, ${maxEvents} events.`);
  } finally { Math.random = originalRandom; }
});

test('multiple random streams continue across repeated chart-window boundaries', () => {
  const originalRandom = Math.random;
  const endings = new Set<string>();
  try {
    for (const seed of [1, 2, 15, 90, 8731, 65535, 2147483647, 4294967295]) {
      Math.random = seededRandom(seed);
      const { g, genCandle } = generator();
      g.difficultyActive = true;
      let compactions = 0;
      for (let n = 0; n < 25_000; n++) {
        genCandle(g.C.length);
        const c = g.C.at(-1)!;
        assert([c.o, c.c, c.h, c.l, c.top, c.bot, c.v].every(Number.isFinite), `seed ${seed}, candle ${n}`);
        if (!c.hole) assert(c.h <= c.top && c.top <= c.bot && c.bot <= c.l);
        g.p!.x = (g.C.length - 350) * 9;
        const absolute = g.candleOffset + Math.floor(g.p!.x / 9);
        if (compactChartWindow(g, 9)) compactions++;
        assert.equal(g.candleOffset + Math.floor(g.p!.x / 9), absolute);
        g.pickups = g.pickups.filter(p => p.x >= g.p!.x - 100);
        g.marketEvents = g.marketEvents.filter(e => e.index * 9 >= g.p!.x - 150);
        assert(g.C.length < CHART_COMPACT_AT + 351);
      }
      assert(compactions >= 15, `seed ${seed} crosses repeated window boundaries`);
      endings.add(JSON.stringify(g.C.slice(-64)));
    }
    assert.equal(endings.size, 8, 'independent long runs have different final chart sections');
  } finally { Math.random = originalRandom; }
});

test('independent production runs do not reuse chart segments', () => {
  const originalRandom = Math.random;
  const signatures = new Set<string>();
  try {
    for (let seed = 1; seed <= 40; seed++) {
      Math.random = seededRandom(seed);
      const { g } = generator();
      signatures.add(JSON.stringify(g.C.slice(40, 100)));
    }
    assert.equal(signatures.size, 40);
  } finally { Math.random = originalRandom; }
});

test('market sampling clamps outside its range rather than jumping to the first knot', () => {
  const knots = [{ index: 0, height: 320, volatility: 1 }, { index: 20, height: 100, volatility: 2 }];
  assert.deepEqual(market.sampleMarketPath(knots, 21), { height: 100, volatility: 2 });
  assert.deepEqual(market.sampleMarketPath(knots, -5), { height: 320, volatility: 1 });
  assert.deepEqual(market.sampleMarketPath([], 0), { height: 320, volatility: 1 });
});

test('compaction preserves production continuation exactly, including random schedules', () => {
  const originalRandom = Math.random;
  try {
    Math.random = seededRandom(15);
    const first = generator();
    Math.random = seededRandom(15);
    const reference = generator();
    first.g.difficultyActive = reference.g.difficultyActive = true;
    Math.random = seededRandom(18);
    for (let i = first.g.C.length; i < 2400; i++) first.genCandle(i);
    Math.random = seededRandom(18);
    for (let i = reference.g.C.length; i < 2400; i++) reference.genCandle(i);
    first.g.p!.x = 2100 * 9;
    const removed = compactChartWindow(first.g, 9);
    assert(removed > 0);
    const after = seededRandom(90);
    Math.random = after;
    for (let n = 0; n < 1000; n++) first.genCandle(first.g.C.length);
    Math.random = seededRandom(90);
    for (let n = 0; n < 1000; n++) reference.genCandle(reference.g.C.length);
    assert.deepEqual(first.g.C, reference.g.C.slice(removed));
    assert.equal(first.g.lastC, reference.g.lastC);
    assert.equal(first.g.lastTop, reference.g.lastTop);
  } finally { Math.random = originalRandom; }
});

test('compaction preserves printer, hawk, entities, camera and current market samples', () => {
  const { g, genCandle } = generator();
  while (g.C.length < 2500) genCandle(g.C.length);
  g.p!.x = 2100 * 9;
  g.cx = g.p!.x - 250;
  g.printerSaved = g.C.slice();
  g.printerStartX = g.p!.x - 300;
  g.printerEndX = g.p!.x + 1500;
  g.printerProgress = g.p!.x;
  g.hawkStartIndex = 2000;
  const index = 2150;
  g.printerSaved[index] = { ...g.printerSaved[index], hole: true };
  const sourceCandle = printerSourceCandle(g.printerSaved, index)!;
  const turns = [{ x: 0, angle: 0, radius: 180 }, { x: 3000, angle: 6, radius: 230 }];
  const printer = endingPrinterCandle(sourceCandle, index * 9, g.printerStartX, g.printerEndX, turns, 1);
  const hawk = hawkCandle(g.C[index], index - g.hawkStartIndex, 400);
  const sample = market.sampleMarketPath(g.marketPath, index);
  const regime = market.marketRegimeAt(g.marketRegimes, index);
  for (const key of ['pickups', 'swans', 'animals', 'cases', 'popups', 'spits', 'pigeonDrops'] as const) g[key] = [{ x: index * 9 }];
  g.flyingFedora = { x: index * 9 };
  const removed = compactChartWindow(g, 9);
  const local = index - removed;
  assert.deepEqual(market.sampleMarketPath(g.marketPath, local), sample);
  assert.equal(market.marketRegimeAt(g.marketRegimes, local), regime);
  assert.deepEqual(endingPrinterCandle(printerSourceCandle(g.printerSaved!, local)!, local * 9, g.printerStartX, g.printerEndX, turns, 1), printer);
  assert.deepEqual(hawkCandle(g.C[local], local - g.hawkStartIndex, 400), hawk);
  for (const collection of [g.pickups, g.swans, g.animals, g.cases, g.popups, g.spits, g.pigeonDrops]) assert.equal(collection[0].x, local * 9);
  assert.equal(g.flyingFedora!.x, local * 9);
});

test('runtime rebases aim with the chart, keeps absolute score, and excludes captured boss arena', () => {
  assert.match(source, /g\.score = Math\.max\(g\.score, g\.candleOffset \+ Math\.floor\(g\.p\.x \/ CW\)\)/);
  assert.match(source, /if \(!bossTrack\.current\) \{\s*const removed = compactChartWindow\(g, CW\);\s*if \(removed && aimRef\.current\) aimRef\.current\.x -= removed \* CW;/);
  assert.match(source, /regime: LEVELS\[lvOf\(Math\.floor\(g\.p\.x \/ CW\)\)\]\.t/);
});