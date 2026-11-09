import { useEffect, useState } from 'react';
import { frameIntervalSummary, getRenderMode, renderModes, setRenderMode, type RenderMode } from './renderExperiment';

const labels = { full: 'Normal', chart: 'Chart only', actors: 'Actors only', ui: 'UI only', hero: 'Hero + companions', pickups: 'Pickups only', enemies: 'Enemies only', effects: 'Effects only', none: 'No canvas' };

// Mounted only for ?debug=render. No measurements or UI in normal sessions.
export function RenderExperimentPanel() {
  const [mode, setMode] = useState<RenderMode>(getRenderMode);
  const [summary, setSummary] = useState('waiting');
  useEffect(() => {
    let frame = 0, previous = 0, published = 0, previousState = '';
    const values: number[] = [];
    const reset = () => { previous = 0; values.length = 0; };
    const tick = (now: number) => {
      const state = document.querySelector<HTMLElement>('.game-app')?.dataset.state ?? '';
      if (state !== previousState) reset();
      previousState = state;
      if (!document.hidden && (state === 'play' || state === 'boxing')) {
        if (previous) values.push(now - previous);
        previous = now;
        if (values.length > 300) values.shift();
      } else reset();
      if (now - published >= 1000) { setSummary(frameIntervalSummary(values)); published = now; }
      frame = requestAnimationFrame(tick);
    };
    document.addEventListener('visibilitychange', reset);
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', reset); };
  }, [mode]);
  return <aside aria-label="Render experiment" style={{ position: 'absolute', top: 55, right: 8, zIndex: 100, maxWidth: '90%', padding: 8, background: '#101827', color: '#fff', fontSize: 12 }} onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
    <label>Render test: <select aria-label="Render mode" value={mode} style={{ background: '#101827', color: '#fff' }} onChange={event => {
      const next = event.target.value as RenderMode;
      setRenderMode(next); setMode(next); setSummary('waiting');
    }}>{renderModes.map(value => <option key={value} value={value}>{labels[value]}</option>)}</select></label>
    <div aria-live="off">{summary}</div>
    <div>Gameplay samples · not display FPS</div>
    <div>All drawing modes keep text and axes.</div>
    <div>Physics stays active; hidden hazards still apply.</div>
  </aside>;
}