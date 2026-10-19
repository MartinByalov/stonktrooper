// Browser game module for BoxingGame.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { bossColors } from './bossColors';
import { createBossArena, jumpBossPlayer, stepBossArena, throwBossCase, bossName, bossMaxHealth } from './boxingRules';
import type { BossArena } from './boxingRules';
import { sound } from './audio';

type Round = 'fight' | 'win' | 'lose';

export function BoxingGame({ onComplete, onDefeat, encounter, paused = false, headerHud = false, theme = 'dark' }: { onComplete: () => void; onDefeat: () => void; encounter: { current: BossArena | null }; paused?: boolean; headerHud?: boolean; theme?: 'light' | 'dark' }) {
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [round, setRound] = useState<Round>('fight');
  const [fightBanner, setFightBanner] = useState(true);
  const arena = useRef(encounter.current ?? createBossArena());
  const [health, setHealth] = useState(() => ({ lives: arena.current.player.lives, boss: arena.current.boss.health }));
  const maxHealth = bossMaxHealth(arena.current.boss.kind);
  const healthPercent = Math.max(0, Math.min(100, health.boss / maxHealth * 100));
  const header = headerHud ? document.querySelector('.game-app header') : null;
  const colors = bossColors(arena.current.boss.kind, theme === 'dark');

  const keys = useRef(new Set<string>());
  const touch = useRef(0);
  const phase = useRef<Round>(round);
  phase.current = round;
  const jump = () => { if (!pausedRef.current && phase.current === 'fight') jumpBossPlayer(arena.current); };
  const throwCase = () => {
    if (pausedRef.current || phase.current !== 'fight') return;
    const weapon = arena.current.weapon;
    if (!throwBossCase(arena.current)) return;
    if (weapon) sound.playEnemy(weapon, 1);
    else sound.playBriefcaseThrow();
  };
  const defeatCallback = useRef(onDefeat);
  defeatCallback.current = onDefeat;
  const completeCallback = useRef(onComplete);
  completeCallback.current = onComplete;
  useEffect(() => {
    if (round !== 'win') return;
    completeCallback.current();
  }, [round]);
  useEffect(() => {
    // The main chart configures its world coordinates in its layout effect first.
    if (encounter.current) arena.current = encounter.current;
  }, [encounter]);
  useEffect(() => {
    if (!fightBanner) return;
    const timer = window.setTimeout(() => setFightBanner(false), 1200);
    return () => window.clearTimeout(timer);
  }, [fightBanner]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.target instanceof HTMLElement && e.target.closest('input, select, textarea')) return;
      if (!['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space', 'KeyX', 'KeyW', 'ArrowUp'].includes(e.code)) return;
      if (pausedRef.current || phase.current !== 'fight') return;
      e.preventDefault(); keys.current.add(e.code);
      if (!e.repeat) {
        if (['Space', 'KeyX', 'KeyW', 'ArrowUp'].includes(e.code)) jump();
      }
    };
    const up = (e: KeyboardEvent) => { keys.current.delete(e.code); };
    const blur = () => { keys.current.clear(); touch.current = 0; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, []);
  useEffect(() => {
    let frame = 0, previous = 0, accumulator = 0;
    const loop = (now: number) => {
      if (pausedRef.current || document.hidden) {
        previous = 0; accumulator = 0;
        keys.current.clear(); touch.current = 0;
        arena.current.joystickX = 0;
        arena.current.jumpRequested = false; arena.current.attackRequested = false;
        frame = requestAnimationFrame(loop);
        return;
      }
      accumulator += previous ? Math.min((now - previous) / 1000, 0.1) : 0; previous = now;
      while (accumulator >= 1 / 60) {
        if (arena.current.jumpRequested) {
          arena.current.jumpRequested = false;
          if (phase.current === 'fight') jump();
        }
        if (arena.current.attackRequested) {
          arena.current.attackRequested = false;
          if (phase.current === 'fight') throwCase();
        }
        if (phase.current === 'fight') {
          const left = keys.current.has('ArrowLeft') || keys.current.has('KeyA');
          const right = keys.current.has('ArrowRight') || keys.current.has('KeyD');
          const lives = arena.current.player.lives;
          const previousAttack = arena.current.boss.attack;
          stepBossArena(arena.current, Math.abs(arena.current.joystickX) > 0.15 ? arena.current.joystickX : touch.current || Number(right) - Number(left));
          const a = arena.current;
          const punchCue = a.boss.kind === 'paul' ? (a.boss.attackKind === 'hook' ? 29 : a.boss.attackKind === 'tail' ? 37 : -1)
            : a.boss.kind === 'janet' && a.boss.attackKind === 'punch' ? 24 : 30;
          if (previousAttack === punchCue && a.boss.attack === punchCue - 1) sound.playKangarooPunch();
          if (a.player.lives < lives) sound.playHit();
          setHealth(h => h.lives === a.player.lives && h.boss === a.boss.health ? h : { lives: a.player.lives, boss: a.boss.health });
          if (a.result !== 'fight') {
            phase.current = a.result;
            if (a.result === 'lose') { defeatCallback.current(); return; }
            setRound('win');
          }
        }
        accumulator -= 1 / 60;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(frame); encounter.current = null; };
  }, [encounter]);

  return <div className="absolute inset-0 z-40 flex flex-col items-center justify-center text-white pointer-events-none p-3 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Bell boss challenge">
    <>
      {header && createPortal(<div className="boss-header-hud" style={{ color: colors.foreground }}>
        <span className="boss-header-name">{bossName(arena.current.boss.kind)}</span>
        <div className="boss-header-health" role="progressbar" aria-label="Enemy HP" aria-valuemin={0} aria-valuemax={maxHealth} aria-valuenow={health.boss} style={{ background: colors.track }}>
          <div style={{ width: `${healthPercent}%`, background: colors.foreground }} />
        </div>
      </div>, header)}
      <span className="sr-only" role="status">{health.lives} lives remaining. {bossName(arena.current.boss.kind)} health {Math.round(healthPercent)} percent.</span>
      <div className="absolute inset-0">
        {fightBanner && round === 'fight' && <div className="absolute inset-0 bg-slate-950/20 flex items-center justify-center font-black text-white pointer-events-none">
          <span className="text-3xl sm:text-5xl text-center">I DID NOT HEAR NO BELL</span>
        </div>}
      </div>
    </>
  </div>;
}