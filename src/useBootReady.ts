import { useEffect, useState } from 'react';
import { reportBootStage } from './bootProgress';
import { watchBrowserUser, workerConfiguration } from './browserIdentity';

// The boot screen stays until the page has really loaded: fonts, the page and its images, and the
// restored Google session. Each finished part moves the briefcase along its track.
export function useBootReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    const done = { fonts: false, load: false, session: !workerConfiguration.configured };
    const finish = () => {
      if (!active || !(done.fonts && done.load && done.session)) return;
      reportBootStage('save');
      requestAnimationFrame(() => { if (!active) return; reportBootStage('ready'); setReady(true); });
    };
    const part = (name: keyof typeof done, stage: Parameters<typeof reportBootStage>[0]) => () => {
      if (done[name]) return;
      done[name] = true; reportBootStage(stage); finish();
    };
    const fonts = part('fonts', 'network'), load = part('load', 'player'), session = part('session', 'recovery');
    (document.fonts?.ready ?? Promise.resolve()).then(fonts, fonts);
    if (document.readyState === 'complete') load(); else window.addEventListener('load', load, { once: true });
    let stop: (() => void) | undefined;
    if (!done.session) { try { stop = watchBrowserUser(() => session(), () => session()); } catch { session(); } }
    // Never keep the player waiting on a slow font or session request.
    const timer = window.setTimeout(() => { fonts(); load(); session(); }, 8000);
    return () => { active = false; window.clearTimeout(timer); window.removeEventListener('load', load); stop?.(); };
  }, []);
  return ready;
}
