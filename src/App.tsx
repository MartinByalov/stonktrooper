import { MechanicsGuide } from './MechanicsGuide';
import { useMobileDialogFit } from './useMobileDialogFit';
import { observeViewportHeight } from './viewportHeight';
import { MenuHero } from './MenuHero';
import { MenuChart } from './MenuChart';
import { MenuCelebration } from './MenuCelebration';
import { MenuQuote } from './MenuQuote';
import { LandingScore } from './LandingScore';
import { MobileDiagnostics } from './MobileDiagnostics';
import type { BossArena } from './boxingRules';
import { useState, useEffect, useLayoutEffect, useCallback, useRef, type MouseEvent as ReactMouseEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { GameState } from './types';
import { CandleGame } from './CandleGame';
import { AssetPreview } from './AssetPreview';
import { sound } from './audio';
import { SoundMenu } from './SoundMenu';
import { LiquidatedBackdrop } from './LiquidatedBackdrop';
import { ShareDD } from './ShareDD';
import { SiteFooter } from './SiteFooter';
import type { SiteSection } from './SiteFooter';
import { sharedScore } from './shareLinks';
import { Maximize, Minimize, Pause, Play, Settings, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function App() {
  const [mobileDevice, setMobileDevice] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  const [state, setState] = useState<GameState>('menu');
  const [landingScore] = useState(() => sharedScore(window.location.search));
  const mobilePlaying = mobileDevice && (state === 'play' || state === 'boxing');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return localStorage.getItem('cr_theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

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
    sound.setVolume(volume / 100);
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
  const [liveFeedEnabled, setLiveFeedEnabled] = useState(() => {
    try { return localStorage.getItem('cr_live_feed') !== 'false'; } catch { return true; }
  });
  const liveFeedVisible = liveFeedEnabled;
  useEffect(() => {
    sound.enabled = soundEnabled;
    try { localStorage.setItem('cr_sound_enabled', String(soundEnabled)); } catch { }
  }, [soundEnabled]);
  useEffect(() => {
    try { localStorage.setItem('cr_live_feed', String(liveFeedEnabled)); } catch { }
  }, [liveFeedEnabled]);
  const [highContrast, setHighContrast] = useState(() => {
    try { return localStorage.getItem('cr_high_contrast') === 'true'; } catch { return false; }
  });
  useEffect(() => {
    document.documentElement.dataset.highContrast = String(highContrast);
    try { localStorage.setItem('cr_high_contrast', String(highContrast)); } catch { }
  }, [highContrast]);
  useEffect(() => {
    const pause = () => {
      setState(current => current === 'play' ? 'paused' : current);
    };
    const visibility = () => { if (document.hidden) pause(); };
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [state]);
  const resetDefaults = () => {
    setTheme('light');
    changeVolume(100);
    setLiveFeedEnabled(true);
    setAnimationsEnabled(true);
    setHighContrast(false);
  };
  const [soundMenuOpen, setSoundMenuOpen] = useState(false);
  const [pausedGuideOpen, setPausedGuideOpen] = useState(false);
  const [mobileGuideOpen, setMobileGuideOpen] = useState(false);
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
      // Edge gutters are CSS inputs, never outputs of fullscreen-icon geometry.
      // Measuring the inset and feeding it back into header padding causes drift.
      const headerFeed = Array.from(app.querySelectorAll('.mobile-header-feed, .desktop-live-feed')).find(feed => feed.getBoundingClientRect().width > 0);
      const desktopFeed = app.querySelector('.desktop-live-feed-bar');
      app.style.setProperty('--desktop-feed-bottom', `${desktopFeed && desktopFeed.getBoundingClientRect().height > 0 ? desktopFeed.getBoundingClientRect().bottom : rect.top}px`);
      const feedInHeader = !!headerFeed && headerFeed.getBoundingClientRect().width > 0;
      const feedHeight = !liveFeedVisible || feedInHeader ? 0 : headerHeight > 0 ? headerHeight : rect.height * 48 / 840;
      app.style.setProperty('--live-feed-bottom', `${rect.top + feedHeight}px`);
      app.style.setProperty('--live-feed-height', `${feedHeight}px`);
      const footerRect = footer?.getBoundingClientRect();
      const footerVisible = !!footerRect && footerRect.height > 0
        && !!footer && window.getComputedStyle(footer).display !== 'none'
        && footerRect.top < window.innerHeight;
      const footerInsetBottom = footerVisible && footerRect ? Math.max(0, window.innerHeight - footerRect.top) : 0;
      app.style.setProperty('--footer-inset-bottom', `${footerInsetBottom}px`);
      // Fixed-position containing blocks need not match the visual viewport.
      // Measure the shell itself rather than deriving guide height from innerHeight.
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
  const [fullscreenError, setFullscreenError] = useState('');
  const mobileStartPending = useRef(false);

  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)');
    const sync = () => setMobileDevice(media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    let wasFullscreen = document.fullscreenElement === appRef.current;
    const syncFullscreen = () => {
      const fullscreen = document.fullscreenElement === appRef.current;
      setIsFullscreen(fullscreen);
      if (fullscreen && window.matchMedia('(pointer: coarse)').matches) {
        const orientation = screen.orientation as ScreenOrientation & { lock?: (value: 'landscape') => Promise<void> };
        void orientation?.lock?.('landscape').catch(() => {
          setFullscreenError('Landscape lock is unavailable. Keep your phone horizontal while playing.');
        });
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
        // Rotation is not a user activation in every browser. Retry on a tap,
        // but never force re-entry after the user explicitly leaves fullscreen.
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
        // Orientation, visual viewport and browser chrome can settle separately.
        // Retry only within this rotation, not after an explicit fullscreen exit.
        rotationTimers = [150, 400, 800].map(delay => setTimeout(() => {
          if (awaitingGesture && window.innerWidth > window.innerHeight) void enter();
        }, delay));
      }
      if (!landscape) { awaitingGesture = false; clearRotationTimers(); }
      wasLandscape = landscape;
    };
    const tap = (event: Event) => {
      // Start and fullscreen controls already make their own activation-bound request.
      if (event.target instanceof Element && event.target.closest('.desktop-fullscreen-control, .landing-menu-play-button, .continue-run, a, input')) return;
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
    if (state === 'play' || state === 'boxing') setSiteSection(null);
  }, [state]);
  const [selectedMode, setSelectedMode] = useState<'easy' | 'hard'>('hard');
  const [gameKey, setGameKey] = useState<number>(0);
  const [printerRequest, setPrinterRequest] = useState(0);
  const [invertedRequest, setInvertedRequest] = useState(0);
  const [hawkRequest, setHawkRequest] = useState(0);
  const [candleDemo, setCandleDemo] = useState(false);
  const [whaleDemo, setWhaleDemo] = useState(false);
  const [currentResult, setCurrentResult] = useState(0);
  const boxingActive = useRef(false);
  const bossEncounter = useRef<BossArena | null>(null);

  const handleStateChange = useCallback((nextState: GameState) => {
    if (boxingActive.current) return;
    if (nextState === 'boxing') boxingActive.current = true;
    setState(nextState);
  }, []);

  const stats = useRef({
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
    const next = !soundEnabled || volume === 0;
    if (next && volume === 0) setVolume(100);
    setSoundEnabled(next);
    sound.enabled = next;
    if (next) sound.unlock();
  };

  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
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
      if (key === 'p' && !pausedGuideOpen && !soundMenuOpen) {
        setState(current => current === 'play' ? 'paused' : current === 'paused' ? 'play' : current);
      }
    };
    window.addEventListener('keydown', shortcuts, true);
    return () => window.removeEventListener('keydown', shortcuts, true);
  }, [state, soundEnabled, pausedGuideOpen, mobileGuideOpen, soundMenuOpen]);

  // App owns playback: replacing a game canvas must not stop the new game's audio.
  useEffect(() => {
    sound.setPlaying(state === 'play' || state === 'boxing');
    return () => sound.setPlaying(false);
  }, [state, gameKey]);

  useEffect(() => {
    const unlock = () => sound.unlock();
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('keydown', unlock, { capture: true });
    };
  }, []);

  const handleScoreUpdate = useCallback((newStats: typeof stats.current) => {
    stats.current = newStats;
  }, []);

  const handleGameOver = useCallback((_cause: string, finalScore: number) => {
    setCurrentResult(finalScore);
  }, []);

  const startOrResume = useCallback(() => {
    mobileStartPending.current = false;
    setFullscreenError('');
    if (state === 'over' || state === 'menu') {
      boxingActive.current = false;
      setCurrentResult(0);
      setGameKey(k => k + 1);
    }
    setState('play');
  }, [state]);

  useEffect(() => {
    const checkOrientation = () => {
      if (!window.matchMedia('(pointer: coarse)').matches) return;
      const ready = document.fullscreenElement === appRef.current && window.innerWidth > window.innerHeight;
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
    if (state === 'menu' && selectedMode !== 'hard') return;
    sound.unlock();
    if (!window.matchMedia('(pointer: coarse)').matches) { startOrResume(); return; }
    if (mobileStartPending.current) {
      if (document.fullscreenElement !== appRef.current) return;
      mobileStartPending.current = false;
    }
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

  const handleModeSelectorClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setSelectedMode(event.clientX - bounds.left < bounds.width / 2 ? 'easy' : 'hard');
  };

  const handleModeSelectorKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setSelectedMode('easy');
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      setSelectedMode('hard');
    }
  };

  return (
    <div ref={appRef} data-state={state} data-live-feed={liveFeedVisible} data-animations={animationsEnabled} className="game-app min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-200">
      <div className="w-full pt-2">

        {/* Sleek Top Utility & Navigation Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-2">
              <h1 className="header-logo-frame leading-none">
                <img
                  src={`${import.meta.env.BASE_URL}images/${theme === 'dark' ? 'logo-inverted.png' : 'logo.png'}`}
                  alt="Stonktrooper"
                  className="stonktrooper-logo h-8 sm:h-10 w-auto"
                />
              </h1>
            </div>
          </div>

          <canvas className="mobile-header-feed" aria-label="Live Feed" />
          <div className="header-controls flex items-center gap-2 ml-auto">
            {/* Retain manual testing controls without exposing them on the site. */}
            <div hidden style={{ display: 'none' }} data-testid="hidden-mode-controls">
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
            </div>
            {(state === 'play' || state === 'paused') && <button
              type="button"
              onClick={() => setState(current => current === 'play' ? 'paused' : 'play')}
              title="HODL (P)"
              aria-label={state === 'paused' ? 'Resume game' : 'Pause game'}
              aria-pressed={state === 'paused'}
              className="mobile-header-control header-pause-control"
            >
              {state === 'paused' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>}
            {state === 'over' && <button type="button" title="Settings" aria-label="Settings" aria-haspopup="dialog"
              onClick={() => setSiteSection('Settings')}
              className="result-settings-control px-2.5 py-1.5 rounded border border-[var(--line)] bg-[var(--alt)] hover:border-[var(--green)] text-[var(--green)] transition-colors cursor-pointer">
              <Settings className="w-3.5 h-3.5" />
            </button>}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="desktop-fullscreen-control px-2.5 py-1.5 rounded border border-[var(--line)] bg-[var(--alt)] hover:border-[var(--green)] text-[var(--green)] transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              aria-pressed={isFullscreen}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          </div>
        </header>
        <div className="desktop-live-feed-bar" hidden={!liveFeedVisible}>
          <canvas className="desktop-live-feed" aria-label="Live Feed" />
        </div>
        {soundMenuOpen && <SoundMenu onClose={() => setSoundMenuOpen(false)} />}
        {fullscreenError && <p role="status" className="px-4 text-xs text-[var(--red)]">{fullscreenError}</p>}

        {/* PRIMARY GAME ARENA (Clean, Uncluttered, Prominently on Top) */}
        <section
          className="game-arena relative w-full overflow-hidden rounded-none shadow-2xl bg-[#0c111b]"
          aria-label="Main Game View"
        >
          <CandleGame
            liveFeedEnabled={liveFeedVisible}
            key={gameKey}
            theme={theme}
            state={state}
            onStateChange={handleStateChange}
            onScoreUpdate={handleScoreUpdate}
            onGameOver={handleGameOver}
            bossEncounter={bossEncounter}
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
          {state !== 'play' && state !== 'boxing' && (
            <div className={`game-overlay ${state === 'menu' ? 'how-to-play-overlay' : ''} ${state === 'paused' ? 'pause-overlay' : ''} ${state === 'over' ? 'game-over-overlay' : ''} absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-6 ${state === 'menu' ? (theme === 'light' ? 'bg-slate-100/20 backdrop-blur-xs' : 'bg-slate-950/25 backdrop-blur-xs') : state === 'over' ? (theme === 'light' ? 'bg-slate-100/45 backdrop-blur-sm' : 'bg-slate-950/55 backdrop-blur-xs') : 'bg-[var(--veil)] backdrop-blur-xs'} transition-opacity duration-200`}>

              {/* INITIAL START BRIEFING MODAL (state === 'menu') */}
              {state === 'menu' && (
                <div style={{ backgroundColor: 'color-mix(in srgb, var(--panel) 88%, transparent)' }} className="initial-guide desktop-initial-guide max-w-[1640px] w-full border border-[var(--line)] rounded-xl p-3 sm:p-5 shadow-2xl text-left">
                  <div className="how-to-layout flex flex-col items-stretch gap-3">
                    <section className={`landing-menu-panel rounded border border-[var(--line)]${landingScore !== null ? ' landing-menu-shared-score' : ''}`} aria-label="Game menu">
                      <MenuChart theme={theme} />
                      {landingScore !== null && <LandingScore score={landingScore} theme={theme} />}
                      <button className="coffee-link home-coffee-link" type="button" aria-label="Donate (opens in a new tab)" onClick={() => window.open('https://ko-fi.com/eon', '_blank', 'noopener,noreferrer')}>
                        <span className="coffee-cup" aria-hidden="true">♥</span>
                        <span className="donate-label">Donate</span>
                      </button>
                      <div className="landing-menu-actions how-to-controls w-full flex flex-col gap-1">
                        {landingScore === null && <MenuQuote liveFeedEnabled={liveFeedVisible} />}
                        {landingScore === null && <MenuCelebration theme={theme} />}
                        <button type="button" onClick={() => setMobileGuideOpen(true)} aria-haspopup="dialog" className="landing-menu-guide-button menu-action-button w-full rounded border border-black bg-black text-white font-bold font-mono-term cursor-pointer">How to Play</button>
                        <button type="button" onClick={() => setSiteSection('Settings')} aria-haspopup="dialog" className="landing-menu-settings-button menu-action-button w-full rounded border border-[var(--line)] bg-[var(--panel)] text-[var(--text)] font-bold font-mono-term cursor-pointer">Settings</button>
                        <div className="how-to-mode-buttons">
                          <button
                            type="button"
                            aria-label="Change game mode"
                            aria-live="polite"
                            onClick={handleModeSelectorClick}
                            onKeyDown={handleModeSelectorKeyDown}
                            data-mode={selectedMode}
                            className="menu-action-button mobile-portrait-action-button how-to-mode-selector w-full rounded-lg border-0 transition-all hover:brightness-105"
                          >
                            {selectedMode === 'hard' && <ChevronLeft className="how-to-mode-selector-arrow how-to-mode-selector-arrow-left" aria-hidden="true" />}
                            {selectedMode === 'easy' ? 'Git Gud' : 'Hard Mode'}
                            {selectedMode === 'easy' && <ChevronRight className="how-to-mode-selector-arrow how-to-mode-selector-arrow-right" aria-hidden="true" />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleStartOrResume}
                          disabled={selectedMode !== 'hard'}
                          className="landing-menu-play-button menu-action-button mobile-portrait-action-button w-full rounded-lg bg-[#08795c] hover:brightness-110 active:brightness-95 text-white font-bold text-sm sm:text-base transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <span>Start</span>
                          <svg className="new-game-space-key" viewBox="0 0 36 6" aria-hidden="true" focusable="false"><path d="M1 1V5H35V1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                      </div>
                    </section>
                  </div>
                </div>
              )}

              {/* PAUSE & GAME OVER WINDOWS */}
              {state === 'over' && <LiquidatedBackdrop theme={theme} shareOpen={shareDDOpen} />}
              {state !== 'menu' && (
                <div className={`game-result ${state === 'over' ? 'game-result-over' : ''} relative isolate overflow-hidden max-w-md w-full text-center bg-[var(--panel)] border border-[var(--line)] rounded-xl p-6 sm:p-7 shadow-2xl`}>
                  <div className={`relative z-10 ${state === 'over' ? 'game-result-content pt-28 pb-4' : ''}`}>

                    {state === 'paused' && <h2 className="margin-call-title font-black tracking-tight mb-2 font-mono-term text-3xl sm:text-4xl">Margin Call</h2>}


                    {/* Score summary on game over */}
                    {state === 'over' && !shareDDOpen && (
                      <div className="game-result-summary py-3 my-4 bg-[var(--alt)] border border-[var(--line)] rounded-lg font-mono-term text-xs">
                        <h2 className="font-black text-lg sm:text-xl text-red-400 mb-2">LIQUIDATED</h2>
                        <div>
                          <span className="text-xl sm:text-2xl font-bold text-[var(--text)] block">All-time High</span>
                          <strong className="text-3xl sm:text-4xl block mt-2" style={{ color: theme === 'dark' ? '#08795c' : '#54d3ac' }}>{Math.round(currentResult).toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong>
                        </div>
                      </div>
                    )}

                    <div className="game-result-actions mt-5">
                      {state === 'paused' && <>
                        <button type="button" onClick={() => setState('menu')} className="margin-call-action margin-call-home how-to-play-action w-full rounded font-bold font-mono-term cursor-pointer">Home</button>
                        <button type="button" onClick={() => setSiteSection('Settings')} className="margin-call-action margin-call-settings how-to-play-action w-full rounded font-bold font-mono-term cursor-pointer">Settings</button>
                      </>}
                      {state === 'over' && <>
                        <button type="button" onClick={() => setState('menu')} className="margin-call-action liquidated-home how-to-play-action w-full rounded font-bold font-mono-term cursor-pointer">Home</button>
                        {shareDDOpen ? <div className="share-dd-actions-host" /> : <button type="button" onClick={() => setShareDDOpen(true)} className="share-dd-open w-full py-2.5 px-3 rounded border border-[#38bdf8] bg-[#38bdf8] text-white hover:brightness-110 font-bold text-xs font-mono-term transition-colors cursor-pointer">Share DD</button>}
                      </>}
                      <button
                        type="button"
                        onClick={handleStartOrResume}
                        className="continue-run margin-call-action w-full rounded-lg bg-[#08795c] hover:brightness-110 active:brightness-95 text-white font-bold font-mono-term text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>{state === 'paused' ? 'Continue' : 'New Game'}</span>
                        <svg className="new-game-space-key" viewBox="0 0 36 6" aria-hidden="true" focusable="false"><path d="M1 1V5H35V1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>

                    </div>

                  </div>
                </div>
              )}

              {pausedGuideOpen && <div className="paused-guide-overlay absolute z-40" onPointerDown={e => e.stopPropagation()}>
                <div role="dialog" aria-modal="true" aria-labelledby="paused-guide-title" className="paused-guide-dialog bg-[var(--panel)] border border-[var(--line)] rounded-xl p-4" onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') setPausedGuideOpen(false); }}>
                  <div className="how-to-guide-header relative flex h-10 items-center justify-center border-b border-[var(--line)] mb-3 px-10">
                    <h2 id="paused-guide-title" className="how-to-play-label text-xl sm:text-2xl font-black font-mono-term tracking-tight text-center">How to Play</h2>
                    <button type="button" autoFocus title="Close How to Play" aria-label="Close How to Play and return to pause" onClick={() => setPausedGuideOpen(false)} className="dialog-close mobile-dialog-close absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded border border-[var(--line)] text-[var(--text)] hover:bg-[var(--alt)] transition-colors cursor-pointer"><X className="w-5 h-5" aria-hidden="true" /></button>
                  </div>
                  <MechanicsGuide theme={theme} />
                </div>
              </div>}

            </div>
          )}
        </section>
        {shareDDOpen && state === 'over' && <ShareDD score={currentResult} onClose={() => setShareDDOpen(false)} theme={theme} scoreTheme={theme} />}

        {mobileGuideOpen && <div className="mobile-how-to-dialog fixed inset-0 z-50 flex items-center justify-center p-3" onPointerDown={e => e.stopPropagation()}>
          <div role="dialog" aria-modal="true" aria-labelledby="mobile-guide-title" className="mobile-how-to-panel w-full h-full overflow-hidden bg-[var(--panel)] border border-[var(--line)] rounded-xl p-3">
            <div className="mobile-how-to-header relative flex h-10 items-center justify-center mb-3 px-10 border border-[#dbdbdb] rounded">
              <h2 id="mobile-guide-title" className="how-to-play-label text-xl font-black font-mono-term tracking-tight text-center">How to Play</h2>
              <button type="button" autoFocus title="Close How to Play" aria-label="Close How to Play" onClick={() => setMobileGuideOpen(false)} className="dialog-close mobile-dialog-close mobile-how-to-close p-2 rounded border border-[var(--line)] text-[var(--text)] hover:bg-[var(--alt)] transition-colors cursor-pointer"><X className="w-5 h-5" aria-hidden="true" /></button>
            </div>
            <div className="how-to-dialog-content">
              <aside className="how-to-dialog-hero overflow-hidden rounded" aria-label="Stonktrooper illustration">
                <MenuHero theme={theme} />
              </aside>
              <MechanicsGuide theme={theme} />
            </div>
          </div>
        </div>}

        {/* Global Footer */}
        <SiteFooter highContrast={highContrast} onToggleHighContrast={() => setHighContrast(current => !current)} onResetDefaults={resetDefaults} volume={soundEnabled ? volume : 0} onVolumeChange={changeVolume} animationsEnabled={animationsEnabled} onToggleAnimations={() => setAnimationsEnabled(current => !current)} liveFeedEnabled={liveFeedEnabled} onToggleLiveFeed={() => setLiveFeedEnabled(current => !current)} onToggleTheme={() => setTheme(current => current === 'dark' ? 'light' : 'dark')} theme={theme} section={siteSection} setSection={setSiteSection} onOpen={() => { if (state === 'play') setState('paused'); }} />
        <MobileDiagnostics />

        <div className="rotate-phone-placeholder" role="status">
          <img src={`${import.meta.env.BASE_URL}images/rotate-phone.png`}
            width={941} height={1672} alt="Rotate your phone to landscape to play Stonktrooper" draggable={false} />
        </div>


      </div>
    </div>
  );
}
