// Regression checks for gameRules.
import assert from 'node:assert/strict';
import { pigeonDropsPrinter, printerTrackOffset } from './gameRules';

test('pigeon printer drop is guaranteed during testing and crossed tracks stay continuous', () => {
  assert(pigeonDropsPrinter(0));
  assert(pigeonDropsPrinter(0.0149));
  assert(pigeonDropsPrinter(0.015));
  assert(pigeonDropsPrinter(0.9));
  assert(pigeonDropsPrinter(0.999999));
  assert.equal(printerTrackOffset(0), 0);
  for (let x = 0; x < 2000; x++) {
    assert(Math.abs(printerTrackOffset(x)) <= 65);
    assert(Math.abs(printerTrackOffset(x + 1) - printerTrackOffset(x)) < 1);
  }
});
import { aimedHitDefeatsEnemy, canCatchBossBell, bellDescentTop } from './gameRules';

test('bell descent has irregular solid landing levels below the bell', () => {
  for (const launch of [-500, 0, 300]) {
    for (let step = 1; step <= 36; step++) {
      const low = bellDescentTop(launch, step, 0);
      const high = bellDescentTop(launch, step, 1);
      assert(Number.isFinite(low));
      assert(high > low);
      assert(low > launch);
      if (step >= 24) assert(low > launch + 90 + 50);
    }
  }
});

test('boss bell contact triggers regardless of landing or jump counters, except in a rocket', () => {
  assert(canCatchBossBell(0, 0));
  assert(canCatchBossBell(0, 20));
  assert(canCatchBossBell(0, 25.9));
  assert(!canCatchBossBell(50, 20));
  assert(!canCatchBossBell(0, 26));
  assert(!canCatchBossBell(0, 30));
});

test('mounted enemies require two aimed hits while ordinary enemies require one', () => {
  for (const mount of ['bear', 'bull'] as const) {
    const enemy = { mount, aimedHits: 0 };
    assert.equal(aimedHitDefeatsEnemy(enemy), false);
    assert.equal(aimedHitDefeatsEnemy(enemy), true);
  }
  assert.equal(aimedHitDefeatsEnemy({}), true);
});
import { test } from 'node:test';
import { getTickerNews } from './news';

test('meme ticker stories avoid immediate repeats and never spawn enemies', () => {
  let previous = '';
  for (let i = 0; i < 100; i++) {
    const news = getTickerNews(previous);
    assert.notEqual(news.headline, previous);
    assert.equal(news.spawnType, undefined);
    assert(news.headline.length > 0);
    previous = news.headline;
  }
});
import { canLandOnTrack, doubleJumpChargeOnLanding, whaleDropsBanknote, ROCKET_SPEED_MULTIPLIER, absorbEnemyHit, isBlockedByTallCandle, arcadeProfit } from './gameRules';
import { readFileSync } from 'node:fs';

test('double jump charge follows marked ground on landing, not a previous yellow zone', () => {
  const candles = [{ sp: true }, { sp: false }, { hole: true, sp: true }, { sp: false }];
  assert(doubleJumpChargeOnLanding(candles, 0, 0));
  assert(doubleJumpChargeOnLanding(candles, 0, 1), 'a yellow candle under the footprint charges the jump');
  assert.equal(doubleJumpChargeOnLanding(candles, 1, 1), false, 'ordinary ground clears the charge');
  assert.equal(doubleJumpChargeOnLanding(candles, 2, 3), false, 'a yellow gap does not charge the jump');
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /if \(bestCandle\) \{[\s\S]*?g\.p\.doubleReady = doubleJumpChargeOnLanding\(g\.C, i0, i1\);/);
});
import { trackHeightAt, animalTrackHeightAt } from './track';
import { drawAnimalCharacter } from './animalRenderer';
import { drawPickupAsset, drawApeAsset, drawApeHead, APE_SCALE } from './assetRenderer';
import { extendMarketPath, sampleMarketPath, MarketKnot, candleVolatilityBoost, extendMarketRegimes, marketRegimeAt, MarketRegime } from './marketPath';
import type { Candle, Animal } from './types';

test('grounded runner follows connected uphill and downhill steps', () => {
  assert(canLandOnTrack(false, 0, 300, 301, 350));
  assert(canLandOnTrack(false, 0, 350, 351, 280));
});

test('bulls and bears leap over gaps and land while whales bridge them', () => {
  const candles = [{ top: 100 }, { hole: true }, { top: 160 }] as Candle[];
  for (const type of ['bull', 'bear', 'whale'] as const) {
    assert.equal(animalTrackHeightAt(type, candles, 4.5, 9, 0), 100);
    assert.equal(animalTrackHeightAt(type, candles, 22.5, 9, 0), 160);
    assert.equal(animalTrackHeightAt(type, candles, 13.5, 9, 0), 90);
    assert.equal(animalTrackHeightAt(type, [], 10, 9, 77), 77);
    const wideGap = [{ top: 100 }, { hole: true }, { hole: true }, { hole: true }, { top: 100 }] as Candle[];
    assert.equal(animalTrackHeightAt(type, wideGap, 22.5, 9, 0), 50);
  }
  assert.equal(animalTrackHeightAt('whale', candles, 13.5, 9, 0), 90);
  assert.equal(trackHeightAt(candles, 13.5, 9, 0), 130);
});

test('current arcade profit uses pips times current price and can decrease', () => {
  assert.equal(arcadeProfit(200, 12.5), 2500);
  assert.equal(arcadeProfit(100, 12.5), 1250);
  assert.equal(arcadeProfit(3, 1.235), 3.71);
  assert.equal(arcadeProfit(100, -5), 0);
  assert(arcadeProfit(100, 15) < arcadeProfit(200, 12.5));
});

test('shield consumes one charge and lets the same animal pass without knockback', () => {
  for (const type of ['bull', 'bear']) {
    const player = { carry: 200, x: 100, y: 320, vy: 0, air: false };
    const enemy = { type, x: 110, y: 295, shieldPassed: false };
    assert(absorbEnemyHit(player, enemy));
    assert.equal(player.carry, 0);
    assert.equal(enemy.shieldPassed, true);
    assert.equal(enemy.x, 110);
    assert.equal(player.vy, 0);
    assert.equal(player.air, false);
    for (let frame = 0; frame < 60; frame++) assert(absorbEnemyHit(player, enemy));
    assert(!absorbEnemyHit(player, { shieldPassed: false }));
  }
});

test('an absorbed enemy does not consume a newly collected shield', () => {
  const player = { carry: 100 };
  assert(absorbEnemyHit(player, { shieldPassed: true }));
  assert.equal(player.carry, 100);
});

test('bag never absorbs an enemy hit or loses its timer on impact', () => {
  const player = { carry: 300, shieldKind: 'bag' };
  const enemy = { shieldPassed: false };
  assert(!absorbEnemyHit(player, enemy));
  assert.equal(player.carry, 300);
  assert.equal(enemy.shieldPassed, false);
});

test('new bag, banana, ape and whale assets render without errors', () => {
  let calls = 0;
  const context = new Proxy({}, {
    get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop: () => { calls++; } }) : () => { calls++; },
    set: () => true,
  }) as CanvasRenderingContext2D;
  for (const type of ['bag', 'banana'] as const) {
    drawPickupAsset(context, { type, x: 0, y: 0, taken: false }, 0, 0);
  }
  drawApeAsset(context, 0.5);
  drawApeAsset(context, 0.5, true);
  drawApeHead(context);
  assert(APE_SCALE < 1);
  drawAnimalCharacter(context, { type: 'whale', phase: 0.5 } as Animal);
  assert(calls > 50);
});

test('ape arms and legs change through the running cycle while seated pose stays stable', () => {
  const points: number[][] = [];
  const context = new Proxy({}, {
    get: (_, key) => key === 'lineTo' ? (...args: number[]) => points.push(args)
      : key === 'createLinearGradient' ? () => ({ addColorStop: () => {} }) : () => {},
    set: () => true,
  }) as CanvasRenderingContext2D;
  const pose = (phase: number, seated = false) => {
    points.length = 0;
    drawApeAsset(context, phase, seated);
    return points.map(point => [...point]);
  };
  assert.notDeepEqual(pose(Math.PI / 2), pose(Math.PI * 1.5));
  assert.deepEqual(pose(0, true), pose(Math.PI / 2, true));
});

test('ape throwing pose differs from running and follows the target direction', () => {
  const points: number[][] = [];
  const context = new Proxy({}, {
    get: (_, key) => key === 'lineTo' ? (...args: number[]) => points.push(args)
      : key === 'createLinearGradient' ? () => ({ addColorStop: () => {} }) : () => {},
    set: () => true,
  }) as CanvasRenderingContext2D;
  const pose = (timer: number, direction: number) => {
    points.length = 0;
    drawApeAsset(context, 0, false, timer, direction);
    return points.map(point => [...point]);
  };
  assert.notDeepEqual(pose(0, 1), pose(15, 1));
  assert.notDeepEqual(pose(15, 1), pose(15, -1));
});

test('tall green candle blocks running and a single jump but allows a cleared double jump', () => {
  assert(isBlockedByTallCandle(true, 320, 165));
  assert(isBlockedByTallCandle(true, 220, 165));
  assert(!isBlockedByTallCandle(true, 160, 165));
  assert(!isBlockedByTallCandle(false, 320, 165));
});

test('swept landing catches fast falls but never snaps a rising jump', () => {
  assert(canLandOnTrack(true, 50, 250, 360, 320));
  assert(!canLandOnTrack(true, -8, 340, 330, 320));
  assert(!canLandOnTrack(true, 8, 380, 388, 320));
});

test('rocket bridge interpolates gaps and speed exceeds running speed', () => {
  const candles = [{ top: 100 }, { hole: true, top: 1e9 }, { top: 160 }] as Candle[];
  assert.equal(trackHeightAt(candles, 13.5, 9, 0), 130);
  assert.equal(trackHeightAt([], 0, 9, 77), 77);
  assert(ROCKET_SPEED_MULTIPLIER > 1);
});

test('banknote drop probability has a five percent threshold', () => {
  assert(whaleDropsBanknote(0));
  assert(whaleDropsBanknote(0.049));
  assert(!whaleDropsBanknote(0.05));
  assert(!whaleDropsBanknote(0.99));
});

test('market paths vary with random input and interpolate continuously', () => {
  const first: MarketKnot[] = [];
  const second: MarketKnot[] = [];
  extendMarketPath(first, 1000, () => 0.2);
  extendMarketPath(second, 1000, () => 0.8);
  assert.notDeepEqual(first, second);
  for (let i = 0; i < 1000; i++) {
    const current = sampleMarketPath(first, i);
    const next = sampleMarketPath(first, i + 1);
    assert(Number.isFinite(current.height));
    assert(Math.abs(next.height - current.height) < 10);
    assert(current.volatility >= 0.7 && current.volatility <= 2.5);
  }
});

test('market starts at the zero-price baseline and grows without a fixed height ceiling', () => {
  const knots: MarketKnot[] = [];
  extendMarketPath(knots, 3000, () => 0.5);
  assert.equal(knots[0].height, 320);
  assert(sampleMarketPath(knots, 3000).height < -1000);
  assert(knots.every((knot, i) => i === 0 || knot.height < knots[i - 1].height));
});

test('market regimes vary in order and duration instead of repeating a fixed cycle', () => {
  const first: MarketRegime[] = [];
  const second: MarketRegime[] = [];
  extendMarketRegimes(first, 1500, () => 0.2);
  extendMarketRegimes(second, 1500, () => 0.8);
  assert.notDeepEqual(first, second);
  assert.notEqual(first[0].end, second[0].end);
  assert.notEqual(marketRegimeAt(first, 0), marketRegimeAt(second, 0));
  first.forEach((segment, i) => {
    assert(segment.end > segment.start);
    if (i) assert.equal(segment.start, first[i - 1].end);
    assert.equal(marketRegimeAt(first, segment.start), segment.level);
  });
});

test('volatility periods enlarge varied candles and return to normal after the event', () => {
  assert.equal(candleVolatilityBoost(171, 200), 1);
  assert.equal(candleVolatilityBoost(200, 200), 2.2);
  assert.equal(candleVolatilityBoost(224, 200), 2.2);
  assert.equal(candleVolatilityBoost(225, 200), 1);
  const bodies = [2, 7, 18, 30];
  const volatile = bodies.map(body => body * candleVolatilityBoost(200, 200));
  assert.equal(new Set(volatile).size, bodies.length);
  assert(volatile.every((body, i) => body > bodies[i]));
});

test('both characters retain two feet through walking and bat attack phases', () => {
  const rectangles: number[][] = [];
  const context = new Proxy({}, {
    get: (_, key) => key === 'fillRect' ? (...args: number[]) => rectangles.push(args)
      : key === 'createLinearGradient' ? () => ({ addColorStop: () => {} }) : () => {},
    set: () => true,
  }) as CanvasRenderingContext2D;
  for (const type of ['bear', 'bull'] as const) {
    for (const attackTimer of [0, 22, 10, 5, 1]) {
      rectangles.length = 0;
      drawAnimalCharacter(context, { type, phase: 1, attackTimer, isCharging: true } as Animal);
      assert.equal(rectangles.filter(r => r[1] === -4 && r[2] === 10 && r[3] === 4).length, 2);
    }
  }
});