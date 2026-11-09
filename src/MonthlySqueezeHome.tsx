import { useEffect, useMemo, useRef, useState } from 'react';
import { MonthlySqueezeCard } from './MonthlySqueezeCard';
import { createSqueezeStatusClient, type SqueezeStatusView } from './monthlySqueezeStatusClient';
import { claimedMarker, createSqueezeClaim, SqueezeClaimError } from './monthlySqueezeClaim';
import { claimIntent, readAccountEffort } from './monthlySqueezeGuest';
import { browserSqueezeStorage, createSqueezeConfirmationStore } from './monthlySqueezeStorage';
import { getBrowserUser, signInBrowserGoogle } from './browserIdentity';
import { readWorkerConfig } from './workerConfig';
import { readSqueezeEvent } from '../shared/monthlySqueezeConfig';
import { FIRST_MONTHLY_SQUEEZE } from '../shared/monthlySqueezeSchedule';

const noticeFor = (code: string) => code === 'profile' ? 'Your profile is still being prepared. Try again in a moment.'
  : code === 'not-unlocked' ? 'Not unlocked yet. Check back soon.'
  : code === 'reauth' ? 'Sign in with Google again to claim.'
  : code === 'retry' ? 'Could not confirm the claim. Press Claim to retry.'
  : 'Could not claim right now. Try again later.';

// The Home card: at most one Worker request per ten minutes; `owns` reads the save, `grant` saves.
export const SQUEEZE_REWARD_ID: string = FIRST_MONTHLY_SQUEEZE.reward.itemId;
export interface SqueezeSave { owned: boolean; owns: (itemId: string) => boolean; grant: (itemId: string) => Promise<void>; open?: () => void }
// The shared goal as the Exchange shows it: players joined out of the target; null when off.
export function useSqueezeProgress(): { participants: number | null; target: number } | null {
  const env = import.meta.env as Record<string, unknown>;
  const config = readWorkerConfig(env), event = readSqueezeEvent(env.VITE_MONTHLY_SQUEEZE_EVENT);
  const enabled = env.VITE_MONTHLY_SQUEEZE_ENABLED === 'true' && config.configured && !!event;
  const client = useMemo(() => enabled ? createSqueezeStatusClient({ env, event: event!, storage: browserSqueezeStorage() }) : null, [enabled]);
  const [view, setView] = useState<SqueezeStatusView | null>(() => client?.read() ?? null);
  useEffect(() => {
    if (!client) return;
    setView(client.read());
    const unsubscribe = client.subscribe(setView);
    void client.refresh().catch(() => {});
    return unsubscribe;
  }, [client]);
  if (!client) return null;
  return { participants: view?.status?.participants ?? null, target: view?.status?.target ?? FIRST_MONTHLY_SQUEEZE.participantTarget ?? 1000 };
}
export function MonthlySqueezeHome({ theme, uid, save }: { theme: 'light' | 'dark'; uid: string | null; save: SqueezeSave }) {
  const env = import.meta.env as Record<string, unknown>;
  const config = readWorkerConfig(env), event = readSqueezeEvent(env.VITE_MONTHLY_SQUEEZE_EVENT);
  if (env.VITE_MONTHLY_SQUEEZE_ENABLED !== 'true' || !config.configured || !event) return null;
  return <Card theme={theme} uid={uid} origin={config.origin} event={event} save={save} />;
}

function Card({ theme, uid, origin, event, save, section = false }: { theme: 'light' | 'dark'; uid: string | null; origin: string; event: NonNullable<ReturnType<typeof readSqueezeEvent>>; save: SqueezeSave; section?: boolean }) {
  const env = import.meta.env as Record<string, unknown>;
  const storage = useMemo(() => browserSqueezeStorage(), []);
  const statusClient = useMemo(() => createSqueezeStatusClient({ env, event, storage }), [event, storage]);
  const [view, setView] = useState<SqueezeStatusView>(() => statusClient.read());
  const [claimedHere, setClaimed] = useState(() => !!uid && claimedMarker(storage, origin, uid, event.id).read());
  // The save is the record: a new device that loads a save holding the item shows it as collected.
  const claimed = !!uid && (claimedHere || save.owned);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [askSignIn, setAskSignIn] = useState(false);
  const claimer = useRef<ReturnType<typeof createSqueezeClaim> | undefined>(undefined);
  // Target: the scheduled one for this event; the server's answer replaces it once known.
  const target = view.status?.target ?? FIRST_MONTHLY_SQUEEZE.participantTarget ?? 1000;
  // A Guest only sees the shared progress; their own effort is not counted anywhere.
  const personal = useMemo(() => uid ? readAccountEffort(storage, origin, uid, event) : undefined, [uid, storage, origin, event]);
  const unlocked = !!view.status?.unlocked;

  useEffect(() => {
    const unsubscribe = statusClient.subscribe(setView);
    // Ask again only if the cached number is old or the tab returns to the foreground.
    void statusClient.refresh().catch(() => {});
    const onVisible = () => { if (document.visibilityState === 'visible') void statusClient.refresh().catch(() => {}); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { unsubscribe(); document.removeEventListener('visibilitychange', onVisible); };
  }, [statusClient]);

  // The player's own confirmed contribution is added to the shown total without a request.
  useEffect(() => {
    if (uid && createSqueezeConfirmationStore(storage, origin, uid, event).read()) statusClient.noteOwnContribution();
  }, [uid, storage, origin, event, statusClient]);

  // A message shows over the card for a few seconds so the card never grows over the buttons.
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 8000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const runClaim = async () => {
    if (!uid || busy) return;
    setBusy(true); setNotice('');
    try {
      claimer.current ??= createSqueezeClaim({ env, event, storage, owned: () => save.owns(FIRST_MONTHLY_SQUEEZE.reward.itemId), grant: save.grant });
      await claimer.current.claim();
      claimIntent(storage, origin, event.id).clear();
      setClaimed(true);
    } catch (error) {
      if (error instanceof SqueezeClaimError && error.code === 'identity') claimer.current = undefined;
      setNotice(noticeFor(error instanceof SqueezeClaimError ? error.code : 'unavailable'));
    } finally { setBusy(false); }
  };

  // A Guest asked to claim, then signed in: credit the reward now.
  useEffect(() => {
    if (uid && unlocked && !claimed && claimIntent(storage, origin, event.id).read()) void runClaim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, unlocked, claimed]);

  // A claimed reward leaves Home; it lives on in Achievements.
  if (claimed) return section ? <MonthlySqueezeCard theme={theme} target={target} personal={event.threshold} threshold={event.threshold} unlocked claimed /> : null;
  const onClaim = () => {
    if (uid) { void runClaim(); return; }
    // A Guest has no account to receive it: ask them to sign in, and remember the request.
    claimIntent(storage, origin, event.id).write();
    setAskSignIn(true); setNotice('Sign in with Google to claim your reward.');
  };
  // Pressing the card (not its buttons) opens the Exchange at the reward.
  const openReward = !section && uid && save.open ? save.open : undefined;
  return <div className={section ? 'monthly-squeeze-section' : 'monthly-squeeze-home'} data-theme-card={theme} data-openable={openReward ? true : undefined}
    role={openReward ? 'button' : undefined} tabIndex={openReward ? 0 : undefined} aria-label={openReward ? 'Open the Monthly Squeeze reward in Exchange' : undefined}
    onClick={openReward ? event => { if (!(event.target as HTMLElement).closest('button, a')) openReward(); } : undefined}
    onKeyDown={openReward ? event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openReward(); } } : undefined}>
    <MonthlySqueezeCard theme={theme} participants={view.status?.participants} target={target} personal={personal} threshold={event.threshold}
      unlocked={unlocked} claimed={false} busy={busy} onClaim={onClaim} notice={notice}
      onNotice={askSignIn && !uid ? () => void signInBrowserGoogle().catch(() => setNotice('Google sign-in is unavailable. Try again later.')) : undefined}
      noticeAction="Sign in" />
  </div>;
}

// Used by the Achievements list: shows the collected Monthly Squeeze, once claimed on this device.
export function MonthlySqueezeAchievement({ theme, owned }: { theme: 'light' | 'dark'; owned: boolean }) {
  const env = import.meta.env as Record<string, unknown>;
  const config = readWorkerConfig(env), event = readSqueezeEvent(env.VITE_MONTHLY_SQUEEZE_EVENT), uid = getBrowserUser()?.uid ?? null;
  if (env.VITE_MONTHLY_SQUEEZE_ENABLED !== 'true' || !config.configured || !event || !uid) return null;
  if (!owned) return null;
  return <MonthlySqueezeCard theme={theme} target={FIRST_MONTHLY_SQUEEZE.participantTarget ?? 1000} personal={event.threshold} threshold={event.threshold} unlocked claimed />;
}

// The same card inside a dialog (Achievements or Loot): full size, listed as Done once claimed.
export function MonthlySqueezeSection({ theme, uid, save }: { theme: 'light' | 'dark'; uid: string | null; save: SqueezeSave }) {
  const env = import.meta.env as Record<string, unknown>;
  const config = readWorkerConfig(env), event = readSqueezeEvent(env.VITE_MONTHLY_SQUEEZE_EVENT);
  if (env.VITE_MONTHLY_SQUEEZE_ENABLED !== 'true' || !config.configured || !event) return null;
  return <Card theme={theme} uid={uid} origin={config.origin} event={event} save={save} section />;
}
