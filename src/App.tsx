import { readyQuests } from './quests';
import { MonthlySqueezeHome, MonthlySqueezeAchievement, SQUEEZE_REWARD_ID } from './MonthlySqueezeHome';
import { DesktopHome } from './DesktopHome';
import { AboutStar } from './AboutStar';
import { PromoCode } from './PromoCode';
import { useBootReady } from './useBootReady';
import { useCompactBrowser } from './useCompactBrowser';
import { DesktopMenuChart } from './DesktopMenuChart';
import { DesktopSiteFooter } from './DesktopSiteFooter';
import { BrowserAccount } from './BrowserAccount';
import { signOutBrowserGoogle, type BrowserUser } from './browserIdentity';
import { prefetchFriends, type FriendlyRacePreview, type FriendsTestMode } from './CommunityPreview';
import { ActionLabel, BadgeLabel } from './ActionLabel';
import { CloseButton } from './CloseButton';
import { MechanicsGuide } from './MechanicsGuide';
import { HatFitGallery } from './HatFitGallery';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { useMobileDialogFit } from './useMobileDialogFit';
import { observeViewportHeight } from './viewportHeight';
import { MenuChart } from './MenuChart';
import { LandingScore } from './LandingScore';
import { MobileDiagnostics } from './MobileDiagnostics';
import type { BossArena } from './boxingRules';
import { createRunStartGate } from './runStartGate';
import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { GameState } from './types';
import { CandleGame, mobileCanvasZoom } from './CandleGame';
import { AssetPreview } from './AssetPreview';
import { sound } from './audio';
import { useDeviceVolume, usesDeviceVolume } from './deviceVolume';
import { SoundMenu } from './SoundMenu';
import { LiquidatedBackdrop } from './LiquidatedBackdrop';
import { ShareDD } from './ShareDD';
import { SiteFooter } from './SiteFooter';
import type { SiteSection } from './SiteFooter';
import { sharedScore, sharedChallenge } from './shareLinks';
import { Pause, Play, Settings, Trophy, Crown, Gift, Maximize, Minimize, LogOut, X, Bell } from 'lucide-react';
import { Loot } from './Loot';
import { countLootRewards, dailyLootReward } from './lootRewards';
import { Exchange, CurrencyFooter, WalletBar, captureCurrencyOrigins, type CurrencyCollectionOrigins } from './Exchange';
import { Achievements } from './Achievements';
import { Leaderboard, dailyLeaderboardRank } from './Leaderboard';
import { PET_IDS } from './petRenderer';
import { PREVIEW_MODES, type ModePreviewRequest, type PreviewMode } from './petPose';
import { useProgression } from './useProgression';
import { connectionMessage } from './connectionPresentation';
import { PracticeKillsHud, type RunKills } from './PracticeKillsHud';
import { ReviveCountdown } from './ReviveCountdown';
import { BOOT_FINISH_MS } from './bootProgress';
import { LegalConsent, legalAccepted } from './LegalConsent';
// Terms and Privacy belong to the Android app; ?legalPreview=1 shows the dialog in development.
const legalRequired = () => Capacitor.isNativePlatform() || (import.meta.env.DEV && new URLSearchParams(window.location.search).get('legalPreview') === '1');
import { canReward, claimableAchievements, emptyWallet, readProgress, skinColors, SKINS, type GameEvent } from './progression';
import { getLeaderboard, leaderboardConfigured, rewardedServicesAvailable } from './playerServices';

// No app is published: mobile uses the browser rules (portrait placeholder, fullscreen on rotation).
const nativePresentation = () => Capacitor.isNativePlatform();
const notFoundPage = document.documentElement.dataset.notFound === 'true';
// Shown in the Live Feed of the 404 page: the game itself still works, as a Guest.
const PAGE_NOT_FOUND_MESSAGE = 'PAGE NOT FOUND. YOU CAN STILL PLAY OFFLINE.';
// Home with no connection: the Live Feed shows only this, everything else keeps working as Guest.
const OFFLINE_HOME_MESSAGE = 'NO CONNECTION. YOU CAN STILL PLAY OFFLINE AS GUEST.';

export default function App() {
  const [mobileDevice, setMobileDevice] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  const [state, setState] = useState<GameState>('menu');
  const player = useProgression();
  const [browserUser, setBrowserUser] = useState<BrowserUser | null>(null);
  const [accountMenuError, setAccountMenuError] = useState('');
  const [fullscreenError, setFullscreenError] = useState('');
  const [signInNotice, setSignInNotice] = useState('');
  // Short notices (the fullscreen hint, sign-in and save errors) go to the Live Feed bar. They take no space in the layout
  // and give way to the news again after a few seconds. Screen readers still get the text as an alert below.
  const noticeSource = fullscreenError || accountMenuError || signInNotice || (player.error && !player.busy ? player.error : '');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    setNotice(noticeSource);
    if (!noticeSource) return;
    const timer = setTimeout(() => { setNotice(''); setFullscreenError(''); }, 8000);
    return () => clearTimeout(timer);
  }, [noticeSource]);
  const accountSession = !!browserUser && !notFoundPage;
  // Signed in uses the Drive save, Guest the local game; both read the same progress.
  const outfit = player.progress.equipped;
  const [exchangeFocus, setExchangeFocus] = useState<{ tab: 'mounts'; skin: string } | null>(null);
  const squeezeSave = { owned: player.progress.owned.includes(SQUEEZE_REWARD_ID), owns: player.ownsItem, grant: player.claimMonthly,
    // The Home card points at its reward in Exchange.
    open: () => { if (player.onlineReady && player.networkOnline && !player.busy) { setExchangeFocus({ tab: 'mounts', skin: SQUEEZE_REWARD_ID }); setExchangeOpen(true); } } };
  const signOutAccount = () => void signOutBrowserGoogle().then(() => { setExchangeOpen(false); setAccountMenuError(''); }, () => setAccountMenuError('Could not sign out. Please retry.'));
  useEffect(() => {
    setAccountMenuError('');
  }, [browserUser?.uid]);
  // The boot screen stays up just long enough for the briefcase to reach the end of its track.
  const bootReady = useBootReady();
  const booting = state === 'menu' && (!bootReady || (player.networkOnline && (player.connecting || (player.busy && !player.onlineReady))));
  const [bootFinishing, setBootFinishing] = useState(false);
  const [legalConfirmed, setLegalConfirmed] = useState(() => !legalRequired() || legalAccepted());
  const wasBooting = useRef(booting);
  // Layout effect: the finishing flight starts in the same frame, so the boot screen never blinks away.
  useLayoutEffect(() => {
    if (wasBooting.current && !booting) {
      setBootFinishing(true);
      const timer = setTimeout(() => setBootFinishing(false), BOOT_FINISH_MS);
      wasBooting.current = booting;
      return () => clearTimeout(timer);
    }
    wasBooting.current = booting;
  }, [booting]);
  const pendingAchievements = claimableAchievements(player.progress).length;
  const [exchangeOpen, setExchangeOpen] = useState(() => import.meta.env.DEV && new URLSearchParams(window.location.search).get('exchangePreview') === 'unowned');
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [lootOpen, setLootOpen] = useState(false);
  const [raceTarget, setRaceTarget] = useState<FriendlyRacePreview | null>(null);
  const raceRunId = useRef<string | null>(null);
  const [friendsMode, setFriendsMode] = useState<FriendsTestMode>('default');
  const [friendlyWins, setFriendlyWins] = useState<FriendlyRacePreview[]>([]);
  useEffect(() => { setRaceTarget(null); raceRunId.current = null; setFriendlyWins([]); setFriendsMode('default'); }, [player.googlePlayer?.playerId]);
  useEffect(() => { if (player.onlineReady && player.networkOnline && player.googlePlayer?.playerId) prefetchFriends(player.googlePlayer.playerId); }, [player.onlineReady, player.networkOnline, player.googlePlayer?.playerId]);
  useEffect(() => {
    if (!raceTarget) return;
    const run = player.progress.run;
    if (run?.status === 'playing' && !raceRunId.current) raceRunId.current = run.id;
    if (run?.id !== raceRunId.current || run?.status !== 'finished') return;
    if (raceTarget.reward > 0 && !player.practiceRun && !player.connectionLostRun && player.networkOnline && Math.round(run.ath) > raceTarget.score) {
      setFriendlyWins(previous => previous.some(friend => (friend.id ?? friend.name) === (raceTarget.id ?? raceTarget.name) && friend.score === raceTarget.score) ? previous : [...previous, raceTarget]);
    }
    setRaceTarget(null); raceRunId.current = null;
  }, [raceTarget, player.progress.run, player.practiceRun, player.connectionLostRun, player.networkOnline]);
  useEffect(() => {
    if (lootOpen) void player.refreshTournamentRewards().catch(() => {});
    if (lootOpen) void player.refreshQuestWeek();
  }, [lootOpen, player.refreshTournamentRewards, player.refreshQuestWeek]);
  const pendingLootRewards = countLootRewards(dailyLootReward, readyQuests(player.progress, player.questWeek).map(q => ({ id: q.id, claimable: true })));
  const [leaderboardOpen, setLeaderboardOpen] = useState(() => import.meta.env.DEV && new URLSearchParams(window.location.search).get('leaderboardPreview') === 'claim');
  const previewDailyRank = dailyLeaderboardRank(import.meta.env.DEV && new URLSearchParams(window.location.search).get('leaderboardPreview') === 'claim');
  const [onlineDailyRank, setOnlineDailyRank] = useState<number | null>(null);
  const dailyRank = !leaderboardConfigured() && import.meta.env.DEV ? previewDailyRank : onlineDailyRank ?? '—';
  useEffect(() => {
    let active = true;
    setOnlineDailyRank(null);
    if (!player.googlePlayer || !leaderboardConfigured()) return;
    void getLeaderboard(player.googlePlayer.playerId, 'daily').then(board => { if (active) setOnlineDailyRank(board.self && board.self.rank > 0 ? board.self.rank : null); }).catch(() => {});
    return () => { active = false; };
  }, [player.googlePlayer?.playerId, leaderboardOpen]);
  // A development layout preview is not authentication or reward authorization.
  const exchangeAvailable = player.onlineReady && player.networkOnline;
  const practiceUI = state === 'menu' ? !player.onlineReady : player.practiceRun;
  const feedMessage = notice ? notice.toUpperCase()
    : state === 'menu' && !player.networkOnline && !Capacitor.isNativePlatform() ? OFFLINE_HOME_MESSAGE
    : notFoundPage && state === 'menu' ? PAGE_NOT_FOUND_MESSAGE
    : !player.networkOnline && state !== 'menu' && !player.practiceRun ? 'NO INTERNET CONNECTION'
    : !Capacitor.isNativePlatform() ? (!player.networkOnline ? 'OFFLINE: PROGRESS IS NOT SAVED' : '')
    : player.networkOnline && player.connecting ? 'CONNECTING'
    : state === 'menu' ? connectionMessage(player.networkOnline, false, player.onlineReady, false) : '';
  useEffect(() => {
    // Reconnect during Practice is applied only after returning Home, never mid-run.
    if (state === 'menu') player.restoreProfile();
  }, [state, player.networkOnline, player.restoreProfile]);
  const [reviveRequest, setReviveRequest] = useState(0);
  const [resultStage, setResultStage] = useState<'decision' | 'collected'>('decision');
  const stashPanel = useRef<HTMLDivElement>(null);
  const collectionOrigins = useRef<CurrencyCollectionOrigins>({});
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [finishingHome, setFinishingHome] = useState(false);
  // Pause and game over: the panel's bottom edge is published to CSS for the currency bar.
  useLayoutEffect(() => {
    if (state === 'menu') return;
    const overlay = appRef.current?.querySelector<HTMLElement>('.game-overlay');
    const result = overlay?.querySelector<HTMLElement>('.game-result');
    if (!overlay || !result) return;
    const sync = () => overlay.style.setProperty('--result-bottom', `${result.getBoundingClientRect().bottom - overlay.getBoundingClientRect().top}px`);
    const observer = new ResizeObserver(sync);
    observer.observe(result); observer.observe(overlay);
    sync();
    return () => observer.disconnect();
  }, [state, resultStage, practiceUI, finishingHome]);
  const [runKills, setRunKills] = useState<RunKills>({ bull: 0, bear: 0 });
  const handleGameEvent = useCallback((event: GameEvent) => {
    if (event.type === 'kill' && (event.enemy === 'bull' || event.enemy === 'bear')) {
      const enemy = event.enemy;
      setRunKills(previous => ({ ...previous, [enemy]: previous[enemy] + 1 }));
    }
    player.command(event);
  }, [player.command]);
  const [landingScore] = useState(() => sharedScore(window.location.search));
  const [incomingChallenge] = useState(() => sharedChallenge(window.location.search));
  const mobilePlaying = mobileDevice && (state === 'play' || state === 'boxing');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return localStorage.getItem('cr_theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const deviceVolume = useDeviceVolume();
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem('cr_sound_enabled') !== 'false'; } catch { return true; }
  });
  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('cr_volume');
      const value = saved === null ? 100 : Number(saved);
      return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 100;
    } catch { return 100; }
  });
  const [animationsEnabled, setAnimationsEnabled] = useState(() => {
    try { return localStorage.getItem('cr_animations') !== 'false'; } catch { return true; }
  });
  useEffect(() => {
    sound.setVolume(usesDeviceVolume() ? 1 : volume / 100);
    try { localStorage.setItem('cr_volume', String(volume)); } catch { }
  }, [volume]);
  useEffect(() => {
    try { localStorage.setItem('cr_animations', String(animationsEnabled)); } catch { }
  }, [animationsEnabled]);
  const changeVolume = (value: number) => {
    setVolume(value);
    setSoundEnabled(value > 0);
    sound.setVolume(value / 100);
    sound.enabled = value > 0;
    if (value > 0) sound.unlock();
  };
  const [liveFeedPaused, setLiveFeedPaused] = useState(() => {
    try { return localStorage.getItem('cr_live_feed_paused') === 'true'; } catch { return false; }
  });
  // Sideways phone with the browser bars showing: no Live Feed bar, to give the game the height. Notices move to the header.
  const compactBrowser = useCompactBrowser(mobileDevice && !nativePresentation());
  const liveFeedVisible = !compactBrowser;
  useEffect(() => {
    sound.enabled = usesDeviceVolume() || soundEnabled;
    try { localStorage.setItem('cr_sound_enabled', String(soundEnabled)); } catch { }
  }, [soundEnabled]);
  useEffect(() => {
    try {
      localStorage.setItem('cr_live_feed_paused', String(liveFeedPaused));
      localStorage.removeItem('cr_live_feed');
    } catch { }
  }, [liveFeedPaused]);
  const [highContrast, setHighContrast] = useState(() => {
    try { return localStorage.getItem('cr_high_contrast') === 'true'; } catch { return false; }
  });
  const [boxingPaused, setBoxingPaused] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.highContrast = String(highContrast);
    try { localStorage.setItem('cr_high_contrast', String(highContrast)); } catch { }
  }, [highContrast]);
  useEffect(() => {
    const pause = () => {
      setState(current => current === 'play' ? 'paused' : current);
      if (state === 'boxing') setBoxingPaused(true);
    };
    const visibility = () => { if (document.hidden) pause(); };
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [state]);
  useEffect(() => { if (state !== 'boxing') setBoxingPaused(false); }, [state]);
  const resetDefaults = () => {
    setTheme('light');
    changeVolume(100);
    setLiveFeedPaused(false);
    setAnimationsEnabled(true);
    setHighContrast(false);
  };
  const [soundMenuOpen, setSoundMenuOpen] = useState(false);
  const [pausedGuideOpen, setPausedGuideOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  // Mobile: the guide is a full-screen dialog; desktop keeps the in-game section.
  const openGuide = () => { if (mobileDevice) setMobileGuideOpen(true); else setPausedGuideOpen(true); };
  // Desktop only: Space starts and continues the game, so buttons show the key.
  const spaceKey = mobileDevice ? null : <svg className="new-game-space-key" viewBox="0 0 36 6" aria-hidden="true" focusable="false"><path d="M1 1V5H35V1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  const [mobileGuideOpen, setMobileGuideOpen] = useState(false);
  const [hatFitOpen, setHatFitOpen] = useState(false);
  const [shareDDOpen, setShareDDOpen] = useState(false);
  const [siteSection, setSiteSection] = useState<SiteSection | null>(null);
  const appRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (appRef.current) return observeViewportHeight(appRef.current);
  }, []);
  useMobileDialogFit(appRef);
  useLayoutEffect(() => {
    const app = appRef.current;
    const logo = app?.querySelector('.stonktrooper-logo');
    if (!app || !logo) return;
    const sync = () => {
      const rect = logo.getBoundingClientRect();
      if (rect.width === 0) return; // hidden in fullscreen: keep the last measurement
      const inset = Math.max(0, rect.left - app.getBoundingClientRect().left);
      app.style.setProperty('--home-logo-width', `${rect.width}px`);
      app.style.setProperty('--home-logo-inset', `${inset}px`);
    };
    const observer = new ResizeObserver(sync);
    observer.observe(logo);
    window.addEventListener('resize', sync);
    sync();
    return () => { observer.disconnect(); window.removeEventListener('resize', sync); };
  }, []);
  useEffect(() => {
    const app = appRef.current;
    const arena = app?.querySelector('.game-arena');
    if (!app || !arena) return;
    const footer = app.querySelector<HTMLElement>('.site-footer');
    const fullscreenControl = app.querySelector<HTMLElement>('.desktop-fullscreen-control');
    const themeControl = app.querySelector<HTMLElement>('.mobile-header-theme-control');
    const header = app.querySelector('header');
    const updateFeedBoundary = () => {
      const canvas = app.querySelector('.game-stage > canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const headerHeight = header?.getBoundingClientRect().height ?? 0;
      app.style.setProperty('--live-feed-bar-height', `${headerHeight}px`);
      const fullscreenIcon = fullscreenControl?.querySelector('svg');
      if (header && fullscreenIcon && fullscreenIcon.getBoundingClientRect().width > 0) {
        const iconRect = fullscreenIcon.getBoundingClientRect();
        const bounds = fullscreenIcon.getBBox();
        const viewBox = fullscreenIcon.viewBox.baseVal;
        const scale = iconRect.width / viewBox.width;
        const stroke = parseFloat(getComputedStyle(fullscreenIcon).strokeWidth) || 0;
        const paintedRight = iconRect.left + (bounds.x + bounds.width + stroke / 2 - viewBox.x) * scale;
        const edgeInset = `${Math.max(0, header.getBoundingClientRect().right - paintedRight)}px`;
        if (app.style.getPropertyValue('--content-edge-inset') !== edgeInset) {
          app.style.setProperty('--content-edge-inset', edgeInset);
          app.dispatchEvent(new Event('hudlayoutchange'));
        }
        const logo = app.querySelector('.stonktrooper-logo');
        if (logo) {
          app.style.setProperty('--home-logo-inset', `${Math.max(0, logo.getBoundingClientRect().left - app.getBoundingClientRect().left)}px`);
        }
      }
      const headerFeed = Array.from(app.querySelectorAll('.mobile-header-feed, .desktop-live-feed')).find(feed => feed.getBoundingClientRect().width > 0);
      const desktopFeed = app.querySelector('.desktop-live-feed-bar');
      app.style.setProperty('--desktop-feed-bottom', `${desktopFeed && desktopFeed.getBoundingClientRect().height > 0 ? desktopFeed.getBoundingClientRect().bottom : rect.top}px`);
      const feedInHeader = !!headerFeed && headerFeed.getBoundingClientRect().width > 0;
      const feedHeight = !liveFeedVisible || feedInHeader ? 0 : headerHeight > 0 ? headerHeight : rect.height * 48 / 840 * mobileCanvasZoom();
      app.style.setProperty('--live-feed-bottom', `${rect.top + feedHeight}px`);
      app.style.setProperty('--live-feed-height', `${feedHeight}px`);
      const footerRect = footer?.getBoundingClientRect();
      const footerVisible = !!footerRect && footerRect.height > 0
        && !!footer && window.getComputedStyle(footer).display !== 'none'
        && footerRect.top < window.innerHeight;
      const footerInsetBottom = footerVisible && footerRect ? Math.max(0, window.innerHeight - footerRect.top) : 0;
      app.style.setProperty('--footer-inset-bottom', `${footerInsetBottom}px`);
      // Measure the shell itself, since fixed containing blocks may differ from the visual viewport.
      const guideBottom = footerVisible && footerRect ? footerRect.top : app.getBoundingClientRect().bottom;
      app.style.setProperty('--guide-available-height', `${Math.max(0, guideBottom - rect.top - feedHeight)}px`);
      const fullscreenRect = fullscreenControl?.getBoundingClientRect();
      if (fullscreenRect && fullscreenRect.width > 0 && fullscreenRect.height > 0) {
        app.style.setProperty('--fullscreen-control-width', `${fullscreenRect.width}px`);
        app.style.setProperty('--fullscreen-control-height', `${fullscreenRect.height}px`);
        app.style.setProperty('--fullscreen-control-right', `${Math.max(0, window.innerWidth - fullscreenRect.right)}px`);
        app.style.setProperty('--fullscreen-control-bottom', `${fullscreenRect.bottom}px`);
      }
      const themeRect = themeControl?.getBoundingClientRect();
      if (themeRect && themeRect.width > 0 && themeRect.height > 0) {
        app.style.setProperty('--mobile-theme-control-right', `${Math.max(0, window.innerWidth - themeRect.right)}px`);
      }
    };
    let boundaryFrame = 0;
    const scheduleBoundary = () => {
      if (!boundaryFrame) boundaryFrame = requestAnimationFrame(() => {
        boundaryFrame = 0;
        updateFeedBoundary();
      });
    };
    const observer = new ResizeObserver(scheduleBoundary);
    observer.observe(arena);
    observer.observe(app);
    if (footer) observer.observe(footer);
    if (fullscreenControl) observer.observe(fullscreenControl);
    if (themeControl) observer.observe(themeControl);
    if (header) observer.observe(header);
    const mutationObserver = new MutationObserver(scheduleBoundary);
    mutationObserver.observe(app, { childList: true, subtree: true });
    window.addEventListener('resize', scheduleBoundary);
    document.addEventListener('fullscreenchange', scheduleBoundary);
    window.addEventListener('scroll', scheduleBoundary, true);
    window.visualViewport?.addEventListener('resize', scheduleBoundary);
    window.visualViewport?.addEventListener('scroll', scheduleBoundary);
    updateFeedBoundary();
    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      cancelAnimationFrame(boundaryFrame);
      window.removeEventListener('resize', scheduleBoundary);
      document.removeEventListener('fullscreenchange', scheduleBoundary);
      window.removeEventListener('scroll', scheduleBoundary, true);
      window.visualViewport?.removeEventListener('resize', scheduleBoundary);
      window.visualViewport?.removeEventListener('scroll', scheduleBoundary);
    };
  }, [liveFeedVisible, mobilePlaying]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mobileStartPending = useRef(false);
  const runStartGate = useRef(createRunStartGate());
  const [startingRun, setStartingRun] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)');
    const sync = () => setMobileDevice(media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    let wasFullscreen = document.fullscreenElement === appRef.current;
    const syncFullscreen = () => {
      if (nativePresentation()) return;
      const fullscreen = document.fullscreenElement === appRef.current;
      setIsFullscreen(fullscreen);
      if (fullscreen && window.matchMedia('(pointer: coarse)').matches) {
        const orientation = screen.orientation as ScreenOrientation & { lock?: (value: 'landscape') => Promise<void> };
        void orientation?.lock?.('landscape').catch(() => { /* Manual rotation remains available without a warning. */ });
      }
      if (wasFullscreen && !fullscreen && window.matchMedia('(pointer: coarse)').matches) {
        const orientation = screen.orientation as ScreenOrientation & { unlock?: () => void };
        try { orientation?.unlock?.(); } catch { }
        setState(current => current === 'play' ? 'paused' : current);
      }
      wasFullscreen = fullscreen;
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  useEffect(() => {
    if (nativePresentation()) return;
    let wasLandscape = window.innerWidth > window.innerHeight;
    let awaitingGesture = window.matchMedia('(pointer: coarse)').matches && wasLandscape;
    let requesting = false;
    let rotationTimers: ReturnType<typeof setTimeout>[] = [];
    const clearRotationTimers = () => { rotationTimers.forEach(clearTimeout); rotationTimers = []; };
    const enter = async () => {
      if (requesting || document.fullscreenElement || !appRef.current?.requestFullscreen) return;
      requesting = true;
      awaitingGesture = false;
      try {
        await appRef.current.requestFullscreen();
        setFullscreenError('');
        const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: 'landscape') => Promise<void> };
        try { await orientation?.lock?.('landscape'); } catch { /* Manual rotation remains available. */ }
      } catch {
        // Retry fullscreen on a tap after rotation, but never re-enter after an explicit exit.
        awaitingGesture = true;
        setFullscreenError('Tap Fullscreen to enter landscape fullscreen.');
      } finally { requesting = false; }
    };
    const rotate = () => {
      if (!window.matchMedia('(pointer: coarse)').matches) return;
      const landscape = window.innerWidth > window.innerHeight;
      if (landscape && !wasLandscape) {
        clearRotationTimers();
        awaitingGesture = true;
        void enter();
        // Retry only within this rotation, never after an explicit fullscreen exit.
        rotationTimers = [150, 400, 800].map(delay => setTimeout(() => {
          if (awaitingGesture && window.innerWidth > window.innerHeight) void enter();
        }, delay));
      }
      if (!landscape) { awaitingGesture = false; clearRotationTimers(); }
      wasLandscape = landscape;
    };
    const tap = (event: Event) => {
      // Start and fullscreen controls already make their own activation-bound request.
      if (event.target instanceof Element && event.target.closest('.desktop-fullscreen-control, .landing-menu-play-button, .landing-menu-guest-button, .continue-run, a, input')) return;
      if (awaitingGesture && window.innerWidth > window.innerHeight) void enter();
    };
    const fullscreenChanged = () => {
      clearRotationTimers();
      awaitingGesture = false;
    };
    window.addEventListener('resize', rotate);
    screen.orientation?.addEventListener('change', rotate);
    window.visualViewport?.addEventListener('resize', rotate);
    window.addEventListener('pointerup', tap, true);
    window.addEventListener('click', tap, true);
    document.addEventListener('fullscreenchange', fullscreenChanged);
    return () => {
      clearRotationTimers();
      window.removeEventListener('resize', rotate);
      screen.orientation?.removeEventListener('change', rotate);
      window.visualViewport?.removeEventListener('resize', rotate);
      window.removeEventListener('pointerup', tap, true);
      window.removeEventListener('click', tap, true);
      document.removeEventListener('fullscreenchange', fullscreenChanged);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (nativePresentation()) return;
    setFullscreenError('');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (appRef.current?.requestFullscreen) await appRef.current.requestFullscreen();
      else setFullscreenError('Fullscreen is not supported by this browser.');
    } catch {
      setFullscreenError('Unable to open fullscreen. Try again or check browser permissions.');
    }
  };

  useEffect(() => { if (state !== 'over') setShareDDOpen(false); }, [state]);
  useEffect(() => {
    if (state === 'play' || state === 'boxing') {
      setSiteSection(null);
      setAchievementsOpen(false);
    }
  }, [state]);
  const [gameKey, setGameKey] = useState<number>(0);
  const [printerRequest, setPrinterRequest] = useState(0);
  const [invertedRequest, setInvertedRequest] = useState(0);
  const [hawkRequest, setHawkRequest] = useState(0);
  const [candleDemo, setCandleDemo] = useState(false);
  const [whaleDemo, setWhaleDemo] = useState(false);
  const [modePreview, setModePreview] = useState<ModePreviewRequest>();
  const [previewPet, setPreviewPet] = useState<string>();
  useEffect(() => { setPreviewPet(undefined); }, [outfit.pets]);
  const previewModeLabels: Record<PreviewMode, string> = { normal: 'Normal', dumpster: 'Dumpster', whale: 'Whale mount', bull: 'Bull mount', bear: 'Bear mount', rocket: 'Rocket', printer: 'Printer', monkeys: 'Monkeys', hat: 'Hat weapon', jerome: 'Bell: Jerome', paul: 'Bell: Paul', janet: 'Bell: Janet' };
  const startModePreview = (mode: ModePreviewRequest['mode']) => {
    if (confirmFinish) return;
    sound.unlock(); setSiteSection(null); setExchangeOpen(false); setAchievementsOpen(false);
    setMobileGuideOpen(false); setPausedGuideOpen(false); setSoundMenuOpen(false);
    boxingActive.current = false; bossEncounter.current = null;
    setWhaleDemo(false); setCandleDemo(false); setHawkRequest(0); setPrinterRequest(0); setInvertedRequest(0);
    setPreviewPet(current => current ?? outfit.pets);
    if (state === 'menu' || state === 'over') { setCurrentResult(0); setGameKey(key => key + 1); }
    setModePreview(current => ({ mode, serial: (current?.serial ?? 0) + 1 }));
    setState('play');
  };
  const [currentResult, setCurrentResult] = useState(0);
  const [newAllTimeHigh, setNewAllTimeHigh] = useState(false);
  const runPreviousBest = useRef(player.progress.bestAth);
  const boxingActive = useRef(false);
  const bossEncounter = useRef<BossArena | null>(null);
  const [bossRequest, setBossRequest] = useState(0);

  const handleStateChange = useCallback((nextState: GameState) => {
    if (confirmFinish && nextState === 'play') return;
    if (boxingActive.current) return;
    if (nextState === 'boxing') boxingActive.current = true;
    setState(nextState);
  }, [confirmFinish]);

  const stats = useRef({
    currentPrice: 0,
    totalScore: 0,
    score: 0,
    coins: 0,
    diamonds: 0,
    banknotes: 0,
    swanHits: 0,
    animalHits: 0,
    regime: 'NORMAL',
    cycle: 1,
    cycleProgress: 0,
    isDiamondHands: false,
    diamondRemainingFrames: 0,
    isRocketMode: false,
    rocketRemainingFrames: 0
  });


  // Theme synchronization
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const favicon = document.getElementById('favicon') as HTMLLinkElement | null;
    if (favicon) {
      favicon.type = 'image/png';
      favicon.href = `${import.meta.env.BASE_URL}images/${theme === 'dark' ? 'tab-icon-inverted-48.png' : 'tab-icon-48.png'}`;
    }
    try {
      localStorage.setItem('cr_theme', theme);
    } catch { }
  }, [theme]);

  const toggleSound = () => {
    if (usesDeviceVolume()) { deviceVolume.changeVolume(deviceVolume.volume === 0 ? 50 : 0); return; }
    const next = !soundEnabled || volume === 0;
    if (next && volume === 0) setVolume(100);
    setSoundEnabled(next);
    sound.enabled = next;
    if (next) sound.unlock();
  };

  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      // Let the gallery handle focus and Escape before gameplay or portrait keyboard guards.
      if (hatFitOpen || leaderboardOpen || lootOpen) return;
      if (achievementsOpen && event.key !== 'Tab' && event.key !== 'Enter') {
        if (event.key === 'Escape') setAchievementsOpen(false);
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      if (confirmFinish || (state === 'over' && [' ', 'x', 'w', 'arrowup', 'r', 'escape'].includes(event.key.toLowerCase()))
        || (state === 'paused' && event.key.toLowerCase() === 'r')) {
        if (confirmFinish && event.key === 'Escape') setConfirmFinish(false);
        if (!confirmFinish || [' ', 'x', 'w', 'arrowup', 'r', 'p', 'h', 'escape'].includes(event.key.toLowerCase())) {
          event.preventDefault(); event.stopImmediatePropagation(); return;
        }
      }
      if (window.matchMedia('(orientation: portrait)').matches) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [role="dialog"]')) return;
      const key = event.key.toLowerCase();
      if (!['h', 'p', 'm', 'f', 'n'].includes(key)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (key === 'm') toggleSound();
      if (key === 'f') void toggleFullscreen();
      if (key === 'n') setTheme(current => current === 'dark' ? 'light' : 'dark');
      if (key === 'escape' && mobileGuideOpen) setMobileGuideOpen(false);
      if (key === 'h' && state === 'play') setState('paused');
      if (key === 'p' && !finishingHome && !confirmFinish && !pausedGuideOpen && !soundMenuOpen && !exchangeOpen && !achievementsOpen && !siteSection && !mobileGuideOpen) {
        setState(current => current === 'play' ? 'paused' : current === 'paused' ? 'play' : current);
      }
    };
    window.addEventListener('keydown', shortcuts, true);
    return () => window.removeEventListener('keydown', shortcuts, true);
  }, [state, soundEnabled, pausedGuideOpen, mobileGuideOpen, soundMenuOpen, exchangeOpen, achievementsOpen, siteSection, confirmFinish, finishingHome, hatFitOpen, leaderboardOpen, lootOpen]);

  // App owns playback: replacing a game canvas must not stop the new game's audio.
  useEffect(() => {
    sound.setPlaying(state === 'play' || state === 'boxing');
    return () => sound.setPlaying(false);
  }, [state, gameKey]);

  useEffect(() => {
    const unlock = () => sound.unlock();
    const visibility = () => { sound.setAppVisible(!document.hidden); if (!document.hidden) unlock(); };
    visibility();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('keydown', unlock, { capture: true });
    };
  }, []);

  const handleScoreUpdate = useCallback((newStats: typeof stats.current) => {
    stats.current = newStats;
  }, []);

  const handleGameOver = useCallback((_cause: string, finalScore: number) => {
    collectionOrigins.current = {};
    setResultStage('decision');
    setCurrentResult(finalScore);
    setNewAllTimeHigh(finalScore > runPreviousBest.current);
    player.command({ type: 'death', pips: Math.round(stats.current.totalScore), ath: finalScore });
  }, [player.command, player.practiceRun]);

  useEffect(() => {
    if (gameKey > 0) {
      setRunKills({ bull: 0, bear: 0 });
      runPreviousBest.current = player.progress.bestAth;
      setNewAllTimeHigh(false);
      player.command({ type: 'start', id: crypto.randomUUID(), now: Date.now() });
    }
  }, [gameKey, player.command]);

  const watchReward = async (kind: 'revive' | 'doubleCoins') => {
    if (await player.reward(kind)) {
      if (kind === 'revive') {
        bossEncounter.current = null; boxingActive.current = false;
        setReviveRequest(value => value + 1); setState('play');
      } else setResultStage('collected');
    }
  };

  const stashSection = !practiceUI && <div ref={stashPanel} className={`game-result-summary liquidated-stash-panel result-stash-panel ${state === 'paused' ? 'margin-call-stash' : ''}`}>
    <h2 className="font-black text-lg sm:text-xl mb-2">STASH</h2>
    <div className="result-summary-body">
      <WalletBar wallet={player.progress.run?.collected ?? emptyWallet()} theme={theme} hatSkin={outfit.hats} currencies={['coins', 'diamonds', 'bags', 'tenders', 'bells', 'bananas', 'hats']} />
    </div>
  </div>;
  const finishRun = () => {
    if (finishingHome) return;
    const returnHome = state === 'paused';
    collectionOrigins.current = captureCurrencyOrigins(stashPanel.current);
    player.command({ type: 'finish', pips: Math.round(stats.current.totalScore), ath: Math.round(stats.current.totalScore * stats.current.currentPrice * 100) / 100 });
    setConfirmFinish(false);
    setResultStage('collected');
    if (returnHome) setCurrentResult(Math.round(stats.current.totalScore * stats.current.currentPrice * 100) / 100);
    setFinishingHome(false);
    setState(returnHome ? 'menu' : 'over');
  };

  // Liquidated settles the run by itself shortly after it appears: the Stash falls into the balance.
  useEffect(() => {
    if (state !== 'over' || practiceUI || resultStage !== 'decision' || shareDDOpen) return;
    const timer = setTimeout(finishRun, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, practiceUI, resultStage, shareDDOpen]);

  const startOrResume = useCallback(() => runStartGate.current(async () => {
    setStartingRun(true);
    setFullscreenError('');
    mobileStartPending.current = false;
    try {
    if (confirmFinish || finishingHome) return;
    if (state === 'over' && !practiceUI && !player.networkOnline) { setState('menu'); return; }
    if ((state === 'over' || state === 'menu') && !await player.prepareRun()) {
      setFullscreenError('Could not start the run. Check your connection and try again.');
      return;
    }
    mobileStartPending.current = false;
    setFullscreenError('');
    if (state === 'over' || state === 'menu') {
      // Reuse the existing Friendly Run companion; links confer no reward or identity.
      raceRunId.current = null;
      setRaceTarget(incomingChallenge && !practiceUI
        ? { ...incomingChallenge, title: '', reward: 0 } : null);
      setPreviewPet(undefined); setModePreview(undefined);
      boxingActive.current = false;
      setCurrentResult(0);
      setResultStage('decision');
      setGameKey(k => k + 1);
    }
    setState('play');
    } catch (error) {
      setFullscreenError(error instanceof Error ? error.message : 'Could not start the run. Please try again.');
    } finally {
      setStartingRun(false);
    }
  }), [state, confirmFinish, finishingHome, player.prepareRun, practiceUI, player.networkOnline, accountSession, incomingChallenge]);

  useEffect(() => {
    const checkOrientation = () => {
      const isPortrait = window.matchMedia('(orientation: portrait)').matches;
      if (isPortrait) {
        setState(current => current === 'play' ? 'paused' : current);
        if (state === 'boxing') setBoxingPaused(true);
        return;
      }
      if (!window.matchMedia('(pointer: coarse)').matches) return;
      const ready = (nativePresentation() || document.fullscreenElement === appRef.current) && window.innerWidth > window.innerHeight;
      if (mobileStartPending.current && ready) startOrResume();
      else if (!ready && state === 'play') setState('paused');
    };
    window.addEventListener('resize', checkOrientation);
    screen.orientation?.addEventListener('change', checkOrientation);
    document.addEventListener('fullscreenchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      screen.orientation?.removeEventListener('change', checkOrientation);
      document.removeEventListener('fullscreenchange', checkOrientation);
    };
  }, [state, startOrResume]);

  const handleStartOrResume = async () => {
    if (window.matchMedia('(orientation: portrait)').matches) return;
    sound.unlock();
    // The Android Activity owns landscape orientation; WebView fullscreen is not required.
    if (nativePresentation()) { startOrResume(); return; }
    if (!window.matchMedia('(pointer: coarse)').matches) { startOrResume(); return; }
    if (mobileStartPending.current) return;
    mobileStartPending.current = true;
    setFullscreenError('');
    try {
      if (document.fullscreenElement !== appRef.current) {
        if (!appRef.current?.requestFullscreen) throw new Error('Fullscreen unavailable');
        await appRef.current.requestFullscreen();
      }
    } catch {
      mobileStartPending.current = false;
      setFullscreenError('Fullscreen is required to play on mobile. Please try again in a supported browser.');
      return;
    }
    if (!mobileStartPending.current) return;
    try {
      const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: 'landscape') => Promise<void> };
      await orientation.lock?.('landscape');
    } catch {
      // Never start portrait gameplay if the browser refuses the automatic lock.
      if (window.innerWidth <= window.innerHeight) {
        mobileStartPending.current = false;
        return;
      }
    }
    if (mobileStartPending.current && document.fullscreenElement === appRef.current && window.innerWidth > window.innerHeight) startOrResume();
  };

  // Mobile pause: Settings and Leaderboard go left in the header; Play and Fullscreen stay right.
  const leftHeaderControls = mobileDevice && (state === 'paused' || state === 'over' || (state === 'menu' && accountSession));
  const promoStar = <AboutStar className="about-star mobile-header-control header-promo-star" onPress={() => setPromoOpen(true)} theme={theme} wallet={player.progress.wallet} hatSkin={outfit.hats} />;
  const leaderboardButton = !practiceUI && (state === 'menu' || state === 'paused' || state === 'over') && <><button type="button" title="Leaderboard" aria-label="Leaderboard" aria-haspopup="dialog" aria-expanded={leaderboardOpen}
            disabled={!player.networkOnline} onClick={() => setLeaderboardOpen(true)} className="mobile-header-control header-leaderboard-control"><Crown className="w-3.5 h-3.5" aria-hidden="true" /><span className="achievement-notification leaderboard-notification" aria-hidden="true"><BadgeLabel>{String(dailyRank)}</BadgeLabel></span><span className="sr-only">Daily rank {dailyRank}</span></button></>;
  const settingsButton = state !== 'menu' && <button type="button" title="Settings" aria-label="Settings" aria-haspopup="dialog" aria-expanded={siteSection === 'Settings'}
              onClick={() => {
                if (state === 'play') setState('paused');
                if (state === 'boxing') setBoxingPaused(true);
                setSiteSection('Settings');
              }} className="mobile-header-control header-options-control"><Settings className="w-3.5 h-3.5" aria-hidden="true" /></button>;

  // Account buttons of the Home menu: Exchange or Play as Guest, Sign in / Sign up, messages.
  const homeAccountButtons = <>
    {accountSession
      ? <button type="button" disabled={!exchangeAvailable || player.busy} onClick={() => setExchangeOpen(true)} aria-haspopup="dialog" className="landing-menu-exchange-button menu-action-button w-full rounded font-bold font-mono-term"><ActionLabel>Exchange</ActionLabel></button>
      : <button type="button" disabled={startingRun} aria-busy={startingRun} onClick={() => void handleStartOrResume()} className="landing-menu-guest-button menu-action-button w-full rounded font-bold font-mono-term"><ActionLabel>Play as Guest</ActionLabel>{spaceKey}</button>}
    {!notFoundPage && <BrowserAccount menuOnly onUserChange={setBrowserUser} onNotice={setSignInNotice} />}
    {notFoundPage && <p role="status" className="text-xs"><a href={import.meta.env.BASE_URL}>Return to the Home page</a></p>}
    {accountSession && <button type="button" disabled={startingRun} onClick={() => void handleStartOrResume()} aria-label="Start" className="menu-action-button landing-menu-play-button w-full rounded font-bold font-mono-term"><ActionLabel>Start</ActionLabel>{spaceKey}</button>}
    {accountMenuError && <p role="alert" className="sr-only">{accountMenuError}</p>}
    {player.error && !player.busy && <p role="alert" className="sr-only">{player.error}</p>}
  </>;

  return (
    <div ref={appRef} data-layout={mobileDevice ? 'mobile' : 'desktop'} data-account={accountSession || undefined} data-offline={!player.networkOnline || undefined} data-fullscreen={isFullscreen} data-state={state} data-practice={practiceUI} data-menu-open={siteSection !== null || mobileGuideOpen || pausedGuideOpen || exchangeOpen || achievementsOpen || leaderboardOpen || lootOpen || hatFitOpen} data-live-feed={liveFeedVisible} data-animations={animationsEnabled} className="game-app min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-200">
      {!legalConfirmed && !booting && !bootFinishing && <LegalConsent onAccept={() => setLegalConfirmed(true)} />}
      {(booting || bootFinishing) && <div id="boot-screen" role="status" aria-live="polite" aria-label="Stonktrooper is loading" style={{ zIndex: 10000 }}>
        <img className="boot-logo" src={`${import.meta.env.BASE_URL}images/startup/logo.png`} alt="Stonktrooper" width="1523" height="416" />
        <p className="boot-loading">Loading…</p>
        <div className="boot-track" aria-hidden="true"><div className="boot-flight"><img className="boot-case" src={`${import.meta.env.BASE_URL}images/startup/briefcase.svg`} alt="" width="36" height="36" /></div></div>
      </div>}
      <div className="app-shell w-full">

        {/* Sleek Top Utility & Navigation Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6 pb-2">
          {<div className="flex items-center gap-3"><div className="flex items-baseline gap-2"><h1 className="header-logo-frame leading-none">
            <img src={`${import.meta.env.BASE_URL}images/${theme === 'dark' ? 'logo-inverted.png' : 'logo.png'}`} alt="Stonktrooper" className="stonktrooper-logo h-8 sm:h-10 w-auto" />
          </h1></div></div>}
          
          {(state === 'play' || state === 'boxing' || (!mobileDevice && (state === 'paused' || state === 'over'))) && (practiceUI
            ? <PracticeKillsHud kills={runKills} />
            : <CurrencyFooter className="game-currency-hud" label="Collected" showLabel={false} currencies={['coins', 'diamonds']} wallet={player.progress.run?.collected ?? emptyWallet()} theme={theme} hatSkin={outfit.hats} />)}
          {leftHeaderControls && <div className="header-left-controls">{state === 'menu' ? <>{promoStar}{leaderboardButton}</> : <>{settingsButton}{leaderboardButton}</>}</div>}
          {compactBrowser && notice && <p role="status" className="header-notice">{notice.toUpperCase()}</p>}
          <canvas className="mobile-header-feed" aria-label="Live Feed" />
          <div className="header-controls flex items-center gap-2 ml-auto">
            {/* Retain preview tools for manual testing without exposing them in the header. */}
            <div hidden style={{ display: 'none' }} data-testid="hidden-header-tools">
            <button type="button" className="mobile-header-control header-hat-fit" aria-label="Open hat fit gallery" aria-haspopup="dialog" aria-expanded={hatFitOpen} title="Hat fit gallery" onClick={() => {
              if (state === 'play') setState('paused');
              if (state === 'boxing') setBoxingPaused(true);
              setHatFitOpen(true);
            }}>Hat fit</button>
            {PREVIEW_MODES.map(mode => <button key={mode} type="button" className="mobile-header-control header-mode-preview" data-preview-mode={mode}
              aria-label={`Preview ${previewModeLabels[mode]} mode with pet`} title={`${previewModeLabels[mode]} + pet · 20% jump / 80% shoot`} disabled={confirmFinish}
              onClick={() => startModePreview(mode)}>{({ normal: '▶', dumpster: '🗑', whale: '🐋', bull: '🐂', bear: '🐻', rocket: '🚀', printer: '🖨', monkeys: '🐒', hat: '🎩', jerome: 'J', paul: 'P', janet: 'Jan' })[mode]}</button>)}
            <button type="button" className="mobile-header-control header-pet-preview" aria-label="Preview next pet" title={`Next pet (${previewPet ?? outfit.pets})`}
              onClick={() => setPreviewPet(current => PET_IDS[(PET_IDS.indexOf(current ?? outfit.pets) + 1) % PET_IDS.length])}>🐾</button>
            {/* Retain manual testing controls without exposing them on the site. */}
            {import.meta.env.DEV && <div hidden style={{ display: 'none' }} data-testid="hidden-mode-controls">
            <button
              type="button"
              title="Start Whale mode: Whale, two bananas, then Bear and Bull targets"
              aria-label="Toggle Whale game mode"
              aria-pressed={whaleDemo}
              disabled={state === 'boxing'}
              onClick={() => {
                sound.unlock();
                setWhaleDemo(active => !active);
                setCandleDemo(false);
                setSoundMenuOpen(false);
                setCurrentResult(0);
                setGameKey(k => k + 1);
                setState('play');
              }}
              className={`mobile-header-control px-2.5 py-1.5 rounded border border-[var(--line)] bg-[var(--alt)] text-xs text-[var(--green)] cursor-pointer disabled:opacity-40 ${whaleDemo ? 'ring-2 ring-[var(--green)]' : ''}`}
            >🐋<span className="hidden sm:inline"> Whale</span></button>
            <button type="button" title="Toggle sudden candle growth and gap demo" aria-label="Toggle candle surprise demo" aria-pressed={candleDemo} disabled={state === 'boxing'} onClick={() => {
              sound.unlock(); setSoundMenuOpen(false);
              if (state === 'menu' || state === 'over') { setCurrentResult(0); setGameKey(k => k + 1); }
              setCandleDemo(active => !active); setState('play');
            }} className={`px-2.5 py-1.5 rounded border border-[var(--line)] bg-[var(--alt)] text-xs text-[var(--green)] disabled:opacity-40 ${candleDemo ? 'ring-2 ring-[var(--green)]' : ''}`}>↕ Candles</button>
            <button type="button" title="Hawk mode" disabled={state === 'boxing'} onClick={() => {
              sound.unlock(); setSoundMenuOpen(false);
              if (state === 'menu' || state === 'over') { setCurrentResult(0); setGameKey(k => k + 1); }
              setHawkRequest(1); setState('play');
            }} className="px-2.5 py-1.5 rounded border border-[var(--line)] bg-[var(--alt)] text-xs text-[var(--green)] disabled:opacity-40">🦅 Hawk</button>
            <button type="button" title="Pigeon / Money Printer mode" aria-label="Activate Pigeon Money Printer mode" disabled={state === 'boxing'} onClick={() => {
              sound.unlock(); setSoundMenuOpen(false);
              if (state === 'menu' || state === 'over') { setCurrentResult(0); setGameKey(k => k + 1); }
              boxingActive.current = false;
              setPrinterRequest(request => request + 1);
              setState('play');
            }} className="px-2.5 py-1.5 rounded border border-[var(--line)] bg-[var(--alt)] text-xs text-[var(--green)] disabled:opacity-40">🐦 Pigeon</button>
            <button type="button" title="Toggle inverted chart view" aria-label="Toggle inverted chart view" disabled={state === 'boxing'} onClick={() => {
              sound.unlock(); setSoundMenuOpen(false);
              if (state === 'menu' || state === 'over') { setCurrentResult(0); setGameKey(k => k + 1); }
              setInvertedRequest(1); setState('play');
            }} className="px-2.5 py-1.5 rounded border border-[var(--line)] bg-[var(--alt)] text-xs text-[var(--green)] disabled:opacity-40">↕ Inverted</button>
            <button type="button" title="Music styles" aria-expanded={soundMenuOpen} onClick={() => { if (state === 'play') setState('paused'); setSoundMenuOpen(true); }} className="px-2.5 py-1.5 rounded border border-[var(--line)] bg-[var(--alt)] text-xs text-[var(--green)]">♫ Music</button>
            </div>}
            </div>
            {/* Development only: starts the Bell boss fight. Never part of a release build. */}
            {import.meta.env.DEV && state === 'play' && <button type="button" className="mobile-header-control header-boss-control" title="Boss fight (Bell)" aria-label="Start Bell boss fight" onClick={() => { sound.unlock(); setBossRequest(request => request + 1); }}><Bell className="w-3.5 h-3.5" aria-hidden="true" /></button>}
            {(state === 'play' || state === 'paused' || state === 'boxing') && <button
              type="button"
              disabled={finishingHome}
              onClick={() => state === 'boxing' ? setBoxingPaused(paused => !paused) : setState(current => current === 'play' ? 'paused' : 'play')}
              title="HODL (P)"
              aria-label={state === 'paused' || boxingPaused ? 'Resume game' : 'Pause game'}
              aria-pressed={state === 'paused' || boxingPaused}
              className="mobile-header-control header-pause-control"
            >
              {state === 'paused' || boxingPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>}
            
            
            
            {!leftHeaderControls && leaderboardButton}
            {!leftHeaderControls && !mobileDevice && settingsButton}
            {accountSession && state === 'menu' && <button type="button" title="Sign out" aria-label="Sign out of Google" onClick={signOutAccount} className="mobile-header-control header-signout-control"><LogOut className="w-3.5 h-3.5" aria-hidden="true" /></button>}
            {mobileDevice && <button type="button" onClick={toggleFullscreen} className="mobile-header-control header-options-control header-fullscreen-control"
              title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} aria-pressed={isFullscreen}>
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" aria-hidden="true" /> : <Maximize className="w-3.5 h-3.5" aria-hidden="true" />}
            </button>}
            {!mobileDevice && <button type="button" onClick={toggleFullscreen}
              className="desktop-fullscreen-control px-2.5 py-1.5 rounded border border-[var(--line)] bg-[var(--alt)] hover:border-[var(--green)] text-[var(--green)] transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} aria-pressed={isFullscreen}>
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>}
          </div>
        </header>
        {<div className="desktop-live-feed-bar" hidden={!liveFeedVisible}><canvas className="desktop-live-feed" aria-label="Live Feed" /></div>}
        {promoOpen && <PromoCode fixed onClose={() => setPromoOpen(false)} onRedeem={player.redeemPromo} />}
        {hatFitOpen && <HatFitGallery theme={theme} hatSkin={outfit.hats} onClose={() => setHatFitOpen(false)} />}
        {leaderboardOpen && player.networkOnline && !practiceUI && <Leaderboard vaultMonth={player.vaultMonth} friendsMode={friendsMode} onFriendsMode={setFriendsMode} onResetRaces={() => { setFriendlyWins([]); setRaceTarget(null); raceRunId.current = null; }} key={player.googlePlayer?.playerId} onClaimVault={player.claimVault} onClaimQuest={player.claimQuest} onRedeemPromo={player.redeemPromo} onCollectAchievement={player.claimAchievement} questWeek={player.questWeek} monthlyAchievement={<MonthlySqueezeAchievement theme={theme} owned={squeezeSave.owned} />} friendlyWins={friendlyWins} playerId={player.googlePlayer?.playerId} signedIn busy={player.busy || finishingHome} token={player.account?.token} progress={player.progress} theme={theme} onClose={() => setLeaderboardOpen(false)} onRace={!finishingHome && (state === 'menu' || state === 'over' || state === 'paused') ? async friend => runStartGate.current(async () => {
          if (state === 'paused') {
            // Settle the previous run before the new one replaces its receipt; Friends shows no flights.
            player.command({ type: 'finish', pips: Math.round(stats.current.totalScore), ath: Math.round(stats.current.totalScore * stats.current.currentPrice * 100) / 100 });
          }
          if (!await player.prepareRun()) throw new Error('Could not start the run. Check your connection and try again.');
          setConfirmFinish(false); collectionOrigins.current = {};
          bossEncounter.current = null;
          raceRunId.current = null; setRaceTarget(friend);
          setLeaderboardOpen(false); setPreviewPet(undefined); setModePreview(undefined);
          boxingActive.current = false; setCurrentResult(0); setResultStage('decision');
          setGameKey(key => key + 1); setState('play');
        }) : undefined} onClaimFriend={target => setFriendlyWins(previous => previous.map(friend => (friend.id ?? friend.name) === (target.id ?? target.name) && friend.score === target.score ? { ...friend, claimed: true } : friend))} />}
        {lootOpen && player.networkOnline && !practiceUI && <Loot theme={theme} onClose={() => setLootOpen(false)} onRedeemPromo={player.redeemPromo} progress={player.progress} questWeek={player.questWeek} onClaimQuest={player.claimQuest} />}
        {soundMenuOpen && <SoundMenu onClose={() => setSoundMenuOpen(false)} />}
        {fullscreenError && <p role="status" className="sr-only">{fullscreenError}</p>}

        {/* PRIMARY GAME ARENA (Clean, Uncluttered, Prominently on Top) */}
        <section
          className="game-arena relative w-full overflow-hidden rounded-none shadow-2xl bg-[var(--bg)]"
          aria-label="Main Game View"
        >
          <CandleGame
            onGameEvent={handleGameEvent}
            cosmetics={raceTarget && !practiceUI ? { ...outfit, pets: 'friend:' + raceTarget.name } : previewPet ? { ...outfit, pets: previewPet } : outfit}
            modePreview={modePreview}
            reviveRequest={reviveRequest}
            liveFeedEnabled={liveFeedVisible || !!feedMessage}
            feedMessage={feedMessage}
            liveFeedPaused={liveFeedPaused}
            key={gameKey}
            theme={theme}
            state={state}
            onStateChange={handleStateChange}
            onScoreUpdate={handleScoreUpdate}
            onGameOver={handleGameOver}
            bossEncounter={bossEncounter}
            bossRequest={bossRequest}
            printerRequest={printerRequest}
            invertedRequest={invertedRequest}
            onInvertedActivated={() => setInvertedRequest(0)}
            hawkRequest={hawkRequest}
            candleDemo={candleDemo}
            whaleDemo={whaleDemo}
            onHawkActivated={() => setHawkRequest(0)}
            onPrinterActivated={() => setPrinterRequest(0)}
          />

          {/* OVERLAYS: START MENU / PAUSE / MARGIN CALL */}
          {state === 'boxing' && boxingPaused && <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--veil)]"><button type="button" className="preferences-clear-button p-4 rounded border font-bold" onClick={() => setBoxingPaused(false)}>Resume game</button></div>}
          {state !== 'play' && state !== 'boxing' && (
            <div className={`game-overlay ${state === 'menu' ? 'how-to-play-overlay' : ''} ${state === 'paused' ? 'pause-overlay' : ''} ${state === 'over' ? 'game-over-overlay' : ''} absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-6 ${state === 'menu' ? (theme === 'light' ? 'bg-slate-100/20 backdrop-blur-xs' : 'bg-slate-950/25 backdrop-blur-xs') : state === 'over' ? (theme === 'light' ? 'bg-slate-100/45 backdrop-blur-sm' : 'bg-slate-950/55 backdrop-blur-xs') : 'bg-[var(--veil)] backdrop-blur-xs'} transition-opacity duration-200`}>

              {/* INITIAL START BRIEFING MODAL (state === 'menu') */}
              {state === 'menu' && (
                <div style={{ backgroundColor: 'color-mix(in srgb, var(--panel) 88%, transparent)' }} className="initial-guide desktop-initial-guide max-w-[1640px] w-full border border-[var(--line)] rounded-xl p-3 sm:p-5 shadow-2xl text-left">
                  <div className="how-to-layout flex flex-col items-stretch gap-3">
                    {!mobileDevice ? <DesktopHome theme={theme} liveFeedVisible={liveFeedVisible}
                      chart={<DesktopMenuChart theme={theme} />}
                      extra={<MonthlySqueezeHome theme={theme} uid={browserUser?.uid ?? null} save={squeezeSave} />}
                      landingScore={landingScore !== null ? <LandingScore score={landingScore} theme={theme} /> : null}
                      onGuide={() => setSiteSection('How to Play' as never)} onSettings={() => setSiteSection('Settings')}
                      >{homeAccountButtons}</DesktopHome> :
                    <section className={`landing-menu-panel rounded border border-[var(--line)]${landingScore !== null ? ' landing-menu-shared-score' : ''}`} aria-label="Game menu">
                      <MenuChart theme={theme} animationsEnabled={animationsEnabled} candleSkin={outfit.candles} hatSkin={outfit.hats} suitcaseSkin={outfit.suitcase} suitSkin={outfit.suits} shoeSkin={outfit.shoes} petSkin={outfit.pets} />
                      <MonthlySqueezeHome theme={theme} uid={browserUser?.uid ?? null} save={squeezeSave} />
                      {landingScore !== null && <LandingScore score={landingScore} theme={theme} />}
                      <button className="coffee-link home-coffee-link" type="button" aria-label="Donate (opens in a new tab)" onClick={() => window.open('https://ko-fi.com/eon', '_blank', 'noopener,noreferrer')}>
                        <span className="coffee-cup" aria-hidden="true">♥</span><span className="donate-label">Donate</span>
                      </button>
                      <div className="landing-menu-actions how-to-controls w-full flex flex-col gap-1">
                        <button type="button" onClick={() => setSiteSection('Settings')} aria-haspopup="dialog" className="landing-menu-settings-button menu-action-button w-full rounded border border-[var(--line)] bg-[var(--panel)] text-[var(--text)] font-bold font-mono-term cursor-pointer"><ActionLabel>Settings</ActionLabel></button>
                        <button type="button" onClick={() => setMobileGuideOpen(true)} aria-haspopup="dialog" className="landing-menu-guide-button menu-action-button w-full rounded border border-black bg-black text-white font-bold font-mono-term cursor-pointer"><ActionLabel>How to Play</ActionLabel></button>
                        {homeAccountButtons}
                      </div>
                    </section>}
                  </div>
                </div>
              )}

              {/* PAUSE & GAME OVER WINDOWS */}
              {state === 'over' && <LiquidatedBackdrop theme={theme} shareOpen={shareDDOpen} />}
              {state !== 'menu' && (
                <div data-result-stage={state === 'over' ? 'collected' : 'paused'} className={`game-result ${state === 'over' ? 'game-result-over' : ''} relative isolate overflow-hidden max-w-md w-full text-center bg-[var(--panel)] border border-[var(--line)] rounded-xl p-6 sm:p-7 shadow-2xl`}>
                  <div className={`relative z-10 ${state === 'over' ? 'game-result-content pt-28 pb-4' : ''}`}>

                    {state === 'paused' && <>
                      <div className="game-result-summary margin-call-summary py-3 bg-[var(--alt)] border border-[var(--line)] rounded-lg font-mono-term">
                        <h2 aria-live="polite" className={`font-black text-lg sm:text-xl mb-2 ${confirmFinish ? 'finish-confirm-title text-red-400' : ''}`} style={confirmFinish ? undefined : { color: '#54d3ac' }}>{confirmFinish ? 'FINISH THIS RUN?' : 'MARGIN CALL'}</h2>
                        <div className="margin-call-summary-body">
                        {confirmFinish && <p className="margin-call-finish-description">Collected items and score will be kept.<br /><br />End the game and return to Home?</p>}
                        {!confirmFinish && <>
                        <span className={`result-score-label ${stats.current.totalScore > player.progress.bestPips ? 'new-all-time-high' : ''}`}>{stats.current.totalScore > player.progress.bestPips ? 'NEW HIGH SCORE' : 'SCORE'}</span>
                        <strong className="result-score-value">{Math.round(stats.current.totalScore).toLocaleString()}</strong>
                        </>}
                        </div>
                      </div>
                    </>}


                    {state === 'over' && <div className="liquidated-collected-grid font-mono-term">
                      <div className="game-result-summary liquidated-collected-summary">
                        <h2 className="font-black text-lg sm:text-xl text-red-400 mb-2">LIQUIDATED</h2>
                        <div className="result-summary-body">
                        <span className={`result-score-label ${newAllTimeHigh ? 'new-all-time-high' : ''}`} role={newAllTimeHigh ? 'status' : undefined}>{newAllTimeHigh ? 'NEW HIGH SCORE' : 'SCORE'}</span>
                        <strong className="result-score-value">{Math.round(currentResult).toLocaleString()}</strong>
                        </div>
                      </div>
                      <div className="liquidated-collected-navigation" inert={finishingHome}>
                        {practiceUI && <button type="button" onClick={() => openGuide()} className="liquidated-guide"><ActionLabel>How to Play</ActionLabel></button>}
                        <button type="button" disabled={player.busy || finishingHome} onClick={() => setState('menu')} className="liquidated-home"><ActionLabel>Home</ActionLabel></button>
                        {!practiceUI && shareDDOpen && <div className="share-dd-actions-host" />}
                        {!practiceUI && !shareDDOpen && <button type="button" disabled={!player.networkOnline} onClick={() => setShareDDOpen(true)} className="share-dd-open"><ActionLabel>Challenge</ActionLabel></button>}
                        {!practiceUI && <button type="button" disabled={player.busy || !exchangeAvailable} title={exchangeAvailable ? 'Exchange' : 'Sign in with Google to access Exchange'} onClick={() => setExchangeOpen(true)} aria-haspopup="dialog" className="liquidated-exchange"><ActionLabel>Exchange</ActionLabel></button>}
                        <button type="button" disabled={startingRun} aria-busy={startingRun} onClick={() => void handleStartOrResume()} className="continue-run new-game-button"><ActionLabel>New Game</ActionLabel>{spaceKey}</button>
                      </div>
                      {stashSection}
                    </div>}

                    <div className="game-result-actions mt-5">
                      {state === 'paused' && <>
                        <button type="button" disabled={player.busy || finishingHome} onClick={() => practiceUI || confirmFinish ? finishRun() : setConfirmFinish(true)} className={`margin-call-action margin-call-home ${confirmFinish ? 'confirm-finish' : ''} how-to-play-action w-full rounded font-bold font-mono-term cursor-pointer`}><ActionLabel>{confirmFinish ? 'End Game' : 'Home'}</ActionLabel></button>
                        <button type="button" onClick={() => openGuide()} aria-haspopup="dialog" className="margin-call-action margin-call-achievements how-to-play-action w-full rounded font-bold font-mono-term cursor-pointer"><ActionLabel>How to Play</ActionLabel></button>
                        {!practiceUI && <button type="button" disabled={player.busy || finishingHome || !exchangeAvailable} title={exchangeAvailable ? 'Exchange' : 'Sign in with Google to access Exchange'} onClick={() => setExchangeOpen(true)} aria-haspopup="dialog" className="margin-call-action liquidated-exchange w-full rounded font-bold font-mono-term cursor-pointer"><ActionLabel>Exchange</ActionLabel></button>}
                      </>}
                      {state === 'paused' && <button
                        type="button"
                        disabled={finishingHome}
                        onClick={() => {
                          if (state === 'paused' && confirmFinish) {
                            setConfirmFinish(false);
                            sound.unlock();
                            setState('play');
                          } else void handleStartOrResume();
                        }}
                        className="margin-call-action continue-run w-full rounded-lg bg-[#08795c] hover:brightness-110 active:brightness-95 text-white font-bold font-mono-term text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ActionLabel>Continue</ActionLabel>{spaceKey}
                      </button>}
                    </div>
                    {state === 'paused' && stashSection}

                  </div>
                </div>
              )}


              {pausedGuideOpen && <div className="paused-guide-overlay absolute z-40" onPointerDown={e => e.stopPropagation()}>
                <div role="dialog" aria-modal="true" aria-labelledby="paused-guide-title" className="paused-guide-dialog bg-[var(--panel)] p-4" onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') setPausedGuideOpen(false); }}>
                  <div className="how-to-guide-header relative flex h-10 items-center justify-center border-b border-[var(--line)] mb-3 px-10">
                    <h2 id="paused-guide-title" className="how-to-play-label text-xl sm:text-2xl font-black font-mono-term tracking-tight text-center">How to Play</h2>
                    <CloseButton type="button" autoFocus title="Close How to Play" aria-label="Close How to Play and return to pause" onClick={() => setPausedGuideOpen(false)} className="dialog-close mobile-dialog-close absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded border border-[var(--line)] text-[var(--text)] hover:bg-[var(--alt)] transition-colors cursor-pointer" />
                  </div>
                  <MechanicsGuide theme={theme} candleSkin={outfit.candles} />
                </div>
              </div>}

            </div>
          )}
        </section>
        {shareDDOpen && player.networkOnline && state === 'over' && <ShareDD score={currentResult} challenger={browserUser?.displayName || player.account?.name || 'Challenger'} onClose={() => setShareDDOpen(false)} theme={theme} scoreTheme={theme} />}
        {exchangeOpen && player.networkOnline && !practiceUI && <Exchange initialTab={exchangeFocus?.tab} focusSkin={exchangeFocus?.skin} vaultMonth={player.vaultMonth} progress={player.progress} theme={theme} animationsEnabled={animationsEnabled} name={player.account?.name} busy={player.busy} error={player.error}
          onClose={() => { setExchangeOpen(false); setExchangeFocus(null); }} onSignIn={() => void player.signIn()} onBuy={id => void player.buyOrEquip(id)} onTitle={id => void player.equipTitle(id)} onBuyTitle={id => void player.buyTitle(id)} onVault={() => { setExchangeOpen(false); setLeaderboardOpen(true); }} />}
        {achievementsOpen && player.networkOnline && !practiceUI && <Achievements monthly={<MonthlySqueezeAchievement theme={theme} owned={squeezeSave.owned} />} progress={player.progress} theme={theme} onCollect={player.claimAchievement} onClose={() => setAchievementsOpen(false)} />}

        {mobileGuideOpen && <div className="mobile-how-to-dialog fixed inset-0 z-50 flex items-center justify-center p-3" onPointerDown={e => e.stopPropagation()}>
          <div role="dialog" aria-modal="true" aria-labelledby="mobile-guide-title" className="mobile-how-to-panel w-full h-full overflow-hidden bg-[var(--panel)] p-3">
            <div className="mobile-how-to-header relative flex h-10 items-center justify-center mb-3 px-10 border border-[#dbdbdb] rounded">
              <h2 id="mobile-guide-title" className="how-to-play-label text-xl font-black font-mono-term tracking-tight text-center">How to Play</h2>
              <CloseButton type="button" autoFocus title="Close How to Play" aria-label="Close How to Play" onClick={() => setMobileGuideOpen(false)} className="dialog-close mobile-dialog-close mobile-how-to-close p-2 rounded border border-[var(--line)] text-[var(--text)] hover:bg-[var(--alt)] transition-colors cursor-pointer" />
            </div>
            <div className="how-to-dialog-content">
              <MechanicsGuide theme={theme} candleSkin={outfit.candles} />
            </div>
          </div>
        </div>}

        {/* Keep settings dialogs available from Pause without a website footer. */}
        {mobileDevice ? <SiteFooter onProgress={player.command} wallet={player.progress.wallet} hatSkin={outfit.hats} onStarCoin={state === 'menu' && player.networkOnline && !practiceUI ? player.claimStarCoin : undefined} showNavigation highContrast={highContrast} onToggleHighContrast={() => setHighContrast(current => !current)} onResetDefaults={resetDefaults} volume={deviceVolume.volume ?? (soundEnabled ? volume : 0)} onVolumeChange={usesDeviceVolume() ? deviceVolume.changeVolume : changeVolume} animationsEnabled={animationsEnabled} onToggleAnimations={() => setAnimationsEnabled(current => !current)} liveFeedPaused={liveFeedPaused} onToggleLiveFeedPause={() => setLiveFeedPaused(current => !current)} onToggleTheme={() => setTheme(current => current === 'dark' ? 'light' : 'dark')} theme={theme} section={siteSection} setSection={setSiteSection} onOpen={() => { if (state === 'play') setState('paused'); }} /> : <DesktopSiteFooter highContrast={highContrast} onToggleHighContrast={() => setHighContrast(current => !current)} onResetDefaults={resetDefaults} volume={deviceVolume.volume ?? (soundEnabled ? volume : 0)} onVolumeChange={usesDeviceVolume() ? deviceVolume.changeVolume : changeVolume} animationsEnabled={animationsEnabled} onToggleAnimations={() => setAnimationsEnabled(current => !current)} liveFeedEnabled={!liveFeedPaused} onToggleLiveFeed={() => setLiveFeedPaused(current => !current)} onToggleTheme={() => setTheme(current => current === 'dark' ? 'light' : 'dark')} theme={theme} section={siteSection as never} setSection={setSiteSection as never} onOpen={() => { if (state === 'play') setState('paused'); }} />}
        <MobileDiagnostics />

        {/* The words live in aria-label because an image alt flashes as text before the picture loads. */}
        <div className="rotate-phone-placeholder" role="status" aria-label="Rotate your phone to landscape to play Stonktrooper">
          <img src={`${import.meta.env.BASE_URL}images/rotate-phone.png`}
            width={941} height={1672} alt="" decoding="sync" draggable={false} />
        </div>


      </div>
    </div>
  );
}





