import { useEffect, useState, type CSSProperties } from 'react';
import { PlayerAvatar } from './PlayerAvatar';
import { PodiumCrown } from './Leaderboard';
import { SKINS, skinColors, type Progress } from './progression';
import { CosmeticPreview } from './CosmeticPreview';
import { AssetPreview } from './AssetPreview';
import { getGoogleTime, getFriendsScores } from './playerServices';
import { VAULT_REWARD_IDS, VAULT_TARGET, vaultReward, vaultRuns } from './vault';

// Last Friends list per player, so reopening the tab paints immediately.
const friendsCache = new Map<string, FriendlyRacePreview[]>();
// Warm the cache once per player on Home, so the first Friends open is instant.
export function prefetchFriends(playerId: string) {
  if (!playerId || friendsCache.has(playerId)) return;
  void getFriendsScores(playerId, false, false).then(entries => { if (!friendsCache.has(playerId)) friendsCache.set(playerId, entries); }).catch(() => {});
}

export function MonthlyVaultReset() {
  const [reset, setReset] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () => { void getGoogleTime().then(now => {
      if (!active) return;
      const date = new Date(now);
      setReset(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
      setFailed(false);
    }).catch(() => { if (active) { setReset(null); setFailed(true); } }); };
    refresh();
    const timer = setInterval(refresh, 60000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  return <span className="vault-reset">Resets in: {reset !== null
    ? <time dateTime={new Date(reset).toISOString()}>{new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(reset)} · 00:00 UTC</time>
    : failed ? 'Unavailable' : 'Loading…'}</span>;
}

export interface FriendlyRacePreview { id?: string; name: string; title: string; score: number; reward: number; claimed?: boolean; avatar?: string }
export const previewFriends: FriendlyRacePreview[] = [
  { name: 'DiamondHands', title: 'Coinqueror', score: 12500, reward: 3 },
  { name: 'BullishBanana', title: 'Bagsquire', score: 7500, reward: 2 },
  { name: 'BuyHighSellLow', title: 'Copiumancer', score: 3000, reward: 1 },
];
export const raceWon = (wins: readonly FriendlyRacePreview[], friend: FriendlyRacePreview) => wins.some(win => (win.id ?? win.name) === (friend.id ?? friend.name) && win.score === friend.score);
export type FriendsTestMode = 'default' | 'low' | 'updated' | 'empty' | 'loading' | 'error';
export function FriendsPreview({ onRace, onClaim, wins = [], playerId, theme }: { onRace?: (friend: FriendlyRacePreview) => void | Promise<void>; onClaim?: (friend: FriendlyRacePreview) => void; wins?: readonly FriendlyRacePreview[]; playerId?: string; theme: 'light' | 'dark' }) {
  const [friends, setFriends] = useState<FriendlyRacePreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [starting, setStarting] = useState(false);
  const [runError, setRunError] = useState('');
  const start = async (friend: FriendlyRacePreview) => {
    if (starting || !onRace) return;
    setStarting(true); setRunError('');
    try { await onRace({ ...friend, reward: 2 }); }
    catch (error) { setRunError(error instanceof Error ? error.message : 'Could not start the run. Please retry.'); }
    finally { setStarting(false); }
  };
  useEffect(() => {
    let active = true;
    let pending = false;
    const cached = playerId ? friendsCache.get(playerId) : undefined;
    setFriends(cached ?? []); setFailed(false); setLoading(!cached);
    if (!playerId) { setLoading(false); return; }
    const load = (resolve = false, fresh = true) => {
      if (pending || document.visibilityState === 'hidden') return;
      pending = true;
      void getFriendsScores(playerId, resolve, fresh).then(entries => { friendsCache.set(playerId, entries); if (active) { setFriends(entries); setFailed(false); } })
        .catch(() => { if (active) setFailed(true); }).finally(() => { pending = false; if (active) setLoading(false); });
    };
    const reload = () => load();
    // First paint may use the Play Games cache; later refreshes always reload.
    load(refresh > 0, refresh > 0 || !!cached);
    const timer = setInterval(reload, 30000);
    window.addEventListener('focus', reload);
    window.addEventListener('online', reload);
    document.addEventListener('visibilitychange', reload);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', reload); window.removeEventListener('online', reload); document.removeEventListener('visibilitychange', reload); };
  }, [playerId, refresh]);
  return <>
    {runError && <p role="alert">{runError}</p>}
    {failed && <div className="friends-actions friends-connect"><button className="how-to-play-action" type="button" disabled={loading || !playerId} onClick={() => setRefresh(value => value + 1)}>Connect Friends</button></div>}
    {!friends.length ? !failed && <div className="friends-empty" role="status" aria-busy={loading}>{loading ? 'Loading friends list.' : 'No friends in the list.'}</div> :
    <div className="leaderboard-table-scroll friends-table-scroll" tabIndex={0}>
      <table className="leaderboard-table friends-race-table" data-rewards="true" data-claim="true">
        <caption className="sr-only">Google friends Score rankings and Run actions. Reward preview: Claims are session-only and do not credit diamonds.</caption>
        <colgroup><col className="leaderboard-rank-column" /><col className="leaderboard-content-column" /><col className="leaderboard-title-column" /><col className="leaderboard-content-column" /><col className="friends-reward-column" /><col className="friends-race-column" /></colgroup>
        <thead><tr><th scope="col" className="leaderboard-rank-heading"><span>Rank</span></th><th scope="col" className="leaderboard-player-heading"><span>Stonktrooper</span></th><th scope="col" className="leaderboard-title-heading"><span>Title</span></th><th scope="col" className="leaderboard-score-heading"><span>Score</span></th><th scope="col"><span>Reward</span></th><th scope="col"><span className="sr-only">Run or Claim</span></th></tr></thead>
        <tbody>{friends.map((friend, index) => {
          const win = wins.find(entry => (entry.id ?? entry.name) === (friend.id ?? friend.name) && entry.score === friend.score);
          return <tr key={friend.id ?? friend.name} className="friend-preview-row" data-rank={index + 1}>
          <td><span className="leaderboard-rank">{index + 1}</span></td>
          <td><span className="leaderboard-player"><span className="leaderboard-avatar" aria-hidden="true">{index < 3 && <PodiumCrown rank={index + 1} />}<PlayerAvatar uri={friend.avatar} /></span><span className="leaderboard-name">{friend.name}</span></span></td>
          <td className="leaderboard-title-cell">{friend.title ? <span className="player-title leaderboard-player-title">{friend.title}</span> : <span aria-label="No title">—</span>}</td>
          <td className="leaderboard-score">{friend.score.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
          <td><span className="friend-preview-prize" aria-label="2 diamonds"><AssetPreview asset="diamond" theme={theme} currencyIcon />2</span></td>
          <td className="friend-action-cell">{win?.claimed ? <span className="achievement-done-stamp" aria-label="Run reward collected">Done</span> : <button type="button" className="friend-race-button achievement-collect" disabled={starting || (win ? !onClaim : !onRace)} title={win ? 'Reward preview only; no diamonds are credited yet' : undefined} onClick={() => win ? onClaim?.(win) : void start(friend)}>{win ? 'Claim' : 'Run'}</button>}</td>
        </tr>; })}</tbody>
      </table>
    </div>}
  </>;
}

// Visual proposal only: not month-scoped eligibility or a cosmetic entitlement.
export function VaultPreview({ theme, progress, month = null, onClaim, busy }: { theme: 'light' | 'dark'; progress: Progress; month?: string | null; onClaim?: (testOpen: boolean) => Promise<void>; busy?: boolean }) {
  // Games Played this UTC month, toward this month's reward.
  const target = VAULT_TARGET, runs = Math.min(target, vaultRuns(progress, month));
  const [revealed, setRevealed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState('');
  const rewardId = month ? vaultReward(month) : VAULT_REWARD_IDS[0];
  const owned = progress.owned.includes(rewardId);
  // An owned reward shows as claimed (card + Done), never a second Claim.
  const state = revealed || owned ? 'claimed' : runs >= target ? 'open' : 'closed';
  const shoes = SKINS.find(skin => skin.id === rewardId)!;
  useEffect(() => {
    if (!revealing) return;
    const timer = setTimeout(() => setRevealing(false), 2100);
    return () => clearTimeout(timer);
  }, [revealing]);
  return <div className="community-scroll community-preview vault-preview" style={{ '--vault-progress-color': skinColors(progress.equipped.candles, theme === 'dark')[0] } as CSSProperties}>
    <MonthlyVaultReset />
    <div className="vault-stage" data-vault-state={state} data-revealing={revealing || undefined}>
      {(state !== 'claimed' || revealing) && <img className="vault-mystery-art" src={`/achievements/vault-${revealing ? 'open' : 'closed'}.png`} alt={revealing ? 'Open Monthly Vault' : 'Closed Monthly Vault — hidden reward'} />}
      {(state === 'claimed' || revealing) && <article className="vault-item-card" data-skin={shoes.id}><h3>{shoes.name}</h3><CosmeticPreview skin={shoes} theme={theme} /><p className="vault-item-description">{(shoes.description ?? '').split(/(?<=[.!?])\s+/).map((line, index) => <span key={index} className="vault-description-line">{line}</span>)}</p></article>}
    </div>
    <div className="vault-progress-footer">
      {state === 'closed' && <><progress id="vault-progress" aria-label="Games Played" max={target} value={runs} /><label htmlFor="vault-progress">Games Played: {runs} / {target}</label></>}
      {state === 'claimed' && !revealing && <span className="achievement-done-stamp vault-done-stamp" aria-label="Vault reward collected">Done</span>}
      {state === 'open' && <button type="button" className="vault-claim achievement-collect" disabled={claiming || revealing || busy || !onClaim} onClick={async () => {
        if (!onClaim || claiming) return;
        setClaiming(true); setError('');
        try { await onClaim(false); setRevealing(true); setRevealed(true); }
        catch (failure) { setError(failure instanceof Error ? failure.message : 'Vault claim failed.'); }
        finally { setClaiming(false); }
      }}>Claim</button>}
      {error && <p role="alert">{error}</p>}
    </div>
  </div>;
}