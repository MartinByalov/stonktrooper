import { useEffect, useMemo, useRef, useState } from 'react';
import { MonthlySqueezeCard } from './MonthlySqueezeCard';
import { createSqueezeStatusClient, type SqueezeStatusView } from './monthlySqueezeStatusClient';
import { claimedMarker, createSqueezeClaim, SqueezeClaimError } from './monthlySqueezeClaim';
import { claimIntent, readAccountEffort } from './monthlySqueezeGuest';
import { browserSqueezeStorage, createSqueezeConfirmationStore } from './monthlySqueezeStorage';
import { getBrowserUser, signInBrowserGoogle } from './browserIdentity';
import { readWorkerConfig } from './workerConfig';
import { readSqueezeEvent } from '../shared/monthlySqueezeConfig';
import { FIRST_MONTHLY_SQUEEZE, MONTHLY_SQUEEZE_RELEASES } from '../shared/monthlySqueezeSchedule';

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
export function MonthlySqueezeHome({ theme, uid, save, onGuestPress }: { theme: 'light' | 'dark'; uid: string | null; save: SqueezeSave; onGuestPress?: () => void }) {
  const env = import.meta.env as Record<string, unknown>;
  const config = readWorkerConfig(env), event = readSqueezeEvent(env.VITE_MONTHLY_SQUEEZE_EVENT);
  if (env.VITE_MONTHLY_SQUEEZE_ENABLED !== 'true' || !config.configured || !event) return null;
  return <Card theme={theme} uid={uid} origin={config.origin} event={event} save={save} onGuestPress={onGuestPress} />;
}

function Card({ theme, uid, origin, event, save, onGuestPress, section = false }: { theme: 'light' | 'dark'; uid: string | null; origin: string; event: NonNullable<ReturnType<typeof readSqueezeEvent>>; save: SqueezeSave; onGuestPress?: () => void; section?: boolean }) {
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
  // The reward needs both: everyone's goal reached and this player's own part done.
  const didMyPart = personal !== undefined && personal >= event.threshold;
  const [failed, setFailed] = useState(false);

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
      setFailed(false);
      setClaimed(true);
    } catch (error) {
      setFailed(true);
      if (error instanceof SqueezeClaimError && error.code === 'identity') claimer.current = undefined;
      setNotice(noticeFor(error instanceof SqueezeClaimError ? error.code : 'unavailable'));
    } finally { setBusy(false); }
  };

  // The goal is reached by everyone and this player did their part: the reward is given by itself and the card turns to Done in
  // Achievements. One automatic try per card: if it fails, the message and a Claim button stay for a retry.
  const autoTried = useRef(false);
  useEffect(() => {
    if (!uid || !unlocked || !didMyPart || claimed || autoTried.current) return;
    autoTried.current = true;
    void runClaim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, unlocked, didMyPart, claimed]);

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
  // A Guest pressing the card is told, in the Live Feed, that signing in is what takes part and wins the reward.
  const press = openReward ?? (!section && !uid ? onGuestPress : undefined);
  return <div className={section ? 'monthly-squeeze-section' : 'monthly-squeeze-home'} data-theme-card={theme} data-openable={press ? true : undefined}
    role={press ? 'button' : undefined} tabIndex={press ? 0 : undefined}
    aria-label={openReward ? 'Open the Monthly Squeeze reward in Exchange' : press ? 'Log in to participate and win rewards' : undefined}
    onClick={press ? event => { if (!(event.target as HTMLElement).closest('button, a')) press(); } : undefined}
    onKeyDown={press ? event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); press(); } } : undefined}>
    <MonthlySqueezeCard theme={theme} participants={view.status?.participants} target={target} personal={personal} threshold={event.threshold}
      unlocked={unlocked} claimed={false} busy={busy} onClaim={onClaim} notice={notice} autoReward={!!uid} canRetry={failed}
      hint={uid && unlocked && !didMyPart ? `Goal reached. Complete your ${event.threshold} to receive the reward.` : undefined}
      onNotice={askSignIn && !uid ? () => void signInBrowserGoogle().catch(() => setNotice('Google sign-in is unavailable. Try again later.')) : undefined}
      noticeAction="Sign in" />
  </div>;
}

// Used by the Achievements list: shows the collected Monthly Squeeze, once claimed on this device.
// Releases are listed like any other achievement, as Done, once the player holds their reward. Nothing else is shown here.
export function MonthlySqueezeAchievement({ theme, ownedItems }: { theme: 'light' | 'dark'; ownedItems: readonly string[] }) {
  const env = import.meta.env as Record<string, unknown>;
  const config = readWorkerConfig(env), uid = getBrowserUser()?.uid ?? null;
  if (env.VITE_MONTHLY_SQUEEZE_ENABLED !== 'true' || !config.configured || !uid) return null;
  const done = MONTHLY_SQUEEZE_RELEASES.filter(release => ownedItems.includes(release.reward.itemId));
  if (!done.length) return null;
  return <>{done.map(release => <MonthlySqueezeCard key={release.event.id} release={release} theme={theme} target={release.participantTarget ?? 1000} personal={release.event.threshold} threshold={release.event.threshold} unlocked claimed showLabel={false} />)}</>;
}

// The same card inside a dialog (Achievements or Loot): full size, listed as Done once claimed.
export function MonthlySqueezeSection({ theme, uid, save }: { theme: 'light' | 'dark'; uid: string | null; save: SqueezeSave }) {
  const env = import.meta.env as Record<string, unknown>;
  const config = readWorkerConfig(env), event = readSqueezeEvent(env.VITE_MONTHLY_SQUEEZE_EVENT);
  if (env.VITE_MONTHLY_SQUEEZE_ENABLED !== 'true' || !config.configured || !event) return null;
  return <Card theme={theme} uid={uid} origin={config.origin} event={event} save={save} section />;
}
