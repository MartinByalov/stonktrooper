import { readWorkerConfig } from './workerConfig';

// uid adapts old UI hooks; its value is Google sub, NOT Firebase UID.
export interface BrowserUser { uid: string; displayName: string | null }
export const workerConfiguration = readWorkerConfig(import.meta.env);
let currentUser: BrowserUser | null = null;
// True once the server has said who is signed in (or that nobody is). Views that mount later start from this, not from "unknown".
let sessionKnown = false;
let generation = 0;
const listeners = new Set<(user: BrowserUser | null) => void>();
export const getBrowserUser = () => currentUser;
export const isBrowserSessionKnown = () => sessionKnown;
// Invalidate detached profile requests during logout, login and refresh; not a session credential.
export const getBrowserIdentityGeneration = () => generation;
function publish(user: BrowserUser | null) {
  currentUser = user;
  sessionKnown = true;
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
  // The first view asks the server. Later views (back from a game, a dialog or the Exchange) reuse the answer at once, so the
  // sign-in button never flashes while the same question is asked again.
  if (sessionKnown) next(currentUser);
  else void refreshBrowserSession().catch(failure => { if (active) error(failure); });
  return () => { active = false; listeners.delete(next); };
}
export async function signInBrowserGoogle(options: { consent?: boolean } = {}) {
  const data = await workerRequest(options.consent ? '/auth/start?consent=1' : '/auth/start', { method: 'POST' });
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
// Disconnect Google: the Worker revokes the grant and deletes its technical records; this browser forgets the account copy.
// The save file stays in the player's own Google Drive.
export async function disconnectBrowserGoogle() {
  generation++;
  await workerRequest('/auth/disconnect', { method: 'POST' });
  generation++;
  try {
    for (const key of Object.keys(localStorage)) {
      if (['cr_google_save_v1:', 'cr_pending_currencies_v1:', 'cr_retired_local_v1:', 'cr_retired_pending_v1:'].some(prefix => key.startsWith(prefix))) localStorage.removeItem(key);
    }
  } catch { /* Storage can be unavailable; the account is already disconnected. */ }
  publish(null);
}
export const browserAuthError = (error: unknown) => error instanceof Error ? error.message : 'Google sign-in unavailable. Please retry.';