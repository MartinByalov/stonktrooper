import { briefcaseRightEdge, clipBriefcaseStep } from './gameView';
import { drawBellLives } from './bellLivesHud';
import { hudStripGeometry } from './hudStripGeometry';
import { hatMetrics } from './hatPose';
import { runnerShoeSpeedMultiplier } from './runnerSpeed';
import { drawRocketPetCanopy, drawRocketCanopy, clipRocketCanopy, rocketSeatCenter, ROCKET_SEAT_SPACING, ROCKET_PET_CANOPY } from './rocketCanopy';
import { frogBodyPose, ridingPetLift } from './mountPose';
// Browser game module for CandleGame.
import { drawPigeonStain } from './pigeonStain';
import { drawCharacterHat, drawPickupAsset, drawSwanAsset, drawApeAsset, drawApeHead, drawApeHat, drawHumanHead, drawFallingCharacter, drawSpinningEquippedHat, APE_SCALE } from './assetRenderer';
import React, { useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { randomDelay } from './randomTiming';
import { lethalBirdContact, canStompBird } from './birdCollision';
import { segmentPointDistance } from './projectileCollision';
import { tryBirdHatTheft, restoreStolenHat, type PlayerHat } from './birdHatTheft';
import { stepHawkFlight } from './hawkFlight';
import { trackPickupDelay } from './pickupTiming';
import { compactChartWindow, ensureChartAhead } from './chartWindow';
import { applyCandleSurprise, SURPRISE_MIN_GAP, SURPRISE_MAX_GAP, candleSurpriseDelay, SURPRISE_RETRY_FRAMES } from './candleSurprise';
import { stepTenderFall, tenderLanding } from './tenderFall';
import { randomBirdCargo, canReleaseBirdCargo } from './birdCargo';
import { renderBackingSize } from './renderBudget';
import { drawDiagnosticsEnabled, recordDrawDuration } from './drawDiagnostics';
import { drawDumpster } from './dumpsterRenderer';
import { drawPet } from './petRenderer';
import { drawMount, mountRiderDrop } from './mountRenderer';
import { mountPickupDistance } from './pickupContact';
import { drawEquippedBag, drawNearBriefcaseArm, drawSuitDetails, drawSuitCollar, drawRunnerLeg, drawRidingSuit, drawFarRunnerArm, drawJointedSuitArm, drawGauntlet, drawDeskItem, drawHeroHand } from './cosmeticModels';
import { candleGlyph, drawCandleDesign } from './candleDesign';
import { petDeathPose, petPose, petAnimationPhase, stepPetFollower, startPetAttack, stepPetAttack, petAttackBossHit, type PetAttack, type PetFollower, type ModePreviewRequest } from './petPose';
import { hawkBagThrowPose, nearestHawkEnemy, steerHawkBag } from './hawkBagThrow';
import { whaleCompanionPose, applyWhaleRiderSeat, applyWhaleRiderSwim, drawWhaleRiderArm, drawWhaleRiderLeg, drawMountedSeat, drawPennyStirrupForeground, WHALE_RIDER_SEAT, WHALE_RIDER_SCALE } from './whaleRider';
import { swanBagPose } from './swanBag';
import { printerFallRotation } from './printerFall';
import { aimedVelocity, plotViewY, AimPoint } from './aim';
import { actorInPlayfield } from './gameView';
import { gameView, clientToWorld, followCameraY, isJumpZone, BOSS_ATTACK_ZONE_FRACTION } from './gameView';
import { chartHistory } from './chartHistory';
import { CANDLE_PATTERNS, pickCandlePattern } from './candlePatterns';
import { advanceSimulationClock, resetSimulationClock } from './simulationClock';
import { pickupInRenderBounds, pickupRenderBounds } from './pickupVisibility';
import { RenderExperimentPanel } from './RenderExperimentPanel';
import { actorLayers, getRenderMode, renderExperimentEnabled, renderLayers } from './renderExperiment';
import { pigeonDropsPrinter } from './gameRules';
import { extendPrinterTurns, endingPrinterCandle, printerSourceCandle, printerCrossingPose, printerEnemyPose, printerProfileFlip, rightEdgeSpawnX, PrinterTurn, printerPastLastCrossing } from './printerTrack';
import { aimedHitDefeatsEnemy, dismountRider, canCatchBossBell, bellDescentTop } from './gameRules';
import { GameState, Candle, Player, Pickup, Swan, Animal, Briefcase, MarketEvent, MarketLevel, ActiveNews, ScorePopup } from './types';
import { sound } from './audio';
import { activityMultiplier, enemyPips } from './scoring';
import { defaults, skinColors, type Category, type GameEvent } from './progression';
import { hawkCandle, hawkDropBudget, hawkSpeedMultiplier } from './hawkTrack';
import { zeroCrashCamera, zeroCrashComplete } from './zeroCrash';
import { canSpawnEncounter, shouldPlaceBell, WARMUP_CANDLES, difficultyUnlocked, chartPrice, marketReachedZero } from './pacing';
import { pigeonFlightY, stepPigeonDrop, PigeonDrop } from './pigeonEffects';
import { createBossArena, throwBossCase, stepBossArena, bossName, randomBossKind, bossMaxHealth, bossWinPips } from './boxingRules';
import { drawBossEncounter } from './bossRenderer';
import { bellSegmentHit } from './bellCombat';
import { emitBellBlood } from './bellBlood';
import { bossColors } from './bossColors';
import { ApeCompanion, addCompanion, tickCompanions } from './companions';
import { getRandomNews, getTickerNews, formatFeedHeadline, MarketNews } from './news';
import { trackHeightAt, petTrackHeightAt, animalTrackHeightAt, animalFallsInGap, rocketTrackPose } from './track';
import { canMountWhale, canMountRider, touchesWhale, jumpWhaleMount, stepWhaleMount, whaleStompsEnemy, WHALE_CONTACT_RADIUS, WHALE_MOUNT_DURATION, WHALE_SEAT_HEIGHT, WHALE_SPEED_MULTIPLIER } from './whaleMount';
import { marketClockLabel, marketClockStep } from './marketClock';
import { drawChartGridLine } from './chartGridRenderer';
import { popupColor } from './popupColors';
import { FEDORA_DURATION, FEDORA_WINDUP, FEDORA_MAX_THROWS, addFedoraTime, weaponHatCount, fedoraArmPose, fedoraReleasePose, fedoraHit, fedoraBossHit, fedoraHitsMount, separateFedoraMount, stepFlyingFedora, type FlyingFedora } from './fedoraBoomerang';
import { actionArmPose, briefcaseArmPose, runnerCarryPose, runnerBagThrowPose } from './characterPose';
import { drawProfileBackLayers } from './profileLayers';

import { bagDrainPenalty, enemyMovementSpeed, canLandOnTrack, canRecoverSolidLanding, doubleJumpChargeOnLanding, whaleDropsBanknote, BAG_PIPS_PENALTY, APE_DURATION, APE_THROW_INTERVAL, ROCKET_SPEED_MULTIPLIER, absorbEnemyHit, canStompEnemy, isBlockedByTallCandle, arcadeProfit } from './gameRules';
import { ANIMAL_CENTER, animalHeight, drawAnimalCharacter } from './animalRenderer';
import { extendMarketPath, sampleMarketPath, MarketKnot, MARKET_BASELINE, candleVolatilityBoost, extendMarketRegimes, marketRegimeAt, MarketRegime } from './marketPath';

interface CandleGameProps {
  feedMessage?: string;
  liveFeedEnabled?: boolean;
  liveFeedPaused?: boolean;
  whaleDemo?: boolean;
  candleDemo?: boolean;
  printerRequest?: number;
  bossRequest?: number;
  invertedRequest?: number;
  onInvertedActivated?: () => void;
  hawkRequest?: number;
  onHawkActivated?: () => void;
  onPrinterActivated?: () => void;
  bossEncounter: { current: import('./boxingRules').BossArena | null };
  theme: 'dark' | 'light';
  state: GameState;
  onStateChange: (state: GameState) => void;
  onGameEvent?: (event: GameEvent) => void;
  cosmetics?: Record<Category, string>;
  reviveRequest?: number;
  modePreview?: ModePreviewRequest;
  onScoreUpdate: (stats: {
    currentPrice: number;
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

const TAPE_HEIGHT = 48;
const CW = 9; // Stable world units; independent of screen size.
const renderTestEnabled = typeof window !== 'undefined' && renderExperimentEnabled(window.location.search);
export const mobileCanvasZoom = (): number => 1;

const CAP = 50;
const LEN = 360; // Candlesticks per market cycle
const HX = 250; // Initial world spawn, independent of the screen camera anchor.

const GREEN = '#159e83';
const RED = '#e94343';

const LEVELS: MarketLevel[] = [
  { n: 'Normal market', t: 'NORMAL', tint: '#142637', bull: 0.52, vol: 9, description: 'Calm cyclical baseline' },
  { n: 'Crash pressure', t: 'CRASH', tint: '#33151e', bull: 0.22, vol: 13, description: 'Downward volatility' },
  { n: 'Short squeeze', t: 'SQUEEZE', tint: '#153326', bull: 0.80, vol: 12, description: 'Bullish squeeze' },
  { n: 'Recovery', t: 'RECOVERY', tint: '#20213b', bull: 0.54, vol: 10, description: 'Market consolidation' }
];


const R = (a: number, b: number) => a + Math.random() * (b - a);

// Slower, enjoyable pacing for readable gameplay
const price = (y: number) => chartPrice(y, MARKET_BASELINE).toFixed(2);

export const CandleGame: React.FC<CandleGameProps> = ({
  feedMessage = '',
  liveFeedEnabled = true,
  liveFeedPaused = false,
  theme,
  state,
  onStateChange,
  onScoreUpdate,
  onGameEvent,
  cosmetics = defaults,
  reviveRequest = 0,
  modePreview,
  onGameOver,
  bossEncounter,
  bossRequest = 0,
  printerRequest = 0,
  invertedRequest = 0,
  onInvertedActivated,
  onPrinterActivated,
  candleDemo = false,
  whaleDemo = false,
  hawkRequest = 0,
  onHawkActivated
}) => {
  const viewRef = useRef(gameView());
  const heroCameraOffset = () => viewRef.current.heroX;
  const [GREEN, RED] = skinColors(cosmetics.candles, theme === 'dark');
  const eventRef = useRef(onGameEvent);
  eventRef.current = onGameEvent;
  const currencyCounts = useRef({ coins: 0, diamonds: 0, bags: 0, hats: 0, tenders: 0, bells: 0, bananas: 0 });
  const collectCurrency = (currency: keyof typeof currencyCounts.current) => {
    currencyCounts.current[currency]++;
    eventRef.current?.({ type: 'collect', currency });
  };
  const cosmeticRef = useRef(cosmetics);
  const petAttack = useRef<PetAttack | null>(null);
  const petFollower = useRef<(PetFollower & { id: string }) | null>(null);
  const petDeath = useRef<{ x: number; y: number; frame: number; gap: boolean; id: string } | null>(null);
  cosmeticRef.current = cosmetics;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasDisplay = useRef({ width: viewRef.current.width, height: viewRef.current.height });
  const scoreInset = useRef(14);
  const scoreTopInset = useRef(14);
  const headerFeedRef = useRef<HTMLCanvasElement | null>(null);
  const feedMessageRef = useRef(feedMessage);
  feedMessageRef.current = feedMessage;
  const statusTicker = useRef({ message: '', x: 0, time: 0 });
  const headerFeedActive = useRef(false);
  const headerFeedLayout = useRef({ height: 32, width: viewRef.current.width, mainHeight: viewRef.current.height });
  const hudStripLayout = useRef({ height: 36, stripHeight: 24, radius: 4, left: 12, width: 100, livesLeft: 12, livesWidth: 90, iconSize: 19.2 });
  const feedLayout = useRef({ mobile: false, fontSize: 11, textScaleX: 1, tapeHeight: TAPE_HEIGHT });
  const feedColor = useRef('');
  const feedTextCache = useRef(new WeakMap<MarketNews, { message: string; font: string; width: number; textScaleX: number }>());
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const refresh = () => {
      const mobile = window.matchMedia('(pointer: coarse)').matches;
      const bounds = canvas.getBoundingClientRect();
      canvasDisplay.current = { width: bounds.width, height: bounds.height };
      const header = canvas.closest('.game-app')?.querySelector('header');
      const optionsIcon = header?.querySelector('.header-options-control svg');
      const edgeInset = header && optionsIcon ? header.getBoundingClientRect().right - optionsIcon.getBoundingClientRect().right
        : parseFloat(getComputedStyle(canvas).getPropertyValue('--content-edge-inset')) || 12.1666666667;
      scoreInset.current = edgeInset;
      scoreTopInset.current = edgeInset;
      canvas.closest<HTMLElement>('.game-stage')?.style.setProperty('--game-hud-inset', `${scoreInset.current}px`);
      canvas.closest<HTMLElement>('.game-stage')?.style.setProperty('--game-hud-top-inset', `${scoreTopInset.current}px`);
      const previous = viewRef.current;
      if (bounds.width > 0 && bounds.height > 0) viewRef.current = gameView(bounds);
      const next = viewRef.current;
      const g = gameRef.current;
      // Reframe the existing world; never reset physics, terrain or run progress.
      if (g.p && (previous.width !== next.width || previous.scale !== next.scale)) {
        g.cx = g.p.x - next.heroX;
        g.cy += previous.heroY - next.heroY;
        if (bossEncounter.current) bossEncounter.current.cameraX = g.cx;
      }
      const scale = Math.max(0.01, bounds.height / viewRef.current.height * mobileCanvasZoom());
      const horizontalScale = Math.max(0.01, bounds.width / viewRef.current.width * mobileCanvasZoom());
      const axisLeft = bounds.width / 2 + (viewRef.current.width / 2 - viewRef.current.axisWidth) * horizontalScale;
      canvas.closest<HTMLElement>('.game-arena')?.style.setProperty('--chart-axis-right', `${Math.max(0, bounds.width - axisLeft)}px`);
      const textScaleX = mobile ? scale / horizontalScale : 1;
      const headerHeight = canvas.closest('.game-app')?.querySelector('header')?.getBoundingClientRect().height ?? 0;
      const canvasStyle = getComputedStyle(canvas);
      feedColor.current = canvasStyle.getPropertyValue('--ui-blue').trim();
      const radiusValue = canvasStyle.getPropertyValue('--ui-radius').trim();
      const radius = (parseFloat(radiusValue) || 0) * (radiusValue.endsWith('rem') ? parseFloat(getComputedStyle(document.documentElement).fontSize) : 1);
      const pause = header?.querySelector('.header-pause-control')?.getBoundingClientRect();
      const controls = header?.querySelector('.header-options-control')?.getBoundingClientRect();
      const controlSize = controls?.width || 40;
      const actions = header?.querySelector<HTMLElement>('.header-controls.ml-auto');
      const controlGap = actions ? parseFloat(getComputedStyle(actions).columnGap) || 0 : 8;
      const headerBounds = header?.getBoundingClientRect();
      const geometry = hudStripGeometry({ canvasLeft: bounds.left, canvasWidth: bounds.width,
        headerLeft: headerBounds?.left ?? bounds.left, controlSize, controlGap,
        currencyWidth: header?.querySelector('.game-currency-hud')?.getBoundingClientRect().width,
        // Mobile: the score tab sits at the same edge gap as every other corner element (--edge-gap).
        leftInset: (() => {
          const app = canvas.closest<HTMLElement>('.game-app');
          if (!app) return parseFloat(canvasStyle.getPropertyValue('--corner-base-gap')) || edgeInset;
          // Desktop: the score tab starts exactly where the counter above it starts.
          if (app.dataset.layout === 'desktop') {
            const hud = header?.querySelector('.game-currency-hud')?.getBoundingClientRect();
            if (hud && hud.width > 0 && headerBounds) return hud.left - headerBounds.left;
          }
          const probe = document.createElement('div');
          probe.style.cssText = 'position:absolute;visibility:hidden;width:var(--edge-gap, 0px)';
          app.appendChild(probe);
          const gap = probe.getBoundingClientRect().width;
          probe.remove();
          return gap > 0 ? gap : parseFloat(canvasStyle.getPropertyValue('--corner-base-gap')) || edgeInset;
        })(),
        pauseLeft: pause && pause.width > 0 ? pause.left : undefined,
        controlsRight: controls && controls.width > 0 ? controls.right : undefined });
      // Desktop controls are 32px, so the score tab is 32px tall; Android keeps 24px.
      const desktopLayout = canvas.closest<HTMLElement>('.game-app')?.dataset.layout === 'desktop';
      hudStripLayout.current = { height: headerHeight || 36, stripHeight: desktopLayout ? 32 : 24, radius, ...geometry, iconSize: controlSize * .8 };
      headerFeedRef.current = Array.from(canvas.closest('.game-app')?.querySelectorAll<HTMLCanvasElement>('.mobile-header-feed, .desktop-live-feed') ?? []).find(feed => feed.getBoundingClientRect().width > 0) ?? null;
      headerFeedActive.current = !!headerFeedRef.current && headerFeedRef.current.getBoundingClientRect().width > 0;
      const headerFeed = headerFeedRef.current;
      if (headerFeed && headerFeedActive.current) {
        const rect = headerFeed.getBoundingClientRect();
        headerFeedLayout.current = { height: rect.height, width: rect.width, mainHeight: bounds.height };
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const width = Math.max(1, Math.round(rect.width * dpr));
        const height = Math.max(1, Math.round(rect.height * dpr));
        if (headerFeed.width !== width) headerFeed.width = width;
        if (headerFeed.height !== height) headerFeed.height = height;
      }
      const tapeHeight = !liveFeedEnabled ? 0 : headerFeedActive.current ? 1 / scale : headerHeight > 0 ? headerHeight / scale : TAPE_HEIGHT;
      feedLayout.current = { mobile, fontSize: mobile || headerFeedActive.current ? Math.min(64, Math.max(11, 14 / scale)) : 11, textScaleX, tapeHeight };
    };
    const observer = new ResizeObserver(refresh);
    const app = canvas.closest('.game-app');
    app?.addEventListener('hudlayoutchange', refresh);
    observer.observe(canvas);
    const header = canvas.closest('.game-app')?.querySelector('header');
    if (header) observer.observe(header);
    const wallet = header?.querySelector('.game-currency-hud .wallet-bar');
    if (wallet) observer.observe(wallet);
    const headerFeeds = canvas.closest('.game-app')?.querySelectorAll('.mobile-header-feed, .desktop-live-feed') ?? [];
    const pauseTicker = () => { tickerHoverPausedRef.current = true; };
    const resumeTicker = () => { tickerHoverPausedRef.current = false; };
    headerFeeds.forEach(feed => {
      observer.observe(feed);
      feed.addEventListener('pointerenter', pauseTicker);
      feed.addEventListener('pointerleave', resumeTicker);
      feed.addEventListener('pointercancel', resumeTicker);
    });
    window.addEventListener('resize', refresh);
    refresh();
    return () => {
      observer.disconnect(); window.removeEventListener('resize', refresh);
      app?.removeEventListener('hudlayoutchange', refresh);
      headerFeeds.forEach(feed => {
        feed.removeEventListener('pointerenter', pauseTicker);
        feed.removeEventListener('pointerleave', resumeTicker);
        feed.removeEventListener('pointercancel', resumeTicker);
      });
      resumeTicker();
    };
  }, [state, liveFeedEnabled, theme]);
  // The page sets the theme after effects run, so read --ui-blue again once it is applied.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (canvas) feedColor.current = getComputedStyle(canvas).getPropertyValue('--ui-blue').trim();
    });
    return () => cancelAnimationFrame(frame);
  }, [theme]);
  const tickerHoverPausedRef = useRef(false);
  const tickerPausedRef = useRef(liveFeedPaused);
  useEffect(() => { tickerPausedRef.current = liveFeedPaused; }, [liveFeedPaused]);
  const aimRef = useRef<AimPoint | null>(null);
  const jumpPointers = useRef(new Set<number>());
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
    playerHat: 'default' as PlayerHat,
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
    blackHoles: [] as { x: number; y: number; life: number }[],
    severanceEmpty: 0,
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
    tickerScrollX: viewRef.current.width,
    printerTickerX: viewRef.current.width - viewRef.current.axisWidth,
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

  const pickPattern = (crash: boolean) => pickCandlePattern(crash, Math.random);

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
      const target = bellDescentTop(g.bellLaunchTop, i - g.bellDescentStart + 1, Math.random());
      const body = Math.random() < 0.15 ? R(24, 42) : R(3, 22);
      // The Bell route is part of this stock, not a separately positioned chart.
      const o = g.lastC;
      const c = target + body;
      const top = Math.min(o, c), bot = Math.max(o, c);
      g.C[i] = { o, c, top, bot,
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
    const [bd, uw, lw] = T[2](l.vol * marketSample.volatility * volatilityBoost, Math.random);
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
      // Cap the climb, not the whole OHLC candle, so its open stays attached to the previous close.
      c = Math.max(c, pt - mr);
      top = Math.min(o, c);
      bot = Math.max(o, c);
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
    petFollower.current = null;
    bossEncounter.current = null;
    petAttack.current = null;
    petDeath.current = null;
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
    g.blackHoles = [];
    g.severanceEmpty = 0;
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
    g.tickerScrollX = viewRef.current.width;
    g.tickerTextWidth = 0;
    g.tickerQueue = [];
    g.tickerScrollX = 0;
    g.accumulator = 0;
    g.previousTime = 0;

    for (let i = 0; i < Math.ceil(viewRef.current.width / 0.65 / CW) + 20; i++) {
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

    if (whaleDemo) {
      // A clean runway holds the mount, companion pickups and two targets for banana-throw testing.
      const top = g.p.y;
      const endX = g.p.x + 1500;
      for (let i = startIndex - 1; i <= Math.ceil(endX / CW); i++) {
        g.C[i] = { ...g.C[i], hole: false, o: top + 8, c: top, top,
          bot: top + 8, h: top - 3, l: top + 12, sp: false, doubleJumpBarrier: false };
      }
      g.pickups = g.pickups.filter(pickup => pickup.x > endX);
      const whaleX = g.p.x + 150;
      g.animals = g.animals.filter(animal => animal.x > endX);
      g.animals.push({ type: 'whale', x: whaleX, y: top - ANIMAL_CENTER,
        feet: top, previousFeet: top, phase: 0, dead: false });
      for (const distance of [300, 420]) {
        g.pickups.push({ type: 'banana', x: g.p.x + distance,
          y: top - WHALE_SEAT_HEIGHT - 25, taken: false });
      }
      for (const [index, distance] of [1100, 1400].entries()) {
        g.animals.push({ type: index === 0 ? 'bear' : 'bull',
          x: g.p.x + distance, y: top - ANIMAL_CENTER,
          feet: top, previousFeet: top, phase: 0, dead: false });
      }
    }

    g.cx = g.p.x - heroCameraOffset();
    g.cy = g.p.y - viewRef.current.heroY;
    g.score = 0;
    g.activityPips = 0; g.hawkTimer = 0; g.nextHawk = randomDelay(140, 550); g.spits = []; g.hatSoiled = false; g.playerHat = 'default'; g.pigeonDrops = [];
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
  }, [genCandle, whaleDemo, bossEncounter]);

  const die = useCallback((causeText: string) => {
    const g = gameRef.current;
    if (g.currentState === 'over') return;
    // Player is fully protected while in rocket mode!
    if (g.p && g.p.rocketTimer > 0) return;
    const encounter = bossEncounter.current;
    if (encounter && g.p && !g.falling && !g.zeroCrash) {
      if (encounter.player.invulnerable > 0) return;
      encounter.player.lives = Math.max(0, encounter.player.lives - 1);
      encounter.player.invulnerable = 90;
      sound.playHit();
      if (encounter.player.lives > 0) return;
    }

    if (g.p && !petDeath.current) {
      petDeath.current = { x: g.p.x, y: g.p.y, frame: 0, gap: g.falling, id: cosmeticRef.current.pets };
      petAttack.current = null;
    }
    g.currentState = 'over';
    g.cause = causeText;
    g.overT = 15;
    g.held = false;
    sound.playGameOver();
    const finalScore = Math.max(0, g.score - g.penalty + g.activityPips);
    const candle = g.C[Math.floor((g.p?.x ?? 0) / CW)];
    // Publish the exact final PIPS before recording the death (not the previous frame).
    onScoreUpdate({ currentPrice: candle ? Number(price(candle.c)) : 0, totalScore: finalScore, score: g.score, coins: g.coins, diamonds: g.diamonds, banknotes: g.banknotes,
      swanHits: g.swanHits, animalHits: g.animalHits, regime: 'NORMAL', cycle: 1, cycleProgress: 0,
      isDiamondHands: false, diamondRemainingFrames: 0, isRocketMode: false, rocketRemainingFrames: 0 });
    onGameOver(causeText, arcadeProfit(finalScore, candle ? Number(price(candle.c)) : 0));
    onStateChange('over');
  }, [onGameOver, onStateChange, onScoreUpdate, bossEncounter]);

  const activateHawk = useCallback(() => {
    const g = gameRef.current;
    if (!g.p || g.hawkTimer > 0) return;
    // A shortened Pigeon keeps its random exit; outside Pigeon, keep the view for Hawk's slide.
    if (g.printerTimer > 0) g.invertedView = g.printerExitInverted;
    g.printerExitInverted = g.invertedView;
    aimRef.current = null;
    if (g.printerSaved) { g.C = g.printerSaved.slice(); g.printerSaved = null; }
    g.printerTimer = 0; g.printerRotation = 0;
    g.hawkStartIndex = Math.floor(g.p.x / CW);
    g.hawkFrontier = g.hawkStartIndex - 1;
    g.hawkBudget = hawkDropBudget(g.p.y, MARKET_BASELINE + 1600);
    g.hawkTimer = 600;
    g.popups.push({ x: g.p.x, y: g.p.y - 75, text: 'KEK', color: '#fb923c', life: 70 });
    g.hawkBags = 0;
    g.flyingFedora = null; g.fedoraWindup = 0;
    g.cases = []; g.throwAnimTimer = 0; g.bagThrowAnimTimer = 0;
  }, []);

  const activatePrinter = useCallback(() => {
    const g = gameRef.current;
    if (!g.p || g.falling || g.currentState === 'boxing') return;
    eventRef.current?.({ type: 'feat', feat: 'printer' });
    if (g.printerTimer <= 0) g.printerSaved = null;
    g.printerTimer = 600;
    g.printerExitInverted = Math.random() < 0.5;
    // Pick the continuing boundary up front; reflecting only at the exit swaps both graphs.
    g.invertedView = g.printerExitInverted;
    aimRef.current = null;
    g.printerTickerX = viewRef.current.width - viewRef.current.axisWidth;
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
    extendPrinterTurns(g.printerTurns, viewRef.current.right + viewRef.current.spawnMargin);
    g.p.rocketTimer = 0; g.p.carry = 0;
    sound.playRocket();
  }, []);

  const spawnBoss = useCallback((kind = randomBossKind()) => {
    const g = gameRef.current;
    if (!g.p || g.falling || bossEncounter.current) return;
    const encounter = createBossArena(kind);
    encounter.externalPlayer = true;
    // Boss attacks use live run state; each has its own contact token, so a diamond blocks one strike.
    encounter.absorbBossHit = () => !!g.p && (g.p.rocketTimer > 0
      || !!g.p.whaleMount || absorbEnemyHit(g.p, {}));
    encounter.nextDrop = Infinity;
    encounter.boss.behaviorTimer = randomDelay(45, 360);
    encounter.heightAt = x => {
      const candle = g.C[Math.floor(x / CW)];
      return candle && !candle.hole ? candle.top : Infinity;
    };
    encounter.safeHeightAt = x => trackHeightAt(g.C, x, CW, g.p!.y);
    encounter.doubleJumpAt = x => !!g.C[Math.floor(x / CW)]?.sp;
    Object.assign(encounter.player, { x: g.p.x, y: g.p.y, vy: g.p.vy,
      grounded: !g.p.air, jumps: g.p.jumps, invulnerable: 100 });
    encounter.runnerOffset = g.p.x - g.cx;
    encounter.cameraX = g.cx;
    encounter.left = g.cx;
    encounter.right = g.cx + viewRef.current.right;
    encounter.bossLeft = g.cx + viewRef.current.right * BOSS_ATTACK_ZONE_FRACTION;
    encounter.bossRight = encounter.right - 70;
    encounter.boss.x = Math.min(encounter.bossRight, encounter.player.x + 550);
    encounter.boss.y = encounter.safeHeightAt(encounter.boss.x);
    encounter.boss.aimY = encounter.player.y - 35;
    bossEncounter.current = encounter;
    sound.playBell();
  }, [bossEncounter]);

  const awardEnemy = useCallback((enemy: Animal | Swan) => {
    const g = gameRef.current;
    const points = enemyPips(enemy) * activityMultiplier(g.printerTimer, g.hawkTimer);
    g.activityPips += points;
    eventRef.current?.({ type: 'kill', enemy: 'type' in enemy ? enemy.type : enemy.kind ?? 'swan' });
    if ('type' in enemy) g.animalHits++; else g.swanHits++;
    g.popups.push({ x: enemy.x, y: enemy.y - 20, text: `+${points}`, color: '#fbbf24', life: 35 });
  }, []);

  // Hawk bags auto-target; ordinary projectiles retain manual ballistic aim.
  const throwBriefcase = useCallback(() => {
    const g = gameRef.current;
    if (g.currentState !== 'play' || g.falling || g.flyingFedora || g.fedoraWindup > 0 || !g.p || g.p.whaleMount) return;

    // In Bell combat the boomerang is independent of the briefcase cooldown and held diamond or bag.
    if (g.hawkTimer <= 0 && bossEncounter.current && g.fedoraTimer > 0 && g.fedoraCount > 0) {
      g.fedoraCount--;
      g.fedoraWindup = FEDORA_WINDUP;
      return;
    }
    if (g.caseCooldown > 0) return;

    if (g.hawkTimer > 0) {
      if (g.p.carry <= 0 || g.p.shieldKind !== 'bag' || g.hawkBags <= 0) return;
      const x = g.p.x + 18;
      const y = g.p.y - 20;
      const target = nearestHawkEnemy(g.p, [...g.swans, ...g.animals]);
      const homingSpeed = 11.5 + speedAt(g.score);
      const velocity = aimedVelocity({ x, y }, target ?? aimRef.current ?? { x: x + 100, y }, homingSpeed);
      g.cases.push({ x, y, vx: velocity.x, vy: velocity.y, life: 70, angle: 0, kind: 'bag', windup: 8, target, homingSpeed });
      g.bagThrowDirection = velocity.x < 0 ? -1 : 1;
      g.hawkBags--;
      g.p.carry = 0;
      g.p.shieldKind = undefined;
      g.bagThrowAnimTimer = 16;
      g.caseCooldown = 45;
      sound.playBag();
      return;
    }

    const bag = cosmeticRef.current.suitcase;
    if (g.p.carry > 0 && !(bag === 'suitcase-diamond-hands' && g.p.shieldKind === 'bag')) return;

    if (g.fedoraTimer > 0 && g.fedoraCount > 0) {
      if (g.flyingFedora || g.fedoraWindup > 0) return;
      g.fedoraCount--;
      g.fedoraWindup = FEDORA_WINDUP;
      return;
    }

    // Pitching throwing arm animation trigger
    g.throwAnimTimer = 16;

    const release=actionArmPose(true,{x:18,y:-28}).hand;
    const x = g.p.x + release.x;
    const y = g.p.y + release.y;

    const velocity = aimedVelocity({ x, y }, aimRef.current ?? { x: x + 100, y }, 11.5 + speedAt(g.score));
    g.cases.push({
      x,
      y,
      vx: velocity.x,
      vy: velocity.y,
      life: 70,
      angle: bag === 'suitcase-diamond-hands' ? Math.atan2(velocity.y, velocity.x) : 0,
      skin: bag,
    });

    g.caseCooldown = 45;
    sound.playBriefcaseThrow();
    eventRef.current?.({ type: 'throw' });
  }, [bossEncounter]);

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

    const minRightEdgeX = g.cx + viewRef.current.right + viewRef.current.spawnMargin;

    if (freshNews.spawnType === 'bear' || freshNews.spawnType === 'bull') {
      let spawnIdx = Math.ceil(minRightEdgeX / CW);
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
      let spawnIdx = Math.ceil(minRightEdgeX / CW);
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

  const updateEntities = useCallback((heroDx = 0, heroDy = 0) => {
    const g = gameRef.current;
    if (!g.p) return;
    const field = { left: viewRef.current.left, right: viewRef.current.right, top: feedLayout.current.tapeHeight, bottom: viewRef.current.bottom };
    const leftEdge = g.cx + field.left, rightEdge = g.cx + field.right;
    const fieldWidth = field.right - field.left;
    const birdTop = g.cy + field.top + 58, birdBottom = g.cy + field.bottom - 58;
    const constrainBird = (y: number) => Math.max(birdTop, Math.min(birdBottom, y));
    const overheadY = (phase: number) => pigeonFlightY(g.cy, TAPE_HEIGHT, phase, .25, field);

    const petId = cosmeticRef.current.pets;
    const onFoot = !petId.startsWith('friend:') && !g.p.whaleMount && g.p.rocketTimer <= 0 && g.hawkTimer <= 0 && g.printerTimer <= 0 && !g.falling && !petDeath.current;
    const petBoss=bossEncounter.current?.result==='fight'?bossEncounter.current.boss:null;
    if (!onFoot || (petAttack.current && petAttack.current.id !== petId)) petAttack.current = null;
    if (onFoot && !petAttack.current) {
      const target = [...g.animals, ...g.swans].find(enemy => !enemy.dead && !enemy.dying && enemy.x > g.p!.x + 90 && enemy.x < Math.min(g.p!.x + 320, rightEdge) && enemy.y >= g.cy + field.top && enemy.y <= g.cy + field.bottom && Math.abs(enemy.y - g.p!.y) < 100)
        ?? (petBoss&&Math.abs(petBoss.x-g.p.x)<420?{x:petBoss.x,y:petBoss.y-35}:null);
      if (target) petAttack.current = startPetAttack(petId, { x: target.x - g.p.x, y: target.y - g.p.y });
    }
    const attack = petAttack.current;
    if (attack) {
      if (attack.stage === 'flying' && attack.age > 10) {
        // Correct the descending arc for enemies that keep moving during the throw.
        const target = [...g.animals, ...g.swans].filter(enemy => !enemy.dead && !enemy.dying)
          .map(enemy=>({x:enemy.x,y:enemy.y})).concat(petBoss?[{x:petBoss.x,y:petBoss.y-35}]:[])
          .sort((a, b) => Math.hypot(a.x - g.p!.x - attack.x, a.y - g.p!.y - attack.y) - Math.hypot(b.x - g.p!.x - attack.x, b.y - g.p!.y - attack.y))[0];
        if (target) {
          attack.vx = Math.max(-18, Math.min(18, (target.x - g.p.x - attack.x) / 5 + heroDx));
          attack.vy = Math.max(-14, Math.min(14, (target.y - g.p.y - attack.y + 10) / 5 + heroDy));
        }
      }
      const prevX = g.p.x - heroDx + attack.x, prevY = g.p.y - heroDy + attack.y - 10;
      if (stepPetAttack(attack, heroDx, heroDy,x=>petTrackHeightAt(g.C,g.p!.x+x,CW,g.lastTop)-g.p!.y)) petAttack.current = null;
      else if (attack.stage === 'flying') {
        const x = g.p.x + attack.x, y = g.p.y + attack.y - 10;
        if(petBoss) {
          if(segmentPointDistance(prevX,prevY,x,y,petBoss.x,petBoss.y-35)<32) {
            if(petAttackBossHit(attack,petBoss))sound.playHit();
          }
        }
        for (const enemy of [...g.animals, ...g.swans]) {
          if(attack.stage!=='flying')break;
          if (enemy.dead || enemy.dying) continue;
          if (segmentPointDistance(prevX, prevY, x, y, enemy.x, enemy.y) > ('type' in enemy ? 30 : 22)) continue;
          if ('type' in enemy && enemy.mount) {
            const rider = dismountRider(enemy);
            if (rider) g.animals.push(rider);
          }
          enemy.dying = true; enemy.dieTimer = 25; enemy.dieVx = 3.5; enemy.dieVy = -5; enemy.dieAngle = 0;
          awardEnemy(enemy); sound.playHit(); attack.stage = 'returning'; break;
        }
      }
    }

    if (g.caseCooldown > 0) g.caseCooldown--;
    if (g.severanceEmpty > 0) g.severanceEmpty--;
    for (const hole of g.blackHoles) hole.life--;
    g.blackHoles = g.blackHoles.filter(hole => hole.life > 0);
    if (!g.p.whaleMount && g.fedoraTimer > 0 && --g.fedoraTimer === 0) {
      g.fedoraCount = 0;
    }
    if (!g.p.whaleMount && g.fedoraWindup > 0 && --g.fedoraWindup === 0 && g.p) {
      const release=fedoraReleasePose();
      g.flyingFedora = { x: g.p.x + release.handX, y: g.p.y + release.handY,
        angle: 0, returning: false };
      sound.playFedoraThrow();
      g.throwAnimTimer = 8;
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
          // Rebase the upward-biased market instead of adding a downslope after the timer.
          for (const knot of g.marketPath) knot.height += g.hawkBudget;
        }
      }
    }
    if (g.printerTimer <= 0 && g.score >= g.nextHawk && spawnAllowed() && Math.random() < 0.08) {
      markSpawn();
      const x = rightEdgeSpawnX(leftEdge, fieldWidth, viewRef.current.spawnMargin);
      const hawkY = constrainBird(g.p.y - 85);
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
      const x = rightEdgeSpawnX(leftEdge, fieldWidth, viewRef.current.spawnMargin);
      const feet = trackHeightAt(g.C, x, CW, g.p.y);
      g.animals.push({ x, feet, y: feet - 40, phase: 0, type: Math.random() < 0.5 ? 'bull' : 'bear', dead: false });
      if (g.swans.filter(s => !s.dead && !s.dying).length < 1 && g.animals.filter(a => !a.dead && !a.dying).length < 4) {
        const y = constrainBird(g.p.y + 150);
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
      const end = Math.min(g.C.length - 1, Math.ceil((rightEdge + viewRef.current.spawnMargin) / CW));
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
      const x = rightEdge + viewRef.current.spawnMargin;
      const feet = trackHeightAt(g.C, x, CW, g.p.y);
      g.animals.push({ type: 'whale', x, feet, y: feet - ANIMAL_CENTER, phase: 0, dead: false });
      g.nextWhale = g.score + randomDelay(100, g.difficultyActive ? 240 : 700);
    }
    for (const a of g.animals) {
      a.previousFeet = a.feet;
      if (a.dying) {
        if (a.type === 'whale' && !a.lootRolled) {
          a.lootRolled = true;
          if (whaleDropsBanknote(Math.random())) g.pickups.push({ x: a.x, y: a.y, type: 'banknote', taken: false, vy: -2 });
        }
        if (a.dieTimer !== undefined) a.dieTimer--;
        if (a.vortex) {
          a.x += (a.vortex.x - a.x) * .2; a.feet += (a.vortex.y + ANIMAL_CENTER - a.feet) * .2; a.y = a.feet - ANIMAL_CENTER;
          a.dieAngle = (a.dieAngle ?? 0) + .5;
          if ((a.dieTimer ?? 0) <= 0) a.dead = true;
          continue;
        }
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
        const spawnX = rightEdge + viewRef.current.spawnMargin;
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
      const x = rightEdge + viewRef.current.spawnMargin;
      const flightLane = Math.random();
      const y = pigeonFlightY(g.cy, TAPE_HEIGHT, 0, flightLane, field);
      g.swans.push({ kind: 'pigeon', flightLane, x, y, baseY: y, phase: 0, dead: false });
      g.nextPigeon = g.score + randomDelay(80, g.difficultyActive ? 205 : 600);
    }
    for (const s of g.swans) {
      // Stomps compare against the head height before this frame's movement.
      s.previousY = s.y;
      const encounter = bossEncounter.current;
      if (encounter) {
        // Hearts supplement normal flight, cargo and death loot.
        if (!s.dead && !s.dying && !encounter.lifeBirds.has(s)
          && s.x <= g.p.x + 350 && s.x >= g.p.x) {
          encounter.lifeBirds.add(s);
          if (Math.random() < 0.35) encounter.drops.push({ x: s.x, y: s.y + 18, vy: 0, kind: 'life', life: 900 });
        }
      }
      if (s.dying) {
        if (!s.lootRolled) {
          s.lootRolled = true;
          if (s.kind !== 'hawk' && (s.kind !== 'pigeon' || pigeonDropsPrinter(Math.random()))) {
            g.pickups.push({ x: s.x, y: s.y, type: s.kind === 'pigeon' ? 'printer' : 'bag', taken: false, vy: -2 });
          }
        }
        if (s.dieTimer !== undefined) s.dieTimer--;
        if (s.vortex) {
          s.x += (s.vortex.x - s.x) * .2; s.y += (s.vortex.y - s.y) * .2;
          s.dieAngle = (s.dieAngle ?? 0) + .5;
          if ((s.dieTimer ?? 0) <= 0) s.dead = true;
          continue;
        }
        s.x += s.dieVx || 0;
        s.y += s.dieVy || 0;
        if (s.dieVy !== undefined) s.dieVy += 0.35;
        if (s.dieAngle !== undefined) s.dieAngle += 0.25;
        if (s.dieTimer !== undefined && s.dieTimer <= 0) s.dead = true;
        continue;
      }

      if (s.stolenHat) {
        s.x -= 4; s.y -= 0.7; s.phase += 0.12;
        s.isCharging = false;
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
        s.y = overheadY(s.phase);
        s.baseY = s.y;
        if (actorInPlayfield(s.x, s.y, g.cx, g.cy, field, 58) && canReleaseBirdCargo(s.x, leftEdge, g.p.x, fieldWidth, CW, g.C, s.cargoReleaseRatio ?? 0.75, Math.min(420, fieldWidth * .28))) {
          const type = s.cargo;
          const feet = s.y + 24 + ANIMAL_CENTER * 2;
          g.animals.push({ type, x: s.x, feet, y: feet - ANIMAL_CENTER, phase: 0, dead: false, dropVelocity: 1 });
          s.cargo = undefined;
        }
        if (s.cargo && s.x - leftEdge < fieldWidth * 0.60) {
          s.x = leftEdge + fieldWidth * 0.60;
        }
      }

      // Cargo flights stay overhead after release instead of diving at the hero.
      if (s.cargoFlight) {
        s.x -= 2.2; s.phase += 0.12;
        s.y = overheadY(s.phase);
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
        s.y = pigeonFlightY(g.cy, TAPE_HEIGHT, s.phase, s.flightLane ?? 0.5, field);
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
        s.y = constrainBird(s.y); s.baseY = constrainBird(s.baseY);
        // Random visible-flight delay, independent of distance to the player.
        if (!s.lootRolled && s.x < rightEdge && s.x > leftEdge) {
          s.tenderDropTimer ??= Math.floor(R(20, 140));
          s.tenderDropTimer--;
        }
        if (!s.lootRolled && actorInPlayfield(s.x, s.y, g.cx, g.cy, field, 58) && ((s.tenderDropTimer !== undefined && s.tenderDropTimer <= 0) || s.x <= g.p.x + 450)) {
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
        s.baseY = Math.max(birdTop + 6, Math.min(birdBottom - 6, s.baseY));
        s.y = constrainBird(s.baseY + Math.sin(s.phase) * 6);
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
      s.y = constrainBird(s.y);
    }

    // Briefcase physics: straight forward with ballistic drop and dynamic rapid spin
    g.apes = tickCompanions(g.apes, g.p.rocketTimer > 0 || !!g.p.whaleMount, !!g.p.whaleMount);
    g.apeTimer = Math.max(0, ...g.apes.map(ape => ape.timer));
    for (const [apeIndex, ape] of g.apes.entries()) {
      if (g.hawkTimer > 0 || (!g.p.whaleMount && g.p.carry > 0 && g.p.shieldKind === 'bag')) {
        ape.throwTimer = 0;
        continue;
      }
      // A companion already aboard stays with the pilot throughout the flight.


      const apeX = g.p.x - 45 - apeIndex * 32;
      const apeFeet = g.p.air ? g.p.y : trackHeightAt(g.C, apeX, CW, g.p.y);
      const follower = whaleCompanionPose(apeIndex);
      const origin = g.p.whaleMount
        ? { x: g.p.x + follower.x + follower.scale * WHALE_RIDER_SEAT.x, y: g.p.y + follower.y + follower.scale * WHALE_RIDER_SEAT.y - 24 * APE_SCALE * WHALE_RIDER_SCALE }
        : g.p.rocketTimer > 0
        ? { x: g.p.x - 37 - (apeIndex + 1) * 32, y: g.p.y - 46 }
        : { x: apeX, y: apeFeet - 43 * APE_SCALE };
      const boss = bossEncounter.current?.boss;
      const target = [...g.swans, ...g.animals, ...(boss ? [{ x: boss.x, y: boss.y - 35, dead: boss.health <= 0, dying: false }] : [])]
        .filter(enemy => !enemy.dead && !enemy.dying && Math.abs(enemy.x - origin.x) < 650)
        .sort((a, b) => Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y))[0];
      if (target && ape.cooldown === 0) {
        ape.direction = target.x >= origin.x ? 1 : -1;
        ape.throwTimer = 15;
        origin.x += ape.direction * 28 * APE_SCALE * (g.p.whaleMount ? WHALE_RIDER_SCALE : 1);
        const frames = Math.max(12, Math.hypot(target.x - origin.x, target.y - origin.y) / 12);
        g.cases.push({ ...origin, vx: (target.x - origin.x) / frames - 1.5, vy: (target.y - origin.y) / frames - 0.025 * (frames - 1), life: 75, angle: 0, kind: 'banana' });
        ape.cooldown = APE_THROW_INTERVAL;
        sound.playBananaThrow();
      }
    }
    // Event Horizon: the struck enemy (a rider and its mount together) falls into a black hole.
    const swallowEnemy = (enemy: Animal | Swan, x: number, y: number) => {
      g.blackHoles.push({ x, y, life: 40 });
      if ('type' in enemy && enemy.mount) {
        const rider = dismountRider(enemy);
        if (rider) { rider.vortex = { x, y }; rider.dieTimer = 30; g.animals.push(rider); awardEnemy(rider); }
      }
      enemy.dying = true; enemy.dieTimer = 30; enemy.dieAngle = 0; enemy.vortex = { x, y };
      awardEnemy(enemy);
    };
    // Severance Package: the desk items scatter from the impact and hit what they reach.
    const spillDesk = (x: number, y: number) => {
      for (let i = 0; i < 4; i++) g.cases.push({ x, y, vx: -2.4 + i * 2, vy: -4.6 + Math.abs(i - 1.5) * .9, life: 26, angle: 0, kind: 'debris', item: i });
      g.severanceEmpty = 150;
    };
    for (const b of g.cases) {
      if (b.kind === 'bag' && (b.windup ?? 0) > 0) {
        const pose = hawkBagThrowPose(g.bagThrowAnimTimer, g.bagThrowDirection,
          weaponHatCount(g.fedoraTimer, g.fedoraWindup, !!g.flyingFedora));
        b.x = g.p.x + pose.bagX;
        b.y = g.p.y + pose.bagY;
        if(!g.p.whaleMount&&g.p.rocketTimer<=0&&g.hawkTimer<=0) {
          const held=runnerBagThrowPose(g.bagThrowAnimTimer,g.bagThrowDirection).asset;
          b.x=g.p.x+held.x;b.y=g.p.y+held.y;
        }
        b.windup = (b.windup ?? 0) - 1;
        // No movement, lifetime loss or enemy hits while still held overhead.
        continue;
      }
      const prevX = b.x;
      const prevY = b.y;
      const briefcaseEnd = briefcaseRightEdge(g.cx, viewRef.current.right);
      if (!b.kind && prevX >= briefcaseEnd) { b.life = 0; continue; }
      if (b.kind === 'bag') steerHawkBag(b, g.p, [...g.swans, ...g.animals]);
      b.x += b.vx;
      b.y += b.vy;
      if (!b.kind) {
        const clipped = clipBriefcaseStep(prevX, prevY, b.x, b.y, briefcaseEnd);
        b.x = clipped.x; b.y = clipped.y;
        if (clipped.expired) b.life = 0;
      }
      b.vy += b.skin === 'suitcase-diamond-hands' ? 0.012 : b.kind === 'debris' ? 0.18 : 0.05;
      b.life--;
      if (b.skin === 'suitcase-diamond-hands') b.angle = Math.atan2(b.vy, b.vx);
      else b.angle += b.kind === 'debris' ? 0.25 : 0.38; // Dynamic rapid spin around center!

      const encounter = bossEncounter.current;
      if (encounter && b.kind !== 'debris' && bellSegmentHit(prevX, prevY, b.x, b.y, {
        left: encounter.boss.x - 22, right: encounter.boss.x + 22,
        top: encounter.boss.y - 85, bottom: encounter.boss.y,
      }) !== null) {
        encounter.boss.health = Math.max(0, encounter.boss.health - 8);
        emitBellBlood(encounter.blood, b.x, b.y, b.vx, 1);
        b.life = 0;
        sound.playHit();
        continue;
      }

      for (const enemy of [...g.swans, ...g.animals]) {
        if (enemy.dying || enemy.dead) continue;
        const hitRadius = 'type' in enemy ? (enemy.mount ? 45 : 26) : 18;
        if (segmentPointDistance(prevX, prevY, b.x, b.y, enemy.x, enemy.y) < hitRadius) {
          const skin = b.kind ? undefined : b.skin;
          if (skin === 'suitcase-event-horizon') {
            swallowEnemy(enemy, b.x, b.y);
            b.life = 0;
            sound.playHit();
            break;
          }
          if (skin === 'suitcase-severance') spillDesk(b.x, b.y);
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
      const caught = stepFlyingFedora(hat, g.p.x, g.C, CW, g.cx + field.right);
      const encounter = bossEncounter.current;
      if (encounter && hat.hitBoss !== encounter.boss && bellSegmentHit(prevX, prevY, hat.x, hat.y, {
        left: encounter.boss.x - 22, right: encounter.boss.x + 22,
        top: encounter.boss.y - 85, bottom: encounter.boss.y,
      }) !== null) {
        hat.hitBoss = encounter.boss;
        hat.returning = true;
        if (fedoraBossHit(encounter.boss, cosmeticRef.current.hats === 'hats-ath' ? 1 : Math.random()) === 'damage') {
          emitBellBlood(encounter.blood, hat.x, hat.y, hat.x - prevX, 1);
        }
        sound.playFedoraHit();
      }
      for (const enemy of [...g.swans, ...g.animals]) {
        if (enemy.dead || enemy.dying || hat.hitTargets?.has(enemy)) continue;
        const distanceTo = (centerY: number) => segmentPointDistance(prevX, prevY, hat.x, hat.y, enemy.x, centerY);
        const riderDistance = 'type' in enemy && enemy.mount
          ? distanceTo(enemy.feet - (enemy.mount === 'whale' ? 85 : 78)) : Infinity;
        const mountDistance = 'type' in enemy ? distanceTo(enemy.feet - ANIMAL_CENTER) : Infinity;
        const mountHit = 'type' in enemy && fedoraHitsMount(enemy, riderDistance, mountDistance);
        if (!mountHit && riderDistance >= 26 && ('type' in enemy
          ? enemy.mount || mountDistance >= 26 : distanceTo(enemy.y) >= 18)) continue;
        (hat.hitTargets ??= new Set()).add(enemy);
        hat.returning = true;
        if (fedoraHit(enemy, cosmeticRef.current.hats === 'hats-ath' ? 1 : Math.random(), mountHit) === 'hat') {
          sound.playFedoraHit();
          break;
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
        break;
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
    if (g.p.rocketTimer <= 0 && !g.p.whaleMount) {
      for (const enemy of [...g.swans, ...g.animals]) {
        if (enemy.dying || enemy.dead || enemy.shieldPassed) continue;
        // A descending stomp can steal a bear/bull mount, but never side contact.
        if ('type' in enemy && enemy.mount) {
          const top = enemy.feet - animalHeight(enemy);
          const previousTop = (enemy.previousFeet ?? enemy.feet) - animalHeight(enemy);
          const stomp = canStompEnemy(g.p, enemy.x, top, previousTop, 55);
          if (!stomp || !['bear', 'bull'].includes(enemy.mount)) continue;
          const kind = enemy.mount;
          const tame = canMountRider(enemy, stomp, g.printerTimer > 0 || g.hawkTimer > 0, Math.random());
          const rider = dismountRider(enemy);
          if (rider) { g.animals.push(rider); awardEnemy(rider); }
          eventRef.current?.({ type: 'feat', feat: 'stomp' });
          if (tame) {
            g.p.whaleMount = { kind, timer: WHALE_MOUNT_DURATION, feet: enemy.feet, previousFeet: enemy.feet, vy: 0, phase: 0,
              bags: g.p.carry > 0 && g.p.shieldKind === 'bag' ? 1 : 0 };
            enemy.dead = true; // Transfer the living mount, without kill loot.
            g.p.y = enemy.feet - WHALE_SEAT_HEIGHT;
            g.p.vy = 0; g.p.buf = 0; g.gapAirborne = false;
            g.cases = []; g.flyingFedora = null; g.fedoraWindup = 0;
            g.throwAnimTimer = 0; g.bagThrowAnimTimer = 0;
            for (const ape of g.apes) { ape.throwTimer = 0; ape.whalePhase = 0; }
            g.popups.push({ x: g.p.x, y: g.p.y - 45, text: `${kind.toUpperCase()} RIDER!`, color: '#38bdf8', life: 60 });
            sound.playCoin(); break;
          }
          // Failed taming still ejects the rider; the surviving mount stays hostile.
          g.p.y = top; g.p.vy = -7.5; g.p.air = true;
          sound.playHit(); continue;
        }
        const top = 'type' in enemy ? enemy.feet - animalHeight(enemy) : enemy.y - 16;
        const previousTop = 'type' in enemy ? (enemy.previousFeet ?? enemy.feet) - animalHeight(enemy) : (enemy.previousY ?? enemy.y) - 16;
        const whale = 'type' in enemy && enemy.type === 'whale';
        if (
          whale ? touchesWhale(g.p, enemy) : 'type' in enemy
            ? canStompEnemy(g.p, enemy.x, top, previousTop, enemy.type === 'bull' ? 55 : 50)
            : canStompBird(enemy, g.p)
        ) {
          if ('type' in enemy && enemy.type === 'whale') {
            // A whale cannot be stomped: diamond protection is spent even on a successful tame.
            if (absorbEnemyHit(g.p, enemy)) {
              g.popups.push({ x: g.p.x, y: g.p.y - 35, text: 'Good DD', color: '#38bdf8', life: 40 });
              sound.playHit();
            }
            if (!canMountWhale(g.printerTimer > 0 || g.hawkTimer > 0, whaleDemo ? 0 : Math.random())) continue;
            g.p.whaleMount = { kind: 'whale', timer: WHALE_MOUNT_DURATION, feet: enemy.feet, previousFeet: enemy.feet, vy: 0, phase: 0,
              bags: g.p.carry > 0 && g.p.shieldKind === 'bag' ? 1 : 0 };
            enemy.dead = true; // Transfer to the player; no kill score or loot.
            eventRef.current?.({ type: 'feat', feat: 'whale-ride' });
            g.p.y = enemy.feet - WHALE_SEAT_HEIGHT;
            g.p.vy = 0; g.p.buf = 0; g.gapAirborne = false;
            g.cases = []; g.flyingFedora = null; g.fedoraWindup = 0;
            g.throwAnimTimer = 0; g.bagThrowAnimTimer = 0;
            for (const ape of g.apes) { ape.throwTimer = 0; ape.whalePhase = 0; }
            g.popups.push({ x: g.p.x, y: g.p.y - 45, text: 'WHALE RIDER!', color: '#38bdf8', life: 60 });
            sound.playCoin();
            break;
          }
          enemy.dying = true;
          enemy.dieTimer = 25;
          enemy.dieVx = 3.0;
          enemy.dieVy = -5.5;
          enemy.dieAngle = 0;
          g.p.y = top;
          g.p.vy = -7.5;
          g.p.air = true;
          sound.playHit();
          eventRef.current?.({ type: 'feat', feat: 'stomp' });
          if (g.hawkTimer > 0 && g.p.rocketTimer <= 0) eventRef.current?.({ type: 'feat', feat: 'dumpster-stomp' });
          awardEnemy(enemy);
        }
      }
    }

    const mount = g.p.whaleMount;
    if (mount) {
      for (const enemy of [...g.swans, ...g.animals]) {
        if (enemy.dead || enemy.dying || enemy.shieldPassed) continue;
        const top = 'type' in enemy ? enemy.feet - animalHeight(enemy) : enemy.y - 16;
        if (Math.abs(enemy.x - g.p.x) >= ('type' in enemy ? 55 : 25)) continue;
        if (whaleStompsEnemy(mount, g.p.x, enemy.x, top, 'type' in enemy ? 55 : 25)) {
          enemy.dying = true; enemy.dieTimer = 25;
          enemy.dieVx = 3; enemy.dieVy = -5.5; enemy.dieAngle = 0;
          sound.playHit(); awardEnemy(enemy);
          continue;
        }
        const bottom = 'type' in enemy ? enemy.feet : enemy.y + 16;
        if (mount.feet > top && g.p.y - 48 < bottom) {
          if ('type' in enemy && enemy.type === 'whale' && !enemy.mount) {
            enemy.dead = true;
            mount.timer = WHALE_MOUNT_DURATION;
            mount.kind = 'whale';
            mount.feet = enemy.feet; mount.previousFeet = enemy.feet; mount.vy = 0;
            mount.jumps = 0; mount.launchFeet = undefined;
            mount.phase = 0;
            g.p.y = enemy.feet - WHALE_SEAT_HEIGHT; g.p.vy = 0;
            break;
          }
          g.p.whaleMount = undefined;
          g.p.vy = -7.5; g.p.air = true;
          enemy.shieldPassed = true;
          sound.playHit();
          return;
        }
      }
    }

    // Living Enemies collide unless in rocket mode; a carried diamond absorbs one collision.
    if (g.p.rocketTimer <= 0 && !g.p.whaleMount) {
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

      // All bird collisions have been resolved; surviving near misses may steal a hat.
      for (const bird of g.swans) tryBirdHatTheft(bird, g);

      for (const a of g.animals) {
        const bullSwing = a.type === 'bull' && !a.attackHit && (a.attackTimer ?? 0) <= 10 && (a.attackTimer ?? 0) >= 5;
        const hitRange = a.type === 'bull' ? 55 : 50;
        const playerCenterY = g.p.y - Math.cos(g.printerTimer > 0 ? g.printerRotation : 0) * 24;
        const overlapsVertically = g.printerTimer > 0
          ? Math.abs(playerCenterY - a.y) < animalHeight(a) / 2 + 24
          : g.p.y > a.feet - animalHeight(a) && g.p.y - 48 < a.feet;
        if (!a.dead && !a.dying && !a.shieldPassed && (a.type !== 'bull' || bullSwing) && Math.abs(a.x - g.p.x) < (a.type === 'whale' ? WHALE_CONTACT_RADIUS : hitRange) && overlapsVertically) {
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
        const bellDistance = Math.min(Math.hypot(d.x - g.p.x, d.y - closestY), mountPickupDistance(g.p.x, g.p.whaleMount, d));
        if (!d.taken && canCatchBossBell(g.p.rocketTimer, bellDistance)) {
          d.taken = true;
          collectCurrency('bells');
          g.popups = [];
          g.activeNews = null;
          g.p.whaleMount = undefined;
          spawnBoss();
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
      const touchesMount = mountPickupDistance(g.p.x, g.p.whaleMount, d) < 8;
      if (!d.taken && (Math.hypot(d.x - g.p.x, d.y - (g.p.y - 25)) < magnetDist || touchesMount)) {
        d.taken = true;
        if (d.type === 'printer') {
          activatePrinter();
        } else if (d.type === 'coin') {
          collectCurrency('coins');
          g.coins++;
          const points = 10 * activityMultiplier(g.printerTimer, g.hawkTimer);
          g.activityPips += points;
          g.popups.push({ x: d.x, y: d.y - 12, text: `+${points}`, color: '#fbbf24', life: 25 });
          sound.playCoin();
        } else if (d.type === 'fedora') {
          collectCurrency('hats');
          restoreStolenHat(g, 'fedora');
          g.fedoraTimer = addFedoraTime(g.fedoraTimer);
          g.fedoraCount = FEDORA_MAX_THROWS;
          g.popups.push({ x: d.x, y: d.y - 20, text: 'YOLO', color: '#f8fafc', life: 40 });
          sound.playCoin();
        } else if (d.type === 'diamond') {
          collectCurrency('diamonds');
          g.diamonds++;
          const points = 250 * activityMultiplier(g.printerTimer, g.hawkTimer);
          g.activityPips += points;
          g.p.carry = 300; // Lasts longer (5 seconds!)
          g.p.shieldKind = 'diamond';
          g.popups.push({ x: d.x, y: d.y - 20, text: `+${points}`, color: '#38bdf8', life: 40 });
          sound.playDiamond();
        } else if (d.type === 'bag') {
          collectCurrency('bags');
          if (g.p.whaleMount) g.p.whaleMount.bags = (g.p.whaleMount.bags ?? 0) + 1;
          if (g.hawkTimer > 0) g.hawkBags++;
          if (g.p.rocketTimer > 0) g.rocketBags++;
          g.bagDrainFrames = 0;
          g.p.carry = 300;
          g.p.shieldKind = 'bag';
          sound.playBag();
        } else if (d.type === 'tender') {
          collectCurrency('tenders');
          activateHawk();
          g.popups.push({ x: d.x, y: d.y - 20, text: 'Hawk mode!', color: '#fbbf24', life: 40 });
          sound.playTender();
        } else if (d.type === 'banana') {
          if (!addCompanion(g.apes, APE_DURATION)) { d.taken = false; continue; }
          collectCurrency('bananas');
          restoreStolenHat(g, 'banana');
          if (g.p.whaleMount) g.apes[g.apes.length - 1].whalePhase = 0;
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
    g.swans = g.swans.filter((s) => !s.dead && s.x + 80 > leftEdge);
    g.animals = g.animals.filter((a) => !a.dead && a.x + 80 > leftEdge);
    g.cases = g.cases.filter((b) => b.life > 0);
  }, [die, triggerSyntheticNews, onStateChange, activatePrinter, activateHawk, awardEnemy, whaleDemo, spawnBoss, bossEncounter]);

  const update = useCallback(() => {
    const g = gameRef.current;
    if (!g.p || g.currentState !== 'play') return;
    const field = { left: viewRef.current.left, right: viewRef.current.right, top: feedLayout.current.tapeHeight, bottom: viewRef.current.bottom };
    const petPreviousY = g.p.y;

    if (g.falling) {
      if (!petDeath.current) {
        petDeath.current = { x: g.p.x, y: g.p.y, frame: 0, gap: true, id: cosmeticRef.current.pets };
        petAttack.current = null;
      }
      g.fallFrame++;
      g.p.vy = Math.min(12, g.p.vy + 0.35);
      const floor = g.cy + field.bottom;
      if (g.zeroCrash) {
        g.p.y += g.p.vy;
        const candle = g.C[g.zeroCrashIndex];
        const bottom = Math.max(g.zeroCrashTop + 2, g.p.y);
        if (candle) g.C[g.zeroCrashIndex] = { ...candle, o: g.zeroCrashTop, c: bottom,
          top: g.zeroCrashTop, bot: bottom, h: g.zeroCrashTop - 3, l: bottom + 3 };
        g.cy = zeroCrashCamera(g.cy, g.p.y, g.zeroCrashTop, viewRef.current.bottom, field.top);
        if (zeroCrashComplete(g.fallFrame, g.zeroCrashTop, g.cy, field.top)) die('Market price reached zero');
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
    ensureChartAhead(g, Math.max(g.p.x, g.cx + field.right), field.right - field.left, CW, genCandle);
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
    if (isRocketMode || g.printerTimer > 0 || g.hawkTimer > 0 || (g.p.whaleMount?.timer ?? 1) <= 0) g.p.whaleMount = undefined;
    const ridingWhale = !!g.p.whaleMount;
    const shoeSpeed = runnerShoeSpeedMultiplier(cosmeticRef.current.shoes, isRocketMode || ridingWhale || g.hawkTimer > 0 || g.printerTimer > 0);
    const sp = speedAt(currentIdx) * shoeSpeed * (isRocketMode ? ROCKET_SPEED_MULTIPLIER : ridingWhale ? WHALE_SPEED_MULTIPLIER : hawkSpeedMultiplier(g.hawkTimer, g.hawkBags));

    g.p.x += sp;
    g.p.ph += 0.28 * shoeSpeed;

    const prev = g.p.y;
    g.p.previousY = prev;
    const printerActive = g.printerTimer > 0;
    if (printerActive) {
      g.printerTimer--;
      g.printerProgress += sp;
      // Keep the view fixed: the chosen boundary continues while the other peels away at printerEndX.
      const first = Math.max(0, Math.floor((g.cx + field.left) / CW));
      const last = Math.min(g.C.length - 1, Math.ceil((g.cx + field.right) / CW));
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
      // Leave right after the final crossing; the exit commits strand 1 this frame.
      extendPrinterTurns(g.printerTurns, g.printerEndX - g.printerStartX);
      if (g.printerTimer > 0 && printerPastLastCrossing(x => printerSourceCandle(g.printerSaved ?? g.C, Math.floor(x / CW)),
        g.p.x, g.printerStartX, g.printerEndX, g.printerTurns, CW)) g.printerTimer = 0;
    } else if (g.p.whaleMount) {
      stepWhaleMount(g.p.whaleMount, g.C, g.p.x, CW);
      g.p.y = g.p.whaleMount.feet - WHALE_SEAT_HEIGHT;
      g.p.vy = g.p.whaleMount.vy;
      g.p.air = (g.p.whaleMount.jumps ?? 0) > 0;
      g.p.buf = 0; g.gapAirborne = false;
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
    if (overGap && !isRocketMode && !printerActive && !ridingWhale) g.gapAirborne = true;
    let bestCandle: Candle | null = null;

    if (!isRocketMode && !printerActive && !ridingWhale) {
      for (let i = i0; i <= i1; i++) {
        const c = g.C[i];
        if (!c || c.hole) continue;
        if (g.p.x + 6 < i * CW || g.p.x - 6 > (i + 1) * CW) continue;

        // High candles are walls; the runner stays on the yellow approach until a jump clears the top.
        if (isBlockedByTallCandle(c.doubleJumpBarrier, prev, c.top)) {
          g.p.x = Math.min(g.p.x, i * CW - 7);
          continue;
        }

        // Robust step-up and landing: a descending player cannot tunnel through a solid higher column.
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
      // Charge only when landing on a yellow candle; it stays available until used or the next landing.
      g.p.doubleReady = doubleJumpChargeOnLanding(g.C, i0, i1);
    }

    // Gap fall death (Skipped if in rocket mode!)
    if (!printerActive && !ridingWhale && !landed && g.p.vy > 0 && g.p.rocketTimer <= 0) {
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
    if (!isRocketMode && !ridingWhale && g.p.buf > 0 && g.p.coy > 0) {
      g.p.vy = -9.2;
      g.p.coy = 0;
      g.p.buf = 0;
      g.p.jumps = 1;
      g.p.air = true;
    }

    g.score = Math.max(g.score, g.candleOffset + Math.floor(g.p.x / CW));

    ensureChartAhead(g, Math.max(g.p.x, g.cx + field.right), field.right - field.left, CW, genCandle);

    if (g.globalFrame >= g.nextCandleSurprise && !printerActive && g.hawkTimer <= 0 && !isRocketMode) {
      g.nextCandleSurprise = g.globalFrame + (candleDemo ? 60 : SURPRISE_RETRY_FRAMES);
      const candidates: number[] = [];
      const first = Math.ceil((g.p.x + Math.min(500, (field.right - field.left) * .35)) / CW);
      const last = Math.min(g.C.length - SURPRISE_MAX_GAP - 5, Math.floor((g.cx + field.right - 100) / CW));
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

    updateEntities(sp, g.p.y - petPreviousY);
    if (g.currentState !== 'play') return;
    ensureChartAhead(g, Math.max(g.p.x, g.cx + field.right), field.right - field.left, CW, genCandle);
    if (printerActive && g.printerTimer === 0 && g.printerSaved) {
      const saved = g.printerSaved;
      // Strand 1 is the upper chart when inverted, else lower; commit it and let the tail scroll out.
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
    // Leave room for the separated whale train behind the rider.
    g.cx = (g.printerTimer > 0 ? g.printerProgress : g.p.x) - heroCameraOffset();
    if (g.printerTimer <= 0 && g.cx > g.printerEndX + 60) g.printerSaved = null;
    // Never rebase a temporary boss arena: its callbacks capture chart indices.
    if (!bossEncounter.current) {
      const removed = compactChartWindow(g, CW);
      if (removed && aimRef.current) aimRef.current.x -= removed * CW;
    }
    g.cy = followCameraY(g.cy, g.p.y, viewRef.current, feedLayout.current.tapeHeight);

    const encounter = bossEncounter.current;
    if (encounter) {
      const previousBossX = encounter.boss.x;
      const previousWalkPhase = encounter.boss.walkPhase;
      encounter.boss.x += g.cx - encounter.cameraX;
      encounter.cameraX = g.cx;
      encounter.left = g.cx;
      encounter.right = g.cx + viewRef.current.right;
      encounter.briefcaseRight = briefcaseRightEdge(g.cx, viewRef.current.right);
      encounter.bossLeft = g.cx + viewRef.current.right * BOSS_ATTACK_ZONE_FRACTION;
      encounter.bossRight = encounter.right - 70;
      Object.assign(encounter.player, { x: g.p.x, y: g.p.y, vy: g.p.vy,
        grounded: !g.p.air, jumps: g.p.jumps, moving: true, walkPhase: g.p.ph });
      encounter.aim = aimRef.current;
      encounter.onEnemyDefeated = enemy => { awardEnemy(enemy); sound.playHit(); };
      // Melee and projectiles must see the same normal-run enemies.
      encounter.animals = g.animals;
      encounter.birds = g.swans;
      if (encounter.attackRequested) {
        encounter.attackRequested = false;
        // Normal pickups keep their normal throwing restrictions and actions.
        if (g.p.carry > 0 || g.fedoraTimer > 0 || g.flyingFedora || g.p.whaleMount
          || g.p.rocketTimer > 0 || g.hawkTimer > 0 || g.printerTimer > 0) throwBriefcase();
        else if (throwBossCase(encounter)) sound.playBriefcaseThrow();
      }
      const lives = encounter.player.lives;
      // Reuse normal enemies for projectile collisions without simulating them twice.
      stepBossArena(encounter, 0);
      // Measure against the candles, including forward travel, so a scrolling boss does not skate.
      const walkingDistance = Math.abs(encounter.boss.x - previousBossX);
      const spinning = encounter.boss.kind === 'janet' && encounter.boss.attack > 0
        && encounter.boss.attackKind === 'spin';
      encounter.boss.moving = encounter.boss.grounded && !spinning && walkingDistance > 0.01;
      encounter.boss.walkPhase = previousWalkPhase + (encounter.boss.moving ? walkingDistance * 0.16 : 0);
      encounter.animals = [];
      encounter.birds = [];
      if (encounter.player.lives < lives) sound.playHit();
      if (encounter.result === 'lose') { bossEncounter.current = null; die('Boss encounter knockout'); return; }
      if (encounter.result === 'win') {
        g.activityPips += bossWinPips(encounter.boss.kind);
        eventRef.current?.({ type: 'kill', enemy: encounter.boss.kind });
        bossEncounter.current = null;
      }
    }

    // Companions use their own terrain, not the hero's jump; horizontal state is runner-relative.
    if (g.p.rocketTimer <= 0 && g.hawkTimer <= 0 && g.printerTimer <= 0 && !g.p.whaleMount && !petDeath.current) {
      const id = cosmeticRef.current.pets;
      const phase = petAnimationPhase(g.globalFrame/60,id);
      const pose = petPose('normal',phase,false,id,true);
      if (!petFollower.current || petFollower.current.id !== id) {
        petFollower.current = { id, x: pose.x, feet: petTrackHeightAt(g.C,g.p.x+pose.x,CW,g.lastTop), vy: 0 };
      }
      const follower = petFollower.current;
      stepPetFollower(follower,pose.x,follower.feet);
      follower.feet=petTrackHeightAt(g.C,g.p.x+follower.x,CW,g.lastTop);
    } else petFollower.current = null;

    const totalScoreVal = Math.max(0, g.score - g.penalty + g.activityPips);
    if (!g.difficultyActive && difficultyUnlocked(totalScoreVal)) {
      g.difficultyActive = true;
      // Visible terrain stays unchanged; schedule obstacles in new terrain so players can react.
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
      currentPrice: g.C[Math.floor(g.p.x / CW)] ? Number(price(g.C[Math.floor(g.p.x / CW)].c)) : 0,
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
  }, [genCandle, updateEntities, die, onScoreUpdate, candleDemo, bossEncounter, awardEnemy, throwBriefcase]);

  // Sprite rendering.

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
    const suit = skinColors(cosmeticRef.current.suits, theme === 'dark');
    let deathPetRendered = false;
    const renderPet = (mode: Parameters<typeof petPose>[0]) => {
      const death = petDeath.current;
      if (death) {
        if (deathPetRendered) return;
        deathPetRendered = true;
        const pose = petDeathPose(death.frame, death.gap);
        ctx.save(); ctx.translate(death.x - g.p!.x + pose.x, death.y - g.p!.y + pose.y);
        ctx.scale(pose.scale, pose.scale);
        // Rotate around the body rather than the feet, then land back-first.
        ctx.translate(0, -12); ctx.rotate(pose.rotation); ctx.translate(0, 12);
        drawPet(ctx, death.id, theme === 'dark', 0, false, false, true);
        ctx.restore(); return;
      }
      const phase = cosmeticRef.current.pets.startsWith('friend:') ? g.p!.ph : petAnimationPhase(g.globalFrame/60,cosmeticRef.current.pets);
      const pose = petPose(mode, phase, false, cosmeticRef.current.pets, true);
      const attack = mode === 'normal' && petAttack.current?.id === cosmeticRef.current.pets ? petAttack.current : null;
      if (attack) {
        ctx.save(); ctx.translate(attack.x, attack.y); ctx.scale(pose.scale, pose.scale);
        if (attack.stage === 'flying') { ctx.translate(0, -10); ctx.rotate(attack.age * .35); ctx.translate(0, 10); }
        else if (attack.x > -26) ctx.scale(-1, 1);
        drawPet(ctx, attack.id, theme === 'dark', phase, attack.stage === 'returning',attack.stage==='returning',true); ctx.restore(); return;
      }
      const follower = mode === 'normal' && petFollower.current?.id === cosmeticRef.current.pets ? petFollower.current : null;
      const petX = follower?.x ?? pose.x;
      const petFloor = mode === 'normal'
        ? petTrackHeightAt(g.C, g.p!.x + petX, CW, g.lastTop) : g.p!.y;
      const terrainY = Number.isFinite(petFloor) ? petFloor - g.p!.y : 0;
      ctx.save(); ctx.translate(petX, pose.y + terrainY); ctx.scale(pose.scale, pose.scale);
      const walking = mode === 'normal' && !g.falling;
      const jumpingGap = mode === 'normal' && petFloor < trackHeightAt(g.C, g.p!.x + petX, CW, g.lastTop) - 2;
      drawPet(ctx, cosmeticRef.current.pets, theme === 'dark', phase, false, walking, true, jumpingGap); ctx.restore();
    };
    if (petDeath.current) renderPet('normal');
    if (g.printerTimer > 0) {
      ctx.rotate(g.printerRotation);
      ctx.scale(printerProfileFlip(g.printerRotation), 1);
    }
    // Android Bell retains the equipped runner and normal control model.
    if (g.falling) {
      renderPet('normal');
      drawFallingCharacter(ctx, g.fallFrame, g.apeTimer > 0, false, theme === 'dark', g.playerHat !== 'none', cosmeticRef.current.hats, cosmeticRef.current.suitcase, cosmeticRef.current.suits, cosmeticRef.current.shoes);
      ctx.restore();
      return;
    }

    if (g.hawkTimer > 0 && g.p.rocketTimer <= 0) {
      drawDumpster(ctx, g.apes.length, g.p.ph, weaponHatCount(g.fedoraTimer, g.fedoraWindup, !!g.flyingFedora), theme === 'dark',
        g.p.carry > 0 && g.p.shieldKind === 'diamond', g.hawkBags, g.globalFrame, g.hatSoiled, g.bagThrowAnimTimer, g.bagThrowDirection, g.playerHat !== 'none', petDeath.current ? undefined : cosmeticRef.current.pets, cosmeticRef.current.hats);
      ctx.restore(); return;
    }

    // Whale riders keep the diamond in their lap, not as an aura; protection shows again after dismount.
    if (!g.p.whaleMount && g.p.carry > 0 && g.p.shieldKind !== 'bag') {
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
      const passengerCount = g.apes.length + 1;
      ctx.save();
      if (passengerCount) ctx.translate(-27 - (passengerCount - 1) * ROCKET_SEAT_SPACING, 0);

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

      // Rocket fuselage: streamlined retro spacecraft body with a rear engine nozzle.
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
        ctx.beginPath(); ctx.roundRect(-57 - (passengerCount - 1) * ROCKET_SEAT_SPACING, -13, 35 + (passengerCount - 1) * ROCKET_SEAT_SPACING, 26, 8); ctx.fill();
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

      // Collected bags hang from hooks on the rocket's lower side, like the Hawk dumpster.
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
      ctx.save(); clipRocketCanopy(ctx, ROCKET_PET_CANOPY.x);
      renderPet('rocket');
      ctx.restore();
      if (!petDeath.current) drawRocketPetCanopy(ctx);
      for (const [apeIndex, ape] of g.apes.entries()) {
        // Every passenger uses the same roof-mounted cabin as the pilot/pet.
        const seatX = rocketSeatCenter(apeIndex + 2);
        ctx.save();
        clipRocketCanopy(ctx, seatX);
        ctx.translate(seatX - 2.4, -12);
        ctx.scale(APE_SCALE, APE_SCALE);
        drawApeAsset(ctx, g.globalFrame * 0.15, true, ape.throwTimer, ape.direction, false, g.p.carry > 0 && g.p.shieldKind === 'bag');
        ctx.restore();
        drawRocketCanopy(ctx, seatX);
      }
      ctx.save(); clipRocketCanopy(ctx);
      // Torso first, neck/head second: the neckline cannot cover the face.
      drawRidingSuit(ctx,cosmeticRef.current.suits,theme==='dark',g.p.ph,'rocket');
      // Clear profile eye instead of a dark mask-like band.
      if (g.apeTimer > 0) {
        ctx.save(); ctx.translate(2, -22); ctx.scale(0.65, 0.65); drawApeHead(ctx, false);
        if (g.playerHat !== 'none' && g.fedoraTimer <= 0 && g.fedoraWindup <= 0 && !g.flyingFedora) drawApeHat(ctx, true, theme === 'dark'); ctx.restore();
      } else {
      ctx.save(); ctx.translate(2, -22); ctx.scale(0.65, 0.65); drawHumanHead(ctx, g.playerHat !== 'none', theme === 'dark', cosmeticRef.current.hats, g.globalFrame / 60, weaponHatCount(g.fedoraTimer, g.fedoraWindup, !!g.flyingFedora) === 0); ctx.restore();
      }

      for (let hat = 0; hat < weaponHatCount(g.fedoraTimer, g.fedoraWindup, !!g.flyingFedora); hat++) {
        ctx.save(); ctx.translate(2, -22); ctx.scale(0.65, 0.65);
        ctx.translate(0, -(hat + (g.apeTimer <= 0 && g.playerHat !== 'none' ? 1 : 0)) * hatMetrics(cosmeticRef.current.hats).stackHeight);
        if (g.apeTimer > 0) drawApeHat(ctx, false, theme === 'dark', cosmeticRef.current.hats, g.globalFrame / 60, hat === weaponHatCount(g.fedoraTimer, g.fedoraWindup, !!g.flyingFedora)-1);
        else drawCharacterHat(ctx, false, false, theme === 'dark', cosmeticRef.current.hats, g.globalFrame / 60, hat === weaponHatCount(g.fedoraTimer, g.fedoraWindup, !!g.flyingFedora)-1);
        ctx.restore();
      }

      // Arms holding rocket steering yoke / joystick!
      ctx.strokeStyle = suit[0];
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

      ctx.restore(); // End pilot cabin clip before drawing its glass and rim.
      drawRocketCanopy(ctx);

      ctx.restore();
      ctx.restore();
      return;
    }

    if (g.p.whaleMount) {
      // Rear-most follower first; every rider shows their right profile.
      for (let index = g.apes.length - 1; index >= 0; index--) {
        const follower = whaleCompanionPose(index);
        ctx.save(); ctx.translate(follower.x, follower.y); ctx.scale(follower.scale, follower.scale);
        const ape = g.apes[index];
        // Companions ride in step with the hero's mount, so everyone jumps together.
        const phase = g.p.whaleMount.phase ?? 0;
        const frogRider = cosmeticRef.current.mounts === 'mounts-wednesday';
        if (frogRider) {
          ctx.translate(0,20);ctx.rotate(frogBodyPose((g.p.whaleMount.jumps??0)>0,g.p.whaleMount.vy).angle);ctx.translate(0,-20);
        } else applyWhaleRiderSwim(ctx, phase);
        const riderScale = APE_SCALE * WHALE_RIDER_SCALE / follower.scale;
        const drop = mountRiderDrop(cosmeticRef.current.mounts, g.p.whaleMount.kind), pony = cosmeticRef.current.mounts === 'mounts-penny';
        ctx.translate(0, drop);
        ctx.save(); applyWhaleRiderSeat(ctx, phase, riderScale);
        drawWhaleRiderLeg(ctx, false, '#4e301d', '#a7774d', 8, pony); ctx.restore();
        ctx.save(); ctx.translate(0, 40 - drop); ctx.scale(-1, 1);
        drawMount(ctx, cosmeticRef.current.mounts, g.p.whaleMount.kind ?? 'whale', theme === 'dark', phase, (g.p.whaleMount.jumps ?? 0)>0, g.p.whaleMount.vy, g.apes.length > 0);
        ctx.restore();
        applyWhaleRiderSeat(ctx, phase, riderScale); ctx.translate(0, -11);
        drawApeAsset(ctx, g.p.ph, true, ape.throwTimer, ape.direction, false, false, true, frogRider);
        ctx.restore();
      }
      ctx.save();
      const phase = g.p.whaleMount.phase ?? 0;
      if(cosmeticRef.current.mounts==='mounts-wednesday') {
        ctx.translate(0,20);ctx.rotate(frogBodyPose((g.p.whaleMount.jumps??0)>0,g.p.whaleMount.vy).angle);ctx.translate(0,-20);
      } else applyWhaleRiderSwim(ctx, phase);
      const drop = mountRiderDrop(cosmeticRef.current.mounts, g.p.whaleMount.kind), pony = cosmeticRef.current.mounts === 'mounts-penny';
      ctx.translate(0, drop);
      ctx.save(); applyWhaleRiderSeat(ctx, phase, WHALE_RIDER_SCALE);
      drawWhaleRiderLeg(ctx, false, suit[0], '#090d16', 5, pony); ctx.restore();
      ctx.save(); ctx.translate(0, WHALE_SEAT_HEIGHT - drop); ctx.scale(-1, 1);
      drawMount(ctx, cosmeticRef.current.mounts, g.p.whaleMount.kind ?? 'whale', theme === 'dark', phase, (g.p.whaleMount.jumps ?? 0)>0, g.p.whaleMount.vy, g.apes.length > 0);
      ctx.restore();
      ctx.save(); applyWhaleRiderSeat(ctx, phase, WHALE_RIDER_SCALE);
      const mountedGauntlets=cosmeticRef.current.suitcase.split(':')[0]==='suitcase-diamond-hands';
      const mountedGauntletOut=g.cases.some(c=>c.life>0&&c.skin==='suitcase-diamond-hands');
      const mountedHand=(near:boolean)=>(x:number,y:number,angle:number)=>drawHeroHand(ctx,x,y,angle,near,near&&mountedGauntletOut?'':cosmeticRef.current.suitcase,theme==='dark');
      drawWhaleRiderArm(ctx, false, suit[0], '#dca581',4,cosmeticRef.current.mounts==='mounts-wednesday',pony,drop<0,mountedGauntlets?mountedHand(false):undefined);
      drawRidingSuit(ctx,cosmeticRef.current.suits,theme==='dark',g.p.ph,'whale',false);
      drawMountedSeat(ctx, suit[0]);
      drawWhaleRiderLeg(ctx, true, suit[0], '#090d16', 5, pony);
      if (pony) drawPennyStirrupForeground(ctx, theme === 'dark');
      ctx.save(); ctx.translate(0, -38); ctx.scale(0.8, 0.8);
      if (g.apeTimer > 0) {
        drawApeHead(ctx, false);
        if (g.playerHat !== 'none' && g.fedoraTimer <= 0 && g.fedoraWindup <= 0 && !g.flyingFedora) drawApeHat(ctx, true, theme === 'dark');
      } else drawHumanHead(ctx, g.playerHat !== 'none', theme === 'dark', cosmeticRef.current.hats, g.globalFrame / 60, weaponHatCount(g.fedoraTimer, g.fedoraWindup, !!g.flyingFedora) === 0);
      const hats = weaponHatCount(g.fedoraTimer, g.fedoraWindup, !!g.flyingFedora);
      for (let hat = 0; hat < hats; hat++) {
        // The hat renderer already offsets the brim; share the head origin and scale.
        ctx.save(); ctx.translate(0, -(hat + (g.apeTimer <= 0 && g.playerHat !== 'none' ? 1 : 0)) * hatMetrics(cosmeticRef.current.hats).stackHeight);
        if(g.apeTimer>0)drawApeHat(ctx,false,theme==='dark',cosmeticRef.current.hats,g.globalFrame/60,hat === hats-1);
        else drawCharacterHat(ctx, false, false, theme === 'dark', cosmeticRef.current.hats, g.globalFrame / 60, hat === hats-1); ctx.restore();
      }
      ctx.restore();
      // Keep lap luggage stacked; redraw only the collar after the long neck, leaving the face clear.
      ctx.save(); ctx.translate(-2.5,5);
      drawSuitCollar(ctx,cosmeticRef.current.suits,theme==='dark',g.p.ph,true,-5,12); ctx.restore();
      if (g.p.carry > 0 && g.p.shieldKind !== 'bag') {
        ctx.save(); ctx.translate(9, -7); ctx.scale(0.55, 0.55);
        drawPickupAsset(ctx, { type: 'diamond', x: 0, y: 0, taken: false }, 0, 0, g.globalFrame, theme === 'dark');
        ctx.restore();
      } else if (!mountedGauntlets) {
        ctx.save(); ctx.translate(1, -14); ctx.scale(.85, .75);
        drawEquippedBag(ctx, cosmeticRef.current.suitcase, theme === 'dark');
        ctx.restore();
      }
      const lapBags = g.p.whaleMount.bags ?? 0;
      const visibleBags = Math.max(lapBags, g.p.carry > 0 && g.p.shieldKind === 'bag' ? 1 : 0);
      for (let bag = 0; bag < visibleBags; bag++) {
        ctx.save(); ctx.translate(9 + (bag % 2) * 3, -16 - bag * 9); ctx.scale(0.45, 0.45);
        drawPickupAsset(ctx, { type: 'bag', x: 0, y: 0, taken: false }, 0, 0, g.globalFrame, theme === 'dark');
        ctx.restore();
      }
      if (!petDeath.current) {
        const mount = g.p.whaleMount;
        const lift = ridingPetLift((mount.jumps ?? 0) > 0, (mount.launchFeet ?? mount.feet) - mount.feet);
        ctx.save(); ctx.translate(9, -13 + lift); ctx.scale(.4, .4);
        drawPet(ctx, cosmeticRef.current.pets, theme === 'dark', petAnimationPhase(g.globalFrame / 60, cosmeticRef.current.pets), false, false, true, (mount.jumps ?? 0) > 0);
        ctx.restore();
      }
      // Near/right arm is foreground; the left shoulder remains behind torso.
      drawWhaleRiderArm(ctx, true, suit[0], '#fed7aa',4,cosmeticRef.current.mounts==='mounts-wednesday',pony,drop<0,mountedGauntlets?mountedHand(true):undefined);
      ctx.restore();
      ctx.restore();
      ctx.restore(); return;
    }

    // --- STANDARD ON-FOOT RUNNER SPRITE ---
    renderPet('normal');
    if (g.p.air) {
      ctx.rotate(Math.max(-0.12, Math.min(0.12, g.p.vy * 0.012)));
      ctx.scale(1 + Math.sin(g.p.ph) * 0.025, 1 - Math.sin(g.p.ph) * 0.035);
    }
    if (g.p.carry > 0 && g.p.shieldKind === 'bag') ctx.rotate(0.08);
    const wingPhase=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:g.globalFrame/60;
    const carryPose=runnerCarryPose(g.p.shieldKind==='bag'?'bag':'diamond',g.p.ph);
    const gauntletOut=g.cases.some(c=>c.life>0&&c.skin==='suitcase-diamond-hands');
    const actionArm=(front:boolean,target:{x:number;y:number},palm=true)=>{
      const arm=actionArmPose(front,target,front?1:-1);
      drawJointedSuitArm(ctx,cosmeticRef.current.suits,theme==='dark',arm.shoulder,arm.elbow,arm.hand,front?4.5:3.5,3);
      if(palm) drawHeroHand(ctx,arm.hand.x,arm.hand.y,Math.atan2(arm.hand.y-arm.elbow.y,arm.hand.x-arm.elbow.x),front,front&&gauntletOut?'':cosmeticRef.current.suitcase,theme==='dark');
      return arm.hand;
    };
    drawProfileBackLayers(() => {
    if(!g.p)return;
    // Match the reference back-arm poses: swing while running, brace the diamond, trail on throws.
    if (g.p.carry > 0 && g.bagThrowAnimTimer <= 0) {
      actionArm(false,carryPose.far.hand);
    } else if (g.p.carry <= 0 && g.throwAnimTimer > 0 && g.bagThrowAnimTimer <= 0) {
      actionArm(false,{x:-8,y:-20});
    } else if (g.p.carry <= 0 && g.throwAnimTimer <= 0 && g.bagThrowAnimTimer <= 0) {
      drawFarRunnerArm(ctx,cosmeticRef.current.suits,theme==='dark',stride,cosmeticRef.current.suitcase);
    }

    }, () => {
      if(!g.p)return;
      drawRunnerLeg(ctx, cosmeticRef.current.suits, cosmeticRef.current.shoes, theme === 'dark', stride, false, g.p.air, wingPhase);
      drawRunnerLeg(ctx, cosmeticRef.current.suits, cosmeticRef.current.shoes, theme === 'dark', stride, true, g.p.air, wingPhase);
    });

    // Torso and legs both occlude the entire far arm, including its hand.
    drawSuitDetails(ctx, cosmeticRef.current.suits, theme === 'dark', g.p.ph);

    // Head
    if (g.apeTimer > 0) {
      ctx.save(); ctx.translate(3, -42); ctx.scale(0.8, 0.8); drawApeHead(ctx, false);
      if (g.playerHat !== 'none' && g.fedoraTimer <= 0 && g.fedoraWindup <= 0 && !g.flyingFedora) drawApeHat(ctx, true, theme === 'dark'); ctx.restore();
    } else {
    ctx.save(); ctx.translate(3, -42); ctx.scale(0.8, 0.8); drawHumanHead(ctx, g.playerHat !== 'none', theme === 'dark', cosmeticRef.current.hats, g.globalFrame / 60, weaponHatCount(g.fedoraTimer, g.fedoraWindup, !!g.flyingFedora) === 0);
    if (g.hawkTimer > 0) {
      ctx.fillStyle = '#fff7ed'; ctx.beginPath(); ctx.ellipse(3, 0, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(10, 0, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.ellipse(4, -4, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(2, 4); ctx.quadraticCurveTo(6, 7, 9, 3); ctx.stroke();
      ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.arc(-4, -2, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    }

    for (let i = 0; i < weaponHatCount(g.fedoraTimer, g.fedoraWindup, !!g.flyingFedora); i++) {
      // Weapon hats replace the ape captain cap; humans retain their worn hat.
      ctx.save(); ctx.translate(3, -42 - (i + (g.apeTimer <= 0 && g.playerHat !== 'none' ? 1 : 0)) * hatMetrics(cosmeticRef.current.hats).stackHeight * .8); ctx.scale(0.8, 0.8);
      if(g.apeTimer>0)drawApeHat(ctx,false,theme==='dark',cosmeticRef.current.hats,g.globalFrame/60,i === weaponHatCount(g.fedoraTimer, g.fedoraWindup, !!g.flyingFedora)-1);
      else drawCharacterHat(ctx, false, false, theme === 'dark', cosmeticRef.current.hats, g.globalFrame / 60, i === weaponHatCount(g.fedoraTimer, g.fedoraWindup, !!g.flyingFedora)-1); ctx.restore();
    }

    if (g.hatSoiled && (g.playerHat !== 'none' || g.fedoraTimer > 0)) {
      const hats = weaponHatCount(g.fedoraTimer, g.fedoraWindup, !!g.flyingFedora);
      const captain = g.apeTimer > 0 && hats === 0;
      const stainY = hats > 0 ? (g.apeTimer > 0 ? -57 : -65) - (hats - 1) * 11 : -57;
      drawPigeonStain(ctx, captain ? 6 : 3, stainY, !captain && theme === 'light');
    }

    // Complete neck and chest layers before foreground arms; repainting later cuts the sleeve.
    drawSuitCollar(ctx, cosmeticRef.current.suits, theme === 'dark', g.p.ph, g.p.air, g.p.vy);

    // Case A: diamond hands, holding the diamond proudly overhead with raised arms.
    if (g.bagThrowAnimTimer > 0) {
      const pose=runnerBagThrowPose(g.bagThrowAnimTimer,g.bagThrowDirection);
      if(pose.holding) {
        ctx.save();ctx.translate(pose.asset.x,pose.asset.y);ctx.scale(pose.asset.scale,pose.asset.scale);
        drawPickupAsset(ctx,{type:'bag',x:0,y:0,taken:false},0,0,g.globalFrame,theme==='dark');ctx.restore();
      }
      actionArm(true,pose.near.hand);
    } else if (g.fedoraWindup > 0) {
      const arm=fedoraArmPose(g.fedoraWindup);
      const hand=actionArm(true,{x:arm.handX,y:arm.handY},false);
      const grab=Math.max(0,Math.min(1,(1-g.fedoraWindup/FEDORA_WINDUP)/.4));
      const stack=weaponHatCount(g.fedoraTimer,g.fedoraWindup,!!g.flyingFedora);
      const headY=-42-stack*hatMetrics(cosmeticRef.current.hats).stackHeight*.8;
      ctx.save();ctx.translate(3+(hand.x-3)*grab,headY+(hand.y+5-headY)*grab);
      ctx.scale(.8,.8);
      drawCharacterHat(ctx,false,false,theme==='dark',cosmeticRef.current.hats,g.globalFrame/60);ctx.restore();
      drawHeroHand(ctx,hand.x,hand.y,0,true,gauntletOut?'':cosmeticRef.current.suitcase,theme==='dark');
    } else if (g.p.carry > 0 && g.p.shieldKind === 'bag') {
      const {asset,near}=carryPose;
      ctx.save();ctx.translate(asset.x,asset.y);ctx.scale(asset.scale,asset.scale);
      drawPickupAsset(ctx,{type:'bag',x:0,y:0,taken:false},0,0,g.globalFrame,theme==='dark');ctx.restore();
      actionArm(true,near.hand);
    } else if (g.p.carry > 0) {
      const {asset,near}=carryPose;
      actionArm(true,near.hand,false);
      ctx.save();ctx.translate(asset.x,asset.y);ctx.scale(asset.scale,asset.scale);
      drawPickupAsset(ctx,{type:'diamond',x:0,y:0,taken:false},0,0,g.globalFrame,theme==='dark');ctx.restore();
      drawHeroHand(ctx,near.hand.x,near.hand.y,0,true,gauntletOut?'':cosmeticRef.current.suitcase,theme==='dark');
    } else if (g.fedoraTimer > 0 || g.flyingFedora) {
      const release=fedoraReleasePose(),rest=briefcaseArmPose(g.p.air,g.p.vy,stride);
      const follow=Math.max(0,Math.min(1,g.throwAnimTimer/8));
      const arm={handX:rest.handX+(release.handX-rest.handX)*follow,handY:rest.handY+(release.handY-rest.handY)*follow};
      if(follow>0) actionArm(true,{x:arm.handX,y:arm.handY});
      else drawNearBriefcaseArm(ctx,cosmeticRef.current.suits,cosmeticRef.current.suitcase,theme==='dark',stride,g.p.air,g.p.vy,false);
    } else if (g.throwAnimTimer > 0) {
      const reach = Math.min(1, g.throwAnimTimer / 8);
      // --- CASE B: THROW ANIMATION (Pitching arm thrusting forward to launch briefcase) ---
      actionArm(true,{x:3+15*reach,y:-16-12*reach});


    }

    // The right arm holds the case in right-profile view; draw it after the torso.
    if (g.p.carry <= 0 && g.throwAnimTimer <= 0 && g.bagThrowAnimTimer <= 0 && g.fedoraWindup <= 0 && g.fedoraTimer <= 0 && !g.flyingFedora) {
      // Briefcase held low (hidden if currently in flight)
      const isBriefcaseFlying = g.cases.some((c) => c.life > 0 && c.kind !== 'banana' && c.kind !== 'debris');
      const heldBag = cosmeticRef.current.suitcase + (g.severanceEmpty > 0 ? ':empty' : '');
      drawNearBriefcaseArm(ctx, cosmeticRef.current.suits, heldBag, theme === 'dark', stride, g.p.air, g.p.vy, !isBriefcaseFlying);
    }

    ctx.restore();
  }, [theme, bossEncounter]);
  // 2. PICKUPS (Coins, Diamonds, Banknotes)
  const drawPickups = useCallback((ctx: CanvasRenderingContext2D) => {
    const g = gameRef.current;
    const bounds = pickupRenderBounds(viewRef.current, feedLayout.current.tapeHeight);
    for (const d of g.pickups) {
      const x = d.x - g.cx;
      const y = d.y - g.cy;
      // Cull only rendering, not simulation: clipping hides pixels but still issues asset commands.
      if (!pickupInRenderBounds(x, y, bounds)) continue;

      ctx.save();
      ctx.translate(x, y);
      drawPickupAsset(ctx, d, 0, 0, g.globalFrame, theme === 'dark', 'M', true, cosmeticRef.current.hats);
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
        if (s.vortex) { const k = Math.max(0, (s.dieTimer || 0) / 30); ctx.scale(k, k); }
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
      drawSwanAsset(ctx, whiteSwan ? { ...s, kind: 'white' } : s, theme === 'dark', theme === 'dark', cosmeticRef.current.hats);
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
        if (a.vortex) {
          const k = Math.max(0, (a.dieTimer || 0) / 30);
          ctx.translate(0, -ANIMAL_CENTER); ctx.rotate(a.dieAngle || 0); ctx.scale(k, k); ctx.translate(0, ANIMAL_CENTER);
        } else ctx.rotate(a.dieAngle || 0);
        ctx.globalAlpha = Math.max(0, (a.dieTimer || 0) / 25);
      }
      drawAnimalCharacter(ctx, a, false, false, theme === 'dark', false, false, false, false, cosmeticRef.current.hats);
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
      tapeH = headerFeedLayout.current.height / Math.max(0.01, mainHeight / viewRef.current.height);
      ctx = headerCtx;
      ctx.setTransform(header.width / viewRef.current.width, 0, 0, header.height / tapeH, 0, 0);
    }
    const { mobile, fontSize: feedFontSize } = feedLayout.current;
    const textScaleX = header ? (headerFeedLayout.current.height / tapeH) / Math.max(0.01, headerFeedLayout.current.width / viewRef.current.width) : feedLayout.current.textScaleX;

    if (liveFeedEnabled) {
      ctx.save();
      ctx.textBaseline = 'alphabetic';
      const writeCentered = (text: string, x: number) => {
        // Center the visible glyph bounds within the Live Feed, ignoring ascenders and descenders.
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
        ctx.clearRect(0, 0, viewRef.current.width, tapeH);
      } else {
        ctx.fillStyle = theme === 'light' ? '#ffffff' : '#253044';
        ctx.fillRect(0, 0, viewRef.current.width, tapeH);
      }

      ctx.textAlign = 'left';

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, viewRef.current.width, tapeH);
      ctx.clip();


      ctx.font = `bold ${feedFontSize}px monospace`;
    if (feedMessageRef.current) {
      const message = feedMessageRef.current;
      const noInternet = message === 'NO INTERNET CONNECTION';
      const scrollsByRule = message.startsWith('OFFLINE:') || message.startsWith('PAGE NOT FOUND') || message.startsWith('NO CONNECTION.') || message === 'CONNECTING' || noInternet;
      ctx.fillStyle = feedColor.current;
      const iconWidth = noInternet ? 28 * textScaleX : 0;
      const width = ctx.measureText(message).width * textScaleX + iconWidth;
      // A notice wider than the bar scrolls like the news, so a long message is never cut off.
      const scrolling = scrollsByRule || width > viewRef.current.width - 16;
      ctx.textAlign = scrolling ? 'left' : 'center';
      if (scrolling) {
        const now = performance.now();
        const ticker = statusTicker.current;
        if (ticker.message !== message) { ticker.message = message; ticker.x = 0; ticker.time = now; }
        const seconds = Math.min(.1, Math.max(0, (now - ticker.time) / 1000));
        ticker.time = now;
        const period = width + 64 * textScaleX;
        ticker.x = (ticker.x - seconds * 60 * textScaleX) % period;
        for (let x = ticker.x; x < viewRef.current.width; x += period) {
          if (noInternet) {
            // Crossed-out Wi-Fi glyph drawn with the same canvas colour as text.
            ctx.save(); ctx.translate(x + 10 * textScaleX, tapeH / 2);
            ctx.scale(textScaleX, 1); ctx.strokeStyle = feedColor.current; ctx.lineWidth = 1.7; ctx.lineCap = 'round';
            for (const radius of [5, 9, 13]) {
              ctx.beginPath(); ctx.arc(0, 7, radius, -Math.PI * .77, -Math.PI * .23); ctx.stroke();
            }
            ctx.beginPath(); ctx.arc(0, 7, 1.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-9, -7); ctx.lineTo(9, 10); ctx.stroke(); ctx.restore();
          }
          writeCentered(message, x + iconWidth);
        }
      } else {
        if (width > viewRef.current.width - 16) ctx.font = `bold ${feedFontSize * (viewRef.current.width - 16) / width}px monospace`;
        writeCentered(message, viewRef.current.width / 2);
      }
      header?.setAttribute('aria-label', message);
    } else if (bossEncounter.current || g.printerTimer > 0) {
        ctx.textAlign = 'center';
        ctx.fillStyle = theme === 'light' ? '#08795c' : '#55d6ae';
        ctx.font = `bold ${mobile || header ? feedFontSize : 13}px monospace`;
      if (bossEncounter.current) {
          ctx.fillStyle = bossColors(bossEncounter.current?.boss.kind ?? 'jerome', theme === 'dark').foreground;
          writeCentered(bossName(bossEncounter.current?.boss.kind ?? 'jerome'), (viewRef.current.width) / 2);
        } else {
          ctx.textAlign = 'left';
          // The prefix never wraps; only the trailing R stream repeats.
          const prefix = 'MONEY PRINTER GO B';
          const prefixWidth = ctx.measureText(prefix).width * textScaleX;
          if (g.printerTickerX + prefixWidth > 0) writeCentered(prefix, g.printerTickerX);
          const letterWidth = Math.max(1, ctx.measureText('R').width * textScaleX);
          const tailX = g.printerTickerX + prefixWidth;
          const visibleTailX = tailX < 0 ? -((-tailX) % letterWidth) : tailX;
          if (visibleTailX < viewRef.current.width) {
            const count = Math.ceil((viewRef.current.width - visibleTailX) / letterWidth) + 1;
            writeCentered('R'.repeat(count), visibleTailX);
          }
        }
      }
      let tickerX = g.tickerScrollX;
      let itemIndex = 0;
      // Paused wire in the header: one sentence stays in the middle, never a frozen strip cut at both ends.
      const pausedSentence = tickerPausedRef.current && !!header && !feedMessageRef.current && !bossEncounter.current && g.printerTimer <= 0;
      if (pausedSentence) {
        const item = g.tickerQueue[0] ?? (g.tickerQueue[0] = { news: getTickerNews(), width: 0 });
        const message = `${item.news.source}: ${formatFeedHeadline(item.news.headline)}`.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '');
        const natural = ctx.measureText(message).width * textScaleX;
        // Keep clear of the soft fade at both ends of the header feed.
        const fit = Math.min(1, (viewRef.current.width - 64) / Math.max(1, natural));
        const metrics = ctx.measureText(message);
        const ascent = metrics.actualBoundingBoxAscent ?? 9;
        const descent = metrics.actualBoundingBoxDescent ?? 2;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = feedColor.current;
        ctx.translate(viewRef.current.width / 2, tapeH / 2 + (ascent - descent) / 2);
        ctx.scale(textScaleX * fit, 1);
        ctx.fillText(message, 0, 0);
        ctx.restore();
      }
    // Connection status owns the feed; never paint news over the status message.
    while (!pausedSentence && !feedMessageRef.current && !bossEncounter.current && g.printerTimer <= 0 && tickerX < viewRef.current.width + 500) {
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
        // Share the theme accent with Settings, Stash and the blue action buttons.
        ctx.fillStyle = feedColor.current;
        writeCentered(message, tickerX);
        tickerX += item.width;
      }

      ctx.restore();
      // Carry effects only tint the thin timer strip; news remains uninterrupted.
      ctx.restore();
    }
    if (!feedMessageRef.current) header?.setAttribute('aria-label', 'Live Feed');
    ctx = plotCtx;
    ctx.save();
    tapeH = feedLayout.current.tapeHeight;
    if (!liveFeedEnabled) {
      // Keep active countdowns at the chart's top edge without reserving a news strip.
      ctx.scale(1, 1 / Math.max(0.01, canvasDisplay.current.height / viewRef.current.height * mobileCanvasZoom()));
      tapeH = 3;
    } else if (headerFeedActive.current) {
      // No idle divider beneath the header wire; only active status strips.
      ctx.scale(1, tapeH);
      tapeH = 3;
    }
    if (bossEncounter.current && liveFeedEnabled) {
      const colors = bossColors(bossEncounter.current.boss.kind, theme === 'dark');
      ctx.fillStyle = colors.track; ctx.fillRect(0, tapeH - 3, viewRef.current.width, 3);
      ctx.fillStyle = colors.foreground; ctx.fillRect(0, tapeH - 3, (viewRef.current.width) * Math.max(0, Math.min(1, bossEncounter.current.boss.health / bossMaxHealth(bossEncounter.current.boss.kind))), 3);
    } else if (g.p && g.p.rocketTimer > 0) {
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(0, tapeH - 3, viewRef.current.width, 3);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(0, tapeH - 3, (viewRef.current.width) * Math.min(1, g.p.rocketTimer / 420), 3);
    } else if (g.hawkTimer > 0) {
      ctx.fillStyle = '#1a2e05'; ctx.fillRect(0, tapeH - 3, viewRef.current.width, 3);
      ctx.fillStyle = '#a3e635'; ctx.fillRect(0, tapeH - 3, (viewRef.current.width) * Math.min(1, g.hawkTimer / 600), 3);
    } else if (g.p?.whaleMount) {
      ctx.fillStyle = '#172b48'; ctx.fillRect(0, tapeH - 3, viewRef.current.width, 3);
      ctx.fillStyle = '#688baf';
      ctx.fillRect(0, tapeH - 3, viewRef.current.width * Math.max(0, Math.min(1, g.p.whaleMount.timer / WHALE_MOUNT_DURATION)), 3);
    } else if (g.apeTimer > 0) {
      ctx.fillStyle = '#713f12'; ctx.fillRect(0, tapeH - 3, viewRef.current.width, 3);
      ctx.fillStyle = '#fde047'; ctx.fillRect(0, tapeH - 3, viewRef.current.width * Math.min(1, g.apeTimer / APE_DURATION), 3);
    } else if (g.fedoraTimer > 0) {
      ctx.fillStyle = theme === 'dark' ? '#334155' : '#cbd5e1';
      ctx.fillRect(0, tapeH - 3, viewRef.current.width, 3);
      ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#05070a';
      ctx.fillRect(0, tapeH - 3, viewRef.current.width * Math.min(1, g.fedoraTimer / FEDORA_DURATION), 3);
    } else if (g.p && g.p.carry > 0) {
      const fraction = Math.max(0, Math.min(1, g.p.carry / 300));
      ctx.fillStyle = g.p.shieldKind === 'bag' ? '#450a0a' : '#082f49';
      ctx.fillRect(0, tapeH - 3, viewRef.current.width, 3);
      ctx.fillStyle = g.p.shieldKind === 'bag' ? '#ef4444' : '#38bdf8';
      ctx.fillRect(0, tapeH - 3, (viewRef.current.width) * fraction, 3);
    }
    ctx.restore();
    if (g.p?.whaleMount && g.currentState !== 'boxing') {
      ctx.save();
      ctx.font = 'bold 13px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillStyle = theme === 'dark' ? '#a6bdca' : '#344c73';
      ctx.fillText(`WHALE ${Math.max(0, Math.ceil(g.p.whaleMount.timer / 60))}s`, viewRef.current.width - viewRef.current.axisWidth - 12, feedLayout.current.tapeHeight + 8);
      ctx.restore();
    }
  }, [bossEncounter, theme, liveFeedEnabled]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.setTransform(ctx.canvas.width / viewRef.current.width, 0, 0, ctx.canvas.height / viewRef.current.height, 0, 0);
    const g = gameRef.current;
    const TAPE_HEIGHT = feedLayout.current.tapeHeight;
    const darkPalette = {
      bg: '#000000',
      grid: '#303640',
      text: '#d1d4dc',
      muted: '#969dab',
      veil: '#0c1119e8'
    };
    const lightPalette = {
      bg: '#ffffff',
      grid: '#d5dbe2',
      text: '#24364b',
      muted: '#52677d',
      veil: '#f5f8fced'
    };
    const palette = theme === 'dark' ? darkPalette : lightPalette;
    const heroIndex = Math.floor((g.currentState === 'menu' || !g.p ? 0 : g.p.x) / CW);
    // Rendering is a read: regime generation belongs to genCandle/update.
    const l = LEVELS[marketRegimeAt(g.marketRegimes, heroIndex)];

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, viewRef.current.width, viewRef.current.height);

    ctx.save();

    if (g.currentState === 'menu') {
      // Decorative only: the initial screen never advances physics or spawns.
      for (let i = 0; i < Math.min(g.C.length, Math.ceil((viewRef.current.width - viewRef.current.axisWidth) / CW)); i++) {
        const c = g.C[i];
        if (!c || c.hole) continue;
        const x = i * CW;
        const shift = viewRef.current.height * 0.58 - MARKET_BASELINE;
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
    ctx.rect(0, TAPE_HEIGHT, viewRef.current.width - viewRef.current.axisWidth, viewRef.current.height - TAPE_HEIGHT - viewRef.current.timeAxisHeight);
    ctx.clip();

    const renderMode = renderTestEnabled ? getRenderMode() : 'full';
    const layers = renderLayers(renderMode);
    const actors = actorLayers(renderMode);
    const visibleLeft = viewRef.current.left;
    const visibleRight = viewRef.current.right;
    const a = Math.floor((g.cx + visibleLeft) / CW) - 1;
    const b = Math.ceil((g.cx + visibleRight) / CW) + 2;
    if (layers.chart) {
      // Volume is anchored to the time axis outside the inverted world; gap slots draw none.
      for (let i = a; i <= b; i++) {
        const c = chartHistory(g.C, i);
        if (!c || c.hole) continue;
        const x = i * CW - g.cx + 1;
        const h = c.v * 54;
        ctx.fillStyle = (c.c < c.o ? GREEN : RED) + (c.sp ? 'bb' : '44');
        ctx.fillRect(x, viewRef.current.height - viewRef.current.timeAxisHeight - h, (CW - 3), h);
      }
    }


    if (g.invertedView && g.currentState !== 'boxing') {
      ctx.translate(0, TAPE_HEIGHT + viewRef.current.height - viewRef.current.timeAxisHeight);
      ctx.scale(1, -1);
    }



    if (layers.chart) {
    // Pixel-aligned fills keep moving grid lines at constant raster coverage.
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1 / viewRef.current.scale;
    for (let gridY = Math.floor(g.cy / 50) * 50; gridY < g.cy + viewRef.current.height; gridY += 50) {
      const y = gridY - g.cy;
      drawChartGridLine(ctx, viewRef.current.left, y,
        viewRef.current.right, y, theme === 'dark');
    }

    }
    // One set of visible ticks drives both grid lines and time-axis labels.
    ctx.save();
    ctx.font = `${viewRef.current.timeFontSize}px system-ui, monospace`;
    const tickPixels = CW;
    const tickStep = marketClockStep(tickPixels, ctx.measureText(marketClockLabel(g.candleOffset + b)).width + 18);
    ctx.restore();
    const timeTicks: { x: number; labelX: number; label: string }[] = [];
    for (let i = a; i <= b; i++) {
      if ((g.candleOffset + i) % tickStep !== 0) continue;
      const x = i * CW - g.cx;
      const labelX = x;
      if (labelX >= 0 && labelX < viewRef.current.width - viewRef.current.axisWidth) {
        timeTicks.push({ x, labelX, label: marketClockLabel(g.candleOffset + i) });
      }
    }

    // Temporarily project the boss encounter onto this chart, retaining the run.
    const encounter = bossEncounter.current;

    if (layers.chart) {
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1 / viewRef.current.scale;
    for (const { x } of timeTicks) {
        drawChartGridLine(ctx, x, -viewRef.current.height,
          x, viewRef.current.height * 2, theme === 'dark');
    }

    ctx.lineWidth = 1;
    for (let i = a; i <= b; i++) {
      const c = chartHistory(g.C, i);
      if (!c || g.printerTimer > 0) continue;

      if (c.hole) {
        continue;
      }

      const x = i * CW - g.cx;
      const col = c.c < c.o ? GREEN : RED;

      const previous = chartHistory(g.C, i - 1) ?? c;
      drawCandleDesign(ctx, cosmeticRef.current.candles, theme === 'dark', x + 1, CW - 3,
        candleGlyph(cosmeticRef.current.candles, c.o - g.cy, c.c - g.cy, c.h - g.cy, c.l - g.cy, previous.o - g.cy, previous.c - g.cy));

      if (c.sp) {
        ctx.fillStyle = theme === 'dark' ? '#ffe89b26' : '#edd57935';
        ctx.fillRect(x, TAPE_HEIGHT, CW, viewRef.current.height - TAPE_HEIGHT - viewRef.current.timeAxisHeight);
      }
    }

    if (g.printerTimer > 0 || (g.printerSaved && g.cx < g.printerEndX + 60)) {
      const first = Math.max(0, a);
      const last = Math.min((g.printerSaved?.length ?? 0) - 1, Math.ceil((g.cx + viewRef.current.right + viewRef.current.spawnMargin) / CW));
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
    }
    if (layers.actors) {
    {
      if (actors.pickups) drawPickups(ctx);
      if (actors.enemies) {
        drawSwans(ctx);
        drawAnimals(ctx);
      }
      for (const drop of actors.effects ? g.pigeonDrops : []) {
        const x = drop.x - g.cx, y = drop.y - g.cy;
        ctx.strokeStyle = theme === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(x, y - 5); ctx.stroke();
        ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#000000'; ctx.beginPath(); ctx.ellipse(x, y, 3.5, 6, -0.15, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Spinning briefcases use the same theme palette as the carried case.
    for (const bCase of !actors.effects ? [] : g.cases) {
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

      if (bCase.kind === 'debris') {
        ctx.scale(2.3, 2.3); drawDeskItem(ctx, bCase.item ?? 0);
        ctx.restore();
        continue;
      }

      if (bCase.skin === 'suitcase-diamond-hands') {
        // Rocket punch: knuckles first, with speed streaks, never spinning.
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.55)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        for (const y of [-5, 0, 5]) { ctx.beginPath(); ctx.moveTo(-32, y); ctx.lineTo(-16, y); ctx.stroke(); }
        ctx.scale(1, 1); drawGauntlet(ctx, theme === 'dark');
        ctx.restore();
        continue;
      }

      ctx.translate(-8, -7);
      drawEquippedBag(ctx, bCase.skin ?? cosmeticRef.current.suitcase, theme === 'dark');

      ctx.restore();
    }
    for (const hole of !actors.effects ? [] : g.blackHoles) {
      const k = hole.life / 40, r = 3 + 11 * Math.sin(Math.PI * k);
      ctx.save(); ctx.translate(hole.x - g.cx, hole.y - g.cy);
      ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 2, r * .5, -.3 + (1 - k) * 4, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#000'; ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    if (actors.effects && g.flyingFedora) {
      ctx.save();
      ctx.translate(g.flyingFedora.x - g.cx, g.flyingFedora.y - g.cy);
      ctx.scale(0.7, 0.7);
      drawSpinningEquippedHat(ctx, g.flyingFedora.angle, theme === 'dark', cosmeticRef.current.hats);
      ctx.restore();
    }

    for (const pop of !actors.effects ? [] : g.popups) {
      ctx.save();
      ctx.fillStyle = popupColor(pop.color, theme === 'dark');
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
      if (actors.hero && originalPlayer) {
        g.p = { ...originalPlayer, x: p.x, y: p.y, vy: p.vy, air: !p.grounded, ph: p.walkPhase };
        g.throwAnimTimer = p.throwTimer; g.apeTimer = 0;
        ctx.save();
        if (p.invulnerable && encounter.frame % 10 < 5) ctx.globalAlpha = 0.4;
        // Mirror the very same running model around its feet, not a substitute fighter.
        if (p.facing < 0) { ctx.translate(2 * (p.x - g.cx), 0); ctx.scale(-1, 1); }
        drawHero(ctx); ctx.restore();
        g.p = originalPlayer; g.throwAnimTimer = originalThrow; g.apeTimer = originalApes;
      }
      if (actors.enemies) {
        // Boss renderer includes its projectiles and effects as one group.
        ctx.save(); ctx.translate(-g.cx, -g.cy);
        drawBossEncounter(ctx, encounter, theme === 'dark', cosmeticRef.current.suitcase, cosmeticRef.current.hats); ctx.restore();
      }
    } else if (actors.hero) drawHero(ctx);
    if (actors.hero && g.p && !g.p.whaleMount && g.apeTimer > 0 && g.p.rocketTimer <= 0 && (g.hawkTimer <= 0 || g.falling)) {
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

    }
    ctx.restore();

    if (layers.chart && g.zeroCrash && g.p) {
      ctx.save();

      const x = g.zeroCrashIndex * CW - g.cx + 1;
      if (g.invertedView && !encounter) {
        ctx.translate(0, TAPE_HEIGHT + viewRef.current.height - viewRef.current.timeAxisHeight);
        ctx.scale(1, -1);
      }
      const top = g.zeroCrashTop - g.cy;
      const bottom = g.C[g.zeroCrashIndex]?.bot ?? g.zeroCrashTop;
      ctx.fillStyle = RED;
      // Render after the plot clip so the growing last candle also enters the bottom axis.
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

    // Time Axis (Bottom)
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, viewRef.current.height - viewRef.current.timeAxisHeight, viewRef.current.width, viewRef.current.timeAxisHeight);
    ctx.font = `${viewRef.current.timeFontSize}px system-ui, monospace`;
    ctx.fillStyle = palette.muted;
    ctx.textAlign = 'center';
    for (const { labelX, label } of timeTicks) {
      ctx.fillText(label, labelX, viewRef.current.height - 4 / viewRef.current.scale);
    }

    // Price Axis (Right)
    ctx.fillStyle = palette.bg;
    ctx.fillRect(viewRef.current.width - viewRef.current.axisWidth, TAPE_HEIGHT, viewRef.current.axisWidth, viewRef.current.height - TAPE_HEIGHT);
    ctx.strokeStyle = palette.grid;
    ctx.beginPath();
    ctx.moveTo(viewRef.current.width - viewRef.current.axisWidth, TAPE_HEIGHT);
    ctx.lineTo(viewRef.current.width - viewRef.current.axisWidth, viewRef.current.height);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = `bold ${viewRef.current.priceFontSize}px system-ui, monospace`;
    ctx.fillStyle = palette.muted;
    for (let gridY = Math.floor(g.cy / 50) * 50; gridY < g.cy + viewRef.current.height - viewRef.current.timeAxisHeight; gridY += 50) {
      const labelY = (plotViewY(gridY - g.cy, g.invertedView && !encounter, TAPE_HEIGHT, viewRef.current.height - viewRef.current.timeAxisHeight));
      if (labelY >= TAPE_HEIGHT + 8 && labelY < viewRef.current.height - viewRef.current.timeAxisHeight) ctx.fillText(price(gridY), viewRef.current.width - viewRef.current.axisWidth + 6 / viewRef.current.scale, labelY + 4 / viewRef.current.scale);
    }

    if (hc) {
      const col = hc.c < hc.o ? GREEN : RED;
      const y = (plotViewY(hc.c - g.cy, g.invertedView && !encounter, TAPE_HEIGHT, viewRef.current.height - viewRef.current.timeAxisHeight));
      ctx.fillStyle = col;
      ctx.fillRect(viewRef.current.width - viewRef.current.axisWidth, y - 12 / viewRef.current.scale, viewRef.current.axisWidth, 24 / viewRef.current.scale);
      ctx.fillStyle = '#fff';
      ctx.fillText(price(hc.c), viewRef.current.width - viewRef.current.axisWidth + 6 / viewRef.current.scale, y + 4 / viewRef.current.scale);
    }
    // Status tabs overlay the price axis too; it must not erase Bell hearts.
    if (hc) {
      ctx.font = '900 15px monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#08795c';
      {
        const label = 'PIPS: ';
        const value = totalScoreVal.toLocaleString();
        const text = `${label}${value}`;
        const bounds = canvasDisplay.current;
        const scoreZoom = mobileCanvasZoom();
        const scoreScaleX = Math.max(0.01, bounds.width / viewRef.current.width * scoreZoom);
        const scoreScaleY = Math.max(0.01, bounds.height / viewRef.current.height * scoreZoom);
        const mobileScore = feedLayout.current.mobile;
        const textScaleX = mobileScore ? scoreScaleY / scoreScaleX : 1;
        ctx.save();
        ctx.scale(textScaleX, 1);
        const scoreFontFamily = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
        const badgeScaleX = scoreScaleX * textScaleX;
        const badgeWidth = hudStripLayout.current.width / badgeScaleX;
        const badgePaddingX = Math.min(8, hudStripLayout.current.width * .1) / badgeScaleX;
        const maxScoreWidth = badgeWidth - badgePaddingX * 2;
        const baseFontSize = (hudStripLayout.current.stripHeight > 24 ? 16 : 14) / scoreScaleY;
        ctx.font = `900 ${baseFontSize}px ${scoreFontFamily}`;
        const baseMetrics = ctx.measureText(text);
        const baseWidth = Math.max(baseMetrics.width, baseMetrics.actualBoundingBoxLeft + baseMetrics.actualBoundingBoxRight);
        const fontSize = Math.min(baseFontSize, baseFontSize * maxScoreWidth / Math.max(1, baseWidth));
        const hudFont = `900 ${fontSize}px ${scoreFontFamily}`;
        ctx.font = hudFont;
        ctx.textBaseline = 'alphabetic';
        const metrics = ctx.measureText(label || value);
        const stripLeft = (hudStripLayout.current.left - bounds.width / 2 * (1 - scoreZoom)) / (scoreScaleX * textScaleX);
        const x = stripLeft + badgePaddingX + metrics.actualBoundingBoxLeft;
        // Compact header-attached tabs retain the shared action-button radius.
        const badgeHeight = hudStripLayout.current.stripHeight / scoreScaleY;
        // Header-hosted ticker sits outside this canvas: tabs start at its top edge.
        const badgeTop = headerFeedActive.current ? 0 : TAPE_HEIGHT;
        const y = badgeTop + (badgeHeight + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
        const badgeRadius = { x: hudStripLayout.current.radius / badgeScaleX, y: hudStripLayout.current.radius / scoreScaleY };
        const drawHudStrip = (left: number, top = badgeTop, stacked = false) => {
          ctx.fillStyle = theme === 'light' ? '#000000' : '#ffffff';
          ctx.beginPath();
          ctx.roundRect(
            left,
            top,
            badgeWidth,
            badgeHeight,
            stacked ? [0, 0, 0, 0] : [0, 0, badgeRadius, badgeRadius],
          );
          ctx.fill();
        };
        drawHudStrip(stripLeft, badgeTop, !!encounter);
        ctx.fillStyle = theme === 'light' ? '#54d3ac' : '#08795c';
        ctx.fillText(label, x, y);
        ctx.fillStyle = theme === 'light' ? '#54d3ac' : '#08795c';
        ctx.fillText(value, x + ctx.measureText(label).width, y);
        if (encounter) {
          const lives = Math.max(0, Math.min(3, encounter.player.lives));
          ctx.font = hudFont;
          const dividerHeight = 1 / scoreScaleY;
          const dividerTop = badgeTop + badgeHeight;
          const livesTop = dividerTop + dividerHeight;
          drawHudStrip(stripLeft, livesTop);
          ctx.fillStyle = theme === 'light' ? '#ffffff' : '#000000';
          ctx.fillRect(stripLeft, dividerTop, badgeWidth, dividerHeight);
          ctx.save();
          ctx.translate(stripLeft, livesTop);
          ctx.scale(1 / badgeScaleX, 1 / scoreScaleY);
          drawBellLives(ctx, lives, hudStripLayout.current.width, badgeHeight * scoreScaleY, 14, theme === 'dark');
          ctx.restore();
        }
        ctx.restore();
      }


    }

    ctx.restore();
    // Header feed and status chrome are drawn after the world clip.
    drawTopTickerTape(ctx);
    ctx.restore();
  }, [drawHero, drawPickups, drawSwans, drawAnimals, drawTopTickerTape, theme, bossEncounter, GREEN, RED]);

  const pressJump = useCallback(() => {
    const g = gameRef.current;
    if (g.printerTimer > 0) return;
    if (g.currentState === 'play' && g.p && !g.falling) {
      if (g.p.whaleMount) {
        if (jumpWhaleMount(g.p.whaleMount)) {
          g.p.vy = g.p.whaleMount.vy;
          g.p.air = true;
          g.p.buf = 0;
        }
        g.held = true;
        return;
      }
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

  // A remounted New Game must not replay an old Spawn Boss button request.
  const handledBossRequest = useRef(bossRequest);
  useLayoutEffect(() => {
    if (bossRequest > 0 && handledBossRequest.current !== bossRequest) {
      handledBossRequest.current = bossRequest;
      spawnBoss();
    }
  }, [bossRequest, spawnBoss]);

  const handledRevive = useRef(reviveRequest);
  const handledModePreview = useRef(0);
  useLayoutEffect(() => {
    if (!modePreview || handledModePreview.current === modePreview.serial) return;
    const g = gameRef.current;
    if (!g.p) return;
    handledModePreview.current = modePreview.serial;
    petFollower.current = null;
    petAttack.current = null; aimRef.current = null; g.held = false;
    jumpPointers.current.clear();
    if (g.printerSaved) { g.C = g.printerSaved.slice(); g.printerSaved = null; }
    bossEncounter.current = null;
    g.hawkTimer = 0; g.printerTimer = 0; g.printerRotation = 0; g.invertedView = false;
    g.p.rocketTimer = 0; g.p.whaleMount = undefined; g.falling = false; g.zeroCrash = false;
    petDeath.current = null;
    g.apes = []; g.apeTimer = 0; g.animals = []; g.swans = []; g.cases = [];
    g.flyingFedora = null; g.fedoraWindup = 0;
    g.fedoraTimer = 0; g.fedoraCount = 0; g.throwAnimTimer = 0; g.bagThrowAnimTimer = 0;
    g.p.carry = 0; g.p.shieldKind = undefined;
    g.pickups = []; g.pigeonDrops = []; g.popups = []; g.activeNews = null;
    // Start on solid nearby terrain; preview switches never strand a pet or companion.
    let index = Math.max(0, Math.min(g.C.length - 1, Math.floor(g.p.x / CW)));
    while (index > 0 && (!g.C[index] || g.C[index].hole)) index--;
    const ground = g.C[index]?.top ?? g.p.y;
    g.p.x = index * CW + CW / 2; g.p.y = ground; g.p.previousY = ground;
    g.p.vy = 0; g.p.air = false; g.p.jumps = 0;
    if (modePreview.mode === 'monkeys') {
      addCompanion(g.apes, APE_DURATION); addCompanion(g.apes, APE_DURATION);
      g.apeTimer = APE_DURATION;
    }
    if (modePreview.mode === 'dumpster') activateHawk();
    if (modePreview.mode === 'printer') activatePrinter();
    if (modePreview.mode === 'rocket') { g.p.rocketTimer = 420; g.p.air = true; }
    if (modePreview.mode === 'whale' || modePreview.mode === 'bull' || modePreview.mode === 'bear') {
      g.p.whaleMount = { kind: modePreview.mode, timer: WHALE_MOUNT_DURATION, feet: ground, previousFeet: ground, vy: 0, phase: 0, bags: 0 };
      g.p.y = ground - WHALE_SEAT_HEIGHT; g.p.previousY = g.p.y;
    }
    g.cx = g.p.x - heroCameraOffset(); g.cy = g.p.y - viewRef.current.heroY;
    g.currentState = 'play'; g.accumulator = 0; g.previousTime = 0;
    if (modePreview.mode === 'hat') {
      g.fedoraTimer = FEDORA_DURATION; g.fedoraCount = FEDORA_MAX_THROWS;
    }
    if (modePreview.mode === 'bell') spawnBoss();
    if (modePreview.mode === 'jerome' || modePreview.mode === 'paul' || modePreview.mode === 'janet') spawnBoss(modePreview.mode);
  }, [modePreview, bossEncounter, activateHawk, activatePrinter, spawnBoss]);
  useLayoutEffect(() => {
    if (reviveRequest === handledRevive.current) return;
    handledRevive.current = reviveRequest;
    petFollower.current = null;
    const g = gameRef.current;
    if (!g.p) return;
    if (g.printerSaved) { g.C = g.printerSaved.slice(); g.printerSaved = null; }
    bossEncounter.current = null;
    // Move only to adjacent safe terrain, preserving distance, PIPS and pickups.
    let index = Math.max(0, Math.min(g.C.length - 1, Math.floor(g.p.x / CW)));
    while (index > 0 && (!g.C[index] || g.C[index].hole || (g.zeroCrash && index >= g.zeroCrashIndex))) index--;
    const ground = g.C[index]?.top ?? g.p.y;
    g.p.x = index * CW + CW / 2; g.p.y = ground; g.p.previousY = ground; g.p.vy = 0;
    g.p.air = false; g.p.coy = 6; g.p.buf = 0; g.p.jumps = 0;
    // Existing diamond shield supplies a short grace period, without a currency reward.
    g.p.carry = 180; g.p.shieldKind = 'diamond'; g.p.rocketTimer = 0; g.p.whaleMount = undefined;
    g.cx = g.p.x - heroCameraOffset(); g.cy = ground - viewRef.current.heroY;
    g.falling = false; g.zeroCrash = false; g.fallFrame = 0; g.gapAirborne = false;
    petDeath.current = null;
    petAttack.current = null;
    g.printerTimer = 0; g.hawkTimer = 0; g.printerRotation = 0; g.invertedView = false;
    g.animals = []; g.swans = []; g.cases = []; g.spits = []; g.pigeonDrops = []; g.popups = [];
    g.currentState = 'play'; g.held = false; g.accumulator = 0; g.previousTime = 0;
  }, [reviveRequest, bossEncounter]);

  useLayoutEffect(() => {
    const g = gameRef.current;
    g.currentState = state;
    if (state === 'menu' || state === 'over') bossEncounter.current = null;
    if (state === 'over') g.printerTimer = 0;
    g.accumulator = 0;
    g.previousTime = 0;
    g.held = false;
    jumpPointers.current.clear();
  }, [state, bossEncounter]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (window.matchMedia('(orientation: portrait)').matches) return;
      // End-of-run decisions belong to App: never restart behind a result or confirmation dialog.
      if (gameRef.current.currentState === 'over' || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (gameRef.current.currentState === 'paused' && ['r', 'R'].includes(e.key)) return;
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
  }, [pressJump, releaseJump, throwBriefcase, togglePause, initGame, onStateChange, bossEncounter]);

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

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const { width, height } = renderBackingSize(bounds.width, bounds.height, viewRef.current.width, viewRef.current.height, window.devicePixelRatio || 1, window.matchMedia('(pointer: coarse)').matches);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      ctx.setTransform(width / viewRef.current.width, 0, 0, height / viewRef.current.height, 0, 0);
    };
    const resize = new ResizeObserver(resizeCanvas);
    resize.observe(canvas);
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    let needsDraw = true;
    const experiment = renderTestEnabled;
    let previousRenderMode = getRenderMode();
    const resetClock = () => {
      resetSimulationClock(gameRef.current);
      needsDraw = true;
    };
    document.addEventListener('visibilitychange', resetClock);

    const renderLoop = (now: number) => {
      if (disposed) return;
      if (document.hidden) {
        resetClock();
        animationFrameId = requestAnimationFrame(renderLoop);
        return;
      }
      const g = gameRef.current;
      const renderMode = experiment ? getRenderMode() : 'full';
      if (experiment && renderMode !== previousRenderMode) {
        // Clear once on transition, including the separate mobile feed canvas.
        ctx.clearRect(0, 0, viewRef.current.width, viewRef.current.height);
        const feed = headerFeedRef.current;
        if (feed) feed.getContext('2d')?.clearRect(0, 0, viewRef.current.width, viewRef.current.height);
        needsDraw = true;
        previousRenderMode = renderMode;
      }
      const simulationSteps = advanceSimulationClock(g, now, () => {
        if (petDeath.current && (g.currentState === 'play' || g.currentState === 'over')) {
          petDeath.current.frame = Math.min(180, petDeath.current.frame + 1);
        }
        // News animation is independent of gameplay and effect timers.
        if (!tickerPausedRef.current && !tickerHoverPausedRef.current && (g.currentState === 'play' || g.currentState === 'paused' || g.currentState === 'menu' || g.currentState === 'over')) {
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
      });

      // Draw once per simulation tick, even after a slow frame; skip duplicate high-refresh paints.
      const drawStarted = drawDiagnosticsEnabled ? performance.now() : 0;
      if (renderMode !== 'none' && (simulationSteps > 0 || needsDraw)) {
        loopCallbacks.current.draw(ctx);
        if (drawDiagnosticsEnabled) recordDrawDuration(g.currentState, performance.now() - drawStarted);
        needsDraw = false;
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrameId);
      resize.disconnect();
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('visibilitychange', resetClock);
    };
  }, [initGame]);

  return (
    <div className="game-stage relative w-full aspect-[1920/840] overflow-hidden select-none bg-[#0c111b] shadow-2xl">
      {renderTestEnabled && <RenderExperimentPanel />}
      <canvas
        ref={canvasRef}
        width={1920}
        height={840}
        tabIndex={0}
        onPointerMove={e => {
          const g = gameRef.current;
          const bounds = e.currentTarget.getBoundingClientRect();
          const canvasY = (e.clientY - bounds.top) / bounds.height * viewRef.current.height;
          tickerHoverPausedRef.current = !headerFeedActive.current && canvasY >= 0 && canvasY <= feedLayout.current.tapeHeight;
          aimRef.current = clientToWorld({ x: e.clientX, y: e.clientY }, bounds, viewRef.current,
            { x: g.cx, y: g.cy }, g.invertedView && g.currentState !== 'boxing', feedLayout.current.tapeHeight);
          if (bossEncounter.current) bossEncounter.current.aim = aimRef.current;
        }}
        onPointerLeave={() => { tickerHoverPausedRef.current = false; }}
        onPointerDown={e => {
          if (e.button !== 0) return;
          e.preventDefault(); e.currentTarget.focus();
          const g = gameRef.current;
          const bounds = e.currentTarget.getBoundingClientRect();
          if (g.currentState !== 'play') return;
          const inputX = (e.clientX - bounds.left) / bounds.width * viewRef.current.width;
          if (inputX < 0 || inputX >= viewRef.current.width - viewRef.current.axisWidth) return;
          if (isJumpZone(inputX, viewRef.current.width, viewRef.current.axisWidth)) {
            jumpPointers.current.add(e.pointerId);
            pressJump();
            e.currentTarget.setPointerCapture(e.pointerId);
            return;
          }
          aimRef.current = clientToWorld({ x: e.clientX, y: e.clientY }, bounds, viewRef.current,
            { x: g.cx, y: g.cy }, g.invertedView, feedLayout.current.tapeHeight);
          if (bossEncounter.current) {
            bossEncounter.current.aim = aimRef.current;
            bossEncounter.current.attackRequested = true;
          } else throwBriefcase();
        }}
        onPointerUp={e => { if (jumpPointers.current.delete(e.pointerId) && !jumpPointers.current.size) releaseJump(); }}
        onPointerCancel={e => { if (jumpPointers.current.delete(e.pointerId) && !jumpPointers.current.size) releaseJump(); }}
        onLostPointerCapture={e => { if (jumpPointers.current.delete(e.pointerId) && !jumpPointers.current.size) releaseJump(); }}
        className="block w-full h-full touch-none cursor-crosshair outline-none focus-visible:ring-2 focus-visible:ring-[#55d6ae]"
        aria-label="Candlestick runner canvas"
      />


    </div>
  );
};
