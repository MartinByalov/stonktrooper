import { completesRun, finalGoogleScore } from './scoreSubmission';
import { getBrowserUser, subscribeBrowserUser } from './browserIdentity';
import { monthlyGameplayAction, prepareMonthlyGameplay } from './monthlySqueezeRuntime';
import { claimScoreReward, unlockScoreRewards } from './scoreRewards';
import { getGoogleTime, getGoogleRewardScores, syncGoogleAchievements } from './playerServices';
import { questWeek } from './quests';
import { vaultMonth } from './vault';
import { initializeAccount } from './initializeAccount';
import { applyPracticeCommand } from './practiceProgress';
import { createRunConnection, CONNECTION_GRACE_MS } from './runConnection';
import { retainRunCurrencies, restoreRunCurrencies, clearRunCurrencies, hasPendingCurrencies } from './pendingCurrencies';
import { commitOnlineProgress, requireOnline } from './onlineProgress';
import { useCallback, useEffect, useRef, useState } from 'react';
import { applyCommand, CURRENCIES, MOBILE_ACHIEVEMENTS, readProgress, type Progress, type ProgressCommand, type RewardKind } from './progression';
import type { LeaderboardLootReward } from './lootRewards';
import { nativeServicesAvailable, servicesAvailable, restoreGooglePlayer, readGoogleSave, writeGoogleSave, signInGoogle, submitGoogleScore, getGoogleOnlineState, watchGoogleConnectivity, type Account, type GooglePlayer } from './playerServices';
import { persistAccountSave, encodeCloudSave, type AccountSave } from './accountSave';
import { LOCAL_SANDBOX, sandboxProgress } from './localSandbox';
import { reportBootStage, restartBootProgress } from './bootProgress';

const achievementPreview = () => import.meta.env.DEV && new URLSearchParams(window.location.search).get('achievementPreview') === 'collect';
const exchangePreview = () => import.meta.env.DEV && new URLSearchParams(window.location.search).get('exchangePreview') === 'unowned';
const localPreview = () => achievementPreview() || exchangePreview();
const loadGuest = () => {
  try {
    const progress = readProgress(null);
    if (achievementPreview()) {
      progress.wallet = { coins: 1250, diamonds: 50, bags: 50, hats: 12, tenders: 8, bells: 3, bananas: 7 };
      for (const id of ['mage', 'bagholder']) {
        const requirements = MOBILE_ACHIEVEMENTS.find(a => a.id === id)!.requirements!;
        for (const currency of CURRENCIES) progress.lifetime[currency] = Math.max(progress.lifetime[currency], requirements[currency] ?? 0);
      }
      progress.rewardedAchievements = progress.rewardedAchievements.filter(id => !['mage', 'bagholder'].includes(id));
    }
    return LOCAL_SANDBOX ? sandboxProgress(progress) : progress;
  } catch { return LOCAL_SANDBOX ? sandboxProgress(readProgress(null)) : readProgress(null); }
};
export function useProgression() {
  const [networkOnline, setNetworkOnline] = useState(navigator.onLine);
  const [progress, setProgress] = useState(loadGuest);
  const current = useRef(progress);
  const [account, setAccount] = useState<Account | null>(null);
  const accountRef = useRef<Account | null>(null);
  const [googlePlayer, setGooglePlayer] = useState<GooglePlayer | null>(null);
  const saveRef = useRef<AccountSave | null>(null);
  const [busy, setBusy] = useState(!LOCAL_SANDBOX && nativeServicesAvailable());
  const [connecting, setConnecting] = useState(!LOCAL_SANDBOX && nativeServicesAvailable());
  const networkRef = useRef(navigator.onLine);
  const reconnecting = useRef(false);
  const reconnectVersion = useRef(0);
  const attachedEpoch = useRef(-1);
  const settlement = useRef<Promise<void> | null>(null);
  const working = useRef(false);
  const accountTransactions = useRef<Promise<void>>(Promise.resolve());
  const discoveringRewards = useRef(false);
  const attachmentPending = useRef(false);
  const attachmentCompletion = useRef<Promise<void> | null>(null);
  const ready = useRef(false);
  const [onlineReady, setOnlineReady] = useState(false);
  // Active Google week for Weekly Quests; null until Google time is known.
  const [questWeekKey, setQuestWeekKey] = useState<string | null>(() => LOCAL_SANDBOX || localPreview() ? questWeek(Date.now()) : null);
  const adoptWeek = useRef<() => Promise<void>>(async () => {});
  // Active UTC month for the Monthly Vault; null until Google time is known.
  const [vaultMonthKey, setVaultMonthKey] = useState<string | null>(() => LOCAL_SANDBOX || localPreview() ? vaultMonth(Date.now()) : null);
  const [practiceRun, setPracticeRun] = useState(true);
  const [connectionLostRun, setConnectionLostRun] = useState(false);
  const [connectionGrace, setConnectionGrace] = useState(false);
  const graceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const connection = useRef(createRunConnection());
  const run = useRef<{ id: string; epoch: number; playerId: string; scoreEligible: boolean } | null>(null);
  const runBaseline = useRef<Progress | null>(null);
  const playing = useRef(false);
  const presentingRun = useRef(false);
  const [error, setError] = useState('');
  const tournamentRewards: LeaderboardLootReward[] = progress.scoreRewards.filter(r => !r.claimed).map(r => ({
    id: r.id, period: r.period === 'all-time' ? 'All-time' : r.period === 'daily' ? 'Daily' : 'Weekly',
    rank: 0, threshold: r.threshold, score: r.score, coins: r.coins, diamonds: r.diamonds, claimable: true,
  }));
  const started = useRef(false);
  const sessionVersion = useRef(0);
  const preparedEpoch = useRef(-1);
  const display = useCallback((next: Progress) => {
    current.current = next;
    setProgress(next);
  }, []);
  const invalidate = useCallback((preservePresentation = false, connectionLost = false) => {
    if (connectionLost && presentingRun.current && run.current) {
      // Connectivity affects ranking eligibility, never the run's currencies.
      run.current.scoreEligible = false;
      setConnectionLostRun(true);
      setConnectionGrace(false);
      return;
    }
    if (connectionLost && playing.current && run.current) setConnectionLostRun(true);
    sessionVersion.current++;
    ready.current = false;
    run.current = null;
    if (presentingRun.current && connectionLost) {
      // Keep the online-run presentation, roll back wallet changes and use the memory-only reducer.
      const source = runBaseline.current ?? saveRef.current?.progress;
      if (source) display({ ...source, run: current.current.run });
      return;
    }
    // Locking the phone revokes earning authority, not the UI; only a confirmed failure enters Practice.
    if (preservePresentation) return;
    setOnlineReady(false); setPracticeRun(true);
    // Roll back all uncommitted account changes. Practice starts clean in memory.
    const practice = loadGuest();
    const source = runBaseline.current ?? saveRef.current?.progress;
    if (source) practice.equipped = { ...source.equipped };
    if (playing.current) {
      const oldRun = current.current.run;
      practice.run = oldRun ? { ...oldRun, collected: { ...practice.wallet }, settled: false } : null;
    }
    display(practice);
    runBaseline.current = null;
  }, [display]);

  const attach = useCallback(async (interactive: boolean, allowResults = false) => {
    // Browser accounts are Firebase accounts; never call a Capacitor Play bridge from Home restoration.
    if (!servicesAvailable()) { setBusy(false); setConnecting(false); setError(''); return; }
    if (presentingRun.current && (!allowResults || playing.current || run.current) || LOCAL_SANDBOX || localPreview() || document.hidden) return;
    if (working.current) { attachmentPending.current = true; return; }
    attachmentPending.current = false;
    working.current = true; setBusy(true); setConnecting(true); setError('');
    if (!ready.current) restartBootProgress();
    let releaseAttachment!: () => void;
    attachmentCompletion.current = new Promise<void>(resolve => { releaseAttachment = resolve; });
    invalidate(true);
    const version = sessionVersion.current;
    try {
      const network = await getGoogleOnlineState();
      setNetworkOnline(network.online);
      networkRef.current = network.online;
      if (!network.online) { invalidate(false, true); return; }
      requireOnline(network);
      reportBootStage('network');
      const player = interactive ? await signInGoogle() : await restoreGooglePlayer();
      if (!player) { invalidate(); accountRef.current = null; setAccount(null); setGooglePlayer(null); return; }
      reportBootStage('player');
      await restoreRunCurrencies(localStorage, player.playerId,
        () => readGoogleSave(player.playerId, interactive), writeGoogleSave);
      reportBootStage('recovery');
      const save = await initializeAccount({ storage: localStorage, playerId: player.playerId,
        readCloud: () => readGoogleSave(player.playerId, interactive) });
      reportBootStage('save');
      requireOnline(await getGoogleOnlineState(), network.epoch);
      if (version !== sessionVersion.current) return;
      preparedEpoch.current = network.epoch;
      attachedEpoch.current = network.epoch;
      saveRef.current = save;
      const next: Account = { ...player, token: '', revision: 0, progress: save.progress };
      accountRef.current = next; setAccount(next); setGooglePlayer(player);
      display(applyCommand({ ...save.progress, run: null }, { type: 'login' }, true));
      ready.current = true; setOnlineReady(true);
      void syncGoogleAchievements(player.playerId, save.progress);
    } catch (e) {
      if (version !== sessionVersion.current) return;
      invalidate();
      setError(e instanceof Error ? e.message : 'Sign in with Google to save progress.');
    } finally {
      // Finished (connected or not): the flight reaches the end of its track.
      reportBootStage('ready');
      working.current = false; setBusy(false); setConnecting(false);
      releaseAttachment();
      // A callback may arrive while the invalidated request is in flight; do not lose it to restore Home.
      if (attachmentPending.current) {
        attachmentPending.current = false;
        void attach(false);
      }
    }
  }, [display, invalidate]);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!LOCAL_SANDBOX && nativeServicesAvailable()) void attach(false);
    else { setBusy(false); setConnecting(false); }
  }, [attach]);
  // Browser account: signing in loads the player's Drive save; signing out returns to the Guest game.
  useEffect(() => {
    if (nativeServicesAvailable() || LOCAL_SANDBOX) return;
    const apply = (user: unknown) => {
      if (user) { if (!ready.current) void attach(false); return; }
      if (!accountRef.current && !saveRef.current) return;
      saveRef.current = null; runBaseline.current = null; preparedEpoch.current = -1; attachedEpoch.current = -1;
      presentingRun.current = false; playing.current = false;
      invalidate();
      accountRef.current = null; setAccount(null); setGooglePlayer(null); setError('');
    };
    if (getBrowserUser()) apply(getBrowserUser());
    return subscribeBrowserUser(apply);
  }, [attach, invalidate]);
  const observeNetwork = useCallback((network: { online: boolean; epoch: number }) => {
    const wasOnline = networkRef.current;
    networkRef.current = network.online;
    setNetworkOnline(network.online);
    if (!network.online) {
      reconnectVersion.current++;
      reconnecting.current = false;
      setConnecting(false);
    }
    // Reconnect authenticates once without loading a profile; repeated callbacks must not restart it.
    if (network.online && presentingRun.current && !wasOnline && !reconnecting.current) {
      const version = ++reconnectVersion.current;
      reconnecting.current = true; setConnecting(true);
      void (async () => {
        try {
          const identity = await restoreGooglePlayer();
          const validated = await getGoogleOnlineState();
          if (version !== reconnectVersion.current || !validated.online) return;
          if (!identity) throw new Error('Sign-in is unavailable.');
          if (run.current && identity.playerId !== run.current.playerId) {
            invalidate(true);
            throw new Error('Google account changed. Current run cannot use the new profile.');
          }
          attachedEpoch.current = validated.epoch;
        } catch (e) {
          if (version === reconnectVersion.current) setError(e instanceof Error ? e.message : 'Sign-in is unavailable.');
        } finally {
          if (version === reconnectVersion.current) { reconnecting.current = false; setConnecting(false); }
        }
      })();
    }
    if (run.current && presentingRun.current) {
      const status = connection.current.update(network.online);
      setConnectionGrace(status.grace);
      if (!status.eligible) { run.current.scoreEligible = false; setConnectionLostRun(true); }
      if (network.online) {
        clearTimeout(graceTimer.current); graceTimer.current = undefined;
        run.current.epoch = network.epoch;
      } else if (graceTimer.current === undefined) {
        graceTimer.current = setTimeout(() => {
          graceTimer.current = undefined;
          const expired = connection.current.update(false);
          setConnectionGrace(expired.grace);
          if (run.current && !expired.eligible) { run.current.scoreEligible = false; setConnectionLostRun(true); }
        }, CONNECTION_GRACE_MS);
      }
      return;
    }
    if (!network.online) invalidate(false, true);
    if (network.online && !playing.current && !presentingRun.current
      && (!ready.current || attachedEpoch.current !== network.epoch)) void attach(false);
  }, [attach, invalidate]);
  useEffect(() => {
    let disposed = false;
    let remove: (() => Promise<void>) | undefined;
    if (nativeServicesAvailable()) void watchGoogleConnectivity(observeNetwork)
      .then(handle => { if (disposed) void handle.remove(); else remove = () => handle.remove(); }).catch(() => invalidate());
    const offline = () => {
      if (servicesAvailable()) {
        // WebView emits transient offline hints on lock; native connectivity is authoritative.
        void getGoogleOnlineState().then(network => {
          if (disposed) return;
          observeNetwork(network);
        }).catch(() => invalidate(true));
        return;
      }
      setNetworkOnline(false); invalidate(false, true);
    };
    const online = () => {
      // Browser hints do not override Android's validated network state.
      if (!servicesAvailable()) { setNetworkOnline(navigator.onLine); return; }
      void getGoogleOnlineState().then(network => {
        if (disposed) return;
        observeNetwork(network);
      }).catch(() => {});
    };
    const foreground = () => {
      if (!nativeServicesAvailable()) return;
      // Native Play Games UI can briefly hide the WebView during a checked transaction; it validates epoch.
      if (working.current) return;
      if (document.hidden) { invalidate(true); return; }
      if (!playing.current) void attach(false);
      else if (nativeServicesAvailable()) void getGoogleOnlineState().then(network => {
        if (disposed) return;
        observeNetwork(network);
      }).catch(() => invalidate(true));
    };
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', foreground);
    return () => { disposed = true; void remove?.(); window.removeEventListener('offline', offline); window.removeEventListener('online', online); document.removeEventListener('visibilitychange', foreground); };
  }, [attach, observeNetwork, invalidate]);
  useEffect(() => () => clearTimeout(graceTimer.current), []);

  const commit = useCallback(async (next: Progress, epoch: number, publish = true) => {
    const save = saveRef.current;
    if (!save || !ready.current) throw new Error('Log in to save account progress.');
    const version = sessionVersion.current;
    const identity = await restoreGooglePlayer();
    if (identity?.playerId !== save.playerId) throw new Error('Google account changed. Log in again.');
    if (version !== sessionVersion.current) throw new Error('Session changed. This run is practice.');
    const updated = await commitOnlineProgress({ save: { ...save, progress: next, dirty: true }, epoch,
      online: getGoogleOnlineState, write: writeGoogleSave });
    if (version !== sessionVersion.current) throw new Error('Session changed. Reload Google progress.');
    persistAccountSave(localStorage, updated);
    void syncGoogleAchievements(updated.playerId, updated.progress);
    saveRef.current = updated;
    if (publish) {
      runBaseline.current = null;
      display(updated.progress);
    }
    if (accountRef.current) { accountRef.current = { ...accountRef.current, progress: updated.progress }; setAccount(accountRef.current); }
    return encodeCloudSave(updated) === encodeCloudSave({ ...save, progress: next });
  }, [display]);

  // Called before starting the engine, never asynchronously after gameplay starts.
  const prepareRun = useCallback(async () => {
    if (settlement.current) await settlement.current;
    await accountTransactions.current;
    if (working.current && attachmentCompletion.current) await attachmentCompletion.current;
    if (working.current) return false;
    if (LOCAL_SANDBOX || localPreview()) { await adoptWeek.current(); return true; }
    // Browser Guest play is local regardless of connectivity; Google play waits for the backend.
    if (!servicesAvailable()) return true;
    if (ready.current && !(saveRef.current && hasPendingCurrencies(localStorage, saveRef.current.playerId))) {
      try {
        const network = await getGoogleOnlineState();
        setNetworkOnline(network.online);
        requireOnline(network, preparedEpoch.current);
        // The loaded profile is attached; Play checks only its epoch, and a new week saves its baseline first.
        await adoptWeek.current();
        if (ready.current) return true;
      } catch { invalidate(); }
    }
    presentingRun.current = false;
    await attach(false);
    if (ready.current) await adoptWeek.current();
    // Online failures are not offline Practice. Retry Play Games instead.
    if (ready.current) return true;
    try { const network = await getGoogleOnlineState(); setNetworkOnline(network.online); return !network.online; }
    catch { return false; }
  }, [attach, invalidate]);
  const complete = useCallback(async (next: Progress, eligible: NonNullable<typeof run.current>) => {
    if (working.current) return;
    working.current = true;
    try {
      if (saveRef.current) retainRunCurrencies(localStorage, saveRef.current, next);
      const network = await getGoogleOnlineState();
      observeNetwork(network);
      // Offline completion retains the receipt for this account across restarts.
      if (!network.online) return;
      const status = connection.current.update(true);
      eligible.scoreEligible &&= status.eligible;
      eligible.epoch = network.epoch;
      if (!eligible.scoreEligible) {
        if ((await restoreGooglePlayer())?.playerId !== eligible.playerId) throw new Error('Google account changed. Currencies remain with the original player.');
        await restoreRunCurrencies(localStorage, eligible.playerId,
          () => readGoogleSave(eligible.playerId), writeGoogleSave);
        ready.current = false;
      } else {
      const accepted = await commit(next, eligible.epoch);
      if (accepted) clearRunCurrencies(localStorage, eligible.playerId);
      if (accepted && ready.current && run.current === eligible && eligible.scoreEligible) {
        const score = finalGoogleScore(next);
        if (score !== null && nativeServicesAvailable()) {
          // The next Play waits for the confirmed save, not for the leaderboard round-trip.
          void submitGoogleScore(eligible.playerId, score).catch(error => console.warn('Google Score submission failed.', error));
          // Optional reward discovery belongs to refreshTournamentRewards; it must not hold settlement or Play.
        }
      }
      }
    } catch (e) {
      // Loss can be detected by the final write first; route that ended online run Home too.
      try {
        const network = await getGoogleOnlineState();
        setNetworkOnline(network.online);
        if (!network.online || network.epoch !== eligible.epoch) setConnectionLostRun(true);
      } catch { /* A service error alone is not proof of lost connectivity. */ }
      invalidate(false, true);
      setError(e instanceof Error ? e.message : 'Currencies retained locally for this account.');
    } finally {
      clearTimeout(graceTimer.current); graceTimer.current = undefined; setConnectionGrace(false);
      run.current = null; playing.current = false; working.current = false;
    }
  }, [commit, invalidate, observeNetwork]);
  const command = useCallback((action: ProgressCommand) => {
    if (working.current) return;
    const preview = LOCAL_SANDBOX || localPreview();
    // Settings and About happen outside a run; they are account transactions, not Practice events.
    if (!preview && action.type === 'feat' && (action.feat === 'diamond-drop' || action.feat === 'coin-flip')
      && !playing.current && !run.current && ready.current && accountRef.current) {
      void accountAction(action).catch(() => { /* Account transaction reports the error. */ });
      return;
    }
    if (action.type === 'start') {
      clearTimeout(graceTimer.current); graceTimer.current = undefined;
      connection.current = createRunConnection(); setConnectionGrace(false);
      presentingRun.current = true;
      setConnectionLostRun(false);
      playing.current = true;
      if (!ready.current && !preview) display(loadGuest());
      // Native epoch is checked again before commit. No persistent practice state.
      runBaseline.current = ready.current ? structuredClone(current.current) : null;
      run.current = null;
      if (ready.current && accountRef.current) {
        // The epoch captured during prepareRun is supplied below by preparedEpoch.
        run.current = { id: action.id, epoch: preparedEpoch.current, playerId: accountRef.current.playerId, scoreEligible: true };
      }
      setPracticeRun(!run.current && !preview);
    }
    const gameplay = ['start', 'collect', 'kill', 'throw', 'feat', 'death', 'finish'].includes(action.type);
    if (!preview && !gameplay) return; // Account actions use the checked transaction path below.
    if (!preview && run.current && !nativeServicesAvailable() && !navigator.onLine) invalidate(false, true);
    try {
      const previous = current.current;
      const next = !preview && !run.current
        ? applyPracticeCommand(current.current, action)
        : applyCommand(current.current, action, true);
      display(LOCAL_SANDBOX ? sandboxProgress(next) : next);
      if (!preview && !nativeServicesAvailable() && getBrowserUser() && next !== previous) {
        if (action.type === 'start') monthlyGameplayAction('start', action.id);
        else if (action.type === 'death' && previous.run?.status === 'playing' && next.run?.status !== 'playing') monthlyGameplayAction('death');
        else if (action.type === 'finish') monthlyGameplayAction('finish');
        else if (action.type === 'reward' && action.kind === 'revive' && next.run?.status === 'playing') monthlyGameplayAction('revive');
      }
      if (next !== previous && !preview && run.current && saveRef.current && (action.type === 'collect' || action.type === 'death' || action.type === 'finish')) {
        retainRunCurrencies(localStorage, saveRef.current, next);
      }
      if (!preview && run.current && completesRun(action, next)) settlement.current = complete(next, run.current);
      else if (completesRun(action, next)) playing.current = false;
    } catch (e) { setError(e instanceof Error ? e.message : 'Progress update failed'); }
  }, [complete, display, invalidate]);
  const startPreparation = useCallback(async () => {
    // Auth unlocks memory-only browser gameplay, not cloud/native transactions.
    if (!nativeServicesAvailable() && getBrowserUser() && !servicesAvailable()) {
      if (!LOCAL_SANDBOX && !localPreview()) {
        try { await prepareMonthlyGameplay(); }
        catch { /* Base gameplay stays available; explicit tester recovery only. */ }
      }
      return true;
    }
    const result = await prepareRun();
    if (ready.current) {
      try { requireOnline(await getGoogleOnlineState(), preparedEpoch.current); }
      catch { invalidate(); }
    }
    if (ready.current && !nativeServicesAvailable() && getBrowserUser() && !LOCAL_SANDBOX && !localPreview()) {
      try { await prepareMonthlyGameplay(); }
      catch { /* Base gameplay stays available; explicit tester recovery only. */ }
    }
    // A connectivity race after preparation cannot start an online Practice run.
    if (!result || LOCAL_SANDBOX || localPreview() || ready.current) return result;
    if (!nativeServicesAvailable()) return true;
    try { const network = await getGoogleOnlineState(); setNetworkOnline(network.online); return !network.online; }
    catch { return false; }
  }, [prepareRun, invalidate]);
  const performAccountAction = async (action: ProgressCommand) => {
    if (settlement.current) await settlement.current;
    if (working.current && attachmentCompletion.current) await attachmentCompletion.current;
    if (!ready.current && !playing.current && !run.current) await attach(false, true);
    if (working.current) throw new Error('A save is still in progress. Please retry shortly.');
    if (!ready.current || !accountRef.current) throw new Error('Reconnecting. Please retry shortly.');
    const claimingReward = action.type === 'claimAchievement' || action.type === 'claimQuest' || action.type === 'claimVault' || action.type === 'redeemPromo';
    if ((run.current || playing.current) && !claimingReward) throw new Error('This account action is unavailable during a run.');
    working.current = true; setBusy(true); setError('');
    try {
      // Refresh the profile before spending or claiming; stale local balances never authorize purchases.
      const network = await getGoogleOnlineState(); requireOnline(network);
      const player = await restoreGooglePlayer();
      if (player?.playerId !== accountRef.current.playerId) throw new Error('Google account changed. Log in again.');
      // A live-run receipt belongs to unfinished gameplay; never settle it when opening a reward dialog.
      const activeRun = run.current;
      const previousSave = saveRef.current;
      if (!activeRun) await restoreRunCurrencies(localStorage, player.playerId, () => readGoogleSave(player.playerId), writeGoogleSave);
      const save = await initializeAccount({ storage: localStorage, playerId: player.playerId, readCloud: () => readGoogleSave(player.playerId) });
      requireOnline(await getGoogleOnlineState(), network.epoch);
      if (activeRun && (!previousSave || !ready.current || run.current !== activeRun
        || activeRun.playerId !== player.playerId
        || encodeCloudSave(save) !== encodeCloudSave(previousSave))) {
        throw new Error('Google progress changed during this run. Reconnect before claiming.');
      }
      saveRef.current = save;
      // Validate against the live earned counters but keep the confirmed wallet; never merge a profile.
      const claimBase = activeRun ? { ...current.current, wallet: { ...save.progress.wallet }, run: null } : { ...save.progress, run: null };
      // A quest Claim first adopts its (trusted) week if this save has not yet.
      const withWeek = (p: Progress) => action.type === 'claimQuest' ? applyCommand(p, { type: 'questWeek', week: action.week }, true)
        : action.type === 'claimVault' && action.month ? applyCommand(p, { type: 'vaultMonth', month: action.month }, true) : p;
      const next = applyCommand(withWeek(applyCommand(claimBase, { type: 'login' }, true)), action, true);
      const liveNext = activeRun ? applyCommand(withWeek(current.current), action, true) : null;
      if (!await commit(next, network.epoch, !activeRun)) throw new Error('Account action was not saved. Reconnect and retry.');
      if (activeRun && run.current === activeRun && liveNext) {
        // Rebase the live presentation and receipt on the confirmed reward; settlement must not duplicate it.
        runBaseline.current = next;
        display(liveNext);
        if (saveRef.current) retainRunCurrencies(localStorage, saveRef.current, liveNext);
      }
    } catch (e) { invalidate(); setError(e instanceof Error ? e.message : 'Account action failed'); throw e; }
    finally { working.current = false; setBusy(false); }
  };
  const accountAction = (action: ProgressCommand): Promise<void> => {
    const transaction = accountTransactions.current.then(() => performAccountAction(action));
    accountTransactions.current = transaction.catch(() => {});
    return transaction;
  };
  const buyOrEquip = async (skinId: string) => {
    try {
      const action: ProgressCommand = current.current.owned.includes(skinId) ? { type: 'equip', skinId } : { type: 'purchase', skinId };
      if (LOCAL_SANDBOX || localPreview()) { display(applyCommand(current.current, action, true)); return; }
      await accountAction(action);
    } catch { /* Visible error is set by accountAction. */ }
  };
  const buyTitle = async (titleId: string) => { try { await accountAction({ type: 'purchaseTitle', titleId }); } catch { /* Visible error. */ } };
  const equipTitle = async (titleId: string | null) => { try { await accountAction({ type: 'equipTitle', titleId }); } catch { /* Visible error. */ } };
  const claimAchievement = async (achievementId: string) => { await accountAction({ type: 'claimAchievement', achievementId }); };
  useEffect(() => { if (onlineReady) void adoptWeek.current(); }, [onlineReady]);
  // Weekly Quests and the Monthly Vault count from the first online run, attach or Loot open.
  adoptWeek.current = async () => {
    let now: number;
    try { now = LOCAL_SANDBOX || localPreview() ? Date.now() : await getGoogleTime(); } catch { return; } // Google time is optional for Play.
    const week = questWeek(now), month = vaultMonth(now);
    setQuestWeekKey(week); setVaultMonthKey(month);
    const { weekly, vault } = current.current;
    const pending: ProgressCommand[] = [];
    if (!weekly || weekly.week < week) pending.push({ type: 'questWeek', week });
    if (!vault || vault.month < month) pending.push({ type: 'vaultMonth', month });
    if (!pending.length) return;
    if (LOCAL_SANDBOX || localPreview()) { display(pending.reduce((p, action) => applyCommand(p, action, true), current.current)); return; }
    if (playing.current || run.current || presentingRun.current || !ready.current) return;
    for (const action of pending) {
      try { await accountAction(action); } catch { return; /* accountAction reports the error. */ }
    }
  };
  // Vault claims use the adopted month, like quest Claims use the adopted week.
  const claimVault = async (testOpen = false) => {
    const month = current.current.vault?.month ?? vaultMonthKey ?? undefined;
    if (!month && !testOpen) throw new Error('The Monthly Vault is still loading. Please retry.');
    const action: ProgressCommand = { type: 'claimVault', testOpen, month };
    if (LOCAL_SANDBOX || localPreview()) {
      display(applyCommand(month ? applyCommand(current.current, { type: 'vaultMonth', month }, true) : current.current, action, true));
      return;
    }
    await accountAction(action);
  };
  // Claims use the adopted week from Google time, so they never wait for optional time reads.
  const claimQuest = async (questId: string) => {
    const week = current.current.weekly?.week ?? questWeekKey;
    if (!week) throw new Error('Weekly quests are still loading. Please retry.');
    if (LOCAL_SANDBOX || localPreview()) {
      display(applyCommand(applyCommand(current.current, { type: 'questWeek', week }, true), { type: 'claimQuest', questId, week }, true));
      return;
    }
    await accountAction({ type: 'claimQuest', questId, week });
  };
  const claimStarCoin = async () => {
    if (LOCAL_SANDBOX || localPreview()) { display(applyCommand(current.current, { type: 'starCoin' }, true)); return; }
    await accountAction({ type: 'starCoin' });
  };
  const claimMonthly = async (skinId: string) => { await accountAction({ type: 'grantMonthly', skinId }); };
  const ownsItem = (skinId: string) => current.current.owned.includes(skinId);
  const redeemPromo = async (code: string) => { await accountAction({ type: 'redeemPromo', code }); return 'Potato unlocked! Equip it in Exchange → Pets.'; };
  const signIn = async () => {
    await attach(true);
    // A practice engine must never inherit authenticated profile/run state.
    if (playing.current && ready.current) window.location.reload();
  };
  const restoreProfile = useCallback(() => {
    if (working.current && settlement.current) {
      void settlement.current.then(() => {
        if (!presentingRun.current && saveRef.current && hasPendingCurrencies(localStorage, saveRef.current.playerId)) invalidate();
        if (!presentingRun.current && !ready.current && servicesAvailable()) void attach(false);
      });
      presentingRun.current = false; playing.current = false;
      return;
    }
    clearTimeout(graceTimer.current); graceTimer.current = undefined; setConnectionGrace(false);
    const leavingRun = presentingRun.current;
    presentingRun.current = false;
    playing.current = false;
    if (leavingRun && (!ready.current || saveRef.current && hasPendingCurrencies(localStorage, saveRef.current.playerId))) invalidate();
    if (!ready.current && !playing.current && servicesAvailable()) void attach(false);
  }, [attach, invalidate]);
  const reward = async (_kind: RewardKind): Promise<boolean> => { setError('Rewards are not available.'); return false; };
  const refreshTournamentRewards = useCallback(async () => {
    // Never replace an active engine/results or turn a Practice run online.
    if (settlement.current) await settlement.current;
    if (!nativeServicesAvailable() || discoveringRewards.current || working.current || playing.current || presentingRun.current || !ready.current || !accountRef.current) return;
    discoveringRewards.current = true;
    let saving = false;
    try {
      const network = await getGoogleOnlineState(); requireOnline(network);
      const id = accountRef.current.playerId;
      if ((await restoreGooglePlayer())?.playerId !== id) throw new Error('Google account changed.');
      let before: number, scores: Awaited<ReturnType<typeof getGoogleRewardScores>>, after: number;
      try {
        before = await getGoogleTime();
        scores = await getGoogleRewardScores(id);
        after = await getGoogleTime();
      } catch (error) {
        // Discovery is optional: keep settled rewards and retry next open; other failures still surface.
        console.warn('Reward verification deferred until Loot retry.', error);
        return;
      }
      // Slow optional reward discovery must not block Claim or a new run.
      await accountTransactions.current;
      if (working.current || playing.current || presentingRun.current || !ready.current || accountRef.current?.playerId !== id) return;
      working.current = true; saving = true;
      const save = await initializeAccount({ storage: localStorage, playerId: id, readCloud: () => readGoogleSave(id) });
      requireOnline(await getGoogleOnlineState(), network.epoch);
      saveRef.current = save;
      const base = { ...save.progress, run: null };
      const next = unlockScoreRewards(base, scores, before, after);
      if (next !== base) await commit(next, network.epoch);
      else display(base);
    } catch (e) { setError(e instanceof Error ? e.message : 'Google rewards unavailable.'); throw e; }
    finally { if (saving) working.current = false; discoveringRewards.current = false; }
  }, [commit, display]);
  const claimLeaderboardReward = async (id: string) => {
    if (settlement.current) await settlement.current;
    if (working.current || playing.current || presentingRun.current || !ready.current || !accountRef.current) throw new Error('Return Home and sign in with Google to claim.');
    working.current = true;
    try {
      const network = await getGoogleOnlineState(); requireOnline(network);
      const playerId = accountRef.current.playerId;
      if ((await restoreGooglePlayer())?.playerId !== playerId) throw new Error('Google account changed.');
      const save = await initializeAccount({ storage: localStorage, playerId, readCloud: () => readGoogleSave(playerId) });
      saveRef.current = save;
      const next = claimScoreReward({ ...save.progress, run: null }, id);
      if (!await commit(next, network.epoch)) throw new Error('Reward was not saved. Reconnect and retry.');
    } catch (e) { invalidate(); setError(e instanceof Error ? e.message : 'Reward claim failed.'); throw e; }
    finally { working.current = false; }
  };
  return { networkOnline, connecting, connectionGrace, restoreProfile, onlineReady: onlineReady || LOCAL_SANDBOX || localPreview(), practiceRun, connectionLostRun, prepareRun: startPreparation,
    equipTitle, claimAchievement, claimStarCoin, claimVault, claimQuest, questWeek: progress.weekly?.week ?? questWeekKey, vaultMonth: progress.vault?.month ?? vaultMonthKey, refreshQuestWeek: () => adoptWeek.current(), googlePlayer, tournamentRewards, refreshTournamentRewards, claimLeaderboardReward,
    progress, account, busy, error, command, signIn, reward, buyOrEquip, buyTitle, redeemPromo, claimMonthly, ownsItem };
}
