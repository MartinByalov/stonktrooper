import { useEffect, useRef, useState } from 'react';
import { copyText } from './copyText';

// Opt in with ?debug=mobile. Nothing is uploaded and normal sessions do no sampling.
export function MobileDiagnostics() {
  const enabled = new URLSearchParams(window.location.search).get('debug') === 'mobile';
  const samples = useRef<{ state: string; ms: number }[]>([]);
  const [report, setReport] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let frame = 0, previous = 0, previousState = '';
    const tick = (now: number) => {
      const state = document.querySelector<HTMLElement>('.game-app')?.dataset.state ?? '';
      if (previous && state === previousState && !document.hidden) {
        samples.current.push({ state, ms: now - previous });
        if (samples.current.length > 3600) samples.current.shift();
      }
      previous = document.hidden ? 0 : now;
      previousState = state;
      frame = requestAnimationFrame(tick);
    };
    const reset = () => { previous = 0; };
    document.addEventListener('visibilitychange', reset);
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', reset); };
  }, [enabled]);
  if (!enabled) return null;
  const capture = () => {
    const bounds = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
      return { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height, paddingBottom: style.paddingBottom, display: style.display };
    };
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.appendChild(probe);
    const safe = getComputedStyle(probe);
    const safeArea = { top: safe.paddingTop, right: safe.paddingRight, bottom: safe.paddingBottom, left: safe.paddingLeft };
    probe.remove();
    const canvas = document.querySelector<HTMLCanvasElement>('.game-stage > canvas');
    const frameTimes = Object.fromEntries(['menu', 'play', 'boxing', 'paused'].map(state => {
      const values = samples.current.filter(sample => sample.state === state).map(sample => sample.ms).sort((a, b) => a - b);
      const percentile = (fraction: number) => values.length ? Number(values[Math.min(values.length - 1, Math.floor(values.length * fraction))].toFixed(2)) : null;
      return [state, { samples: values.length, p50: percentile(.5), p95: percentile(.95), p99: percentile(.99), over33ms: values.filter(ms => ms > 33.4).length }];
    }));
    setCopied(false);
    setReport(JSON.stringify({
      capturedAt: new Date().toISOString(), userAgent: navigator.userAgent,
      assets: Array.from(document.scripts).map(script => script.src).filter(Boolean),
      innerWidth, innerHeight, dpr: devicePixelRatio, fullscreen: !!document.fullscreenElement,
      visualViewport: window.visualViewport ? { height: visualViewport!.height, width: visualViewport!.width, scale: visualViewport!.scale, offsetTop: visualViewport!.offsetTop } : null,
      coarsePointer: matchMedia('(pointer: coarse)').matches, safeArea,
      app: bounds('.game-app'), shell: bounds('.game-app > div'), footer: bounds('.site-footer'),
      arena: bounds('.game-arena'), guide: bounds('.mobile-portrait-guide'), hero: bounds('.mobile-portrait-hero'),
      documentHeight: document.scrollingElement?.scrollHeight,
      canvas: canvas ? { width: canvas.width, height: canvas.height, display: bounds('.game-stage > canvas') } : null,
      // rAF intervals include scheduling/compositing delays; these are not canvas draw durations.
      rafFrameTimesMs: frameTimes,
    }, null, 2));
  };
  return <aside className="mobile-diagnostics" aria-label="Local mobile diagnostics" onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
    <button type="button" onClick={capture}>Capture diagnostics</button>
    {report && <>
      <button type="button" onClick={() => { void copyText(report, navigator, document).then(() => setCopied(true)).catch(() => setCopied(false)); }}>{copied ? 'Copied' : 'Copy report'}</button>
      <button type="button" onClick={() => setReport('')}>Hide report</button>
      <textarea aria-label="Mobile diagnostic report" readOnly value={report} />
    </>}
  </aside>;
}