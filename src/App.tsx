import { MechanicsGuide } from './MechanicsGuide';
import { MenuHero } from './MenuHero';
import { BoxingGame } from './BoxingGame';
import type { BossArena } from './boxingRules';
import { useState, useEffect, useCallback, useRef, type MouseEvent as ReactMouseEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
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
import { Volume2, VolumeX, Maximize, Minimize, Sun, Moon, Pause, Play, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return localStorage.getItem('cr_theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundMenuOpen, setSoundMenuOpen] = useState(false);
  const [pausedGuideOpen, setPausedGuideOpen] = useState(false);
  const [mobileGuideOpen, setMobileGuideOpen] = useState(false);
  const [shareDDOpen, setShareDDOpen] = useState(false);
  const [siteSection, setSiteSection] = useState<SiteSection | null>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const previousMobilePortrait = useRef<boolean | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  const requestMobileLandscape = async () => {
    if (!window.matchMedia('(max-width: 1024px) and (pointer: coarse)').matches) return;
    try {
      if (!document.fullscreenElement && appRef.current?.requestFullscreen) await appRef.current.requestFullscreen();
      const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: 'landscape') => Promise<void> };
      await orientation?.lock?.('landscape');
    } catch {
      // Unsupported browsers use the portrait rotate prompt instead.
    }
  };

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === appRef.current);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
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

  const [state, setState] = useState<GameState>('menu');
  useEffect(() => { if (state !== 'over') setShareDDOpen(false); }, [state]);
  const [selectedMode, setSelectedMode] = useState<'easy' | 'hard'>('hard');
  const [awaitingLandscape, setAwaitingLandscape] = useState(false);
  const [gameKey, setGameKey] = useState<number>(0);
  const [printerRequest, setPrinterRequest] = useState(0);
  const [invertedRequest, setInvertedRequest] = useState(0);
  const [hawkRequest, setHawkRequest] = useState(0);
  const [candleDemo, setCandleDemo] = useState(false);
  const [currentResult, setCurrentResult] = useState(0);
  const boxingActive = useRef(false);
  const bossEncounter = useRef<BossArena | null>(null);

  useEffect(() => {
    const score = sharedScore(window.location.search);
    if (score === null) return;
    setCurrentResult(score);
    setState('over');
    setShareDDOpen(true);
  }, []);

  const handleStateChange = useCallback((nextState: GameState) => {
    if (boxingActive.current) return;
    if (nextState === 'boxing') boxingActive.current = true;
    setState(nextState);
  }, []);

  const [stats, setStats] = useState({
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
      favicon.href = `${import.meta.env.BASE_URL}images/${theme === 'dark' ? 'tab-icon-inverted.png' : 'tab-icon.png'}?v=2`;
    }
    try {
      localStorage.setItem('cr_theme', theme);
    } catch { }
  }, [theme]);

  const toggleSound = () => {
    const next = !soundEnabled;
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

  const handleScoreUpdate = useCallback((newStats: typeof stats) => {
    setStats(newStats);
  }, []);

  const handleGameOver = useCallback((_cause: string, finalScore: number) => {
    setCurrentResult(finalScore);
  }, []);

  const handleStartOrResume = () => {
    if (state === 'menu' && selectedMode !== 'hard') return;
    void requestMobileLandscape();
    sound.unlock();
    if (window.matchMedia('(max-width: 1024px) and (pointer: coarse)').matches && window.innerHeight > window.innerWidth) {
      setAwaitingLandscape(true);
      return;
    }
    setAwaitingLandscape(false);
    if (state === 'over' || state === 'menu') {

      boxingActive.current = false;
      setCurrentResult(0);
      setGameKey((k) => k + 1);
    }
    setState('play');
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

  useEffect(() => {
    const syncOrientation = () => {
      const portrait = window.matchMedia('(max-width: 1024px) and (pointer: coarse)').matches && window.innerHeight > window.innerWidth;
      const wasPortrait = previousMobilePortrait.current;
      if (wasPortrait === false && portrait && state === 'play') setState('paused');
      previousMobilePortrait.current = portrait;
      if (!portrait && awaitingLandscape) {
        // The initial request is made from the START tap. Retry after the
        // physical rotation as some mobile browsers only expose the final
        // landscape viewport after orientationchange.
        void requestMobileLandscape();
        setAwaitingLandscape(false);
        if (state === 'menu' || state === 'over') {
          boxingActive.current = false;
          setCurrentResult(0);
          setGameKey(k => k + 1);
        }
        setState('play');
      }
    };
    syncOrientation();
    window.addEventListener('resize', syncOrientation);
    window.addEventListener('orientationchange', syncOrientation);
    screen.orientation?.addEventListener('change', syncOrientation);
    window.visualViewport?.addEventListener('resize', syncOrientation);
    return () => {
      window.removeEventListener('resize', syncOrientation);
      window.removeEventListener('orientationchange', syncOrientation);
      screen.orientation?.removeEventListener('change', syncOrientation);
      window.visualViewport?.removeEventListener('resize', syncOrientation);
    };
  }, [awaitingLandscape, state]);

  const handleReturnMenu = () => {
    setGameKey((k) => k + 1);
    setState('menu');
  };

  return (
    <div ref={appRef} data-state={state} className="game-app min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-200">
      <div className="w-full pt-2">

        {/* Sleek Top Utility & Navigation Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-2">
              <h1 className="leading-none">
                <img
                  src={`${import.meta.env.BASE_URL}images/${theme === 'dark' ? 'logo-inverted.png' : 'logo.png'}`}
                  alt="Stonktrooper"
                  className="stonktrooper-logo h-8 sm:h-10 w-auto"
                />
              </h1>
            </div>
          </div>

          <div className="header-controls flex items-center gap-2 ml-auto">
            {/* Retain manual testing controls without exposing them on the site. */}
            <div hidden style={{ display: 'none' }} data-testid="hidden-mode-controls">
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
            <button type="button" title="Kangaroo mode" disabled={state === 'boxing'} onClick={() => {
              sound.unlock(); setSoundMenuOpen(false);
              if (state === 'menu' || state === 'over') { setCurrentResult(0); setGameKey(k => k + 1); }
              boxingActive.current = true; setState('boxing');
            }} className="px-2.5 py-1.5 rounded border border-[var(--line)] bg-[var(--alt)] text-xs text-[var(--green)] disabled:opacity-40">🦘 Kangaroo</button>
            <button type="button" title="Music styles" aria-expanded={soundMenuOpen} onClick={() => { if (state === 'play') setState('paused'); setSoundMenuOpen(true); }} className="px-2.5 py-1.5 rounded border border-[var(--line)] bg-[var(--alt)] text-xs text-[var(--green)]">♫ Music</button>
            </div>
            <button type="button" title="About" aria-label="Open information about the game" aria-haspopup="dialog" onClick={() => { if (state === 'play') setState('paused'); setSoundMenuOpen(false); setSiteSection('About'); }} className="mobile-header-control px-2.5 py-1.5 rounded border border-[var(--line)] bg-[var(--alt)] hover:border-[var(--green)] text-[var(--green)] transition-colors cursor-pointer">
              <span className="mobile-header-info-icon flex w-3 h-3 items-center justify-center font-serif text-lg font-bold leading-none" aria-hidden="true">i</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}
              className="mobile-header-control px-2.5 py-1.5 rounded border border-[var(--line)] bg-[var(--alt)] hover:border-[var(--green)] text-[var(--green)] transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Day mode (N)' : 'Night mode (N)'}
              aria-label={theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
            >
              {theme === 'dark' ? <Sun className="mobile-header-theme-icon w-3 h-3" /> : <Moon className="mobile-header-theme-icon w-3 h-3" />}
            </button>
            <button
              type="button"
              onClick={() => setState(current => current === 'play' ? 'paused' : current === 'paused' ? 'play' : current)}
              disabled={state !== 'play' && state !== 'paused'}
              title={state === 'paused' ? 'Play (P)' : 'HODL (P)'}
              aria-label={state === 'paused' ? 'Resume game' : 'Pause game'}
              aria-pressed={state === 'paused'}
              className="px-2.5 py-1.5 rounded border border-[var(--line)] bg-[var(--alt)] hover:border-[var(--green)] text-[var(--green)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
            >
              {state === 'paused' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={toggleSound}
              className="px-2.5 py-1.5 rounded border border-[var(--line)] bg-[var(--alt)] hover:border-[var(--green)] text-xs font-mono-term flex items-center gap-1 transition-colors cursor-pointer"
              title={soundEnabled ? 'Sound Off (M)' : 'Sound On (M)'}
              aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
              aria-pressed={soundEnabled}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[var(--green)]" /> : <VolumeX className="w-3.5 h-3.5 text-[var(--muted)]" />}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-2.5 py-1.5 rounded border border-[var(--line)] bg-[var(--alt)] hover:border-[var(--green)] text-[var(--green)] transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              aria-pressed={isFullscreen}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          </div>
        </header>
        {soundMenuOpen && <SoundMenu onClose={() => setSoundMenuOpen(false)} />}
        {fullscreenError && <p role="status" className="px-4 text-xs text-[var(--red)]">{fullscreenError}</p>}

        {/* PRIMARY GAME ARENA (Clean, Uncluttered, Prominently on Top) */}
        <section
          className="game-arena relative w-full overflow-hidden rounded-none shadow-2xl bg-[#0c111b]"
          aria-label="Main Game View"
        >
          <CandleGame
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
            onHawkActivated={() => setHawkRequest(0)}
            onPrinterActivated={() => setPrinterRequest(0)}
          />

          {/* OVERLAYS: START MENU / PAUSE / MARGIN CALL */}
          {state === 'boxing' && <BoxingGame encounter={bossEncounter} onDefeat={() => { boxingActive.current = false; setState('over'); }} onComplete={() => { bossEncounter.current = null; boxingActive.current = false; setState('play'); }} />}
          {state !== 'play' && state !== 'boxing' && (
            <div className={`game-overlay ${state === 'menu' ? 'how-to-play-overlay' : ''} ${state === 'paused' ? 'pause-overlay' : ''} ${state === 'over' ? 'game-over-overlay' : ''} absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-6 ${state === 'menu' ? (theme === 'light' ? 'bg-slate-100/20 backdrop-blur-xs' : 'bg-slate-950/25 backdrop-blur-xs') : state === 'over' ? (theme === 'light' ? 'bg-slate-100/45 backdrop-blur-sm' : 'bg-slate-950/55 backdrop-blur-xs') : 'bg-[var(--veil)] backdrop-blur-xs'} transition-opacity duration-200`}>

              {/* INITIAL START BRIEFING MODAL (state === 'menu') */}
              {state === 'menu' && (
                <div style={{ backgroundColor: 'color-mix(in srgb, var(--panel) 88%, transparent)' }} className="initial-guide desktop-initial-guide max-w-[1640px] w-full border border-[var(--line)] rounded-xl p-3 sm:p-5 shadow-2xl text-left">
                  <div className="flex items-center justify-center pb-2 border-b border-[var(--line)] mb-3">
                    <h2 className="menu-action-button how-to-play-heading text-xl sm:text-2xl font-black font-mono-term tracking-tight">
                      How to Play
                    </h2>

                  </div>


                  <div className="how-to-layout flex flex-col items-stretch gap-3">
                    <aside className="how-to-aside w-full max-w-[320px] mx-auto lg:mx-0 lg:w-[280px] xl:w-[320px] shrink-0 flex flex-col items-stretch gap-3"><div className="how-to-hero w-full overflow-hidden rounded-xl"><MenuHero theme={theme} /></div>                  {/* Launch Button */}
                      <div className="how-to-controls w-full mt-auto flex flex-col gap-2">
                        <div className="how-to-mode-buttons">
                          <button
                            type="button"
                            aria-label="Change game mode"
                            aria-live="polite"
                            onClick={handleModeSelectorClick}
                            onKeyDown={handleModeSelectorKeyDown}
                            className={`menu-action-button mobile-portrait-action-button how-to-mode-selector w-full rounded-lg border-0 text-white transition-all hover:brightness-105 ${selectedMode === 'easy' ? 'bg-[#38bdf8]' : 'bg-[#ef5350]'}`}
                          >
                            {selectedMode === 'hard' && <ChevronLeft className="how-to-mode-selector-arrow how-to-mode-selector-arrow-left" aria-hidden="true" />}
                            {selectedMode === 'easy' ? 'There is no Easy Mode' : 'Hard Mode'}
                            {selectedMode === 'easy' && <ChevronRight className="how-to-mode-selector-arrow how-to-mode-selector-arrow-right" aria-hidden="true" />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleStartOrResume}
                          disabled={selectedMode !== 'hard'}
                          className="menu-action-button mobile-portrait-action-button w-full rounded-lg bg-[#08795c] hover:brightness-110 active:brightness-95 text-white font-bold text-sm sm:text-base transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Start
                        </button>
                      </div>
                    </aside>
                    <MechanicsGuide theme={theme} />
                  </div>
                </div>
              )}

              {state === 'menu' && (
                <div className="mobile-portrait-guide w-full h-full flex-col items-center justify-center gap-3 p-3 text-center">
                  <div className="mobile-portrait-hero w-full rounded-xl overflow-hidden">
                    <MenuHero theme={theme} />
                  </div>
                  <button type="button" onClick={() => setMobileGuideOpen(true)} className="menu-action-button mobile-portrait-action-button mobile-portrait-how-to-play w-full rounded-lg border border-[#ffd230] bg-slate-900/85 text-[#ffd230] hover:bg-slate-800 font-bold text-sm font-mono-term">
                    How to Play
                  </button>
                  <div className="how-to-controls mobile-portrait-controls w-full flex flex-col gap-2">
                    <div className="how-to-mode-buttons">
                      <button
                        type="button"
                        aria-label="Change game mode"
                        aria-live="polite"
                        onClick={handleModeSelectorClick}
                        onKeyDown={handleModeSelectorKeyDown}
                        className={`menu-action-button mobile-portrait-action-button how-to-mode-selector w-full rounded-lg border-0 text-white transition-all hover:brightness-105 ${selectedMode === 'easy' ? 'bg-[#38bdf8]' : 'bg-[#ef5350]'}`}
                      >
                        {selectedMode === 'hard' && <ChevronLeft className="how-to-mode-selector-arrow how-to-mode-selector-arrow-left" aria-hidden="true" />}
                        {selectedMode === 'easy' ? 'There is no Easy Mode' : 'Hard Mode'}
                        {selectedMode === 'easy' && <ChevronRight className="how-to-mode-selector-arrow how-to-mode-selector-arrow-right" aria-hidden="true" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartOrResume}
                      disabled={selectedMode !== 'hard'}
                      className="menu-action-button mobile-portrait-action-button w-full rounded-lg bg-[#08795c] hover:brightness-110 active:brightness-95 text-white font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Start
                    </button>
                  </div>
                </div>
              )}

              {/* PAUSE & GAME OVER WINDOWS */}
              {state !== 'menu' && (
                <div className={`game-result ${state === 'over' ? 'game-result-over' : ''} relative isolate overflow-hidden max-w-md w-full text-center bg-[var(--panel)] border border-[var(--line)] rounded-xl p-6 sm:p-7 shadow-2xl`}>
                  {state === 'over' && <><LiquidatedBackdrop day={theme === 'light'} /><div className="absolute inset-0 bg-slate-950/15 pointer-events-none" aria-hidden="true" /></>}
                  <div className={`relative z-10 ${state === 'over' ? 'game-result-content pt-28 pb-4' : ''}`}>

                    {state === 'paused' && <h2 className="font-black tracking-tight mb-2 font-mono-term text-3xl sm:text-4xl text-[#08795c]">Margin Call</h2>}


                    {/* Score summary on game over */}
                    {state === 'over' && (
                      <div className="py-3 my-4 bg-[var(--alt)] border border-[var(--line)] rounded-lg font-mono-term text-xs">
                        <h2 className="font-black text-lg sm:text-xl text-red-400 mb-2">LIQUIDATED</h2>
                        <div>
                          <span className="text-xl sm:text-2xl font-bold text-[var(--text)] block">All-time High</span>
                          <strong className={`text-3xl sm:text-4xl block mt-2 ${theme === 'light' ? 'text-[#08795c]' : 'text-[#55d6ae]'}`}>{Math.round(currentResult).toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2.5 mt-5">
                      <button
                        type="button"
                        onClick={handleStartOrResume}
                        className="margin-call-action w-full rounded-lg bg-[#08795c] hover:brightness-110 active:brightness-95 text-white font-bold font-mono-term text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>{state === 'paused' ? 'Continue' : 'New Game'}</span>
                      </button>
                      {state === 'paused' && <button type="button" onClick={() => {
                        const portraitMobile = window.matchMedia('(max-width: 1024px) and (orientation: portrait) and (pointer: coarse)').matches;
                        if (portraitMobile) setMobileGuideOpen(true);
                        else setPausedGuideOpen(true);
                      }} className="margin-call-action mobile-portrait-how-to-play how-to-play-action w-full rounded-lg font-bold font-mono-term">How to Play</button>}

                      {state === 'over' && <button type="button" onClick={() => setShareDDOpen(true)} className="share-dd-open w-full py-2.5 px-3 rounded-lg border border-[#38bdf8] bg-slate-900/85 text-[#38bdf8] hover:bg-slate-800 font-bold text-xs font-mono-term transition-colors cursor-pointer">Share DD</button>}

                      {state === 'over' && <button
                        type="button"
                        onClick={handleReturnMenu}
                        className="how-to-play-action liquidated-how-to-play w-full py-2.5 px-3 rounded-lg bg-slate-900/85 hover:bg-slate-800 font-bold text-xs font-mono-term transition-colors cursor-pointer"
                      >
                        How to Play
                      </button>}
                    </div>

                  </div>
                </div>
              )}

              {pausedGuideOpen && <div className="paused-guide-overlay absolute z-40" onPointerDown={e => e.stopPropagation()}>
                <div role="dialog" aria-modal="true" aria-labelledby="paused-guide-title" className="paused-guide-dialog bg-[var(--panel)] border border-[var(--line)] rounded-xl p-4" onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') setPausedGuideOpen(false); }}>
                  <div className="relative flex items-center justify-center pb-2 mb-3 min-h-10 px-10">
                    <h2 id="paused-guide-title" className="how-to-play-label text-xl sm:text-2xl font-black font-mono-term tracking-tight text-center">How to Play</h2>
                    <button type="button" autoFocus title="Close How to Play" aria-label="Close How to Play and return to pause" onClick={() => setPausedGuideOpen(false)} className="dialog-close absolute right-0 top-0 p-2 rounded border border-[var(--line)] text-[var(--text)] hover:bg-[var(--alt)] transition-colors cursor-pointer"><X className="w-5 h-5" aria-hidden="true" /></button>
                  </div>
                  <MechanicsGuide theme={theme} />
                </div>
              </div>}

            </div>
          )}
        </section>
        {shareDDOpen && state === 'over' && <ShareDD score={currentResult} onClose={() => setShareDDOpen(false)} theme={'dark'} />}

        {mobileGuideOpen && <div className="mobile-how-to-dialog fixed inset-0 z-50 flex items-center justify-center p-3" onPointerDown={e => e.stopPropagation()}>
          <div role="dialog" aria-modal="true" aria-labelledby="mobile-guide-title" className="mobile-how-to-panel w-full h-full overflow-hidden bg-[var(--panel)] border border-[var(--line)] rounded-xl p-3">
            <div className="relative flex items-center justify-center pb-2 mb-3 min-h-10 px-10">
              <h2 id="mobile-guide-title" className="how-to-play-label text-xl font-black font-mono-term tracking-tight text-center">How to Play</h2>
              <button type="button" autoFocus title="Close How to Play" aria-label="Close How to Play" onClick={() => setMobileGuideOpen(false)} className="dialog-close absolute right-0 top-0 p-2 rounded border border-[var(--line)] text-[var(--text)] hover:bg-[var(--alt)] transition-colors cursor-pointer"><X className="w-5 h-5" aria-hidden="true" /></button>
            </div>
            <MechanicsGuide theme={theme} />
          </div>
        </div>}

        {/* Global Footer */}
        <SiteFooter theme={theme} section={siteSection} setSection={setSiteSection} onOpen={() => { if (state === 'play') setState('paused'); }} />

      </div>
    </div>
  );
}
