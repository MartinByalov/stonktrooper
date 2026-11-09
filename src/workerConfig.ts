export function readWorkerConfig(env: Record<string, unknown>) {
  const raw = typeof env.VITE_WORKER_API_URL === 'string' ? env.VITE_WORKER_API_URL.trim() : '';
  if (!raw) return { configured: false, origin: '' };
  try {
    const url = new URL(raw);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
      || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      return { configured: false, origin: '' };
    }
    return { configured: true, origin: url.origin };
  } catch { return { configured: false, origin: '' }; }
}