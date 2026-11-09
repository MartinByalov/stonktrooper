// Opt-in CPU timings only; these do not measure asynchronous GPU/compositing work.
export const drawDiagnosticsEnabled = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('debug') === 'mobile';
const samples: { state: string; ms: number }[] = [];

export function recordDrawDuration(state: string, ms: number) {
  if (!drawDiagnosticsEnabled || !Number.isFinite(ms) || ms < 0) return;
  samples.push({ state, ms });
  if (samples.length > 3600) samples.shift();
}

export function drawDurationReport() {
  return Object.fromEntries(['menu', 'play', 'boxing', 'paused', 'over'].map(state => {
    const values = samples.filter(sample => sample.state === state).map(sample => sample.ms).sort((a, b) => a - b);
    const percentile = (fraction: number) => values.length
      ? Number(values[Math.min(values.length - 1, Math.floor(values.length * fraction))].toFixed(2)) : null;
    return [state, { samples: values.length, p50: percentile(.5), p95: percentile(.95), p99: percentile(.99) }];
  }));
}