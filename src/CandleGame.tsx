// Browser game module for CandleGame.
import { drawPigeonStain } from './pigeonStain';
import { briefcaseColors, drawCharacterHat, drawPickupAsset, drawSwanAsset, drawApeAsset, drawApeHead, drawHumanHead, drawFallingCharacter, APE_SCALE } from './assetRenderer';
import React, { useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { briefcaseArmPose } from './characterPose';
import { randomDelay } from './randomTiming';
import { lethalBirdContact } from './birdCollision';
import { stepHawkFlight } from './hawkFlight';
import { trackPickupDelay } from './pickupTiming';
import { compactChartWindow, ensureChartAhead } from './chartWindow';
import { applyCandleSurprise, SURPRISE_MIN_GAP, SURPRISE_MAX_GAP, candleSurpriseDelay, SURPRISE_RETRY_FRAMES } from './candleSurprise';
import { stepTenderFall, tenderLanding } from './tenderFall';
import { randomBirdCargo, canReleaseBirdCargo } from './birdCargo';
import { MobileJoystick } from './MobileJoystick';
import { drawDumpster } from './dumpsterRenderer';
import { hawkBagThrowPose } from './hawkBagThrow';
import { swanBagPose } from './swanBag';
import { printerFallRotation } from './printerFall';
import { aimedVelocity, pointerToWorld, plotViewY, AimPoint } from './aim';
import { chartViewport, chartToScreen, screenToChart } from './chartViewport';
import { pigeonDropsPrinter } from './gameRules';
import { extendPrinterTurns, endingPrinterCandle, printerSourceCandle, printerCrossingPose, printerEnemyPose, printerProfileFlip, rightEdgeSpawnX, PrinterTurn } from './printerTrack';
import { aimedHitDefeatsEnemy, dismountRider, canCatchBossBell, bellDescentTop } from './gameRules';
import { GameState, Candle, Player, Pickup, Swan, Animal, Briefcase, MarketEvent, MarketLevel, ActiveNews, ScorePopup } from './types';
import { sound } from './audio';
import { activityMultiplier, enemyPips } from './scoring';
import { hawkCandle, hawkDropBudget, hawkSpeedMultiplier } from './hawkTrack';
import { zeroCrashCamera, zeroCrashComplete } from './zeroCrash';
import { canSpawnEncounter, shouldPlaceBell, WARMUP_CANDLES, difficultyUnlocked, chartPrice, marketReachedZero } from './pacing';
import { pigeonFlightY, stepPigeonDrop, PigeonDrop } from './pigeonEffects';
import { createBossArena, sidewaysTops } from './boxingRules';
import { drawBossEncounter } from './bossRenderer';
import { drawBossHero } from './bossHeroRenderer';
import { ApeCompanion, addCompanion, tickCompanions } from './companions';
import { getRandomNews, getTickerNews, formatFeedHeadline, MarketNews } from './news';
import { trackHeightAt, animalTrackHeightAt, animalFallsInGap, rocketTrackPose } from './track';
import { FEDORA_DURATION, FEDORA_WINDUP, FEDORA_MAX_THROWS, addFedoraTime, weaponHatCount, fedoraArmPose, fedoraHit, fedoraHitsMount, separateFedoraMount, stepFlyingFedora, type FlyingFedora } from './fedoraBoomerang';
import { drawSpinningFedora } from './fedoraRenderer';
import { bagDrainPenalty, enemyMovementSpeed, canLandOnTrack, canRecoverSolidLanding, doubleJumpChargeOnLanding, whaleDropsBanknote, BAG_PIPS_PENALTY, APE_DURATION, APE_THROW_INTERVAL, ROCKET_SPEED_MULTIPLIER, absorbEnemyHit, isBlockedByTallCandle, arcadeProfit } from './gameRules';
import { ANIMAL_CENTER, animalHeight, drawAnimalCharacter } from './animalRenderer';
import { extendMarketPath, sampleMarketPath, MarketKnot, MARKET_BASELINE, candleVolatilityBoost, extendMarketRegimes, marketRegimeAt, MarketRegime } from './marketPath';

interface CandleGameProps {
  candleDemo?: boolean;
  printerRequest?: number;
  invertedRequest?: number;
  onInvertedActivated?: () => void;
  hawkRequest?: number;
  onHawkActivated?: () => void;
  onPrinterActivated?: () => void;
  bossEncounter: { current: import('./boxingRules').BossArena | null };
  theme: 'dark' | 'light';
  state: GameState;
  onStateChange: (state: GameState) => void;
  onScoreUpdate: (stats: {
    totalScore: number;
    score: number;
    coins: number;
    diamonds: number;
    banknotes: number;
    swanHits: number;
    animalHits: number;
    regime: string;
    cycle: number;
    cycleProgress: number;
    isDiamondHands: boolean;
    diamondRemainingFrames: number;
    isRocketMode: boolean;
    rocketRemainingFrames: number;
  }) => void;
  onGameOver: (cause: string, finalScore: number) => void;
}

const W = 1920;
const H = 840;
const TAPE_HEIGHT = 48;
const TIME_AXIS_HEIGHT = 12;
const AX = 64;   // Price axis width on right
const CW = 9;    // Candlestick width in pixels

// UI is never zoomed; the plot has its own shared, invertible world transform.
export const mobileCanvasZoom = (): number => 1;

const currentChartViewport = (display?: { width: number; height: number }) => chartViewport(
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches, W, H, AX,
  display,
);

// High-DPI canvases are disproportionately expensive on phones. Keep desktop
// capture crisp, but cap the mobile backing store so the game spends its frame
// budget on gameplay rather than filling millions of mostly invisible pixels.
const canvasPixelRatio = (): number => {
  if (typeof window === 'undefined') return 1;
  const dpr = window.devicePixelRatio || 1;
  return window.matchMedia('(max-width: 767px) and (pointer: coarse)').matches
    ? Math.min(dpr, 1.5)
    : Math.min(dpr, 2);
};

const zoomCanvasPoint = (client: AimPoint, rect: { left: number; top: number; width: number; height: number }, zoom: number): AimPoint => {
  const x = (client.x - rect.left) / rect.width * W;
  const y = (client.y - rect.top) / rect.height * H;
  // The render zoom is anchored at the top edge so the enlarged Live Feed
  // remains visible instead of being cropped by a centered transform.
  return { x: (x - W / 2) / zoom + W / 2, y: y / zoom };
};
const CAP = 50;
const LEN = 360; // Candlesticks per market cycle
const HX = 250;  // Hero camera offset from left

// Move the camera, never the sprite alone: visuals and pickup contact must agree.
const heroCameraOffset = (): number => {
  if (typeof window === 'undefined' || !window.matchMedia('(pointer: coarse)').matches) return HX;
  return currentChartViewport().x;
};

const GREEN = '#26a69a';
const RED = '#ef5350';

const LEVELS: MarketLevel[] = [
  { n: 'Normal market', t: 'NORMAL', tint: '#142637', bull: 0.52, vol: 9, description: 'Calm cyclical baseline' },
  { n: 'Crash pressure', t: 'CRASH', tint: '#33151e', bull: 0.22, vol: 13, description: 'Downward volatility' },
  { n: 'Short squeeze', t: 'SQUEEZE', tint: '#153326', bull: 0.80, vol: 12, description: 'Bullish squeeze' },
  { n: 'Recovery', t: 'RECOVERY', tint: '#20213b', bull: 0.54, vol: 10, description: 'Market consolidation' }
];

const CANDLE_PATTERNS: [string, number, (v: number) => [number, number, number]][] = [
  ['Candle', 35, (v) => [v * (0.35 + Math.random() * 0.65), Math.random() * 0.5 * v, Math.random() * 0.5 * v]],
  ['Marubozu', 10, (v) => [(0.8 + Math.random() * 0.8) * v, 0, 0]],
  ['Doji', 8, (v) => [0, 3 + Math.random() * 0.5 * v, 3 + Math.random() * 0.5 * v]],
  ['Long-legged Doji', 4, (v) => [0, (0.5 + Math.random() * 0.5) * v, (0.5 + Math.random() * 0.5) * v]],
  ['Dragonfly Doji', 3, (v) => [0, 0, (0.6 + Math.random() * 0.6) * v]],
  ['Gravestone Doji', 3, (v) => [0, (0.6 + Math.random() * 0.6) * v, 0]],
  ['Hammer', 7, (v) => [2 + Math.random() * 0.3 * v, Math.random() * 1.2, (1.1 + Math.random() * 0.7) * v]],
  ['Shooting Star', 6, (v) => [2 + Math.random() * 0.3 * v, (1.1 + Math.random() * 0.7) * v, Math.random() * 1.2]],
  ['Spinning Top', 6, (v) => [2 + Math.random() * 0.25 * v, (0.4 + Math.random() * 0.4) * v, (0.4 + Math.random() * 0.4) * v]],
  ['Engulfing', 7, (v) => [(1.2 + Math.random() * 0.7) * v, Math.random() * 0.3 * v, Math.random() * 0.3 * v]]
];

const R = (a: number, b: number) => a + Math.random() * (b - a);

// Slower, enjoyable pacing for readable gameplay
const price = (y: number) => chartPrice(y, MARKET_BASELINE).toFixed(2);
const pad = (n: number) => String(n).padStart(2, '0');

export const CandleGame: React.FC<CandleGameProps> = ({
  theme,
  state,
  onStateChange,
  onScoreUpdate,
  onGameOver,
  bossEncounter,
  printerRequest = 0,
  invertedRequest = 0,
  onInvertedActivated,
  onPrinterActivated,
  candleDemo = false,
  hawkRequest = 0,
  onHawkActivated
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const headerFeedRef = useRef<HTMLCanvasElement | null>(null);
  const headerFeedActive = useRef(false);
  const headerFeedLayout = useRef({ height: 32, width: W, mainHeight: H });
  const feedLayout = useRef({ mobile: false, fontSize: 11, textScaleX: 1, tapeHeight: TAPE_HEIGHT });
  const feedTextCache = useRef(new WeakMap<MarketNews, { message: string; font: string; width: number; textScaleX: number }>());
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const refresh = () => {
      const mobile = window.matchMedia('(pointer: coarse)').matches;
      const bounds = canvas.getBoundingClientRect();
      const scale = Math.max(0.01, bounds.height / H * mobileCanvasZoom());
      const horizontalScale = Math.max(0.01, bounds.width / W * mobileCanvasZoom());
      const axisLeft = bounds.width / 2 + (W / 2 - AX) * horizontalScale;
      canvas.closest<HTMLElement>('.game-arena')?.style.setProperty('--chart-axis-right', `${Math.max(0, bounds.width - axisLeft)}px`);
      const textScaleX = mobile ? scale / horizontalScale : 1;
      const headerHeight = canvas.closest('.game-app')?.querySelector('header')?.getBoundingClientRect().height ?? 0;
      headerFeedRef.current = canvas.closest('.game-app')?.querySelector<HTMLCanvasElement>('.mobile-header-feed') ?? null;
      headerFeedActive.current = !mobile || state === 'play' || state === 'boxing' || window.matchMedia('(orientation: landscape)').matches;
      const headerFeed = headerFeedRef.current;
      if (headerFeed && headerFeedActive.current) {
        const rect = headerFeed.getBoundingClientRect();
        headerFeedLayout.current = { height: rect.height, width: rect.width, mainHeight: bounds.height };
        headerFeed.width = Math.max(1, Math.round(rect.width * Math.min(window.devicePixelRatio || 1, 1.5)));
        headerFeed.height = Math.max(1, Math.round(rect.height * Math.min(window.devicePixelRatio || 1, 1.5)));
      }
      const tapeHeight = headerFeedActive.current ? 1 / scale : headerHeight > 0 ? headerHeight / scale : TAPE_HEIGHT;
      feedLayout.current = { mobile, fontSize: mobile || headerFeedActive.current ? Math.min(64, Math.max(11, 14 / scale)) : 11, textScaleX, tapeHeight };
    };
    const observer = new ResizeObserver(refresh);
    observer.observe(canvas);
    const header = canvas.closest('.game-app')?.querySelector('header');
    if (header) observer.observe(header);
    const headerFeed = canvas.closest('.game-app')?.querySelector('.mobile-header-feed');
    const pauseTicker = () => { tickerHoverPausedRef.current = true; };
    const resumeTicker = () => { tickerHoverPausedRef.current = false; };
    headerFeed?.addEventListener('pointerenter', pauseTicker);
    headerFeed?.addEventListener('pointerleave', resumeTicker);
    headerFeed?.addEventListener('pointercancel', resumeTicker);
    window.addEventListener('resize', refresh);
    refresh();
    return () => {
      observer.disconnect(); window.removeEventListener('resize', refresh);
      headerFeed?.removeEventListener('pointerenter', pauseTicker);
      headerFeed?.removeEventListener('pointerleave', resumeTicker);
      headerFeed?.removeEventListener('pointercancel', resumeTicker);
      resumeTicker();
    };
  }, [state]);
  const tickerHoverPausedRef = useRef(false);
  const aimRef = useRef<AimPoint | null>(null);
  const bossTrack = useRef<{ candles: Candle[]; length: number } | null>(null);
  const gameRef = useRef({
    C: [] as Candle[],
    candleOffset: 0,
    p: null as Player | null,
    cx: 0,
    cy: 0,
    score: 0,
    printerTimer: 0,
    invertedView: false,
    printerExitInverted: false,
    activityPips: 0,
    difficultyActive: false,
    hawkTimer: 0,
    hawkBags: 0,
    hawkStartIndex: 0,
    hawkFrontier: -1,
    hawkBudget: 0,
    nextHawk: 300,
    lastEncounterFrame: -210,
    lastBellIndex: 0,
    hatSoiled: false,
    pigeonDrops: [] as PigeonDrop[],
    spits: [] as { x: number; y: number; vx: number; vy: number; life: number }[],
    printerStartX: 0,
    printerEndX: 0,
    printerBaseY: 0,
    printerProgress: 0,
    printerRotation: 0,
    printerSaved: null as Candle[] | null,
    rocketBags: 0,
    printerTurns: [] as PrinterTurn[],
    nextPigeon: 160,
    penalty: 0,
    bagDrainFrames: 0,
    apeTimer: 0,
    apes: [] as ApeCompanion[],
    nextBanana: 250,
    nextFedora: 200,
    fedoraTimer: 0,
    fedoraCount: 0,
    fedoraWindup: 0,
    bagThrowAnimTimer: 0,
    bagThrowDirection: 1,
    flyingFedora: null as FlyingFedora | null,
    nextWhale: 200,
    coins: 0,
    diamonds: 0,
    banknotes: 0,
    swanHits: 0,
    animalHits: 0,
    held: false,
    overT: 0,
    falling: false,
    zeroCrash: false,
    zeroCrashIndex: -1,
    zeroCrashTop: 0,
    gapAirborne: false,
    fallFrame: 0,
    cause: '',
    lastBig: -9,
    lastC: 320,
    lastTop: 320,
    lastSpike: -9,
    holeLeft: 0,
    lastHole: -99,
    gapDirection: 'down' as 'up' | 'down',
    gapShift: 0,
    pickups: [] as Pickup[],
    swans: [] as Swan[],
    animals: [] as Animal[],
    cases: [] as Briefcase[],
    popups: [] as ScorePopup[],
    caseCooldown: 0,
    throwAnimTimer: 0,
    shockLeft: 0,
    lastShock: -160,
    marketEvents: [] as MarketEvent[],
    zoneLeft: 0,
    zonePickupAt: 0,
    nextZone: 90,
    nextTallCandle: 180,
    bellDescentStart: -1,
    bellDescentEnd: -1,
    bellLaunchTop: 0,
    volatilityEvent: 180,
    nextCoinIndex: 35,
    nextBanknoteIndex: 220,
    coinSingleJumpToggle: false,
    marketPath: [] as MarketKnot[],
    marketRegimes: [] as MarketRegime[],
    activeNews: null as ActiveNews | null,
    nextNewsIndex: 50,
    tickerScrollX: W,
    printerTickerX: W - AX,
    tickerTextWidth: 0,
    tickerQueue: [] as { news: MarketNews; width: number }[],
    previousTime: 0,
    accumulator: 0,
    globalFrame: 0,
    nextCandleSurprise: 0,
    rocketCoinFrontier: -1,
    currentState: state
  });

  const lvOf = useCallback((i: number) => {
    extendMarketRegimes(gameRef.current.marketRegimes, i);
    return marketRegimeAt(gameRef.current.marketRegimes, i);
  }, []);
  const speedAt = useCallback((_i: number) => 3.3, []);

  const pickPattern = (crash: boolean) => {
    const w = CANDLE_PATTERNS.map((pattern) =>
      pattern[1] * (crash && (pattern[0] === 'Marubozu' || pattern[0] === 'Engulfing') ? 3 : 1)
    );
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < w.length; i++) {
      r -= w[i];
      if (r <= 0) return CANDLE_PATTERNS[i];
    }
    return CANDLE_PATTERNS[0];
  };

  const mkHole = useCallback((): Candle => {
    const g = gameRef.current;
    return {
      hole: true,
      direction: g.gapDirection,
      o: g.lastC,
      c: g.lastC,
      h: g.lastC,
      l: g.lastC,
      top: 1e9,
      bot: -1e9,
      sp: false,
      v: 0,
      k: 'Gap'
    };
  }, []);

  const flat6 = useCallback((i: number, tol = 16) => {
    const { C } = gameRef.current;
    let a = 1e9, b = -1e9;
    for (let j = i - 6; j < i; j++) {
      const c = C[j];
      if (!c || c.hole) return false;
      a = Math.min(a, c.top);
      b = Math.max(b, c.top);
    }
    return b - a <= tol;
  }, []);

  const genCandle = useCallback((i: number) => {
    const g = gameRef.current;
    const lv = lvOf(i);
    const warmup = !g.difficultyActive;
    const l = warmup ? LEVELS[0] : LEVELS[lv];
    const spd = speedAt(i);
    const crash = !warmup && lv === 1;
    const rally = !warmup && lv === 2;

    // Yellow is a gameplay overlay on ordinary mixed patterns, not a replacement runway.
    const tallApproach = i >= g.nextTallCandle - 28 && i <= g.nextTallCandle;
    const barrier = !warmup && i === g.nextTallCandle;
    const volatilityBoost = warmup ? 1 : candleVolatilityBoost(i, g.volatilityEvent);

    if (i >= g.bellDescentStart && i <= g.bellDescentEnd) {
      const top = bellDescentTop(g.bellLaunchTop, i - g.bellDescentStart + 1, Math.random());
      const body = Math.random() < 0.15 ? R(24, 42) : R(3, 22);
      const bot = top + body;
      const green = Math.random() < 0.4;
      g.C[i] = { o: green ? bot : top, c: green ? top : bot, top, bot,
        h: top - R(2, 14), l: bot + R(2, 16), sp: false, v: R(0.2, 1), k: 'Bell descent' };
      g.lastC = g.C[i].c;
      g.lastTop = top;
      return;
    }

    if (g.holeLeft > 0) {
      g.holeLeft--;
      g.C[i] = mkHole();
      return;
    }

    // Occasional market gap on flat ground
    if (!tallApproach && i > 65 && i - g.lastHole > 40 && Math.random() < 0.032 && flat6(i)) {
      const width = Math.floor(R(3, Math.max(4, Math.floor((spd * 38 * 0.62) / CW))));
      g.gapDirection = Math.random() < (rally ? 0.75 : crash ? 0.25 : 0.5) ? 'up' : 'down';
      g.gapShift = g.gapDirection === 'up' ? -16 : 18;
      g.holeLeft = width - 1;
      g.lastHole = i;
      g.C[i] = mkHole();
      return;
    }

    if (g.gapShift) {
      g.lastC += g.gapShift;
      g.lastTop += g.gapShift;
      g.gapShift = 0;
    }

    // Sudden crash shock leading to a black swan
    if (!tallApproach && !g.shockLeft && i > 90 && i - g.lastShock > 140 && Math.random() < (crash ? 0.025 : 0.005)) {
      g.shockLeft = Math.floor(R(3, 10));
      g.lastShock = i;
      g.marketEvents.push({ index: i, spawned: false });
    }

    if (g.shockLeft) {
      const o = g.lastC;
      const c = o + R(18, 26);
      g.C[i] = {
        o,
        c,
        h: o - R(1, 3),
        l: c + R(2, 5),
        top: o,
        bot: c,
        sp: false,
        v: 0.95,
        k: 'Marubozu',
        shock: true
      };
      g.lastC = c;
      g.lastTop = o;
      g.shockLeft--;
      return;
    }

    const pc = g.lastC;
    const pt = g.lastTop;

    extendMarketPath(g.marketPath, i);
    const marketSample = sampleMarketPath(g.marketPath, i);
    const macroTargetY = marketSample.height;
    const waveSlope = sampleMarketPath(g.marketPath, i + 1).height - macroTargetY;

    const waveUpChance = waveSlope < 0 ? 0.72 : 0.28;
    const baseUpProb = crash ? 0.18 : rally ? 0.82 : waveUpChance;
    const isUp = Math.random() < baseUpProb;

    const T = barrier ? CANDLE_PATTERNS.find(pattern => pattern[0] === 'Engulfing')! : pickPattern(crash);
    const [bd, uw, lw] = T[2](l.vol * marketSample.volatility * volatilityBoost);
    const body = Math.max(T[0].includes('Doji') ? 1 : 2, bd * R(0.4, 0.95));

    let o = pc;
    let c = isUp ? o - body : o + body;

    const drift = c - macroTargetY;
    if (Math.abs(drift) > 60) {
      c -= Math.sign(drift) * R(2, 5);
    }

    if (barrier) c = Math.min(o, pt) - R(145, 165);

    let top = Math.min(o, c);
    let bot = Math.max(o, c);
    let mr = CAP;

    for (let j = Math.max(1, i - 10); j < i; j++) {
      if (g.C[j].hole || g.C[j].top - g.C[j - 1]?.top > 8) {
        mr = 8;
        break;
      }
    }
    if (i - g.lastBig < 8) mr = Math.min(mr, 14);
    if (i - g.lastSpike < 4) mr = Math.min(mr, 7);
    if (!barrier && top < pt - mr) {
      const sh = pt - mr - top;
      o += sh;
      c += sh;
      top += sh;
      bot += sh;
    }
    if (pt - top > 22) g.lastBig = i;

    // RARE DIAMONDS: Spaced much farther apart (every 300 to 480 candles)
    if (i >= g.nextZone && g.zoneLeft === 0) {
      g.zoneLeft = Math.floor(R(16, 46));
      g.zonePickupAt = Math.floor(R(3, g.zoneLeft - 2));
      g.nextZone = i + randomDelay(g.zoneLeft + 35, g.difficultyActive ? 190 : 390);
    }
    const sp = g.zoneLeft > 0 || tallApproach;
    if (g.zoneLeft > 0 && g.zoneLeft === g.zonePickupAt) {
      g.pickups.push({ x: (i + 14) * CW + CW / 2, y: top - 170, type: 'diamond', taken: false });
    }
    if (g.zoneLeft > 0) g.zoneLeft--;

    const v = sp ? R(0.8, 1) : Math.min(1, 0.15 + body / 50 + R(0, 0.25));
    g.lastC = c;
    g.lastTop = top;
    g.C[i] = { o, c, h: top - uw * 0.65, l: bot + lw * 0.65, top, bot, sp, v, k: T[0], doubleJumpBarrier: barrier };
    if (barrier) {
      // Only a sustained elevated climb qualifies. The bell hangs below its edge.
      const approachTop = Math.max(g.C[Math.max(0, i - 28)]?.top ?? top, pt);
      if (shouldPlaceBell(approachTop - top, i, g.lastBellIndex, Math.random())) {
        g.lastBellIndex = i;
        g.bellDescentStart = i + 1;
        g.bellDescentEnd = i + 36;
        g.bellLaunchTop = top;
        g.pickups.push({ type: 'bell', x: (i + 28) * CW + CW / 2, y: top + 90, launchTop: top, taken: false });
      }
      g.nextTallCandle = i + randomDelay(65, 160);
    }
    if (i > g.volatilityEvent + 24) g.volatilityEvent = i + randomDelay(45, 230);

    // Regular Coins: single jump vs floor alternating
    if (i >= g.nextBanana) {
      g.pickups.push({ x: i * CW + CW / 2, y: top - 85, type: 'banana', taken: false });
      g.nextBanana = i + trackPickupDelay('banana', g.difficultyActive ? 'hard' : 'normal');
    }
    if (i >= g.nextFedora) {
      g.pickups.push({ x: i * CW + CW / 2, y: top - 85, type: 'fedora', taken: false });
      g.nextFedora = i + trackPickupDelay('fedora', g.difficultyActive ? 'hard' : 'normal');
    }
    if (i >= g.nextCoinIndex) {
      g.coinSingleJumpToggle = Math.random() < 0.8;
      const coinY = g.coinSingleJumpToggle ? top - 85 : top - 25;
      g.pickups.push({
        x: i * CW + CW / 2,
        y: coinY,
        type: 'coin',
        taken: false,
        isAir: g.coinSingleJumpToggle
      });
      g.nextCoinIndex = i + trackPickupDelay('coin', g.difficultyActive ? 'hard' : 'normal');
    }
  }, [flat6, mkHole, lvOf, speedAt]);

  // Guaranteed clean reset
  const initGame = useCallback(() => {
    const g = gameRef.current;
    g.difficultyActive = false;
    g.coins = 0;
    g.diamonds = 0;
    g.banknotes = 0;
    g.penalty = 0;
    g.bagDrainFrames = 0;
    g.hawkBags = 0;
    g.rocketBags = 0;
    g.apeTimer = 0;
    g.apes = [];
    g.nextBanana = trackPickupDelay('banana', 'first');
    g.nextFedora = trackPickupDelay('fedora', 'first');
    g.fedoraTimer = 0; g.fedoraCount = 0; g.fedoraWindup = 0; g.flyingFedora = null;
    g.nextWhale = randomDelay(120, 375);
    g.lastBellIndex = 0;
    g.zoneLeft = 0;
    g.zonePickupAt = 0;
    g.nextZone = randomDelay(45, 160);
    g.nextTallCandle = WARMUP_CANDLES + randomDelay(30, 180);
    g.bellDescentStart = -1;
    g.bellDescentEnd = -1;
    g.bellLaunchTop = 0;
    g.volatilityEvent = randomDelay(80, 300);
    g.nextCoinIndex = trackPickupDelay('coin', 'first');
    g.nextBanknoteIndex = Math.floor(R(240, 380));
    g.coinSingleJumpToggle = false;
    g.swanHits = 0;
    g.animalHits = 0;
    g.pickups = [];
    g.swans = [];
    g.animals = [];
    g.cases = [];
    g.popups = [];
    g.caseCooldown = 0;
    g.throwAnimTimer = 0;
    g.shockLeft = 0;
    g.lastShock = -160;
    g.marketEvents = [];
    g.C = [];
    g.candleOffset = 0;
    g.lastBig = -9;
    g.lastC = MARKET_BASELINE;
    g.lastTop = MARKET_BASELINE;
    g.lastSpike = -9;
    g.holeLeft = 0;
    g.gapShift = 0;
    g.gapDirection = 'down';
    g.lastHole = -99;
    g.marketPath = [];
    g.marketRegimes = [];
    g.globalFrame = 0;
    g.nextCandleSurprise = candleSurpriseDelay();
    g.activeNews = null;
    g.nextNewsIndex = randomDelay(25, 170);
    g.tickerScrollX = W;
    g.tickerTextWidth = 0;
    g.tickerQueue = [];
    g.tickerScrollX = 0;
    g.accumulator = 0;
    g.previousTime = 0;

    for (let i = 0; i < Math.ceil(W / 0.65 / CW) + 20; i++) {
      genCandle(i);
    }

    const startIndex = Math.floor(HX / CW);
    g.p = {
      x: HX,
      y: g.C[startIndex].top,
      vy: 0,
      coy: 6,
      buf: 0,
      ph: 0,
      air: false,
      doubleReady: false,
      jumps: 0,
      carry: 0,
      rocketTimer: 0,
      previousY: g.C[startIndex].top
    };

    g.cx = g.p.x - heroCameraOffset();
    g.cy = g.p.y - H * 0.62;
    g.score = 0;
    g.activityPips = 0; g.hawkTimer = 0; g.nextHawk = randomDelay(140, 550); g.spits = []; g.hatSoiled = false; g.pigeonDrops = [];
    g.lastEncounterFrame = -210;
    g.printerTimer = 0; g.printerSaved = null; g.nextPigeon = randomDelay(120, 400);
    g.invertedView = false; g.printerExitInverted = false;
    g.held = false;
    g.overT = 0;
    g.falling = false;
    g.zeroCrash = false;
    g.zeroCrashIndex = -1;
    g.gapAirborne = false;
    g.fallFrame = 0;
    g.cause = '';
  }, [genCandle]);

  const die = useCallback((causeText: string) => {
    const g = gameRef.current;
    // Player is fully protected while in rocket mode!
    if (g.p && g.p.rocketTimer > 0) return;

    g.currentState = 'over';
    g.cause = causeText;
    g.overT = 15;
    g.held = false;
    sound.playGameOver();
    const finalScore = Math.max(0, g.score - g.penalty + g.activityPips);
    const candle = g.C[Math.floor((g.p?.x ?? 0) / CW)];
    onGameOver(causeText, arcadeProfit(finalScore, candle ? Number(price(candle.c)) : 0));
    onStateChange('over');
  }, [onGameOver, onStateChange]);

  const activateHawk = useCallback(() => {
    const g = gameRef.current;
    if (!g.p || g.hawkTimer > 0) return;
    // A shortened Pigeon must still honor its randomly chosen exit.
    // Outside Pigeon, preserve the current view for Hawk's mirrored slide.
    if (g.printerTimer > 0) g.invertedView = g.printerExitInverted;
    g.printerExitInverted = g.invertedView;
    aimRef.current = null;
    if (g.printerSaved) { g.C = g.printerSaved.slice(); g.printerSaved = null; }
    g.printerTimer = 0; g.printerRotation = 0;
    g.hawkStartIndex = Math.floor(g.p.x / CW);
    g.hawkFrontier = g.hawkStartIndex - 1;
    g.hawkBudget = hawkDropBudget(g.p.y, MARKET_BASELINE + 1600);
    g.hawkTimer = 600;
    g.hawkBags = 0;
    g.cases = []; g.throwAnimTimer = 0; g.bagThrowAnimTimer = 0;
  }, []);

  const activatePrinter = useCallback(() => {
    const g = gameRef.current;
    if (!g.p || g.falling || g.currentState === 'boxing') return;
    if (g.printerTimer <= 0) g.printerSaved = null;
    g.printerTimer = 600;
    g.printerExitInverted = Math.random() < 0.5;
    // Choose the visible continuing boundary from the start. Reflecting only
    // at the exit swaps both graphs on screen instead of ending one boundary.
    g.invertedView = g.printerExitInverted;
    aimRef.current = null;
    g.printerTickerX = W - AX;
    g.printerStartX = g.p.x;
    g.printerEndX = g.p.x + 600 * 3;
    g.printerBaseY = g.p.y;
    g.printerProgress = g.p.x;
    g.printerSaved ??= g.C.slice();
    g.animals = []; g.swans = []; g.cases = []; g.spits = [];
    g.pigeonDrops = [];
    g.marketEvents = [];
    g.popups = [];
    g.printerTurns = [];
    extendPrinterTurns(g.printerTurns, W);
    g.p.rocketTimer = 0; g.p.carry = 0;
    sound.playRocket();
  }, []);

  const awardEnemy = useCallback((enemy: Animal | Swan) => {
    const g = gameRef.current;
    const points = enemyPips(enemy) * activityMultiplier(g.printerTimer, g.hawkTimer);
    g.activityPips += points;
    if ('type' in enemy) g.animalHits++; else g.swanHits++;
    g.popups.push({ x: enemy.x, y: enemy.y - 20, text: `+${points}`, color: '#fbbf24', life: 35 });
  }, []);

  // Manual mouse aim; projectiles retain their ballistic trajectory and spinning.
  const throwBriefcase = useCallback(() => {
    const g = gameRef.current;
    if (g.currentState !== 'play' || g.falling || g.caseCooldown > 0 || g.flyingFedora || !g.p) return;

    if (g.hawkTimer > 0) {
      if (g.p.carry <= 0 || g.p.shieldKind !== 'bag' || g.hawkBags <= 0) return;
      const x = g.p.x + 18;
      const y = g.p.y - 20;
      const velocity = aimedVelocity({ x, y }, aimRef.current ?? { x: x + 100, y }, 11.5 + speedAt(g.score));
      g.cases.push({ x, y, vx: velocity.x, vy: velocity.y, life: 70, angle: 0, kind: 'bag', windup: 8 });
      g.bagThrowDirection = velocity.x < 0 ? -1 : 1;
      g.hawkBags--;
      g.p.carry = 0;
      g.p.shieldKind = undefined;
      g.bagThrowAnimTimer = 16;
      g.caseCooldown = 45;
      sound.playBag();
      return;
    }

    if (g.p.carry > 0) return;

    if (g.fedoraTimer > 0 && g.fedoraCount > 0) {
      if (g.flyingFedora || g.fedoraWindup > 0) return;
      g.fedoraCount--;
      g.fedoraWindup = FEDORA_WINDUP;
      return;
    }

    // Pitching throwing arm animation trigger
    g.throwAnimTimer = 16;

    const x = g.p.x + 18;
    const y = g.p.y - 20;

    const velocity = aimedVelocity({ x, y }, aimRef.current ?? { x: x + 100, y }, 11.5 + speedAt(g.score));
    g.cases.push({
      x,
      y,
      vx: velocity.x,
      vy: velocity.y,
      life: 70,
      angle: 0
    });

    g.caseCooldown = 45;
    sound.playBriefcaseThrow();
  }, []);

  // NEWS TRIGGER: Spawns beasts offscreen to the right as signaled by the headline
  const triggerSyntheticNews = useCallback(() => {
    const g = gameRef.current;
    if (!g.p) return;

    const rand = Math.random();
    const newsType = rand < 0.45 ? 'bear' : rand < 0.82 ? 'bull' : 'diamond';
    const freshNews = getRandomNews(newsType);

    g.activeNews = {
      news: freshNews,
      remainingFrames: freshNews.durationFrames,
      totalFrames: freshNews.durationFrames
    };
    g.tickerQueue.push({ news: freshNews, width: 0 });

    const minRightEdgeX = g.cx + W + 120;

    if (freshNews.spawnType === 'bear' || freshNews.spawnType === 'bull') {
      let spawnIdx = Math.max(Math.floor(minRightEdgeX / CW), Math.floor(g.p.x / CW) + 42);
      while (g.C[spawnIdx]?.hole && spawnIdx < g.C.length - 1) spawnIdx++;
      const targetCandle = g.C[spawnIdx];
      if (targetCandle && !targetCandle.hole) {
        g.animals.push({
          x: spawnIdx * CW + CW / 2,
          y: targetCandle.top - ANIMAL_CENTER,
          feet: targetCandle.top,
          phase: 0,
          type: freshNews.spawnType,
          mount: Math.random() < (g.difficultyActive ? 0.35 : 0.2) ? (Math.random() < 0.35 ? 'whale' : freshNews.spawnType === 'bull' ? 'bear' : 'bull') : undefined,
          dead: false
        });
      }
    } else if (freshNews.spawnType === 'diamond') {
      let spawnIdx = Math.max(Math.floor(minRightEdgeX / CW), Math.floor(g.p.x / CW) + 36);
      while (g.C[spawnIdx]?.hole && spawnIdx < g.C.length - 1) spawnIdx++;
      const targetCandle = g.C[spawnIdx];
      if (targetCandle && !targetCandle.hole) {
        g.pickups.push({
          x: spawnIdx * CW + CW / 2,
          y: targetCandle.top - 170,
          type: 'diamond',
          taken: false
        });
      }
    }
  }, []);

  const updateEntities = useCallback(() => {
    const g = gameRef.current;
    if (!g.p) return;

    if (g.caseCooldown > 0) g.caseCooldown--;
    if (g.fedoraTimer > 0 && --g.fedoraTimer === 0) {
      g.fedoraCount = 0; g.fedoraWindup = 0;
    }
    if (g.fedoraWindup > 0 && --g.fedoraWindup === 0 && g.p) {
      g.flyingFedora = { x: g.p.x + 33, y: g.p.y - 25, angle: 0, returning: false };
      sound.playFedoraThrow();
    }
    const spawnAllowed = () => canSpawnEncounter(g.globalFrame, g.lastEncounterFrame,
      g.animals.filter(a => !a.dead && !a.dying).length + g.swans.filter(s => !s.dead && !s.dying).length, g.difficultyActive)
      && (g.difficultyActive || (g.globalFrame - g.lastEncounterFrame >= 420 && g.animals.filter(a => !a.dead && !a.dying).length + g.swans.filter(s => !s.dead && !s.dying).length < 2));
    const markSpawn = () => { g.lastEncounterFrame = g.globalFrame; };
    for (const drop of g.pigeonDrops) {
      const hats = weaponHatCount(g.fedoraTimer, g.fedoraWindup, !!g.flyingFedora);
      const headHeight = g.hawkTimer > 0 && g.p.rocketTimer <= 0
        ? (hats > 0 ? 62 + (hats - 1) * 10 : 53)
        : hats > 0 ? (g.apeTimer > 0 ? 57 : 65) + (hats - 1) * 11 : 57;
      const headY = g.p.y - Math.cos(g.printerTimer > 0 ? g.printerRotation : 0) * headHeight;
      if (stepPigeonDrop(drop, g.p.x, headY)) {
        drop.life = 0; g.hatSoiled = true;
        sound.playPigeonSplat();
        g.popups.push({ x: g.p.x, y: headY - 10, text: 'SPLAT!', color: '#f8fafc', life: 40 });
      }
    }
    g.pigeonDrops = g.pigeonDrops.filter(drop => drop.life > 0);
    if (g.hawkTimer > 0) {
      g.hawkTimer--;
      if (g.printerTimer <= 0) {
        for (let i = Math.max(g.hawkStartIndex, g.hawkFrontier + 1); i < g.C.length; i++) {
          if (g.C[i]) {
            const before = g.C[i];
            const after = hawkCandle(before, i - g.hawkStartIndex, g.hawkBudget);
            const shift = after.top - before.top;
            g.C[i] = after;
            for (const pickup of g.pickups) {
              if (!pickup.taken && Math.floor(pickup.x / CW) === i && pickup.vy === undefined) pickup.y += shift;
            }
          }
          g.hawkFrontier = i;
        }
        if (g.hawkTimer === 0) {
          g.hawkBags = 0;
          const last = [...g.C].reverse().find(c => c && !c.hole);
          if (last) { g.lastC = last.c; g.lastTop = last.top; }
          // Rebase the original upward-biased market, do not keep adding a
          // downward slope after the timer. Future random knots rise as usual.
          for (const knot of g.marketPath) knot.height += g.hawkBudget;
        }
      }
    }
    if (g.printerTimer <= 0 && g.score >= g.nextHawk && spawnAllowed() && Math.random() < 0.08) {
      markSpawn();
      const x = rightEdgeSpawnX(g.cx, W - AX);
      const hawkY = g.p.y - 85;
      g.swans.push({ kind: 'hawk', x, y: hawkY, baseY: hawkY, phase: 0, dead: false });
      g.nextHawk = g.score + randomDelay(180, g.difficultyActive ? 575 : 825);
    }
    for (const spit of g.spits) {
      spit.x += spit.vx; spit.y += spit.vy; spit.vy += 0.18; spit.life--;
      if (Math.hypot(spit.x - g.p.x, spit.y - (g.p.y - 24)) < 23 && g.p.rocketTimer <= 0) {
        spit.life = 0;
        if (g.hawkTimer <= 0) {
          if (g.printerTimer > 0) g.invertedView = g.printerExitInverted;
          aimRef.current = null;
          g.hawkStartIndex = Math.floor(g.p.x / CW);
          g.hawkFrontier = g.hawkStartIndex - 1;
          g.hawkBudget = hawkDropBudget(g.p.y, MARKET_BASELINE + 1600);
          g.hawkTimer = 600;
          g.hawkBags = 0;
          g.cases = []; g.throwAnimTimer = 0; g.bagThrowAnimTimer = 0;
        }
      }
    }
    g.spits = g.spits.filter(spit => spit.life > 0);
    if (g.printerTimer > 0 && g.printerTimer % 180 === 0 && spawnAllowed()) {
      markSpawn();
      const x = rightEdgeSpawnX(g.cx, W - AX);
      const feet = trackHeightAt(g.C, x, CW, g.p.y);
      g.animals.push({ x, feet, y: feet - 40, phase: 0, type: Math.random() < 0.5 ? 'bull' : 'bear', dead: false });
      if (g.swans.filter(s => !s.dead && !s.dying).length < 1 && g.animals.filter(a => !a.dead && !a.dying).length < 4) {
        const y = g.p.y + 150;
        g.swans.push({ kind: 'white', x, y, baseY: y, phase: 0, dead: false });
      }
    }
    if (g.throwAnimTimer > 0) g.throwAnimTimer--;
    if (g.bagThrowAnimTimer > 0) g.bagThrowAnimTimer--;

    // Active Diamond Hands decrement
    if (g.p.carry > 0) {
      g.p.carry--;
    }

    // Active Rocket Mode decrement
    if (g.p.rocketTimer > 0) {
      // Finish only over solid terrain; a gap must not eject the pilot.
      if (g.p.rocketTimer > 1 || rocketTrackPose(g.C, g.p.x, CW, g.p.y).solid) g.p.rocketTimer--;

      // Fill the complete visible route immediately; extend only beyond the viewport.
      const end = Math.min(g.C.length - 1, Math.ceil((g.p.x + W - HX + 64) / CW));
      for (let i = Math.max(0, g.rocketCoinFrontier + 1); i <= end; i++) {
        if (i % 3 !== 0) continue;
        const x = i * CW + CW / 2;
        const y = trackHeightAt(g.C, x, CW, g.p.y) - 25;
        if (!g.pickups.some(p => p.type === 'coin' && Math.abs(p.x - x) < 12)) {
          g.pickups.push({ x, y, type: 'coin', taken: false });
        }
      }
      g.rocketCoinFrontier = end;
    }

    // Active news banner duration
    if (g.activeNews) {
      g.activeNews.remainingFrames--;
      if (g.activeNews.remainingFrames <= 0) {
        g.activeNews = null;
      }
    }

    // Schedule next market news
    if (!g.activeNews && g.score >= g.nextNewsIndex && g.printerTimer <= 0 && spawnAllowed() && Math.random() < 0.08) {
      markSpawn();
      triggerSyntheticNews();
      g.nextNewsIndex = g.score + randomDelay(40, g.difficultyActive ? 100 : 390);
    }

    // Update animals (charging animation when approaching player)
    if (g.score >= g.nextWhale && g.printerTimer <= 0 && spawnAllowed() && Math.random() < 0.08) {
      markSpawn();
      const x = g.cx + W + 100;
      const feet = trackHeightAt(g.C, x, CW, g.p.y);
      g.animals.push({ type: 'whale', x, feet, y: feet - ANIMAL_CENTER, phase: 0, dead: false });
      g.nextWhale = g.score + randomDelay(100, g.difficultyActive ? 240 : 700);
    }
    for (const a of g.animals) {
      if (a.dying) {
        if (a.type === 'whale' && !a.lootRolled) {
          a.lootRolled = true;
          if (whaleDropsBanknote(Math.random())) g.pickups.push({ x: a.x, y: a.y, type: 'banknote', taken: false, vy: -2 });
        }
        if (a.dieTimer !== undefined) a.dieTimer--;
        a.x += a.dieVx || 0;
        a.feet += a.dieVy || 0;
        a.y = a.feet - ANIMAL_CENTER;
        if (a.dieVy !== undefined) a.dieVy += 0.35;
        if (a.dieAngle !== undefined) a.dieAngle += 0.22;
        if (a.dieTimer !== undefined && a.dieTimer <= 0) a.dead = true;
        continue;
      }

      if (a.dropVelocity !== undefined) {
        const floor = trackHeightAt(g.C, a.x, CW, a.feet);
        a.dropVelocity += 0.35;
        a.feet = Math.min(floor, a.feet + a.dropVelocity);
        a.y = a.feet - animalHeight(a) / 2;
        if (a.feet >= floor) a.dropVelocity = undefined;
        a.phase += 0.12;
        continue;
      }

      // Check approach to player: distance < 360 triggers aggressive lunge/charge
      const distToPlayer = a.x - g.p.x;
      a.isCharging = distToPlayer > 0 && distToPlayer < 360;

      const animalSpeed = enemyMovementSpeed(a.type, !!a.isCharging, !!a.mount);
      a.x -= animalSpeed;
      a.phase += a.isCharging ? 0.28 : 0.16;
      if (a.type === 'bull') {
        if (a.attackTimer === 11 && !a.shieldPassed) sound.playEnemy('bat');
        if ((a.attackTimer ?? 0) > 0) a.attackTimer = (a.attackTimer ?? 0) - 1;
        else if (Math.abs(a.x - g.p.x) < 90 && Math.abs(a.feet - g.p.y) < 65) {
          a.attackTimer = 22;
          a.attackHit = false;
        }
      }

      // Ordinary animals fall; mounted riders leap and whales bridge gaps.
      if (g.printerTimer > 0 && a.type !== 'whale') {
        const index = Math.min(g.C.length - 1, Math.max(0, Math.floor(a.x / CW)));
        const source = printerSourceCandle(g.printerSaved ?? g.C, index);
        if (source) {
          const first = endingPrinterCandle(source, a.x, g.printerStartX, g.printerEndX, g.printerTurns, 1);
          const second = endingPrinterCandle(source, a.x, g.printerStartX, g.printerEndX, g.printerTurns, -1);
          const pose = printerEnemyPose(first, second, animalHeight(a));
          a.feet = pose.feet; a.trackRotation = pose.rotation; a.y = pose.centerY;
        }
        a.jumpAmount = 0;
      } else {
        a.trackRotation = 0;
        if (animalFallsInGap(a, g.C, CW)) {
          if (Math.abs(a.x - g.p.x) < 600) sound.playFall();
          a.dying = true;
          a.dieTimer = 60;
          a.dieVx = -animalSpeed;
          a.dieVy = 2;
          a.dieAngle = 0;
          a.attackHit = true;
          continue;
        }
        a.feet = animalTrackHeightAt(a.mount === 'whale' ? 'whale' : a.type, g.C, a.x, CW, a.feet);
        a.jumpAmount = Math.max(0, trackHeightAt(g.C, a.x, CW, a.feet) - a.feet);
        a.y = a.feet - animalHeight(a) / 2;
      }
      if (!a.shieldPassed && Math.abs(a.x - g.p.x) < 500 && Math.abs(a.feet - g.p.y) < 180) {
        const strength = 1 - Math.abs(a.x - g.p.x) / 650;
        sound.playEnemy(a.mount ?? a.type, strength);
        if (a.mount) sound.playEnemy(a.type, strength * 0.75);
        if (a.type === 'bear') sound.playEnemy('chainsaw', strength);
      }
    }

    // Swans: Spawn strictly offscreen on right
    for (const event of g.marketEvents) {
      const distance = event.index * CW - g.p.x;
      if (!event.spawned && distance <= 440 && distance > 0 && spawnAllowed() && Math.random() < 0.08) {
        markSpawn();
        event.spawned = true;
        const spawnX = Math.max(g.cx + W + 100, g.p.x + 640);
        const targetY = g.p.y - 25;
        g.swans.push({
          x: spawnX,
          y: targetY - 65,
          baseY: targetY - 65,
          targetY,
          locked: false,
          phase: 0,
          dead: false
        });
      }
    }
    g.marketEvents = g.marketEvents.filter((event) => event.index * CW > g.p!.x - 150);

    if (g.score >= g.nextPigeon && g.printerTimer <= 0 && spawnAllowed() && Math.random() < 0.08) {
      markSpawn();
      const x = g.cx + W + 80;
      const flightLane = Math.random();
      const y = pigeonFlightY(g.cy, TAPE_HEIGHT, 0, flightLane);
      g.swans.push({ kind: 'pigeon', flightLane, x, y, baseY: y, phase: 0, dead: false });
      g.nextPigeon = g.score + randomDelay(80, g.difficultyActive ? 205 : 600);
    }
    for (const s of g.swans) {
      if (s.dying) {
        if (!s.lootRolled) {
          s.lootRolled = true;
          if (s.kind !== 'hawk' && (s.kind !== 'pigeon' || pigeonDropsPrinter(Math.random()))) {
            g.pickups.push({ x: s.x, y: s.y, type: s.kind === 'pigeon' ? 'printer' : 'bag', taken: false, vy: -2 });
          }
        }
        if (s.dieTimer !== undefined) s.dieTimer--;
        s.x += s.dieVx || 0;
        s.y += s.dieVy || 0;
        if (s.dieVy !== undefined) s.dieVy += 0.35;
        if (s.dieAngle !== undefined) s.dieAngle += 0.25;
        if (s.dieTimer !== undefined && s.dieTimer <= 0) s.dead = true;
        continue;
      }

      if (!s.cargoRolled) {
        s.cargoRolled = true;
        if (s.kind !== 'white') {
          s.cargo = randomBirdCargo();
          s.cargoFlight = !!s.cargo;
          s.cargoReleaseRatio = R(0.65, 0.90);
        }
      }
      if (s.cargo) {
        s.y = g.cy + TAPE_HEIGHT + 80 + Math.sin(s.phase) * 5;
        s.baseY = s.y;
        if (canReleaseBirdCargo(s.x, g.cx, g.p.x, W - AX, CW, g.C, s.cargoReleaseRatio ?? 0.75)) {
          const type = s.cargo;
          const feet = s.y + 24 + ANIMAL_CENTER * 2;
          g.animals.push({ type, x: s.x, feet, y: feet - ANIMAL_CENTER, phase: 0, dead: false, dropVelocity: 1 });
          s.cargo = undefined;
        }
        if (s.cargo && s.x - g.cx < (W - AX) * 0.60) {
          s.x = g.cx + (W - AX) * 0.60;
        }
      }

      // Cargo flights stay overhead after release instead of diving at the hero.
      if (s.cargoFlight) {
        s.x -= 2.2; s.phase += 0.12;
        s.y = g.cy + TAPE_HEIGHT + 80 + Math.sin(s.phase) * 5;
        s.baseY = s.y;
        s.isCharging = false;
        if ((s.kind === 'swan' || s.kind === undefined) && !s.lootRolled && !s.cargo) {
          s.lootRolled = true;
          const bag = swanBagPose();
          g.pickups.push({ x: s.x + bag.x, y: s.y + bag.y, type: 'bag', taken: false, vy: 0 });
        }
        if (s.kind === 'hawk' && !s.cargo && !s.lootRolled) {
          s.lootRolled = true;
          const isAir = true;
          g.pickups.push({ x: s.x - 24.8, y: s.y + 1.6, type: 'tender', taken: false, isAir, vy: 1, rotation: 0.18 });
        }
        continue;
      }

      // Check approach to player: dive lunge when close
      const distToPlayer = s.x - g.p.x;
      if (s.kind === 'pigeon') {
        s.x -= 2.2; s.phase += 0.12;
        s.y = pigeonFlightY(g.cy, TAPE_HEIGHT, s.phase, s.flightLane ?? 0.5);
        s.baseY = s.y;
        if (!s.soiledHat && Math.abs(distToPlayer) < 18) {
          s.soiledHat = true;
          // Surviving the overhead pass guarantees a visible hit on the hat.
          g.pigeonDrops.push({ x: s.x, y: s.y + 18, vx: 0, vy: 1.5, life: 180, impactFrames: 30 });
          sound.playPigeonDrop();
        }
        if (Math.abs(distToPlayer) < 600) sound.playBird('pigeon');
        continue;
      }
      if (s.kind === 'hawk') {
        stepHawkFlight(s, g.p);
        // Random visible-flight delay, independent of distance to the player.
        if (!s.lootRolled && s.x < g.cx + W - AX && s.x > g.cx) {
          s.tenderDropTimer ??= Math.floor(R(20, 140));
          s.tenderDropTimer--;
        }
        if (!s.lootRolled && ((s.tenderDropTimer !== undefined && s.tenderDropTimer <= 0) || s.x <= g.p.x + 450)) {
          s.lootRolled = true;
          const isAir = true;
          g.pickups.push({ x: s.x - 24.8, y: s.y + 1.6, type: 'tender', taken: false, isAir, vy: 1, rotation: 0.18 });
          sound.playTender();
        }
        continue;
      }
      if (s.kind === 'white') {
        if (Math.abs(distToPlayer) < 600) sound.playBird('white');
        s.x -= 2.4; s.phase += 0.12;
        s.baseY = Math.max(g.cy + H * 0.58, Math.min(g.cy + H - 70, s.baseY));
        s.y = s.baseY + Math.sin(s.phase) * 6;
        if (!s.lootRolled && distToPlayer < 300) {
          s.lootRolled = true;
          const bag = swanBagPose(!!s.isCharging, true);
          g.pickups.push({ x: s.x + bag.x, y: s.y + bag.y, type: 'bag', taken: false, vy: -7, upwardFrames: 90 });
          sound.playBag();
        }
        continue;
      }
      if (!s.lootRolled && distToPlayer < 450) {
        s.lootRolled = true;
        const bag = swanBagPose(!!s.isCharging);
        g.pickups.push({ x: s.x + bag.x, y: s.y + bag.y, type: 'bag', taken: false, vy: 0 });
        sound.playBag();
      }
      s.isCharging = distToPlayer > 0 && distToPlayer < 360;
      if (!s.dead && !s.shieldPassed && Math.abs(distToPlayer) < 600) {
        sound.playBird('swan', Math.max(0.3, 1 - Math.abs(distToPlayer) / 750));
      }

      const swanSpeed = s.isCharging ? 2.8 : 2.0;
      s.x -= swanSpeed;
      s.phase += s.isCharging ? 0.18 : 0.09;

      if (s.targetY !== undefined) {
        if (!s.locked) {
          s.targetY = g.p.y - 25;
          if (s.x - g.p.x < 190) s.locked = true;
        }
        s.baseY += Math.max(-2.0, Math.min(2.0, (s.targetY - s.baseY) * (s.isCharging ? 0.08 : 0.05)));
        s.y = s.baseY + Math.sin(s.phase) * (s.isCharging ? 7 : 5);
      } else {
        s.y = s.baseY + Math.sin(s.phase) * 5;
      }
      s.y = Math.max(g.cy + TAPE_HEIGHT + 35, Math.min(g.cy + H * 0.48, s.y));
    }

    // Briefcase physics: straight forward with ballistic drop and dynamic rapid spin
    g.apes = tickCompanions(g.apes, g.p.rocketTimer > 0);
    g.apeTimer = Math.max(0, ...g.apes.map(ape => ape.timer));
    for (const [apeIndex, ape] of g.apes.entries()) {
      if (g.hawkTimer > 0 || (g.p.carry > 0 && g.p.shieldKind === 'bag')) {
        ape.throwTimer = 0;
        continue;
      }
      // A companion already aboard stays with the pilot throughout the flight.


      const apeX = g.p.x - 45 - apeIndex * 32;
      const apeFeet = g.p.air ? g.p.y : trackHeightAt(g.C, apeX, CW, g.p.y);
      const origin = g.p.rocketTimer > 0
        ? { x: g.p.x - 37 - apeIndex * 32, y: g.p.y - 46 }
        : { x: apeX, y: apeFeet - 43 * APE_SCALE };
      const target = [...g.swans, ...g.animals]
        .filter(enemy => !enemy.dead && !enemy.dying && Math.abs(enemy.x - origin.x) < 650)
        .sort((a, b) => Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y))[0];
      if (target && ape.cooldown === 0) {
        ape.direction = target.x >= origin.x ? 1 : -1;
        ape.throwTimer = 15;
        origin.x += ape.direction * 28 * APE_SCALE;
        const frames = Math.max(12, Math.hypot(target.x - origin.x, target.y - origin.y) / 12);
        g.cases.push({ ...origin, vx: (target.x - origin.x) / frames - 1.5, vy: (target.y - origin.y) / frames - 0.025 * (frames - 1), life: 75, angle: 0, kind: 'banana' });
        ape.cooldown = APE_THROW_INTERVAL;
        sound.playBananaThrow();
      }
    }
    for (const b of g.cases) {
      if (b.kind === 'bag' && (b.windup ?? 0) > 0) {
        const pose = hawkBagThrowPose(g.bagThrowAnimTimer, g.bagThrowDirection,
          weaponHatCount(g.fedoraTimer, g.fedoraWindup, !!g.flyingFedora));
        b.x = g.p.x + pose.bagX;
        b.y = g.p.y + pose.bagY;
        b.windup = (b.windup ?? 0) - 1;
        // No movement, lifetime loss or enemy hits while still held overhead.
        continue;
      }
      const prevX = b.x;
      const prevY = b.y;
      b.x += b.vx;
      b.y += b.vy;
      b.vy += 0.05;
      b.life--;
      b.angle += 0.38; // Dynamic rapid spin around center!

      for (const enemy of [...g.swans, ...g.animals]) {
        if (enemy.dying || enemy.dead) continue;
        const dx = b.x - prevX;
        const dy = b.y - prevY;
        const t = Math.max(0, Math.min(1, ((enemy.x - prevX) * dx + (enemy.y - prevY) * dy) / (dx * dx + dy * dy || 1)));
        const hitRadius = 'type' in enemy ? (enemy.mount ? 45 : 26) : 18;
        if (Math.hypot(prevX + t * dx - enemy.x, prevY + t * dy - enemy.y) < hitRadius) {
          if ('type' in enemy && !aimedHitDefeatsEnemy(enemy)) {
            const rider = dismountRider(enemy);
            if (rider) {
              g.animals.push(rider);
              awardEnemy(rider);
            }
            b.life = 0;
            sound.playHit();
            break;
          }
          enemy.dying = true;
          enemy.dieTimer = 25;
          enemy.dieVx = 3.5;
          enemy.dieVy = -5.0;
          enemy.dieAngle = 0;
          b.life = 0;
          sound.playHit();
          awardEnemy(enemy);
          break;
        }
      }
    }
    if (g.flyingFedora) {
      sound.playFedoraFly();
      const hat = g.flyingFedora;
      const prevX = hat.x, prevY = hat.y;
      const caught = stepFlyingFedora(hat, g.p.x, g.C, CW, g.cx + W - AX);
      for (const enemy of [...g.swans, ...g.animals]) {
        if (enemy.dead || enemy.dying || hat.hitTargets?.has(enemy)) continue;
        const dx = hat.x - prevX, dy = hat.y - prevY;
        const distanceTo = (centerY: number) => {
          const t = Math.max(0, Math.min(1, ((enemy.x - prevX) * dx + (centerY - prevY) * dy) / (dx * dx + dy * dy || 1)));
          return Math.hypot(prevX + t * dx - enemy.x, prevY + t * dy - centerY);
        };
        const riderDistance = 'type' in enemy && enemy.mount
          ? distanceTo(enemy.feet - (enemy.mount === 'whale' ? 85 : 78)) : Infinity;
        const mountDistance = 'type' in enemy ? distanceTo(enemy.feet - ANIMAL_CENTER) : Infinity;
        const mountHit = 'type' in enemy && fedoraHitsMount(enemy, riderDistance, mountDistance);
        if (!mountHit && riderDistance >= 26 && ('type' in enemy
          ? enemy.mount || mountDistance >= 26 : distanceTo(enemy.y) >= 18)) continue;
        (hat.hitTargets ??= new Set()).add(enemy);
        if (fedoraHit(enemy, Math.random(), mountHit) === 'hat') {
          sound.playFedoraHit();
          continue;
        }
        if ('type' in enemy && mountHit) g.animals.push(separateFedoraMount(enemy));
        if ('type' in enemy && enemy.mount && !mountHit) {
          const rider = dismountRider(enemy);
          if (rider) { g.animals.push(rider); awardEnemy(rider); }
        } else {
          enemy.dying = true; enemy.dieTimer = 25; enemy.dieVx = 3.5; enemy.dieVy = -5; enemy.dieAngle = 0;
          awardEnemy(enemy);
        }
        sound.playFedoraHit();
      }
      if (caught) g.flyingFedora = null;
    }

    // ROCKET IMPACT: Kills remaining enemies on impact while player is in rocket!
    if (g.p.rocketTimer > 0) {
      for (const enemy of [...g.swans, ...g.animals]) {
        if (enemy.dying || enemy.dead) continue;
        const eY = 'type' in enemy ? enemy.feet - ANIMAL_CENTER : enemy.y;
        if (Math.abs(enemy.x - g.p.x) < 50 && Math.abs(eY - (g.p.y - 22)) < 48) {
          enemy.dying = true;
          enemy.dieTimer = 30;
          enemy.dieVx = 6.0;
          enemy.dieVy = -7.0;
          enemy.dieAngle = 0;
          sound.playHit();
          awardEnemy(enemy);
        }
      }
    }

    // Jump Stomp on Enemies (only if not in rocket mode)
    if (g.p.rocketTimer <= 0) {
      for (const enemy of [...g.swans, ...g.animals]) {
        if (enemy.dying || enemy.dead || enemy.shieldPassed) continue;
        // Whales are never stompable, and mounted riders must be defeated or
        // dismounted before the remaining mount can be stomped separately.
        if ('type' in enemy && (enemy.type === 'whale' || enemy.mount)) continue;
        const top = 'type' in enemy ? enemy.feet - animalHeight(enemy) : enemy.y - 16;
        if (
          Math.abs(enemy.x - g.p.x) < ('type' in enemy ? (enemy.type === 'bull' ? 55 : 50) : 20) &&
          g.p.y > g.p.previousY &&
          g.p.previousY <= top + 5 &&
          g.p.y >= top
        ) {
          enemy.dying = true;
          enemy.dieTimer = 25;
          enemy.dieVx = 3.0;
          enemy.dieVy = -5.5;
          enemy.dieAngle = 0;
          g.p.y = top;
          g.p.vy = -7.5;
          g.p.air = true;
          sound.playHit();
          awardEnemy(enemy);
        }
      }
    }

    // Collisions with Living Enemies (Skipped when in rocket mode!).
    // A carried diamond absorbs one collision from any enemy, including birds.
    if (g.p.rocketTimer <= 0) {
      for (const s of g.swans) {
        if (!s.dead && !s.dying && lethalBirdContact(s, g.p)) {
          if (absorbEnemyHit(g.p, s)) {
            g.popups.push({ x: g.p.x, y: g.p.y - 35, text: 'Good DD', color: '#38bdf8', life: 40 });
            sound.playHit();
          } else {
            die('Bird collision: Dodge or throw a briefcase.');
          }
          return;
        }
      }

      for (const a of g.animals) {
        const bullSwing = a.type === 'bull' && !a.attackHit && (a.attackTimer ?? 0) <= 10 && (a.attackTimer ?? 0) >= 5;
        const hitRange = a.type === 'bull' ? 55 : 50;
        const playerCenterY = g.p.y - Math.cos(g.printerTimer > 0 ? g.printerRotation : 0) * 24;
        const overlapsVertically = g.printerTimer > 0
          ? Math.abs(playerCenterY - a.y) < animalHeight(a) / 2 + 24
          : g.p.y > a.feet - animalHeight(a) && g.p.y - 48 < a.feet;
        if (!a.dead && !a.dying && !a.shieldPassed && (a.type !== 'bull' || bullSwing) && Math.abs(a.x - g.p.x) < (a.type === 'whale' ? 65 : hitRange) && overlapsVertically) {
          a.attackHit = true;
          if (absorbEnemyHit(g.p, a)) {
            g.popups.push({ x: g.p.x, y: g.p.y - 35, text: 'Good DD', color: '#38bdf8', life: 40 });
            sound.playHit();
          } else {
            die(a.type === 'bull' ? 'Bull baseball bat strike.' : 'Bear chainsaw encounter.');
          }
          return;
        }
      }
    }

    // Collect Pickups (Coins, Diamonds, Banknotes)
    for (const d of g.pickups) {
      if (d.type === 'bell') {
        const previousCenterY = g.p.previousY - 25;
        const centerY = g.p.y - 25;
        const closestY = Math.max(Math.min(previousCenterY, centerY), Math.min(d.y, Math.max(previousCenterY, centerY)));
        if (!d.taken && canCatchBossBell(g.p.rocketTimer, Math.hypot(d.x - g.p.x, d.y - closestY))) {
          d.taken = true;
          g.popups = [];
          g.activeNews = null;
          g.currentState = 'boxing';
          onStateChange('boxing');
          sound.playBell();
          return;
        }
        continue;
      }
      if ((d.type === 'banknote' || d.type === 'bag' || d.type === 'printer') && d.vy !== undefined) {
        if ((d.upwardFrames ?? 0) > 0) {
          d.upwardFrames!--;
          d.y += d.vy;
          if (d.upwardFrames === 0) d.taken = true;
        } else {
        d.vy += 0.3;
        const floor = trackHeightAt(g.C, d.x, CW, d.y + 25) - 25;
        d.y = Math.min(floor, d.y + d.vy);
        if (d.type === 'printer') d.rotation = printerFallRotation(d.rotation ?? 0, floor - d.y);
        if (d.y >= floor) d.vy = 0;
        }
      }
      const magnetDist = g.p.rocketTimer > 0 ? 64 : 26;
      // Tender floats at the banana/single-jump coin height, never on the candles.
      if (d.type === 'tender') {
        const landing = tenderLanding(g.C, d.x, CW);
        if (landing) {
          d.x = landing.x;
          stepTenderFall(d, landing.y);
        }
      }
      if (!d.taken && Math.hypot(d.x - g.p.x, d.y - (g.p.y - 25)) < magnetDist) {
        d.taken = true;
        if (d.type === 'printer') {
          activatePrinter();
        } else if (d.type === 'coin') {
          g.coins++;
          const points = 10 * activityMultiplier(g.printerTimer, g.hawkTimer);
          g.activityPips += points;
          g.popups.push({ x: d.x, y: d.y - 12, text: `+${points}`, color: '#fbbf24', life: 25 });
          sound.playCoin();
        } else if (d.type === 'fedora') {
          g.fedoraTimer = addFedoraTime(g.fedoraTimer);
          g.fedoraCount = FEDORA_MAX_THROWS;
          g.popups.push({ x: d.x, y: d.y - 20, text: 'YOLO', color: '#f8fafc', life: 40 });
          sound.playCoin();
        } else if (d.type === 'diamond') {
          g.diamonds++;
          const points = 250 * activityMultiplier(g.printerTimer, g.hawkTimer);
          g.activityPips += points;
          g.p.carry = 300; // Lasts longer (5 seconds!)
          g.p.shieldKind = 'diamond';
          g.popups.push({ x: d.x, y: d.y - 20, text: `+${points}`, color: '#38bdf8', life: 40 });
          sound.playDiamond();
        } else if (d.type === 'bag') {
          if (g.hawkTimer > 0) g.hawkBags++;
          if (g.p.rocketTimer > 0) g.rocketBags++;
          g.bagDrainFrames = 0;
          g.p.carry = 300;
          g.p.shieldKind = 'bag';
          sound.playBag();
        } else if (d.type === 'tender') {
          activateHawk();
          g.popups.push({ x: d.x, y: d.y - 20, text: 'Hawk mode!', color: '#fbbf24', life: 40 });
          sound.playTender();
        } else if (d.type === 'banana') {
          if (!addCompanion(g.apes, APE_DURATION)) { d.taken = false; continue; }
          g.apeTimer = Math.max(...g.apes.map(ape => ape.timer));
          g.popups.push({ x: d.x, y: d.y - 20, text: 'Apes together strong', color: '#fde047', life: 40 });
          sound.playCoin();
        } else if (d.type === 'banknote' && g.printerTimer <= 0) {
          g.banknotes = (g.banknotes || 0) + 1;
          g.p.rocketTimer = 420; // 7 seconds of Rocket Mode!
          g.rocketBags = 0;
          g.gapAirborne = false;
          g.rocketCoinFrontier = Math.floor(g.p.x / CW) - 1;
          g.popups.push({ x: d.x, y: d.y - 26, text: 'TO THE MOON!', color: '#22c55e', life: 55 });
          sound.playRocket();
        }
      }
    }

    for (const pop of g.popups) {
      pop.y -= 1.2;
      pop.life--;
    }
    g.popups = g.popups.filter((p) => p.life > 0);

    g.pickups = g.pickups.filter((d) => !d.taken && d.x > g.p!.x - 100);
    g.swans = g.swans.filter((s) => !s.dead && s.x + 80 > g.p!.x - HX);
    g.animals = g.animals.filter((a) => !a.dead && a.x + 80 > g.p!.x - HX);
    g.cases = g.cases.filter((b) => b.life > 0);
  }, [die, triggerSyntheticNews, onStateChange, activatePrinter, activateHawk, awardEnemy]);

  const update = useCallback(() => {
    const g = gameRef.current;
    if (!g.p || g.currentState !== 'play') return;

    if (g.falling) {
      g.fallFrame++;
      g.p.vy = Math.min(12, g.p.vy + 0.35);
      const floor = g.cy + H - TIME_AXIS_HEIGHT;
      if (g.zeroCrash) {
        g.p.y += g.p.vy;
        const candle = g.C[g.zeroCrashIndex];
        const bottom = Math.max(g.zeroCrashTop + 2, g.p.y);
        if (candle) g.C[g.zeroCrashIndex] = { ...candle, o: g.zeroCrashTop, c: bottom,
          top: g.zeroCrashTop, bot: bottom, h: g.zeroCrashTop - 3, l: bottom + 3 };
        g.cy = zeroCrashCamera(g.cy, g.p.y, g.zeroCrashTop, H, TAPE_HEIGHT);
        if (zeroCrashComplete(g.fallFrame, g.zeroCrashTop, g.cy, TAPE_HEIGHT)) die('Market price reached zero');
        return;
      }
      g.p.y = Math.min(floor, g.p.y + g.p.vy);
      if (g.p.y >= floor) die(g.zeroCrash ? 'Market price reached zero' : 'Fell into a market gap');
      return;
    }

    g.globalFrame++;
    const carryingBag = g.p.carry > 0 && g.p.shieldKind === 'bag';
    const previousRaw = g.score + g.activityPips;
    const currentIdx = Math.floor(g.p.x / CW);
    // Never let physics run beyond a restored/generated chart frontier.
    ensureChartAhead(g, Math.max(g.p.x, g.cx + W), W, CW, genCandle);
    const currentCandle = g.C[currentIdx];
    if (g.printerTimer <= 0 && currentCandle && !currentCandle.hole && marketReachedZero(currentCandle.c, MARKET_BASELINE)) {
      g.zeroCrash = true; g.falling = true; g.fallFrame = 0;
      sound.playFall();
      g.zeroCrashIndex = currentIdx;
      g.zeroCrashTop = currentCandle.top;
      g.C.length = currentIdx + 1;
      g.p.x = currentIdx * CW + CW / 2;
      g.p.y = Math.max(g.p.y, g.zeroCrashTop + 2);
      g.C[currentIdx] = { ...currentCandle, o: g.zeroCrashTop, c: g.p.y,
        top: g.zeroCrashTop, bot: g.p.y, h: g.zeroCrashTop - 3, l: g.p.y + 3 };
      g.p.rocketTimer = 0; g.p.carry = 0; g.p.buf = 0;
      g.p.air = true; g.p.vy = 2; g.held = false;
      return;
    }
    const isRocketMode = g.p.rocketTimer > 0;
    const sp = speedAt(currentIdx) * (isRocketMode ? ROCKET_SPEED_MULTIPLIER : hawkSpeedMultiplier(g.hawkTimer, g.hawkBags));

    g.p.x += sp;
    g.p.ph += 0.28;

    const prev = g.p.y;
    g.p.previousY = prev;
    const printerActive = g.printerTimer > 0;
    if (printerActive) {
      g.printerTimer--;
      g.printerProgress += sp;
      // Keep the view fixed: the selected boundary continues spatially while
      // the opposite boundary peels away and ends at printerEndX.
      const first = Math.max(0, Math.floor(g.cx / CW));
      const last = Math.min(g.C.length - 1, Math.ceil((g.cx + W) / CW));
      extendPrinterTurns(g.printerTurns, last * CW - g.printerStartX);
      for (let i = first; i <= last; i++) {
        const source = printerSourceCandle(g.printerSaved ?? g.C, i);
        if (!source) continue;
        g.C[i] = endingPrinterCandle(source, i * CW, g.printerStartX, g.printerEndX, g.printerTurns, 1);
      }
      g.p.x = g.printerProgress;
      const index = Math.min(g.C.length - 1, Math.max(0, Math.floor(g.p.x / CW)));
      const source = printerSourceCandle(g.printerSaved ?? g.C, index) ?? g.C[index];
      const a = endingPrinterCandle(source, g.p.x, g.printerStartX, g.printerEndX, g.printerTurns, 1);
      const b = endingPrinterCandle(source, g.p.x, g.printerStartX, g.printerEndX, g.printerTurns, -1);
      const pose = printerCrossingPose(a, b);
      g.p.y = pose.y;
      g.printerRotation = pose.rotation;
      g.p.vy = 0; g.p.air = false; g.p.buf = 0;
    } else if (isRocketMode) {
      // Follow the track, bridging gaps between the surrounding solid candle tops.
      g.p.y = rocketTrackPose(g.C, g.p.x, CW, g.p.y).y;
      g.gapAirborne = false;
      g.p.vy = 0;
      g.p.air = true;
    } else {
      g.p.vy += g.p.vy < 0 && g.held ? 0.35 : 0.52;
      g.p.y += g.p.vy;
    }

    const i0 = Math.max(0, Math.floor((g.p.x - 7) / CW));
    const i1 = Math.min(g.C.length - 1, Math.floor((g.p.x + 7) / CW));
    const overGap = g.C.slice(i0, i1 + 1).length > 0 && g.C.slice(i0, i1 + 1).every(c => c.hole);
    if (overGap && !isRocketMode && !printerActive) g.gapAirborne = true;
    let bestCandle: Candle | null = null;

    if (!isRocketMode && !printerActive) {
      for (let i = i0; i <= i1; i++) {
        const c = g.C[i];
        if (!c || c.hole) continue;
        if (g.p.x + 6 < i * CW || g.p.x - 6 > (i + 1) * CW) continue;

        // High candles are walls, not automatic steps. Keep the runner on the
        // yellow approach until a jump clears the top (rocket bypasses this).
        if (isBlockedByTallCandle(c.doubleJumpBarrier, prev, c.top)) {
          g.p.x = Math.min(g.p.x, i * CW - 7);
          continue;
        }

        // Robust step-up and landing logic
        // A descending player cannot tunnel through a solid non-barrier column
        // when horizontal motion reaches a higher neighbouring candle.
        const canLand = canLandOnTrack(g.p.air, g.p.vy, prev, g.p.y, c.top)
          || canRecoverSolidLanding(c.doubleJumpBarrier, g.p.vy, g.p.y, c.top, g.gapAirborne);

        if (canLand && (!bestCandle || c.top < bestCandle.top)) {
          bestCandle = c;
        }
      }
    }

    let landed = false;
    if (bestCandle) {
      g.p.y = bestCandle.top;
      g.p.vy = 0;
      landed = true;
      g.gapAirborne = false;
      g.p.jumps = 0;
      // Charge only while landing on a yellow candle under the player's footprint.
      // Once airborne, the charge remains available until used or the next landing.
      g.p.doubleReady = doubleJumpChargeOnLanding(g.C, i0, i1);
    }

    // Gap fall death (Skipped if in rocket mode!)
    if (!printerActive && !landed && g.p.vy > 0 && g.p.rocketTimer <= 0) {
      let maxBottom = -1e9;
      for (let i = Math.max(0, i0 - 10); i <= Math.min(g.C.length - 1, i1 + 10); i++) {
        const c = g.C[i];
        if (c && !c.hole && c.top > maxBottom) maxBottom = c.top;
      }
      if (g.gapAirborne && maxBottom > -1e9 && g.p.y > maxBottom + 35) {
        g.falling = true;
        sound.playFall();
        g.fallFrame = 0;
        g.p.carry = 0;
        g.held = false;
        g.p.air = true;
        g.p.vy = Math.min(4, g.p.vy);
        return;
      }
    }

    g.p.air = !printerActive && (isRocketMode || !landed);
    if (landed) g.p.coy = 6;
    else g.p.coy--;

    if (g.p.buf > 0) g.p.buf--;
    if (!isRocketMode && g.p.buf > 0 && g.p.coy > 0) {
      g.p.vy = -9.2;
      g.p.coy = 0;
      g.p.buf = 0;
      g.p.jumps = 1;
      g.p.air = true;
    }

    g.score = Math.max(g.score, g.candleOffset + Math.floor(g.p.x / CW));

    ensureChartAhead(g, Math.max(g.p.x, g.cx + W), W, CW, genCandle);

    if (g.globalFrame >= g.nextCandleSurprise && !printerActive && g.hawkTimer <= 0 && !isRocketMode) {
      g.nextCandleSurprise = g.globalFrame + (candleDemo ? 60 : SURPRISE_RETRY_FRAMES);
      const candidates: number[] = [];
      const first = Math.ceil((g.p.x + 500) / CW);
      const last = Math.min(g.C.length - SURPRISE_MAX_GAP - 5, Math.floor((g.cx + W - AX - 100) / CW));
      for (let index = first; index <= last; index++) {
        if (!g.pickups.some(d => !d.taken && Math.abs(d.x - index * CW) < CW * (SURPRISE_MAX_GAP + 5))) candidates.push(index);
      }
      // Shuffle candidates instead of always altering the first available candle.
      while (candidates.length) {
        const choice = Math.floor(Math.random() * candidates.length);
        const index = candidates.splice(choice, 1)[0];
        if (applyCandleSurprise(g.C, index, SURPRISE_MIN_GAP + Math.floor(Math.random() * (SURPRISE_MAX_GAP - SURPRISE_MIN_GAP + 1)), R(30, 120))) {
          g.nextCandleSurprise = g.globalFrame + candleSurpriseDelay();
          g.popups.push({ x: index * CW, y: g.C[index].top - 35, text: 'Paper Hands', color: '#facc15', life: 120 });
          if (candleDemo) {
            g.nextCandleSurprise = g.globalFrame + 420;
          }
          break;
        }
      }
    }

    updateEntities();
    if (g.currentState !== 'play') return;
    ensureChartAhead(g, Math.max(g.p.x, g.cx + W), W, CW, genCandle);
    if (printerActive && g.printerTimer === 0 && g.printerSaved) {
      const saved = g.printerSaved;
      // Strand 1 is the visible upper chart when inverted, lower otherwise.
      // Commit that continuing strand and leave the opposite tail to scroll out.
      for (let i = 0; i < saved.length; i++) {
        const source = printerSourceCandle(saved, i);
        if (source && i * CW <= g.printerEndX) g.C[i] = endingPrinterCandle(source, i * CW, g.printerStartX, g.printerEndX, g.printerTurns, 1);
      }
      g.printerRotation = 0;
      g.invertedView = g.printerExitInverted;
      g.swans = g.swans.filter(s => s.kind !== 'white');
      for (const animal of g.animals) {
        animal.trackRotation = 0;
        animal.feet = animalTrackHeightAt(animal.type, g.C, animal.x, CW, animal.feet);
        animal.y = animal.feet - animalHeight(animal) / 2;
      }
      g.p.vy = 0; g.p.air = false;
      g.gapAirborne = false;
      g.p.previousY = g.p.y;
    }
    if (carryingBag) {
      const currentRaw = g.score + g.activityPips;
      g.bagDrainFrames++;
      // 100 Pips over 300 frames, plus cancellation of all gains during the bag.
      const drain = g.bagDrainFrames % 3 === 0 ? BAG_PIPS_PENALTY / 100 : 0;
      g.penalty = bagDrainPenalty(previousRaw, currentRaw, g.penalty, drain);
    }

    if (g.currentState !== 'play') return;
    g.cx = (g.printerTimer > 0 ? g.printerProgress : g.p.x) - heroCameraOffset();
    if (g.printerTimer <= 0 && g.cx > g.printerEndX + 60) g.printerSaved = null;
    // Never rebase a temporary boss arena: its callbacks capture chart indices.
    if (!bossTrack.current) {
      const removed = compactChartWindow(g, CW);
      if (removed && aimRef.current) aimRef.current.x -= removed * CW;
    }
    g.cy += (g.p.y - H * 0.62 - g.cy) * 0.08;

    const totalScoreVal = Math.max(0, g.score - g.penalty + g.activityPips);
    if (!g.difficultyActive && difficultyUnlocked(totalScoreVal)) {
      g.difficultyActive = true;
      // Already visible terrain stays unchanged; schedule obstacles in newly
      // generated terrain so the player can see and react to the approach.
      g.nextTallCandle = Math.max(g.C.length + 40, WARMUP_CANDLES);
      g.volatilityEvent = g.nextTallCandle;
      g.nextNewsIndex = Math.min(g.nextNewsIndex, g.score + 30);
      g.nextWhale = Math.min(g.nextWhale, g.score + 60);
      g.nextPigeon = Math.min(g.nextPigeon, g.score + 90);
      g.nextCoinIndex = Math.min(g.nextCoinIndex, g.C.length + 25);
      g.nextZone = Math.min(g.nextZone, g.C.length + 30);
      g.nextBanana = Math.min(g.nextBanana, g.C.length + 60);
    }

    onScoreUpdate({
      totalScore: totalScoreVal,
      score: g.score,
      coins: g.coins,
      diamonds: g.diamonds,
      banknotes: g.banknotes,
      swanHits: g.swanHits,
      animalHits: g.animalHits,
      regime: LEVELS[lvOf(Math.floor(g.p.x / CW))].t,
      cycle: Math.floor(g.score / LEN) + 1,
      cycleProgress: ((g.score % LEN) + LEN) % LEN / LEN,
      isDiamondHands: g.p.carry > 0,
      diamondRemainingFrames: g.p.carry,
      isRocketMode: g.p.rocketTimer > 0,
      rocketRemainingFrames: g.p.rocketTimer
    });
  }, [genCandle, updateEntities, die, onScoreUpdate, candleDemo]);

  // ==========================================
  // SPRITE RENDERING
  // ==========================================

  // 1. HERO ANIMATION: SEATED IN ROCKET / DIAMOND OVERHEAD / BRIEFCASE IN OTHER HAND
  const drawHero = useCallback((ctx: CanvasRenderingContext2D) => {
    const g = gameRef.current;
    if (!g.p) return;
    const stride = g.p.air ? Math.sin(g.p.ph) * 0.45 + Math.max(-0.6, Math.min(0.6, -g.p.vy / 14)) : Math.sin(g.p.ph);
    // Offset only the crash sprite; keep the market anchor on its final candle.
    const sx = g.p.x - g.cx + (g.zeroCrash ? 32 : 0);
    const sy = g.p.y - g.cy;

    ctx.save();
    ctx.translate(Math.round(sx), Math.round(sy));
    if (g.printerTimer > 0) {
      ctx.rotate(g.printerRotation);
      ctx.scale(printerProfileFlip(g.printerRotation), 1);
    }
    if (g.currentState === 'boxing') {
      const bossPlayer = bossEncounter.current?.player;
      const boss = bossEncounter.current;
      drawBossHero(ctx, bossPlayer?.moving ? stride : 0, g.p.air, g.p.vy, g.throwAnimTimer, !!boss?.cases.length, boss?.weapon, boss?.swing, boss?.bagTimer, theme === 'dark');
      ctx.restore(); return;
    }
    if (g.falling) {
      drawFallingCharacter(ctx, g.fallFrame, g.apeTimer > 0, false, theme === 'dark');
      ctx.restore();
      return;
    }

    if (g.hawkTimer > 0 && g.p.rocketTimer <= 0) {
      drawDumpster(ctx, g.apes.length, g.p.ph, weaponHatCount(g.fedoraTimer, g.fedoraWindup, !!g.flyingFedora), theme === 'dark',
        g.p.carry > 0 && g.p.shieldKind === 'diamond', g.hawkBags, g.globalFrame, g.hatSoiled, g.bagThrowAnimTimer, g.bagThrowDirection);
      ctx.restore(); return;
    }

    // A visible one-hit shield, tied to the same diamond state as collisions.
    if (g.p.carry > 0 && g.p.shieldKind !== 'bag') {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.09)';
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.75)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(1, -35, 34, 49, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.8)';
      ctx.beginPath();
      ctx.ellipse(1, -35, 30, 45, 0, Math.PI * 1.08, Math.PI * 1.4);
      ctx.stroke();
    }

    // Ground Shadow (if running on feet)
    if (!g.p.air && g.p.rocketTimer <= 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- CASE 1: SEATED IN ROCKET ("TO THE MOON") ---
    if (g.p.rocketTimer > 0) {
      const rBob = Math.sin(g.globalFrame * 0.2) * 3;
      ctx.save();
      ctx.translate(0, -22 + rBob);
      ctx.rotate(-0.06); // Sleek forward flight tilt
      const passengerCount = g.apes.length;
      ctx.save();
      if (passengerCount) ctx.translate(-27 - (passengerCount - 1) * 32, 0);

      // Exhaust Thruster Flames (Blasting out the rear)
      const fPulse = Math.sin(g.globalFrame * 0.45);
      const flameLen = 30 + fPulse * 10;

      // Outer Red Fireball
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-32, -8);
      ctx.lineTo(-32 - flameLen, 0);
      ctx.lineTo(-32, 8);
      ctx.closePath();
      ctx.fill();

      // Middle Golden Flame
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(-32, -5);
      ctx.lineTo(-32 - flameLen * 0.72, 0);
      ctx.lineTo(-32, 5);
      ctx.closePath();
      ctx.fill();

      // Core White-Hot Jet
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-32, -2.5);
      ctx.lineTo(-32 - flameLen * 0.45, 0);
      ctx.lineTo(-32, 2.5);
      ctx.closePath();
      ctx.fill();

      // Exhaust Spark Particles
      for (let s = 0; s < 3; s++) {
        const spkX = -32 - flameLen - (s * 14 + (g.globalFrame * 4) % 24);
        const spkY = Math.sin(g.globalFrame * 0.3 + s) * 6;
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(spkX, spkY, 3, 3);
      }

      // Rocket Fuselage (Streamlined retro spacecraft body)
      // Rear engine nozzle
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-35, -8, 6, 16);

      // Tail Top & Bottom Fins
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.moveTo(-30, -9);
      ctx.lineTo(-44, -22);
      ctx.lineTo(-22, -9);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-30, 9);
      ctx.lineTo(-44, 22);
      ctx.lineTo(-22, 9);
      ctx.closePath();
      ctx.fill();

      // Main Fuselage (Metallic white)
      ctx.restore();
      if (passengerCount) {
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath(); ctx.roundRect(-57 - (passengerCount - 1) * 32, -13, 35 + (passengerCount - 1) * 32, 26, 8); ctx.fill();
        ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#0284c7'; ctx.fillRect(-52, 4, 27, 4);
      }
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-30, -13);
      ctx.lineTo(20, -13);
      ctx.quadraticCurveTo(46, 0, 20, 13);
      ctx.lineTo(-30, 13);
      ctx.closePath();
      ctx.fill();

      // Cyan speed stripe
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-28, 4, 38, 4);

      // Ruby Red Nose Cone tip
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.moveTo(18, -12);
      ctx.quadraticCurveTo(46, 0, 18, 12);
      ctx.closePath();
      ctx.fill();

      // Fuselage Outline
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-30, -13);
      ctx.lineTo(20, -13);
      ctx.quadraticCurveTo(46, 0, 20, 13);
      ctx.lineTo(-30, 13);
      ctx.closePath();
      ctx.stroke();

      // Collected bags hang from hooks along the rocket's lower side,
      // matching the visible side-mounted bags used by the Hawk dumpster.
      for (let bag = 0; bag < g.rocketBags; bag++) {
        const x = -20 + (bag % 4) * 12;
        const y = 25 + Math.floor(bag / 4) * 11;
        ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, y - 10); ctx.stroke();
        ctx.save(); ctx.translate(x, y); ctx.scale(0.48, 0.48);
        drawPickupAsset(ctx, { type: 'bag', x: 0, y: 0, taken: false }, 0, 0);
        ctx.restore();
      }

      // Hero Seated Inside Cockpit!
      for (const [apeIndex, ape] of g.apes.entries()) {
        // Rear passenger seat: hide the lower body inside the fuselage.
        ctx.save();
        ctx.translate(-apeIndex * 32, 0);
        ctx.save();
        ctx.beginPath(); ctx.rect(-55, -45, 32, 32); ctx.clip();
        ctx.translate(-37, -12);
        ctx.scale(APE_SCALE, APE_SCALE);
        drawApeAsset(ctx, g.globalFrame * 0.15, true, ape.throwTimer, ape.direction, false, g.p.carry > 0 && g.p.shieldKind === 'bag');
        ctx.restore();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(-53, -13); ctx.quadraticCurveTo(-38, -43, -22, -13); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#64748b'; ctx.beginPath(); ctx.moveTo(-22, -13); ctx.lineTo(-22, 9); ctx.stroke(); ctx.restore();
      }
      // Clear profile eye instead of a dark mask-like band.
      if (g.apeTimer > 0) {
        ctx.save(); ctx.translate(2, -22); ctx.scale(0.65, 0.65); drawApeHead(ctx); ctx.restore();
      } else {
      ctx.save(); ctx.translate(2, -22); ctx.scale(0.65, 0.65); drawHumanHead(ctx, true, theme === 'dark'); ctx.restore();
      }

      // Suit shoulders & red tie
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-7, -15, 16, 9);
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(-1, -15, 3.5, 6);

      // Arms holding rocket steering yoke / joystick!
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(5, -12);
      ctx.lineTo(13, -9);
      ctx.stroke();
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(12, -10, 4.5, 4);

      // Steering yoke stick
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(15, -4);
      ctx.lineTo(15, -11);
      ctx.stroke();

      // Cockpit Glass Canopy Dome (Transparent cyan with specular shine)
      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.beginPath();
      ctx.moveTo(-13, -13);
      ctx.quadraticCurveTo(0, -34, 18, -13);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Glint highlight on canopy
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-2, -24, 6, 2.5, -0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      ctx.restore();
      return;
    }

    // --- STANDARD ON-FOOT RUNNER SPRITE ---
    if (g.p.air) {
      ctx.rotate(Math.max(-0.12, Math.min(0.12, g.p.vy * 0.012)));
      ctx.scale(1 + Math.sin(g.p.ph) * 0.025, 1 - Math.sin(g.p.ph) * 0.035);
    }
    if (g.p.carry > 0 && g.p.shieldKind === 'bag') ctx.rotate(0.08);
    const backLegX = -stride * 9;
    const frontLegX = stride * 9;

    // Back leg
    ctx.strokeStyle = '#18212f';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-2, -18);
    ctx.lineTo(1 + backLegX * 0.5, -9);
    ctx.lineTo(-3 + backLegX, g.p.air ? -5 : -2);
    ctx.stroke();

    // Back shoe
    ctx.fillStyle = '#090d16';
    ctx.fillRect(-5 + backLegX, g.p.air ? -5 : -3, 8, 3.5);

    // Suit Jacket Torso
    if (g.p.carry > 0 && g.p.shieldKind !== 'bag') {
      // Far arm is occluded by the torso and head drawn afterward.
      ctx.strokeStyle = '#18212f'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-1, -32); ctx.lineTo(0, -46); ctx.lineTo(2, -60); ctx.stroke();
      ctx.fillStyle = '#eab28e'; ctx.fillRect(0, -63, 3.5, 4);
    }
    // Far-side left arm stays behind the torso, opposite the right-hand stride.
    if (g.p.carry <= 0 && g.throwAnimTimer > 0 && g.bagThrowAnimTimer <= 0) {
      ctx.strokeStyle = '#18212f'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, -31); ctx.lineTo(-10, -23); ctx.lineTo(-15, -15); ctx.stroke();
    }
    if (g.p.carry <= 0 && g.throwAnimTimer <= 0 && g.bagThrowAnimTimer <= 0) {
      ctx.strokeStyle = '#18212f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, -31);
      ctx.lineTo(stride * 4, -21);
      ctx.lineTo(stride * 8, -13);
      ctx.stroke();
    }
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-3, -35);
    ctx.quadraticCurveTo(4, -38, 8, -32);
    ctx.lineTo(5, -17);
    ctx.lineTo(-5, -17);
    ctx.closePath();
    ctx.fill();

    // White Shirt Collar
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, -34, 3, 7);

    // Flowing Tie
    const tieWave = Math.sin(g.p.ph * 1.5) * 2.5;
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.moveTo(5, -33);
    ctx.lineTo(7, -33);
    ctx.lineTo(5 - tieWave, -23);
    ctx.lineTo(3 - tieWave, -23);
    ctx.closePath();
    ctx.fill();

    // Front leg
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 5.2;
    ctx.beginPath();
    ctx.moveTo(2, -18);
    ctx.lineTo(3 + frontLegX * 0.5, -9);
    ctx.lineTo(2 + frontLegX, g.p.air ? -7 : -2);
    ctx.stroke();

    // Front shoe
    ctx.fillStyle = '#090d16';
    ctx.fillRect(2 + frontLegX, g.p.air ? -7 : -3, 9, 3.5);

    // Head
    if (g.apeTimer > 0) {
      ctx.save(); ctx.translate(3, -42); ctx.scale(0.8, 0.8); drawApeHead(ctx, g.fedoraTimer <= 0); ctx.restore();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-3, -35, 8, 2);
    } else {
    ctx.save(); ctx.translate(3, -42); ctx.scale(0.8, 0.8); drawHumanHead(ctx, true, theme === 'dark');
    if (g.hawkTimer > 0) {
      ctx.fillStyle = '#fff7ed'; ctx.beginPath(); ctx.ellipse(3, 0, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(10, 0, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.ellipse(4, -4, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(2, 4); ctx.quadraticCurveTo(6, 7, 9, 3); ctx.stroke();
      ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.arc(-4, -2, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3, -35, 8, 2);

    }

    for (let i = 0; i < weaponHatCount(g.fedoraTimer, g.fedoraWindup, !!g.flyingFedora); i++) {
      // Replace the monkey's captain cap with the weapon fedora at head level.
      ctx.save(); ctx.translate(3, (g.apeTimer > 0 ? -42 : -50) - i * 11); ctx.scale(0.8, 0.8);
      drawCharacterHat(ctx, false, false, theme === 'dark'); ctx.restore();
    }

    if (g.hatSoiled) {
      const hats = weaponHatCount(g.fedoraTimer, g.fedoraWindup, !!g.flyingFedora);
      const captain = g.apeTimer > 0 && hats === 0;
      const stainY = hats > 0 ? (g.apeTimer > 0 ? -57 : -65) - (hats - 1) * 11 : -57;
      drawPigeonStain(ctx, captain ? 6 : 3, stainY, !captain && theme === 'light');
    }

    // --- CASE A: DIAMOND HANDS — HOLDING DIAMOND PROUDLY OVERHEAD WITH RAISED ARMS ---
    if (g.bagThrowAnimTimer > 0) {
      const reach = Math.min(1, g.bagThrowAnimTimer / 8);
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(3, -31);
      ctx.lineTo(3 - 10 * reach, -47 - 7 * reach);
      ctx.lineTo(3 + 9 * reach, -64 - 15 * reach);
      ctx.stroke();
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath(); ctx.arc(3 + 9 * reach, -64 - 15 * reach, 3, 0, Math.PI * 2); ctx.fill();
    } else if (g.p.carry > 0 && g.p.shieldKind === 'bag') {
      // Heavy load is carried low in front, with bent elbows and both hands.
      const loadBob = Math.sin(g.p.ph * 2) * 0.8;
      ctx.save();
      ctx.translate(0, loadBob);
      ctx.strokeStyle = '#18212f'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-3, -31); ctx.lineTo(5, -21); ctx.lineTo(17, -17); ctx.stroke();
      ctx.save(); ctx.translate(21, -12);
      drawPickupAsset(ctx, { type: 'bag', x: 0, y: 0, taken: false }, 0, 0);
      ctx.restore();
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.moveTo(3, -31); ctx.lineTo(10, -20); ctx.lineTo(24, -17); ctx.stroke();
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath(); ctx.arc(17, -17, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(24, -17, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (g.p.carry > 0) {
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      // Near right arm is the only fully visible arm in this profile.
      ctx.moveTo(3, -32);
      ctx.lineTo(7, -46);
      ctx.lineTo(5, -60);
      ctx.stroke();

      // Hands holding bottom tip of diamond
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(3.5, -63, 4.5, 4.5);

      // Identical translucent 3D asset for pickups and the carried shield.
      drawPickupAsset(ctx, { type: 'diamond', x: 0, y: 0, taken: false }, 0, -74, g.globalFrame);

    } else if (g.fedoraWindup > 0) {
      const arm = fedoraArmPose(g.fedoraWindup);
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(3, -31); ctx.lineTo(arm.elbowX, arm.elbowY);
      ctx.lineTo(arm.handX, arm.handY); ctx.stroke();
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath(); ctx.arc(arm.handX, arm.handY, 3, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(arm.handX, arm.handY - 3);
      ctx.scale(0.65, 0.65);
      ctx.translate(0, 12);
      drawCharacterHat(ctx, false, false, theme === 'dark'); ctx.restore();
    } else if (g.fedoraTimer > 0 || g.flyingFedora) {
      const arm = fedoraArmPose(0);
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(3, -31); ctx.lineTo(arm.elbowX, arm.elbowY);
      ctx.lineTo(arm.handX, arm.handY); ctx.stroke();
      ctx.fillStyle = '#fed7aa'; ctx.fillRect(arm.handX - 2, arm.handY - 2, 5, 4);
    } else if (g.throwAnimTimer > 0) {
      const reach = Math.min(1, g.throwAnimTimer / 8);
      // --- CASE B: THROW ANIMATION (Pitching arm thrusting forward to launch briefcase) ---
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(3, -31);
      ctx.lineTo(3 + 11 * reach, -21 - 5 * reach);
      ctx.lineTo(3 + 21 * reach, -12 - 10 * reach);
      ctx.stroke();

      // Throwing hand
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(1 + 21 * reach, -14 - 10 * reach, 5, 4.5);


    }

    // Visible right arm holds the case in the right-profile view.
    // Draw after the torso: the near-side right hand and case remain visible.
    if (g.p.carry <= 0 && g.throwAnimTimer <= 0 && g.bagThrowAnimTimer <= 0 && g.fedoraWindup <= 0 && g.fedoraTimer <= 0 && !g.flyingFedora) {
      const arm = briefcaseArmPose(g.p.air, g.p.vy, stride);
      const rightHandX = arm.handX;
      const rightHandY = arm.handY;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(3, -31);
      ctx.lineTo(arm.elbowX, arm.elbowY);
      ctx.lineTo(rightHandX, rightHandY);
      ctx.stroke();

      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(rightHandX - 2.5, rightHandY - 1, 4.5, 4);

      // Briefcase held low (hidden if currently in flight)
      const isBriefcaseFlying = g.cases.some((c) => c.life > 0 && c.kind !== 'banana');
      if (!isBriefcaseFlying) {
        ctx.save();
        ctx.translate(rightHandX - 8, rightHandY + 3);
        ctx.rotate(arm.angle);

        const colors = briefcaseColors(theme === 'dark');
        ctx.fillStyle = colors.body;
        ctx.fillRect(-2, 0, 19, 13);
        ctx.strokeStyle = colors.outline;
        ctx.lineWidth = 1;
        ctx.strokeRect(-2, 0, 19, 13);

        // Handle follows the current theme.
        ctx.strokeStyle = colors.handle;
        ctx.lineWidth = 2;
        ctx.strokeRect(5, -3, 7, 3);

        // Contrasting clasp in the middle.
        ctx.fillStyle = colors.clasp;
        ctx.fillRect(6, 4, 3.5, 2.5);

        ctx.restore();
      }
    }

    ctx.restore();
  }, [theme, bossEncounter]);
  // 2. PICKUPS (Coins, Diamonds, Banknotes)
  const drawPickups = useCallback((ctx: CanvasRenderingContext2D) => {
    const g = gameRef.current;
    for (const d of g.pickups) {
      const x = d.x - g.cx;
      const y = d.y - g.cy;

      ctx.save();
      ctx.translate(x, y);
      drawPickupAsset(ctx, d, 0, 0, g.globalFrame, theme === 'dark');
      ctx.restore();
    }
  }, [theme]);

  // 3. BLACK SWANS (With approach dive lunge animation & scaled bird proportions)
  const drawSwans = useCallback((ctx: CanvasRenderingContext2D) => {
    for (const s of gameRef.current.swans) {
      const x = s.x - gameRef.current.cx;
      const y = s.y - gameRef.current.cy;

      ctx.save();
      ctx.translate(x, y);
      if (s.dying) {
        ctx.rotate(s.dieAngle || 0);
        ctx.globalAlpha = Math.max(0, (s.dieTimer || 0) / 25);
      }

      if (s.cargo) {
        ctx.save(); ctx.translate(0, 24 + ANIMAL_CENTER * 2);
        drawAnimalCharacter(ctx, { type: s.cargo, x: s.x, y: s.y, feet: 0, phase: 0, dead: false }, true);
        ctx.restore();
        // Bent legs and curved toes wrap over the shoulders/back of the cargo.
        ctx.strokeStyle = '#d4a64a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (const side of [-1, 1]) {
          const gripY = s.cargo === 'whale' ? 29 : 38;
          ctx.beginPath(); ctx.moveTo(side * 5, 7);
          ctx.quadraticCurveTo(side * 12, 18, side * 8, gripY);
          ctx.quadraticCurveTo(side * 8 - 5, gripY - 2, side * 8 - 4, gripY + 4);
          ctx.moveTo(side * 8, gripY);
          ctx.quadraticCurveTo(side * 8 + 5, gripY - 2, side * 8 + 4, gripY + 4); ctx.stroke();
        }
      }
      // Keep ordinary swan behaviour, but show White Swan below the inverted chart.
      const whiteSwan = gameRef.current.invertedView && (s.kind === 'swan' || s.kind === undefined);
      drawSwanAsset(ctx, whiteSwan ? { ...s, kind: 'white' } : s, false, theme === 'dark');
      ctx.restore();
    }
  }, [theme]);

  // 4. Upright, two-legged bear and bull characters.
  const drawAnimals = useCallback((ctx: CanvasRenderingContext2D) => {
    for (const a of gameRef.current.animals) {
      ctx.save();
      ctx.translate(a.x - gameRef.current.cx, a.feet - gameRef.current.cy);
      ctx.rotate(a.trackRotation ?? 0);
      ctx.scale(printerProfileFlip(a.trackRotation ?? 0), 1);
      if (a.dying) {
        ctx.rotate(a.dieAngle || 0);
        ctx.globalAlpha = Math.max(0, (a.dieTimer || 0) / 25);
      }
      drawAnimalCharacter(ctx, a, false, false, theme === 'dark');
      ctx.restore();
    }
  }, [theme]);
  // 5. TOP SCROLLING NEWS WIRE TICKER & DIAMOND / ROCKET COUNTDOWN STRIP
  const drawTopTickerTape = useCallback((ctx: CanvasRenderingContext2D) => {
    const g = gameRef.current;
    const plotCtx = ctx;
    const header = headerFeedActive.current ? headerFeedRef.current : null;
    const headerCtx = header?.getContext('2d');
    const mainHeight = headerFeedLayout.current.mainHeight;
    let tapeH = feedLayout.current.tapeHeight;
    if (header && headerCtx) {
      tapeH = headerFeedLayout.current.height / Math.max(0.01, mainHeight / H);
      ctx = headerCtx;
      ctx.setTransform(header.width / W, 0, 0, header.height / tapeH, 0, 0);
    }
    const { mobile, fontSize: feedFontSize } = feedLayout.current;
    const textScaleX = header ? (headerFeedLayout.current.height / tapeH) / Math.max(0.01, headerFeedLayout.current.width / W) : feedLayout.current.textScaleX;

    ctx.save();
    ctx.textBaseline = 'alphabetic';
    const writeCentered = (text: string, x: number) => {
      // Center the visible glyph bounds within the Live Feed, independent
      // of glyph ascenders/descenders.
      const metrics = ctx.measureText(text);
      const ascent = metrics.actualBoundingBoxAscent ?? 9;
      const descent = metrics.actualBoundingBoxDescent ?? 2;
      ctx.save();
      const feedCenterY = tapeH / 2;
      ctx.translate(x, feedCenterY + (ascent - descent) / 2);
      ctx.scale(textScaleX, 1);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    };

    // NORMAL WIRE TICKER
    if (header) {
      // Transparent header canvas: inherit the real header background, no frame.
      ctx.clearRect(0, 0, W, tapeH);
    } else {
      ctx.fillStyle = theme === 'light' ? '#eaf0f5' : '#131c29';
      ctx.fillRect(0, 0, W, tapeH);
    }

    ctx.textAlign = 'left';

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, tapeH);
    ctx.clip();


    ctx.font = `bold ${feedFontSize}px monospace`;
    if (g.currentState === 'boxing' || g.printerTimer > 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = theme === 'light' ? '#08795c' : '#55d6ae';
      ctx.font = `bold ${mobile || header ? feedFontSize : 13}px monospace`;
      if (g.currentState === 'boxing') {
        ctx.fillStyle = '#ffd230';
        writeCentered('Jeromé', (W) / 2);
      } else {
        ctx.textAlign = 'left';
        // The prefix never wraps; only the trailing R stream repeats.
        const prefix = 'MONEY PRINTER GO B';
        const prefixWidth = ctx.measureText(prefix).width * textScaleX;
        if (g.printerTickerX + prefixWidth > 0) writeCentered(prefix, g.printerTickerX);
        const letterWidth = Math.max(1, ctx.measureText('R').width * textScaleX);
        const tailX = g.printerTickerX + prefixWidth;
        const visibleTailX = tailX < 0 ? -((-tailX) % letterWidth) : tailX;
        if (visibleTailX < W) {
          const count = Math.ceil((W - visibleTailX) / letterWidth) + 1;
          writeCentered('R'.repeat(count), visibleTailX);
        }
      }
    }
    let tickerX = g.tickerScrollX;
    let itemIndex = 0;
    while (g.currentState !== 'boxing' && g.printerTimer <= 0 && tickerX < W + 500) {
      if (itemIndex >= g.tickerQueue.length) {
        g.tickerQueue.push({ news: getTickerNews(g.tickerQueue.at(-1)?.news.headline), width: 0 });
      }
      const item = g.tickerQueue[itemIndex++];
      let cached = feedTextCache.current.get(item.news);
      if (!cached || cached.font !== ctx.font || cached.textScaleX !== textScaleX) {
        const message = cached?.message ?? `${item.news.source}: ${formatFeedHeadline(item.news.headline)}`.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '');
        cached = { message, font: ctx.font, width: (ctx.measureText(message).width + 48) * textScaleX, textScaleX };
        feedTextCache.current.set(item.news, cached);
      }
      const message = cached.message;
      item.width = cached.width;
      ctx.fillStyle = item.news.sentiment === 'bearish' ? (theme === 'light' ? '#b91c1c' : '#f87171') : item.news.sentiment === 'bullish' ? (theme === 'light' ? '#15803d' : '#4ade80') : (theme === 'light' ? '#0369a1' : '#38bdf8');
      writeCentered(message, tickerX);
      tickerX += item.width;
    }

    ctx.restore();
    // Carry effects only tint the thin timer strip; news remains uninterrupted.
    ctx.restore();
    ctx = plotCtx;
    ctx.save();
    tapeH = feedLayout.current.tapeHeight;
    if (headerFeedActive.current) {
      // Idle divider is one CSS pixel; active statuses extend to three pixels.
      ctx.fillStyle = theme === 'light' ? '#000000' : '#ffffff';
      ctx.fillRect(0, 0, W, tapeH);
      ctx.scale(1, tapeH);
      tapeH = 3;
    }
    if (g.currentState === 'boxing' && bossEncounter.current) {
      ctx.fillStyle = '#422006'; ctx.fillRect(0, tapeH - 3, W, 3);
      ctx.fillStyle = '#facc15'; ctx.fillRect(0, tapeH - 3, (W) * Math.max(0, Math.min(1, bossEncounter.current.boss.health / 100)), 3);
    } else if (g.p && g.p.rocketTimer > 0) {
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(0, tapeH - 3, W, 3);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(0, tapeH - 3, (W) * Math.min(1, g.p.rocketTimer / 420), 3);
    } else if (g.hawkTimer > 0) {
      ctx.fillStyle = '#1a2e05'; ctx.fillRect(0, tapeH - 3, W, 3);
      ctx.fillStyle = '#a3e635'; ctx.fillRect(0, tapeH - 3, (W) * Math.min(1, g.hawkTimer / 600), 3);
    } else if (g.apeTimer > 0) {
      ctx.fillStyle = '#713f12'; ctx.fillRect(0, tapeH - 3, W, 3);
      ctx.fillStyle = '#fde047'; ctx.fillRect(0, tapeH - 3, W * Math.min(1, g.apeTimer / APE_DURATION), 3);
    } else if (g.fedoraTimer > 0) {
      ctx.fillStyle = theme === 'dark' ? '#334155' : '#cbd5e1';
      ctx.fillRect(0, tapeH - 3, W, 3);
      ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#05070a';
      ctx.fillRect(0, tapeH - 3, W * Math.min(1, g.fedoraTimer / FEDORA_DURATION), 3);
    } else if (g.p && g.p.carry > 0) {
      const fraction = Math.max(0, Math.min(1, g.p.carry / 300));
      ctx.fillStyle = g.p.shieldKind === 'bag' ? '#450a0a' : '#082f49';
      ctx.fillRect(0, tapeH - 3, W, 3);
      ctx.fillStyle = g.p.shieldKind === 'bag' ? '#ef4444' : '#38bdf8';
      ctx.fillRect(0, tapeH - 3, (W) * fraction, 3);
    }
    ctx.restore();
  }, [bossEncounter, theme]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const g = gameRef.current;
    const TAPE_HEIGHT = feedLayout.current.tapeHeight;
    const darkPalette = {
      bg: '#131722',
      grid: '#2a2e3970',
      text: '#d1d4dc',
      muted: '#969dab',
      veil: '#0c1119e8'
    };
    const lightPalette = {
      bg: '#f5f8fc',
      grid: '#d3dde780',
      text: '#24364b',
      muted: '#52677d',
      veil: '#f5f8fced'
    };
    const palette = theme === 'dark' ? darkPalette : lightPalette;
    const heroIndex = Math.floor((g.currentState === 'menu' || !g.p ? 0 : g.p.x) / CW);
    const l = LEVELS[lvOf(heroIndex)];

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();

    if (g.currentState === 'menu') {
      // Decorative only: the initial screen never advances physics or spawns.
      for (let i = 0; i < Math.min(g.C.length, Math.ceil((W - AX) / CW)); i++) {
        const c = g.C[i];
        if (!c || c.hole) continue;
        const x = i * CW;
        const shift = H * 0.58 - MARKET_BASELINE;
        ctx.fillStyle = c.c < c.o ? GREEN : RED;
        ctx.strokeStyle = ctx.fillStyle;
        ctx.beginPath(); ctx.moveTo(x + CW / 2, c.h + shift); ctx.lineTo(x + CW / 2, c.l + shift); ctx.stroke();
        ctx.fillRect(x + 1, c.top + shift, CW - 3, c.bot - c.top);
      }
      drawTopTickerTape(ctx);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, TAPE_HEIGHT, W - AX, H - TAPE_HEIGHT - TIME_AXIS_HEIGHT);
    ctx.clip();

    const viewport = currentChartViewport(ctx.canvas.getBoundingClientRect());
    ctx.translate(viewport.x * (1 - viewport.scaleX), viewport.y * (1 - viewport.scale));
    ctx.scale(viewport.scaleX, viewport.scale);

    if (g.invertedView && g.currentState !== 'boxing') {
      ctx.translate(0, TAPE_HEIGHT + H - TIME_AXIS_HEIGHT);
      ctx.scale(1, -1);
    }



    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    for (let gridY = Math.floor(g.cy / 50) * 50; gridY < g.cy + H; gridY += 50) {
      const y = gridY - g.cy;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    const visibleLeft = screenToChart({ x: 0, y: 0 }, viewport).x;
    const visibleRight = screenToChart({ x: W - AX, y: 0 }, viewport).x;
    const a = Math.max(0, Math.floor((g.cx + visibleLeft) / CW) - 1);
    const b = Math.ceil((g.cx + visibleRight) / CW) + 2;

    // Temporarily project the boss encounter onto this chart, retaining the run.
    const encounter = g.currentState === 'boxing' ? bossEncounter.current : null;

    for (let i = a; i <= b; i++) {
      if (i % 10 === 0) {
        const x = i * CW - g.cx;
        ctx.beginPath();
        ctx.moveTo(x, TAPE_HEIGHT);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
    }

    for (let i = a; i <= b; i++) {
      const c = g.C[i];
      if (!c || c.hole) continue;
      const x = i * CW - g.cx;
      const h = c.v * 40;
      ctx.fillStyle = (c.c < c.o ? GREEN : RED) + (c.sp ? 'bb' : '44');
      ctx.fillRect(x + 1, H - TIME_AXIS_HEIGHT - h, CW - 3, h);
    }

    for (let i = a; i <= b; i++) {
      const c = g.C[i];
      if (!c || g.printerTimer > 0) continue;

      if (c.hole) {
        continue;
      }

      const x = i * CW - g.cx;
      const col = c.c < c.o ? GREEN : RED;

      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + CW / 2, c.h - g.cy);
      ctx.lineTo(x + CW / 2, c.l - g.cy);
      ctx.stroke();

      ctx.fillStyle = col;
      ctx.fillRect(x + 1, c.top - g.cy, CW - 3, c.bot - c.top);

      if (c.sp) {
        ctx.fillStyle = theme === 'dark' ? '#ffe89b26' : '#edd57935';
        ctx.fillRect(x, TAPE_HEIGHT, CW, H - TAPE_HEIGHT - TIME_AXIS_HEIGHT);
      }
    }

    if (g.printerTimer > 0 || (g.printerSaved && g.cx < g.printerEndX + 60)) {
      const first = Math.max(0, Math.floor((g.cx - 320) / CW));
      const last = Math.min((g.printerSaved?.length ?? 0) - 1, Math.ceil((g.cx + W + 320) / CW));
      for (const strand of [1, -1] as const) {
        if (g.printerTimer <= 0 && strand === 1) continue;
        for (let i = first; i <= last; i++) {
          if (strand === -1 && i * CW > g.printerEndX) continue;
          const source = printerSourceCandle(g.printerSaved ?? g.C, i);
          if (!source) continue;
          const candle = endingPrinterCandle(source, i * CW, g.printerStartX, g.printerEndX, g.printerTurns, strand);
          const x = i * CW + CW / 2 - g.cx;
          ctx.save();
          ctx.fillStyle = candle.c < candle.o ? GREEN : RED;
          ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1;
          // Same vertical bodies and wicks as normal run, even at crossings.
          ctx.beginPath(); ctx.moveTo(x, candle.h - g.cy); ctx.lineTo(x, candle.l - g.cy); ctx.stroke();
          ctx.fillRect(x - CW / 2 + 1, candle.top - g.cy, CW - 3, candle.bot - candle.top);
          ctx.restore();
        }
      }
    }
    if (!encounter) {
      drawPickups(ctx);
      drawSwans(ctx);
      drawAnimals(ctx);
      for (const drop of g.pigeonDrops) {
        const x = drop.x - g.cx, y = drop.y - g.cy;
        ctx.strokeStyle = theme === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(x, y - 5); ctx.stroke();
        ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#000000'; ctx.beginPath(); ctx.ellipse(x, y, 3.5, 6, -0.15, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Spinning briefcases use the same theme palette as the carried case.
    for (const bCase of encounter ? [] : g.cases) {
      if (bCase.kind === 'bag' && (bCase.windup ?? 0) > 0) continue;
      ctx.save();
      ctx.translate(bCase.x - g.cx, bCase.y - g.cy);
      ctx.rotate(bCase.angle); // Smooth rapid spin around center!

      if (bCase.kind === 'banana') {
        ctx.save(); ctx.rotate(-bCase.angle);
        const length = Math.hypot(bCase.vx, bCase.vy) || 1;
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.45)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-bCase.vx / length * 22, -bCase.vy / length * 22); ctx.lineTo(-bCase.vx / length * 8, -bCase.vy / length * 8); ctx.stroke();
        ctx.restore();
        drawPickupAsset(ctx, { type: 'banana', x: 0, y: 0, taken: false }, 0, 0);
        ctx.restore();
        continue;
      }

      if (bCase.kind === 'bag') {
        ctx.save(); ctx.rotate(-bCase.angle);
        const length = Math.hypot(bCase.vx, bCase.vy) || 1;
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-bCase.vx / length * 18, -bCase.vy / length * 18); ctx.lineTo(-bCase.vx / length * 7, -bCase.vy / length * 7); ctx.stroke();
        ctx.restore();
        drawPickupAsset(ctx, { type: 'bag', x: 0, y: 0, taken: false }, 0, 0);
        ctx.restore();
        continue;
      }

      const colors = briefcaseColors(theme === 'dark');
      ctx.fillStyle = colors.body;
      ctx.fillRect(-10, -7, 20, 14);
      ctx.strokeStyle = colors.outline;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-10, -7, 20, 14);

      // Handle
      ctx.strokeStyle = colors.handle;
      ctx.lineWidth = 2;
      ctx.strokeRect(-4, -10, 8, 3);

      // Contrasting clasp in the center.
      ctx.fillStyle = colors.clasp;
      ctx.fillRect(-2, -2, 4, 4);

      ctx.restore();
    }
    if (!encounter && g.flyingFedora) {
      ctx.save();
      ctx.translate(g.flyingFedora.x - g.cx, g.flyingFedora.y - g.cy);
      ctx.scale(0.7, 0.7);
      drawSpinningFedora(ctx, g.flyingFedora.angle, theme === 'dark');
      ctx.restore();
    }

    for (const pop of encounter ? [] : g.popups) {
      ctx.save();
      ctx.fillStyle = pop.color;
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.translate(pop.x - g.cx, pop.y - g.cy);
      if (g.invertedView) ctx.scale(1, -1);
      ctx.fillText(pop.text, 0, 0);
      ctx.restore();
    }

    if (encounter) {
      const originalPlayer = g.p;
      const originalThrow = g.throwAnimTimer;
      const originalApes = g.apeTimer;
      const p = encounter.player;
      if (originalPlayer) {
        g.p = { ...originalPlayer, x: p.x, y: p.y, vy: p.vy, air: !p.grounded, ph: p.walkPhase, carry: 0, rocketTimer: 0 };
        g.throwAnimTimer = p.throwTimer; g.apeTimer = 0;
        ctx.save();
        if (p.invulnerable && encounter.frame % 10 < 5) ctx.globalAlpha = 0.4;
        // Mirror the very same running model around its feet, not a substitute fighter.
        if (p.facing < 0) { ctx.translate(2 * (p.x - g.cx), 0); ctx.scale(-1, 1); }
        drawHero(ctx); ctx.restore();
        g.p = originalPlayer; g.throwAnimTimer = originalThrow; g.apeTimer = originalApes;
      }
      ctx.save(); ctx.translate(-g.cx, -g.cy);
      drawBossEncounter(ctx, encounter, theme === 'dark'); ctx.restore();
    } else drawHero(ctx);
    if (!encounter && g.p && g.apeTimer > 0 && g.p.rocketTimer <= 0 && (g.hawkTimer <= 0 || g.falling)) {
      for (const [apeIndex, ape] of g.apes.entries()) {
      ctx.save();
      const apeX = g.p.x - 45 - apeIndex * 32;
      const apeFeet = g.falling || g.p.air ? g.p.y : trackHeightAt(g.C, apeX, CW, g.p.y);
      ctx.translate(apeX - g.cx, apeFeet - 28 * APE_SCALE - g.cy);
      ctx.scale(APE_SCALE, APE_SCALE);
      if (g.falling) {
        ctx.translate(0, 28);
        drawFallingCharacter(ctx, g.fallFrame, true, true);
      } else drawApeAsset(ctx, g.p.ph, false, ape.throwTimer, ape.direction, g.p.air, g.p.carry > 0 && g.p.shieldKind === 'bag');
      ctx.restore(); }
    }

    ctx.restore();

    if (g.zeroCrash && g.p) {
      ctx.save();
      ctx.translate(viewport.x * (1 - viewport.scaleX), viewport.y * (1 - viewport.scale));
      ctx.scale(viewport.scaleX, viewport.scale);
      const x = g.zeroCrashIndex * CW - g.cx + 1;
      if (g.invertedView && !encounter) {
        ctx.translate(0, TAPE_HEIGHT + H - TIME_AXIS_HEIGHT);
        ctx.scale(1, -1);
      }
      const top = g.zeroCrashTop - g.cy;
      const bottom = g.C[g.zeroCrashIndex]?.bot ?? g.zeroCrashTop;
      ctx.fillStyle = RED;
      // Render after the plot clip so the growing last candle enters the
      // bottom axis too. Canvas itself is still clipped by the game stage.
      ctx.fillRect(x, top, CW - 3, bottom - g.cy - top);
      ctx.strokeStyle = RED; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + (CW - 3) / 2, top - 3);
      ctx.lineTo(x + (CW - 3) / 2, bottom - g.cy + 3); ctx.stroke();
      ctx.restore();
    }

    // SCORE & OHLC READOUT IN TOP-LEFT (Clean, NO Red Flashes!)
    const hi = Math.min(g.C.length - 1, Math.floor((g.p ? g.p.x : 0) / CW));
    const hc = g.C[hi];
    const totalScoreVal = Math.max(0, g.score - g.penalty + g.activityPips);

    if (hc) {
      ctx.font = '900 15px monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#08795c';
      if (encounter) {
        ctx.fillStyle = '#ef4444'; ctx.font = 'bold 25px sans-serif';
        ctx.fillText('♥'.repeat(encounter.player.lives) + '♡'.repeat(3 - encounter.player.lives), 14, TAPE_HEIGHT + 20);
      } else {
        const label = 'PIPS: ';
        const value = totalScoreVal.toLocaleString();
        const text = `${label}${value}`;
        const padding = 14;
        const bounds = canvasRef.current?.getBoundingClientRect() ?? { width: W, height: H };
        const scoreZoom = mobileCanvasZoom();
        const scoreScaleX = Math.max(0.01, bounds.width / W * scoreZoom);
        const scoreScaleY = Math.max(0.01, bounds.height / H * scoreZoom);
        const mobileScore = feedLayout.current.mobile;
        const textScaleX = mobileScore ? scoreScaleY / scoreScaleX : 1;
        const paddingX = (padding - bounds.width / 2 * (1 - scoreZoom)) / (scoreScaleX * textScaleX);
        ctx.save();
        ctx.scale(textScaleX, 1);
        const scoreFontFamily = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
        const maxScoreWidth = mobileScore ? (W - AX) / textScaleX - padding * 2 / (scoreScaleX * textScaleX) : W - AX - padding * 2;
        const baseFontSize = mobileScore ? 16 / scoreScaleY : 15;
        ctx.font = `900 ${baseFontSize}px ${scoreFontFamily}`;
        const baseWidth = ctx.measureText(text).width;
        const fontSize = Math.min(baseFontSize, baseFontSize * maxScoreWidth / Math.max(1, baseWidth));
        ctx.font = `900 ${Math.max(10, fontSize)}px ${scoreFontFamily}`;
        ctx.textBaseline = 'alphabetic';
        const metrics = ctx.measureText(text);
        const x = paddingX + metrics.actualBoundingBoxLeft;
        const y = TAPE_HEIGHT + padding / scoreScaleY + metrics.actualBoundingBoxAscent;
        ctx.fillStyle = theme === 'light' ? '#08795c' : '#54d3ac';
        ctx.fillText(label, x, y);
        ctx.fillStyle = theme === 'light' ? '#08795c' : '#54d3ac';
        ctx.fillText(value, x + ctx.measureText(label).width, y);
        ctx.restore();
      }


    }

    // Time Axis (Bottom)
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, H - TIME_AXIS_HEIGHT, W, TIME_AXIS_HEIGHT);
    ctx.font = '9px system-ui, monospace';
    ctx.fillStyle = palette.muted;
    ctx.textAlign = 'center';
    for (let i = a; i <= b; i++) {
      if (i % 10 === 0) {
        const labelX = chartToScreen({ x: i * CW - g.cx, y: 0 }, viewport).x;
        if (labelX >= 0 && labelX < W - AX) ctx.fillText('T+' + pad(i), labelX, H - 3);
      }
    }

    // Price Axis (Right)
    ctx.fillStyle = palette.bg;
    ctx.fillRect(W - AX, TAPE_HEIGHT, AX, H - TAPE_HEIGHT);
    ctx.strokeStyle = palette.grid;
    ctx.beginPath();
    ctx.moveTo(W - AX, TAPE_HEIGHT);
    ctx.lineTo(W - AX, H);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = 'bold 11px system-ui, monospace';
    ctx.fillStyle = palette.muted;
    for (let gridY = Math.floor(g.cy / 50) * 50; gridY < g.cy + H - TIME_AXIS_HEIGHT; gridY += 50) {
      const labelY = chartToScreen({ x: 0, y: plotViewY(gridY - g.cy, g.invertedView && !encounter, TAPE_HEIGHT, H - TIME_AXIS_HEIGHT) }, viewport).y;
      if (labelY >= TAPE_HEIGHT + 8 && labelY < H - TIME_AXIS_HEIGHT) ctx.fillText(price(gridY), W - AX + 6, labelY + 4);
    }

    if (hc) {
      const col = hc.c < hc.o ? GREEN : RED;
      const y = chartToScreen({ x: 0, y: plotViewY(hc.c - g.cy, g.invertedView && !encounter, TAPE_HEIGHT, H - TIME_AXIS_HEIGHT) }, viewport).y;
      ctx.fillStyle = col;
      ctx.fillRect(W - AX, y - 9, AX, 18);
      ctx.fillStyle = '#fff';
      ctx.fillText(price(hc.c), W - AX + 6, y + 4);
    }
    ctx.restore();
    // Draw last while the mobile zoom is still active so the Live Feed scales
    // with the gameplay and remains readable on small screens.
    drawTopTickerTape(ctx);
    ctx.restore();
  }, [drawHero, drawPickups, drawSwans, drawAnimals, drawTopTickerTape, theme, bossEncounter]);

  const pressJump = useCallback(() => {
    const g = gameRef.current;
    if (g.printerTimer > 0) return;
    if (g.currentState === 'play' && g.p && !g.falling) {
      if (g.p.air && g.p.jumps === 1 && g.p.doubleReady) {
        g.p.vy = -9.2;
        g.p.jumps = 2;
        g.p.doubleReady = false;
        g.p.buf = 0;
      } else {
        g.p.buf = 7;
      }
      g.held = true;
    } else if (g.currentState === 'menu' || g.currentState === 'over') {
      initGame();
      g.currentState = 'play';
      g.held = true;
      if (g.p) g.p.buf = 7;
      onStateChange('play');
    }
  }, [initGame, onStateChange]);

  const releaseJump = useCallback(() => {
    gameRef.current.held = false;
  }, []);

  const togglePause = useCallback(() => {
    const g = gameRef.current;
    if (g.currentState === 'play') {
      g.currentState = 'paused';
      g.held = false;
      onStateChange('paused');
    } else if (g.currentState === 'paused') {
      g.currentState = 'play';
      onStateChange('play');
      canvasRef.current?.focus({ preventScroll: true });
    }
  }, [onStateChange]);

  useLayoutEffect(() => { initGame(); }, [initGame]);

  const handledPrinterRequest = useRef(0);
  useLayoutEffect(() => {
    const g = gameRef.current;
    if (invertedRequest > 0 && g.p && g.currentState !== 'boxing') {
      g.invertedView = !g.invertedView;
      if (g.printerTimer > 0) g.printerExitInverted = g.invertedView;
      aimRef.current = null;
      onInvertedActivated?.();
    }
  }, [invertedRequest, onInvertedActivated]);
  useLayoutEffect(() => {
    const g = gameRef.current;
    g.nextCandleSurprise = candleDemo ? g.globalFrame : g.globalFrame + candleSurpriseDelay();
  }, [candleDemo]);
  useLayoutEffect(() => {
    if (hawkRequest > 0 && gameRef.current.p) {
      activateHawk();
      onHawkActivated?.();
    }
  }, [hawkRequest, onHawkActivated, activateHawk]);
  useLayoutEffect(() => {
    if (printerRequest === 0) handledPrinterRequest.current = 0;
    if (printerRequest > 0 && handledPrinterRequest.current !== printerRequest) {
      handledPrinterRequest.current = printerRequest;
      activatePrinter();
      onPrinterActivated?.();
    }
  }, [printerRequest, activatePrinter, onPrinterActivated]);

  useLayoutEffect(() => {
    const g = gameRef.current;
    if (state === 'boxing' && !bossTrack.current && g.p) {
      g.invertedView = false; g.printerExitInverted = false;
      aimRef.current = null;
      if (g.printerSaved) {
        g.C = g.printerSaved.slice();
        g.printerSaved = null;
      }
      g.printerTimer = 0; g.printerRotation = 0;
      g.p.rocketTimer = 0;
      g.fedoraTimer = 0; g.fedoraCount = 0; g.fedoraWindup = 0; g.flyingFedora = null;
      g.swans = []; g.animals = []; g.cases = []; g.pigeonDrops = []; g.spits = [];
      bossTrack.current = { candles: g.C.slice(), length: g.C.length };
      const left = Math.max(0, g.cx);
      const right = left + W - AX - 25;
      const base = g.p.y;
      const first = Math.max(0, Math.floor(left / CW));
      const last = Math.ceil(right / CW) + 2;
      const tops = sidewaysTops(last - first + 1, base);
      for (let i = first; i <= last; i++) {
        const old = g.C[i];
        const top = tops[i - first];
        const body = Math.random() < 0.13 ? R(28, 48) : R(2, 25);
        const rising = i > first && top < tops[i - first - 1];
        const green = Math.random() < (rising ? 0.72 : 0.28);
        g.C[i] = { ...old, hole: false, top, bot: top + body, o: green ? top + body : top, c: green ? top : top + body, h: top - R(1, 14), l: top + body + R(1, 16), v: R(0.15, 1.4), sp: false, k: 'Sideways' };
      }
      const encounter = createBossArena();
      encounter.left = left + 25; encounter.right = right;
      const heroIndex = Math.floor(g.p.x / CW);
      const bossIndex = Math.floor(Math.min(right - 60, g.p.x + 550) / CW);
      for (let start = first + 30; start < last - 12; start += Math.floor(R(40, 65))) {
        const width = Math.floor(R(5, 9));
        if (Math.abs(start - heroIndex) < 14 || Math.abs(start - bossIndex) < 14) continue;
        for (let i = start - 12; i < start; i++) g.C[i].sp = true;
        for (let i = start; i < start + width; i++) g.C[i].hole = true;
      }
      encounter.heightAt = x => {
        const candle = g.C[Math.max(first, Math.min(last, Math.floor(x / CW)))];
        return candle.hole ? Infinity : candle.top;
      };
      encounter.safeHeightAt = x => trackHeightAt(g.C, x, CW, base);
      encounter.triggerCandleSurprise = random => {
        const candidates: number[] = [];
        const start = Math.max(first + 6, Math.ceil((encounter.player.x + 500) / CW));
        const end = Math.min(last - SURPRISE_MAX_GAP - 4, Math.floor((encounter.right - 80) / CW));
        for (let index = start; index <= end; index++) {
          const x = index * CW;
          const clearance = (SURPRISE_MAX_GAP + 5) * CW;
          if (Math.abs(x - encounter.boss.x) < clearance) continue;
          if (encounter.animals.some(animal => Math.abs(animal.x - x) < clearance)) continue;
          if (encounter.drops.some(drop => Math.abs(drop.x - x) < clearance)) continue;
          candidates.push(index);
        }
        while (candidates.length) {
          const index = candidates.splice(Math.floor(random() * candidates.length), 1)[0];
          if (applyCandleSurprise(g.C, index, SURPRISE_MIN_GAP + Math.floor(random() * (SURPRISE_MAX_GAP - SURPRISE_MIN_GAP + 1)), 30 + random() * 90)) {
            encounter.popups.push({ x: index * CW, y: g.C[index].top - 35, text: 'Paper Hands', life: 120 });
            return true;
          }
        }
        return false;
      };
      encounter.doubleJumpAt = x => !!g.C[Math.max(first, Math.min(last, Math.floor(x / CW)))].sp;
      encounter.player.x = g.p.x;
      encounter.player.y = Math.min(encounter.heightAt(g.p.x) - 240, g.cy + TAPE_HEIGHT - 60);
      encounter.player.vy = 2;
      encounter.player.grounded = false;
      encounter.player.coyote = 0;
      encounter.player.invulnerable = 100;
      encounter.boss.x = Math.min(right - 60, g.p.x + 550); encounter.boss.y = encounter.heightAt(encounter.boss.x);
      encounter.boss.aimY = encounter.boss.y - 60;
      bossEncounter.current = encounter;
    } else if (state !== 'boxing' && bossTrack.current) {
      g.C = bossTrack.current.candles;
      g.C.length = bossTrack.current.length;
      bossTrack.current = null; bossEncounter.current = null;
      if (state === 'play' && g.p) {
        g.activityPips += 1000;
        // Return above solid normal-run terrain, then let ordinary gravity
        // animate the descent. Never spawn directly over the saved gap.
        let index = Math.max(0, Math.floor(g.p.x / CW));
        while (index < g.C.length - 1 && g.C[index]?.hole) index++;
        g.p.x = index * CW + CW / 2;
        const ground = trackHeightAt(g.C, g.p.x, CW, g.p.y);
        g.cy = ground - H * 0.62;
        g.p.y = Math.min(ground - 240, g.cy + TAPE_HEIGHT - 60);
        g.p.previousY = g.p.y;
        g.p.vy = 2;
        g.p.air = true;
        g.p.buf = 0; g.p.coy = 0; g.p.jumps = 0;
        g.p.rocketTimer = 0;
        g.gapAirborne = false; g.falling = false;
        g.popups = [];
      }
      if (state === 'over') {
        g.cause = 'Kangaroo knockout';
        g.held = false;
        sound.playGameOver();
        const pips = Math.max(0, g.score - g.penalty + g.activityPips);
        const candle = g.C[Math.floor((g.p?.x ?? 0) / CW)];
        onGameOver(g.cause, arcadeProfit(pips, candle ? Number(price(candle.c)) : 0));
      }
    }
    g.currentState = state;
    g.accumulator = 0;
    g.previousTime = 0;
    g.held = false;
  }, [state, bossEncounter, onGameOver]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameRef.current.currentState === 'boxing') return;
      if (gameRef.current.currentState === 'menu') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLElement && (e.target.closest('[role="dialog"]') || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (!e.repeat) togglePause();
        return;
      }
      if (['r', 'R'].includes(e.key)) {
        e.preventDefault();
        if (!e.repeat) {
          gameRef.current.held = false;
          initGame();
          gameRef.current.currentState = 'play';
          onStateChange('play');
        }
        return;
      }
      if ([' ', 'x', 'X', 'w', 'W', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        if (!e.repeat) {
          if (gameRef.current.currentState === 'paused') {
            togglePause();
          } else if (gameRef.current.currentState === 'over') {
            initGame();
            gameRef.current.currentState = 'play';
            onStateChange('play');
          } else {
            pressJump();
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ([' ', 'x', 'X', 'w', 'W', 'ArrowUp'].includes(e.key)) {
        releaseJump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [pressJump, releaseJump, throwBriefcase, togglePause, initGame, onStateChange]);

  // Fresh callbacks without restarting the run on parent renders or theme changes.
  const loopCallbacks = useRef({ update, draw });
  useLayoutEffect(() => {
    loopCallbacks.current = { update, draw };
  }, [update, draw]);

  useEffect(() => {
    let animationFrameId: number;
    let disposed = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = canvasPixelRatio();
    canvas.width = Math.round(W * ratio);
    canvas.height = Math.round(H * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const renderLoop = (now: number) => {
      if (disposed) return;
      const g = gameRef.current;
      if (g.currentState === 'play' || g.currentState === 'boxing') {
        sound.setMusicMode(g.currentState === 'boxing' ? 'kangaroo' : g.printerTimer > 0 ? 'pigeon' : g.hawkTimer > 0 ? 'hawk' : 'normal');
      }
      const delta = g.previousTime ? Math.min((now - g.previousTime) / 1000, 0.1) : 0;
      g.previousTime = now;
      g.accumulator += delta;
      let simulationSteps = 0;

      while (g.accumulator >= 1 / 60) {
        simulationSteps++;
        // News animation is independent of gameplay and effect timers.
        if (!tickerHoverPausedRef.current && (g.currentState === 'play' || g.currentState === 'paused' || g.currentState === 'menu')) {
          g.tickerScrollX -= 2;
          if (g.printerTimer > 0) g.printerTickerX -= 12;
          while (g.tickerQueue.length && g.tickerQueue[0].width > 0 && g.tickerScrollX + g.tickerQueue[0].width <= 0) {
            g.tickerScrollX += g.tickerQueue[0].width;
            g.tickerQueue.shift();
          }
        }
        if (g.currentState === 'play') {
          loopCallbacks.current.update();
        } else if (g.currentState === 'over' && g.overT > 0) {
          g.overT--;
        }
        g.accumulator -= 1 / 60;
      }

      // A backgrounded/throttled tab can deliver a large timestamp jump. The
      // fixed-step simulation catches up, but rendering every catch-up RAF
      // would make the next frame even more expensive on mobile.
      if (simulationSteps < 4) loopCallbacks.current.draw(ctx);
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrameId);
    };
  }, [initGame]);

  return (
    <div className="game-stage relative w-full aspect-[1920/840] overflow-hidden select-none bg-[#0c111b] shadow-2xl">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        tabIndex={0}
        onPointerMove={e => {
          const g = gameRef.current;
          const bounds = e.currentTarget.getBoundingClientRect();
          const zoom = mobileCanvasZoom();
          const canvasPoint = zoomCanvasPoint({ x: e.clientX, y: e.clientY }, bounds, zoom);
          const canvasY = canvasPoint.y;
          tickerHoverPausedRef.current = !headerFeedActive.current && canvasY >= 0 && canvasY <= TAPE_HEIGHT;
          const chartPoint = screenToChart(canvasPoint, currentChartViewport(bounds));
          aimRef.current = pointerToWorld(chartPoint, { left: 0, top: 0, width: W, height: H }, W, H, { x: g.cx, y: g.cy });
          aimRef.current.y = g.cy + plotViewY(aimRef.current.y - g.cy, g.invertedView && g.currentState !== 'boxing', TAPE_HEIGHT, H - TIME_AXIS_HEIGHT);
          if (bossEncounter.current) bossEncounter.current.aim = aimRef.current;
        }}
        onPointerLeave={() => { tickerHoverPausedRef.current = false; }}
        onPointerDown={e => {
          if (e.button !== 0) return;
          e.preventDefault(); e.currentTarget.focus();
          const g = gameRef.current;
          const bounds = e.currentTarget.getBoundingClientRect();
          const canvasPoint = zoomCanvasPoint({ x: e.clientX, y: e.clientY }, bounds, mobileCanvasZoom());
          const chartPoint = screenToChart(canvasPoint, currentChartViewport(bounds));
          aimRef.current = pointerToWorld(chartPoint, { left: 0, top: 0, width: W, height: H }, W, H, { x: g.cx, y: g.cy });
          aimRef.current.y = g.cy + plotViewY(aimRef.current.y - g.cy, g.invertedView && g.currentState !== 'boxing', TAPE_HEIGHT, H - TIME_AXIS_HEIGHT);
          if (g.currentState === 'boxing' && bossEncounter.current) {
            bossEncounter.current.aim = aimRef.current;
            bossEncounter.current.attackRequested = true;
          } else throwBriefcase();
        }}
        className="block w-full h-full touch-none cursor-crosshair outline-none focus-visible:ring-2 focus-visible:ring-[#55d6ae]"
        aria-label="Candlestick runner canvas"
      />


      {(state === 'play' || state === 'boxing') && <MobileJoystick
        movementEnabled={state === 'boxing'}
        onPress={() => {
          if (gameRef.current.currentState === 'boxing' && bossEncounter.current) bossEncounter.current.jumpRequested = true;
          else pressJump();
        }}
        onMove={x => { if (bossEncounter.current) bossEncounter.current.joystickX = x; }}
        onRelease={() => { releaseJump(); if (bossEncounter.current) bossEncounter.current.joystickX = 0; }}
      />}
    </div>
  );
};
