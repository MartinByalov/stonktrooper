import { finalGoogleScore } from './scoreSubmission';
import { createGoogleAchievementSync } from './googleAchievements';
import type { RewardScores } from './scoreRewards';
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { createLeaderboardCache } from './leaderboardCache';
import { type Progress } from './progression';
import { getBrowserUser, signInBrowserGoogle, workerRequest, workerConfiguration } from './browserIdentity';

interface PlayServicesBridge {
  loadAchievementDiagnostics(options: { playerId: string }): Promise<{ total: number; unlocked: number; stale: boolean }>;
  unlockAchievement(options: { playerId: string; achievementId: string }): Promise<void>;
  loadPlayerAvatar(options: { uri: string }): Promise<{ image: string }>;
  loadFriendsScores(options: { playerId: string; leaderboardId: string; interactive: boolean; forceReload: boolean }): Promise<{ entries: import('./CommunityPreview').FriendlyRacePreview[] }>;
  getGoogleTime(): Promise<{ now: number }>;
  loadRewardScores(options: { playerId: string; leaderboardId: string }): Promise<RewardScores>;
  getOnlineState(): Promise<{ online: boolean; epoch: number }>;
  addListener(event: 'connectivityChanged', listener: (state: { online: boolean; epoch: number }) => void): Promise<PluginListenerHandle>;
  syncSave(options: { playerId: string; expected?: string | null; data?: string; interactive?: boolean }): Promise<{ data: string | null; conflict: boolean }>;
  authenticate(options?: { silent: boolean }): Promise<GooglePlayer & { authenticated: boolean }>;
  submitLeaderboardScore(options: { leaderboardId: string; score: number; playerId: string }): Promise<Record<string, { score: number; newBest: boolean }>>;
  loadLeaderboard(options: { leaderboardId: string; period: string; forceReload?: boolean }): Promise<{ entries: LeaderboardResult['entries']; self?: LeaderboardResult['self'] }>;
}
// Google Play Games native bridge. There is no browser authentication fallback.
const bridge = registerPlugin<PlayServicesBridge>('StonktrooperPlay');
const mirrorGoogleAchievements = createGoogleAchievementSync((playerId, achievementId) => bridge.unlockAchievement({ playerId, achievementId }));
const achievementDiagnostics = new Map<string, Promise<unknown>>();
export const syncGoogleAchievements = async (playerId: string, progress: Progress) => {
  if (!nativeServicesAvailable() || !playerId) return;
  await mirrorGoogleAchievements(playerId, progress);
  // Temporary read-only QA: one successful read per owner/session. No timers,
  // progression writes or coupling between diagnostic failures and cloud saves.
  if (achievementDiagnostics.has(playerId)) return;
  const request = bridge.loadAchievementDiagnostics({ playerId });
  achievementDiagnostics.set(playerId, request);
  try {
    const result = await request;
    if (result.stale) achievementDiagnostics.delete(playerId);
  }
  catch (error) {
    achievementDiagnostics.delete(playerId);
    console.warn('Google achievement diagnostics unavailable.', error);
  }
};
const env = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env;
export const nativeServicesAvailable = () => Capacitor.isNativePlatform()
  && Capacitor.isPluginAvailable('StonktrooperPlay');
// Browser account: the signed-in player's progress is one save file in their own Google Drive,
// moved by the Worker. It answers the same questions as the native bridge (who is signed in,
// online or not, read/write the save), so the progression flow is shared with the app.
const webAccountAvailable = () => !Capacitor.isNativePlatform() && env.VITE_DRIVE_PROFILE_ENABLED === 'true'
  && workerConfiguration.configured && !!getBrowserUser();
export const servicesAvailable = () => nativeServicesAvailable() || webAccountAvailable();
// A new epoch for every loss of connection, like the native validated-network epoch.
let webEpoch = 1;
if (typeof window !== 'undefined') window.addEventListener('offline', () => { webEpoch++; });
const webOnlineState = () => ({ online: navigator.onLine, epoch: webEpoch });
function webPlayer(): GooglePlayer | null {
  const user = getBrowserUser();
  return user ? { playerId: user.uid, name: user.displayName ?? 'Player' } : null;
}
async function webSave(playerId: string, body?: { expected: string | null; data: string }): Promise<{ data: string | null; conflict: boolean }> {
  if (getBrowserUser()?.uid !== playerId) throw new Error('Google account changed. Log in again.');
  const result = await workerRequest('/save', body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) as Record<string, unknown> | null;
  if (!result || typeof result !== 'object' || typeof result.conflict !== 'boolean' || !(result.data === null || typeof result.data === 'string')) throw new Error('Invalid save response');
  if (getBrowserUser()?.uid !== playerId) throw new Error('Google account changed. Log in again.');
  return { data: result.data as string | null, conflict: result.conflict };
}
export const loadPlayerAvatar = async (uri: string) => {
  if (/^https:\/\//.test(uri)) return uri;
  if (!nativeServicesAvailable()) return '';
  return (await bridge.loadPlayerAvatar({ uri })).image;
};
// The sign-in plugin does not implement AdMob or its consent/SSV flow yet.
export const rewardedServicesAvailable = () => false;
export interface Session { token: string; playerId: string; name: string; progress: Progress }
export interface Account extends Session { revision: number }
export interface GooglePlayer { playerId: string; name: string }
export const getGoogleOnlineState = async () => nativeServicesAvailable() || !webAccountAvailable() ? bridge.getOnlineState() : webOnlineState();
export const getGoogleTime = async () => {
  if (!nativeServicesAvailable() && webAccountAvailable()) return Date.now();
  const result = await bridge.getGoogleTime();
  if (!Number.isSafeInteger(result.now) || result.now <= 0) throw new Error('Google time unavailable.');
  return result.now;
};
export const getGoogleRewardScores = (playerId: string) => {
  if (!googleLeaderboardsConfigured()) throw new Error('Google leaderboard is not configured.');
  return bridge.loadRewardScores({ playerId, leaderboardId: googleScoreBoard });
};
export const watchGoogleConnectivity = (listener: (state: { online: boolean; epoch: number }) => void) =>
  bridge.addListener('connectivityChanged', listener);
export const restoreGooglePlayer = async (): Promise<GooglePlayer | null> => {
  if (webAccountAvailable()) return webPlayer();
  if (!nativeServicesAvailable()) return null;
  const player = await bridge.authenticate({ silent: true });
  googleRankingCache.clear();
  return player.authenticated ? player : null;
};
export const signInGoogle = async (): Promise<GooglePlayer> => {
  if (!nativeServicesAvailable()) {
    const player = webPlayer();
    if (player) return player;
    await signInBrowserGoogle();
    throw new Error('Opening Google sign-in…');
  }
  const player = await bridge.authenticate();
  googleRankingCache.clear();
  return player;
};
export const readGoogleSave = (playerId: string, interactive = false) =>
  !nativeServicesAvailable() && webAccountAvailable() ? webSave(playerId) : bridge.syncSave({ playerId, interactive });
export const writeGoogleSave = (playerId: string, expected: string | null, data: string, interactive = false) =>
  !nativeServicesAvailable() && webAccountAvailable() ? webSave(playerId, { expected, data }) : bridge.syncSave({ playerId, expected, data, interactive });

const googleScoreBoard = env.VITE_PLAY_GAMES_SCORE_LEADERBOARD_ID ?? '';
// forceReload=false lets Play Games answer from its cache for an instant first paint.
export const getFriendsScores = async (playerId: string, interactive = false, forceReload = true) => {
  if (!nativeServicesAvailable() || !googleScoreBoard || !playerId) throw new Error('Friends unavailable.');
  return (await bridge.loadFriendsScores({ playerId, leaderboardId: googleScoreBoard, interactive, forceReload })).entries;
};
export const googleLeaderboardsConfigured = () => Capacitor.isNativePlatform()
  && Capacitor.isPluginAvailable('StonktrooperPlay') && !!googleScoreBoard;
export const leaderboardConfigured = () => googleLeaderboardsConfigured();
export const leaderboardProviderLabel = () => 'Stonktrooper';
export async function submitGoogleRun(progress: Progress, playerId: string): Promise<void> {
  const score = finalGoogleScore(progress);
  if (score === null) return;
  await submitGoogleScore(playerId, score);
}
export async function submitGoogleScore(playerId: string, score: number): Promise<void> {
  if (!googleLeaderboardsConfigured()) throw new Error('Google leaderboard is not configured; Score remains pending.');
  if (!playerId || !Number.isSafeInteger(score) || score <= 0) throw new Error('Invalid Google Score.');
  const board = googleScoreBoard;
  const receipt = await bridge.submitLeaderboardScore({ leaderboardId: board, score, playerId });
  if (!receipt?.['all-time'] || !Number.isSafeInteger(receipt['all-time'].score) || receipt['all-time'].score < score) {
    throw new Error('Google returned no valid Score receipt; result remains pending.');
  }
  console.info('Google Score receipt', JSON.stringify(receipt));
  for (const period of ['daily', 'weekly', 'all-time']) freshGoogleBoards.add(`${board}/${period}`);
  googleRankingCache.clear();
}
export interface LeaderboardResult {
  period: string; mode: string; endsAt: number | null;
  self: { rank: number; score: number } | null;
  entries: { name: string; title: string | null; score: number; rank: number; self: boolean; avatar?: string }[];
}
const googleRankingCache = createLeaderboardCache<LeaderboardResult>();
const freshGoogleBoards = new Set<string>();
type RankingPeriod = 'daily' | 'weekly' | 'all-time';
const rankingKey = (playerId: string, period: RankingPeriod) => JSON.stringify([playerId, googleScoreBoard, period]);
export function peekLeaderboard(playerId: string, period: RankingPeriod): LeaderboardResult | null {
  return playerId ? googleRankingCache.peek(rankingKey(playerId, period)) : null;
}
export async function getLeaderboard(playerId: string, period: RankingPeriod, forceReload = false): Promise<LeaderboardResult> {
  if (!googleLeaderboardsConfigured()) throw new Error('Google leaderboard is not configured.');
  if (!playerId) throw new Error('Sign in with Google to view online rankings.');
  if (forceReload) googleRankingCache.clear();
  return googleRankingCache.get(rankingKey(playerId, period), async () => {
    const key = `${googleScoreBoard}/${period}`;
    const result = await bridge.loadLeaderboard({ leaderboardId: googleScoreBoard, period, forceReload: forceReload || freshGoogleBoards.has(key) });
    freshGoogleBoards.delete(key);
    return { ...result, self: result.self ?? null, period, mode: 'score', endsAt: null };
  });
}

