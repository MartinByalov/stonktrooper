import { readWorkerConfig } from './workerConfig';

// uid adapts old UI hooks; its value is Google sub, NOT Firebase UID.
export interface BrowserUser { uid: string; displayName: string | null }
export const workerConfiguration = readWorkerConfig(import.meta.env);
let currentUser: BrowserUser | null = null;
let generation = 0;
const listeners = new Set<(user: BrowserUser | null) => void>();
export const getBrowserUser = () => currentUser;
// Invalidate detached profile requests even during logout/login/refresh, before
// a replacement user is published. This is not a server session credential.
export const getBrowserIdentityGeneration = () => generation;
function publish(user: BrowserUser | null) {
  currentUser = user;
  for (const listener of listeners) listener(user);
}
export async function workerRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  if (!workerConfiguration.configured) throw new Error('Worker API is not configured. Guest play remains available.');
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid API path');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(workerConfiguration.origin + path, {
      ...init, credentials: 'include', cache: 'no-store', redirect: 'error', signal: controller.signal,
      headers: { ...Object.fromEntries(new Headers(init.headers)), 'X-Stonktrooper-Client': 'browser' },
    });
    if (response.status === 401) { generation++; publish(null); throw new Error('Sign in with Google again.'); }
    if (!response.ok) throw new Error('Account service unavailable. Please retry.');
    return response.status === 204 ? null : await response.json();
  } finally { clearTimeout(timeout); }
}
export function parseBrowserSession(value: unknown): BrowserUser | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid session response');
  const user = (value as Record<string, unknown>).user;
  if (user === null) return null;
  if (!user || typeof user !== 'object' || Array.isArray(user)) throw new Error('Invalid session identity');
  const { sub, name } = user as Record<string, unknown>;
  if (typeof sub !== 'string' || !/^[0-9]{1,255}$/.test(sub)
    || (name !== null && (typeof name !== 'string' || name.length > 200))) throw new Error('Invalid session identity');
  return { uid: sub, displayName: name as string | null };
}
export async function refreshBrowserSession() {
  const epoch = ++generation;
  const data = await workerRequest('/auth/session');
  if (epoch === generation) publish(parseBrowserSession(data));
}
export function subscribeBrowserUser(next: (user: BrowserUser | null) => void) {
  listeners.add(next);
  return () => { listeners.delete(next); };
}
export function watchBrowserUser(next: (user: BrowserUser | null) => void, error: (failure: unknown) => void) {
  let active = true;
  listeners.add(next);
  // Wait for server restoration before displaying signed-out UI.
  void refreshBrowserSession().catch(failure => { if (active) error(failure); });
  return () => { active = false; listeners.delete(next); };
}
export async function signInBrowserGoogle() {
  const data = await workerRequest('/auth/start', { method: 'POST' });
  if (!data || typeof data !== 'object') throw new Error('Invalid OAuth response');
  const url = new URL(String((data as Record<string, unknown>).authorizationUrl));
  if (url.origin !== 'https://accounts.google.com' || url.pathname !== '/o/oauth2/v2/auth'
    || url.searchParams.get('response_type') !== 'code') throw new Error('Invalid Google authorization URL');
  generation++;
  window.location.assign(url.href);
}
export async function signOutBrowserGoogle() {
  generation++;
  await workerRequest('/auth/logout', { method: 'POST' });
  generation++;
  publish(null);
}
export const browserAuthError = (error: unknown) => error instanceof Error ? error.message : 'Google sign-in unavailable. Please retry.';