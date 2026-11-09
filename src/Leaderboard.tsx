import { getGoogleTime } from './playerServices';
import { googlePeriod } from './googlePeriods';

import { getLeaderboard, peekLeaderboard, leaderboardConfigured, nativeServicesAvailable, type LeaderboardResult } from './playerServices';
import { PlayerAvatar } from './PlayerAvatar';
import { LOCAL_SANDBOX } from './localSandbox';
import { CloseButton } from './CloseButton';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ChartNoAxesColumn, ChevronLeft, ChevronRight, Vault, Trophy, ListChecks } from 'lucide-react';
import { AboutStar } from './AboutStar';
import { Loot } from './Loot';
import { Achievements } from './Achievements';
import { PromoCode } from './PromoCode';
import type { ReactNode } from 'react';
import { FriendsPreview, VaultPreview, type FriendlyRacePreview, type FriendsTestMode } from './CommunityPreview';

import { CURRENCIES, currencyLabels, equippedTitle, newProgress, type Progress } from './progression';
import { CurrencyFooter } from './Exchange';


// Fictional design fixtures, never submitted to Google Play Games.
const players = [
  ['DiamondHands', 128450], ['BullishBanana', 117820], ['MarginCaller', 109600],
  ['WhaleOfWallStreet', 98420], ['BuyHighSellLow', 87310], ['You', 76900],
  ['DefinitelyNotJerome', 65480], ['Bagholder', 54250], ['PoolOfLiquidity', 43980],
  ['Anonymous player', 32100], ['StonkAndRoll', 28750], ['PaperHands', 24120],
  ['DipCollector', 22300], ['MoonSoon', 21040], ['GreenCandle', 19820],
  ['LimitOrder', 18650], ['BullRun', 17400], ['DiamondDiver', 16220],
  ['ClosingBell', 14800], ['RocketEquity', 13250], ['LongGame', 11700],
  ['LiquidityEnjoyer', 10200], ['BananaBroker', 8450], ['OpeningBell', 6100],
  ['MarketMaker', 5900], ['ShortSqueeze', 5600], ['CoinCollector', 5300],
  ['BullMarket', 5000], ['CandleSurfer', 4700], ['RocketRider', 4400],
  ['ClosingPrice', 4100], ['LongPosition', 3800], ['DiamondPocket', 3500],
  ['GreenPortfolio', 3200], ['AfterHours', 2900], ['FirstTrade', 2600],
] as const;
const exampleTitles: Partial<Record<typeof players[number][0], string>> = {
  DiamondHands: 'Coinqueror',
  MarginCaller: 'Stonksworn',
  WhaleOfWallStreet: 'Wickzard',
  BuyHighSellLow: 'Copiumancer',
  Bagholder: 'Bagsquire',
};
const periods = ['Vault', 'Quests', 'Achievements', 'Stats'] as const;
// Friends and Rankings have no web backend yet; their panels stay in the file but are not offered.
type Section = typeof periods[number] | 'Friends' | 'Rankings';
const periodTitles: Record<Section, string> = { Friends: 'Friends', Stats: 'Statistics', Rankings: 'Rankings', Vault: 'Monthly Vault', Quests: 'Weekly Quests', Achievements: 'Achievements' };
const friendsPeriods = ['Daily', 'Weekly', 'All-time'] as const;
const categoryIcons = [Vault, ListChecks, Trophy, ChartNoAxesColumn];
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function dailyLeaderboardRank(claimPreview: boolean): number {
  return claimPreview ? 2 : players.findIndex(([name]) => name === 'You') + 1;
}

export function PodiumCrown({ rank }: { rank: number }) {
  const palettes = [
    ['#ffc928', '#ffb515', '#ffca28', '#ffbb16', '#ffdc42', '#eea20b', '#ffdd55'],
    ['#cbd5e1', '#94a3b8', '#dbe3ec', '#b4c0cf', '#f1f5f9', '#8494a8', '#f8fafc'],
    ['#cd965f', '#ac7140', '#d9a16b', '#be824d', '#f2c797', '#925c32', '#f4d1a7'],
  ];
  return <svg className="leaderboard-avatar-crown" data-metal={['gold', 'silver', 'bronze'][rank - 1]} style={Object.fromEntries(palettes[rank - 1].map((color, index) => [`--crown-${index}`, color])) as CSSProperties} width="18" height="14" viewBox="0 0 36 28" aria-hidden="true">
    <path d="M4 8 11 13 18 3 25 13 32 8 27 23H9Z" fill="var(--crown-0)" />
    <path d="M18 3 21 16 25 13 32 8 27 23H18Z" fill="var(--crown-1)" />
    <path d="m4 8 7 5 3-5 4 7 4-7 3 5 7-5-5 15H9Z" fill="var(--crown-2)" />
    <path d="m6 13 5 3 7-1 7 1 5-3-3 10H9Z" fill="var(--crown-3)" />
    <circle cx="4" cy="6" r="2.5" fill="var(--crown-4)" />
    <circle cx="18" cy="3" r="2.5" fill="var(--crown-4)" />
    <circle cx="32" cy="6" r="2.5" fill="var(--crown-4)" />
    <path d="M9 22h18v4H9Z" fill="var(--crown-5)" />
    <path d="M9 22h18v1.5H9Z" fill="var(--crown-6)" />
  </svg>;
}

export function Leaderboard({ onClose, theme, progress, token, playerId, signedIn = !!token, onSignIn, busy, initialSection = 'Vault', onClaimQuest, onRedeemPromo, onCollectAchievement, questWeek = null, monthlyAchievement, onRace, friendlyWins = [], onClaimVault, onClaimFriend, vaultMonth = null }: { vaultMonth?: string | null; onClaimFriend?: (friend: FriendlyRacePreview) => void; friendsMode?: FriendsTestMode; onFriendsMode?: (mode: FriendsTestMode) => void; onResetRaces?: () => void; onClaimVault?: (testOpen: boolean) => Promise<void>; friendlyWins?: readonly FriendlyRacePreview[]; initialSection?: Section; onClaimQuest?: (id: string) => Promise<void>; onRedeemPromo?: (code: string) => Promise<string>; onCollectAchievement?: (id: string) => void | Promise<void>; questWeek?: string | null; monthlyAchievement?: ReactNode; onRace?: (friend: FriendlyRacePreview) => void | Promise<void>; playerId?: string; signedIn?: boolean; onSignIn?: () => void; busy?: boolean; token?: string; onClose: () => void; theme: 'light' | 'dark'; progress?: Progress }) {
  const title = progress && equippedTitle(progress);
  const live = !LOCAL_SANDBOX && (leaderboardConfigured() || !import.meta.env.DEV);
  const [board, setBoard] = useState<LeaderboardResult | null>(null);
  const [viewVersion, setViewVersion] = useState(0);
  const [boardError, setBoardError] = useState('');
  const [boardLoading, setBoardLoading] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const claimPreview = LOCAL_SANDBOX || import.meta.env.DEV && new URLSearchParams(window.location.search).get('leaderboardPreview') === 'claim';
  const selfIndex = dailyLeaderboardRank(claimPreview) - 1;
  const [period, setPeriod] = useState<Section>(initialSection);
  const [promoOpen, setPromoOpen] = useState(false);
  const [friendsPeriod, setFriendsPeriod] = useState<'Daily' | 'Weekly' | 'All-time'>('Daily');
  const scorePeriod = friendsPeriod;
  useEffect(() => {
    if (!live) return;
    let active = true;
    setBoard(null); setBoardError(''); setBoardLoading(false);
    if (period !== 'Rankings') return;
    if (!signedIn || !playerId) { setBoardError('Sign in with Google to view online rankings.'); return; }
    if (!leaderboardConfigured()) { setBoardError('Online rankings are not configured in this build.'); return; }
    const rankingPeriod = friendsPeriod === 'All-time' ? 'all-time' : friendsPeriod === 'Daily' ? 'daily' : 'weekly';
    const cached = peekLeaderboard(playerId, rankingPeriod);
    setBoard(cached);
    setBoardLoading(!cached);
    let boundaryTimer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      const result = await getLeaderboard(playerId, rankingPeriod, viewVersion > 0);
      if (active) setBoard(result);
      if (rankingPeriod !== 'all-time') {
        try {
          const now = await getGoogleTime();
          if (!active) return;
          boundaryTimer = setTimeout(() => { if (active) setViewVersion(value => value + 1); }, Math.max(1000, googlePeriod(now, rankingPeriod).end - now));
        } catch { /* Rankings remain usable; no fabricated local countdown. */ }
      }
    };
    void load().catch(error => { if (active) setBoardError(cached ? 'Showing previous rankings. Could not refresh.' : error instanceof Error ? error.message : 'Rankings unavailable.'); })
      .finally(() => { if (active) setBoardLoading(false); });
    return () => { active = false; if (boundaryTimer) clearTimeout(boundaryTimer); };
  }, [live, token, playerId, signedIn, period, friendsPeriod, viewVersion]);
  useEffect(() => {
    const resume = () => { if (!document.hidden) setViewVersion(value => value + 1); };
    document.addEventListener('visibilitychange', resume);
    return () => document.removeEventListener('visibilitychange', resume);
  }, []);
  const rows: { name: string; score: number; rank: number; self: boolean; title?: string | null; avatar?: string }[] = live
    ? board?.entries ?? []
    : players.map(([name, score], index) => ({ name, score, rank: index + 1, self: index === selfIndex, title: index === selfIndex ? title?.name : exampleTitles[name] }));
  const changeFriendsPeriod = (direction: number) => setFriendsPeriod(previous => friendsPeriods[Math.max(0, Math.min(friendsPeriods.length - 1, friendsPeriods.indexOf(previous) + direction))]);
  const selectPeriod = (next: Section) => {
    setPeriod(next);
  };
  const showRewards = false;
  const factor = live ? 1 : scorePeriod === 'Daily' ? .24 : scorePeriod === 'Weekly' ? .61 : 1;
  const hasClaim = false;
  const claimSpace = 0;
  const displayWallet = progress?.wallet ?? newProgress().wallet;
  useEffect(() => { root.current?.querySelector('.leaderboard-table-scroll')?.scrollTo({ top: 0 }); }, [period, friendsPeriod]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    const containers = root.current?.querySelectorAll<HTMLElement>('.leaderboard-table-scroll');
    if (!containers) return;
    const measure = () => {
      const friendsButton = root.current?.querySelector('#leaderboard-tab-1');
      if (friendsButton) root.current?.style.setProperty('--leaderboard-row-height', `${friendsButton.getBoundingClientRect().height / 2}px`);
      const panel = root.current?.querySelector<HTMLElement>('.leaderboard-main');
      if (panel) {
        const width = panel.clientWidth;
        const heading = root.current?.querySelector('.exchange-heading h2')?.getBoundingClientRect();
        const center = heading ? heading.left + heading.width / 2 - panel.getBoundingClientRect().left : width / 2;
        const rank = Math.min(64, Math.max(42, width * .08));
        const action = period === 'Friends' ? 80 : 0;
        const title = (width - rank - action) / (period === 'Friends' ? 4 : 3);
        const player = title;
        panel.style.setProperty('--statistics-total-center', `${center}px`);
        panel.style.setProperty('--statistics-label-width', `${Math.max(0, center - 12)}px`);
        panel.style.setProperty('--community-rank-width', `${rank}px`);
        panel.style.setProperty('--leaderboard-title-width', `${title}px`);
        panel.style.setProperty('--leaderboard-player-width', `${player}px`);
        panel.style.setProperty('--leaderboard-score-width', `${title}px`);
        panel.style.setProperty('--friends-reward-width', `${title}px`);
      }
      root.current?.querySelectorAll<HTMLElement>('.leaderboard-table-scroll').forEach(container => {
      const rankWidth = Math.min(96, Math.max(48, window.innerWidth * .07));
      const width = hasClaim ? Math.max(600, container.clientWidth) : container.clientWidth;
      const raceWidth = period === 'Friends' ? 144 : 0;
      const titleWidth = (width - rankWidth - claimSpace - raceWidth) / (showRewards ? 4 : 3);
      const contentWidth = (width - rankWidth - titleWidth - claimSpace - raceWidth) / (showRewards ? 3 : 2);
      container.style.setProperty('--leaderboard-claim-space', `${claimSpace}px`);
      container.style.setProperty('--leaderboard-content-width', `${contentWidth}px`);
      container.style.setProperty('--leaderboard-rewards-width', `${contentWidth + claimSpace}px`);
      container.style.setProperty('--leaderboard-score-offset', '0px');
      const header = container.querySelector('thead');
      if (header) container.style.setProperty('--leaderboard-heading-height', `${header.getBoundingClientRect().height}px`);
      const playerHeading = container.querySelector('.leaderboard-player-heading');
      const rewardLabel = container.querySelector('.friends-race-table thead th:nth-child(5) > span');
      if (rewardLabel) {
        const range = document.createRange(); range.selectNodeContents(rewardLabel);
        const center = (range.getBoundingClientRect().right + (root.current?.getBoundingClientRect().right ?? window.innerWidth)) / 2;
        container.querySelectorAll<HTMLElement>('.friend-action-cell').forEach(cell => {
          cell.style.setProperty('--friend-action-center', `${center - cell.getBoundingClientRect().left}px`);
        });
      }
      const playerLabel = playerHeading?.querySelector('span');
      const titleLabel = container.querySelector<HTMLElement>('.leaderboard-title-heading > span');
      if (titleLabel) titleLabel.style.transform = 'none';
      const scoreLabel = container.querySelector<HTMLElement>('.leaderboard-score-heading > span');
      if (scoreLabel) scoreLabel.style.transform = '';
      container.querySelectorAll<HTMLElement>('.leaderboard-reward').forEach(reward => {
        const prize = reward.querySelector('.leaderboard-prize');
        if (!prize) return;
        const bounds = reward.getBoundingClientRect();
        const right = prize.getBoundingClientRect().right;
        const edge = reward.closest('td')!.getBoundingClientRect().right;
        reward.style.setProperty('--leaderboard-claim-center', `${(right + edge) / 2 - bounds.left}px`);
      });
      if (playerHeading && playerLabel) {
        const rankLabel = container.querySelector('.leaderboard-rank-heading > span');
        if (rankLabel) {
          const rankRange = document.createRange(); rankRange.selectNodeContents(rankLabel);
          const playerRange = document.createRange(); playerRange.selectNodeContents(playerLabel);
          const avatarCenter = (rankRange.getBoundingClientRect().right + playerRange.getBoundingClientRect().left) / 2;
          const cellLeft = container.querySelector('.leaderboard-player')?.getBoundingClientRect().left ?? playerHeading.getBoundingClientRect().left + 4;
          container.style.setProperty('--community-avatar-left', `${avatarCenter - cellLeft - 12}px`);
          container.style.setProperty('--community-name-inset', `${playerRange.getBoundingClientRect().left - cellLeft}px`);
        }
      }
      });
    };
    const observer = new ResizeObserver(measure);
    const mutations = new MutationObserver(measure);
    if (root.current) mutations.observe(root.current, { childList: true, subtree: true });
    if (root.current) observer.observe(root.current);
    containers.forEach(container => {
      observer.observe(container);
      const header = container.querySelector('thead');
      if (header) observer.observe(header);
    });
    const friendsButton = root.current?.querySelector('#leaderboard-tab-1');
    if (friendsButton) observer.observe(friendsButton);
    measure();
    return () => { observer.disconnect(); mutations.disconnect(); };
  }, [period, friendsPeriod, theme]);

  return <div ref={root} className="leaderboard-overlay exchange-overlay" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title"
    onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const controls = root.current?.querySelectorAll<HTMLElement>('button:not([tabindex="-1"]), [tabindex="0"]');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}>
    <div className="exchange-heading"><AboutStar className="about-star community-rate-us leaderboard-star" onPress={() => setPromoOpen(true)} theme={theme} wallet={progress?.wallet ?? newProgress().wallet} hatSkin={progress?.equipped.hats ?? 'hats-classic'} /><h2 id="leaderboard-title">{periodTitles[period]}</h2>
      <CloseButton ref={closeButton} type="button" className="dialog-close mobile-dialog-close mobile-how-to-close leaderboard-close p-2 rounded border border-[var(--line)] text-[var(--text)] hover:bg-[var(--alt)] transition-colors cursor-pointer" aria-label="Close Leaderboard" onClick={onClose} />
    </div>
    {promoOpen && <PromoCode onClose={() => setPromoOpen(false)} onRedeem={onRedeemPromo} />}
    <div className="leaderboard-body">
    <div className="leaderboard-periods" role="tablist" aria-orientation="vertical" aria-label="Leaderboard sections">
      {periods.map((item, index) => {
        const Icon = categoryIcons[index];
        return <button key={item} type="button" role="tab" id={`leaderboard-tab-${index}`} aria-selected={period === item} aria-controls="leaderboard-panel" tabIndex={period === item ? 0 : -1}
          onClick={() => selectPeriod(item)} onKeyDown={event => {
            const next = event.key === 'ArrowDown' ? (index + 1) % periods.length : event.key === 'ArrowUp' ? (index + periods.length - 1) % periods.length : event.key === 'Home' ? 0 : event.key === 'End' ? periods.length - 1 : -1;
            if (next < 0) return;
            event.preventDefault(); selectPeriod(periods[next]);
            root.current?.querySelector<HTMLButtonElement>(`#leaderboard-tab-${next}`)?.focus();
          }}><Icon size={28} aria-hidden="true" /><span>{item}</span></button>;
      })}
    </div>
    <div id="leaderboard-panel" className="leaderboard-main" role="tabpanel" aria-labelledby={`leaderboard-tab-${periods.indexOf(period as typeof periods[number])}`}>
    {period === 'Friends' && <FriendsPreview theme={theme} onRace={onRace} onClaim={onClaimFriend} wins={friendlyWins} playerId={playerId} />}
    {period === 'Quests' && <Loot embedded theme={theme} onClose={onClose} progress={progress ?? newProgress()} questWeek={questWeek} onClaimQuest={onClaimQuest} onRedeemPromo={onRedeemPromo} />}
    {period === 'Achievements' && <Achievements embedded theme={theme} onClose={onClose} progress={progress ?? newProgress()} onCollect={onCollectAchievement} monthly={monthlyAchievement} />}
    {period === 'Vault' && <VaultPreview theme={theme} progress={progress ?? newProgress()} month={vaultMonth} onClaim={onClaimVault} busy={busy} />}
    {period === 'Stats' && <div className="community-scroll"><table className="community-table"><caption className="sr-only">Saved account statistics</caption><colgroup><col style={{ width: 'var(--statistics-label-width, 50%)' }} /><col /></colgroup><thead><tr><th><span>Stat</span></th><th><span className="statistics-total-label">Total</span></th></tr></thead><tbody>
      {[
        ['Best Score', progress?.bestAth ?? 0], ['Best PIPS', progress?.bestPips ?? 0], ['Runs', progress?.runs ?? 0],
        ['Deaths', progress?.deaths ?? 0], ['Bags thrown', progress?.throws ?? 0],
        ['Enemies defeated', Object.values(progress?.kills ?? {}).reduce((sum, count) => sum + count, 0)],
        ['Achievements claimed', progress?.rewardedAchievements.length ?? 0],
        ['Days played', progress?.loginDays.length ?? 0],
        ['Items owned', progress?.owned.length ?? 0],
        ['Titles owned', progress?.ownedTitles.length ?? 0],
        ...Object.entries(progress?.kills ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([enemy, count]) => [(enemy === 'jerome' ? 'Jeromes' : enemy.replaceAll('-', ' ') + 's') + ' defeated', count]),
        ...CURRENCIES.map(currency => [`${currencyLabels[currency]} collected`, progress?.lifetime[currency] ?? 0]),
      ].map(([label, value]) => <tr key={label}><th scope="row">{String(label).charAt(0).toUpperCase() + String(label).slice(1)}</th><td>{number.format(Number(value))}</td></tr>)}
    </tbody></table></div>}
    {period === 'Rankings' && <>
    {live && !signedIn && onSignIn && <button type="button" disabled={busy || !nativeServicesAvailable()} onClick={onSignIn}>Sign in with Google</button>}
    {live && (boardLoading || boardError || !rows.length) && <p role="status">{boardLoading ? 'Loading rankings...' : boardError || 'No scores yet for this period.'}</p>}
    {live && board?.self && board.self.rank <= 0 && <p role="status">Your score was saved: {board.self.score.toLocaleString('en-US')}. No public rank has been assigned yet.</p>}
    <div id="leaderboard-rankings" className="leaderboard-table-scroll" tabIndex={0}>
      <table className="leaderboard-table" data-rewards={showRewards} data-claim={hasClaim}>
        <caption className="sr-only">{live ? 'Online' : 'Example'} {friendsPeriod} Score rankings. Rankings do not grant rewards.</caption>
        <colgroup><col className="leaderboard-rank-column" /><col className="leaderboard-content-column" /><col className="leaderboard-title-column" /><col className="leaderboard-content-column" />{showRewards && <col className="leaderboard-rewards-column" />}</colgroup>
        <thead><tr><th scope="col" className="leaderboard-rank-heading"><span>Rank</span></th><th scope="col" className="leaderboard-player-heading"><span>Stonktrooper</span></th><th scope="col" className="leaderboard-title-heading"><span>Title</span></th><th scope="col" className="leaderboard-score-heading">{<div className="leaderboard-score-controls" role="group" aria-label="Ranking period"><button type="button" aria-label="Previous ranking period" disabled={friendsPeriod === 'Daily'} onClick={() => changeFriendsPeriod(-1)}><ChevronLeft size={14} aria-hidden="true" /></button><span className="leaderboard-score-period" aria-live="polite">{friendsPeriod === 'All-time' ? 'All-time High' : `${friendsPeriod} Score`}</span><button type="button" aria-label="Next ranking period" disabled={friendsPeriod === 'All-time'} onClick={() => changeFriendsPeriod(1)}><ChevronRight size={14} aria-hidden="true" /></button></div>}</th></tr></thead>
        <tbody>{rows.map(({name, score, rank, self, title: rowTitle, avatar}, index) => {
          const playerTitle = rowTitle;
          const displayedScore = Math.round(score * factor);
          return <tr key={rank} data-rank={rank} data-self={self || undefined} aria-label={self ? `Your position: rank ${rank}` : undefined}>
          <td><span className="leaderboard-rank" aria-label={`Rank ${rank}`}>{rank}</span></td>
          <td><span className="leaderboard-player"><span className="leaderboard-avatar" aria-hidden="true">{index < 3 && <PodiumCrown rank={index + 1} />}<PlayerAvatar uri={avatar} /></span><span className="leaderboard-name">{!live && claimPreview ? index === 1 ? 'You' : index === 5 ? 'TenderEnjoyer' : name : name}</span></span></td>
          <td className="leaderboard-title-cell">{playerTitle ? <span className="player-title leaderboard-player-title" title={playerTitle}>{playerTitle}</span> : <span aria-label="No title">—</span>}</td>
          <td className="leaderboard-score">{number.format(displayedScore)}</td>
        </tr>; })}</tbody>
      </table>
    </div>
    </>}
    </div>
    </div>
    <CurrencyFooter infinite={LOCAL_SANDBOX} autoHide wallet={displayWallet} theme={theme} label="Balance" hatSkin={progress?.equipped.hats ?? 'hats-classic'} className="screen-currency-footer leaderboard-balances" />
  </div>;
}






