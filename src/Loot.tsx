import { useEffect, useRef, useState } from 'react';
import { ActionLabel } from './ActionLabel';
import { questClaimed, questDone, questGoalValue, weeklyQuests } from './quests';
import { DefeatedHead } from './PracticeKillsHud';
import { CurrencyFooter } from './Exchange';
import { animateCurrencyFlights, CURRENCY_COLLECTION_HOLD } from './currencyFlight';
import { AssetPreview, type PreviewAsset } from './AssetPreview';
import { CloseButton } from './CloseButton';
import { currencyLabels, newProgress, type Progress, type Currency } from './progression';
import { dailyLootReward, leaderboardLootRewards, type LeaderboardLootReward } from './lootRewards';
import './loot.css';

const assets: Record<Currency, PreviewAsset> = {
  coins: 'coin', diamonds: 'diamond', bags: 'bag', hats: 'fedora',
  tenders: 'tender', bells: 'bell', bananas: 'banana',
};

/** Reward layout preview. Claims remain disabled until backend integration. */
export function Loot({ embedded = false, theme, onClose, onRedeemPromo, onClaimQuest, progress = newProgress(), questWeek = null, leaderboardRewards = leaderboardLootRewards }: { embedded?: boolean; theme: 'light' | 'dark'; onClose: () => void; onRedeemPromo?: (code: string) => Promise<string>; onClaimQuest?: (id: string) => Promise<void>; progress?: Progress; questWeek?: string | null; leaderboardRewards?: readonly LeaderboardLootReward[] }) {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const collectionLock = useRef(false);
  const [collection, setCollection] = useState<{ id: string; amount: number; canvas: HTMLCanvasElement; x: number; y: number } | null>(null);
  const [credited, setCredited] = useState(0);
  const quests = questWeek ? weeklyQuests(questWeek) : [];
  const confirmed = !!collection && questClaimed(progress, collection.id, questWeek);
  const displayWallet = { ...progress.wallet };
  if (collection && confirmed) displayWallet.coins -= Math.round(collection.amount * (1 - credited));
  const claimQuest = async (id: string) => {
    if (!onClaimQuest || redeeming || collectionLock.current) return;
    collectionLock.current = true;
    setRedeeming(true); setMessage(''); setCredited(0);
    const canvas = root.current?.querySelector<HTMLCanvasElement>(`[data-quest="${id}"] .quest-prize canvas`);
    const quest = quests.find(item => item.id === id);
    if (canvas && quest) {
      const bounds = canvas.getBoundingClientRect();
      const copy = document.createElement('canvas');
      copy.width = canvas.width; copy.height = canvas.height;
      copy.getContext('2d')?.drawImage(canvas, 0, 0);
      setCollection({ id, amount: quest.coins, canvas: copy, x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 });
    }
    try { await onClaimQuest(id); }
    catch (error) {
      setCollection(null); collectionLock.current = false;
      setMessage(error instanceof Error ? error.message : 'Quest claim failed.');
    } finally {
      setRedeeming(false);
      if (!canvas || !quest) collectionLock.current = false;
    }
  };
  useEffect(() => {
    if (!collection || confirmed || redeeming) return;
    // React may publish the confirmed cloud profile after the promise resolves.
    // Keep the animation/lock alive until that render instead of dropping it.
    const timer = setTimeout(() => { setCollection(null); collectionLock.current = false; }, 5000);
    return () => clearTimeout(timer);
  }, [collection, confirmed, redeeming]);
  useEffect(() => {
    if (!collection || !confirmed || !root.current) return;
    const host = root.current;
    let cancel = () => {};
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    const startTimer = setTimeout(() => {
      const destination = host.querySelector('.loot-balances [data-currency="coins"] canvas');
      cancel = animateCurrencyFlights(host, destination ? [{ ...collection, destination }] : [], setCredited, () => {
        holdTimer = setTimeout(() => { setCollection(null); collectionLock.current = false; }, CURRENCY_COLLECTION_HOLD);
      });
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300);
    return () => { clearTimeout(startTimer); clearTimeout(holdTimer); cancel(); };
  }, [collection, confirmed]);
  const { currency, amount } = dailyLootReward;

  useEffect(() => {
    const content = root.current?.querySelector<HTMLElement>('.loot-content');
    const currency = content?.querySelector('.loot-daily-currency');
    if (!content || !currency) return;
    const updateWidth = () => {
      content.style.setProperty('--loot-currency-width', `${currency.getBoundingClientRect().width}px`);
    };
    const observer = new ResizeObserver(updateWidth);
    observer.observe(currency);
    updateWidth();
    void document.fonts.ready.then(() => { if (content.isConnected) updateWidth(); });
    return () => observer.disconnect();
  }, [leaderboardRewards]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus();
    return () => previous?.focus();
  }, []);

  return <div ref={root} className={embedded ? 'loot-overlay loot-embedded' : 'loot-overlay exchange-overlay'} role={embedded ? undefined : 'dialog'} aria-modal={embedded ? undefined : true} aria-labelledby={embedded ? undefined : 'loot-title'} onKeyDown={embedded ? undefined : event => {
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    if (event.key !== 'Tab') return;
    const controls = root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]');
    if (!controls?.length) return;
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }}>
    {!embedded && <div className="exchange-heading"><h2 id="loot-title">Loot</h2>
      <CloseButton ref={close} className="dialog-close loot-close" aria-label="Close Loot" onClick={onClose} />
    </div>}
    <div className="loot-content">
      {import.meta.env.DEV && <p className="sr-only">Development reward preview; claims are not connected.</p>}
      {!embedded && <>
      <section className="loot-section" aria-labelledby="loot-daily-title">
        <h3 id="loot-daily-title">Daily Reward</h3>
        <div className="loot-daily-row">
          <div className="loot-daily-currency" aria-label={`${amount} ${currencyLabels[currency]}`}>
            <strong className="loot-daily-amount">{amount}</strong>
            <AssetPreview asset={assets[currency]} theme={theme} currencyIcon animated={currency === 'coins'} />
          </div>
          <button className="double-coins-action loot-double" type="button" disabled aria-label={`Double Reward: ${currencyLabels[currency]}`} title="Not available">
            <ActionLabel>Double Reward</ActionLabel>
            <span className="reward-ad-label" aria-label="Advertisement">AD</span>
          </button>
          <button className="achievement-collect loot-claim" type="button" disabled title="Reward claiming is not connected yet">Claim</button>
        </div>
      </section>
      </>}
      <section className="loot-section" aria-labelledby="loot-quests-title">
        {!embedded && <h3 id="loot-quests-title">Weekly Quests</h3>}
                <div className="quest-list">{!questWeek && <p className="quest-loading" role="status">Loading this week's quests…</p>}{quests.map(quest => {
          const done = questDone(progress, quest, questWeek), claimed = questClaimed(progress, quest.id, questWeek);
          const completion = quest.goals.reduce((sum, goal) => sum + Math.min(1, questGoalValue(progress, goal, questWeek) / goal.target), 0) / quest.goals.length;
          return <article className="achievement-card quest-row" key={quest.id} data-quest={quest.id} style={{ backgroundSize: `${completion * 100}% 100%` }}>
            <div className="quest-objectives"><strong>{quest.name}</strong>{quest.goals.map((goal, index) => <span className="quest-goal" key={index}>
              {goal.kind === 'collect' ? <AssetPreview asset={assets[goal.currency]} theme={theme} currencyIcon /> : goal.kind === 'kills' ? <DefeatedHead enemy="bull" /> : <AssetPreview asset="briefcase" theme={theme} />}
              <span>{goal.kind === 'collect' ? `Collect ${goal.target} ${currencyLabels[goal.currency]}` : goal.kind === 'kills' ? `Defeat ${goal.target} enemies` : `Throw ${goal.target} bags`} <small>{Math.min(goal.target, questGoalValue(progress, goal, questWeek))}/{goal.target}</small></span>
            </span>)}</div>
            <span className="quest-done">{!claimed && done ? 'Ready' : ''}</span>
            <span className="quest-prize"><AssetPreview asset="coin" theme={theme} currencyIcon />{quest.coins}</span>
            {claimed ? <span className="achievement-done-stamp" aria-label="Quest collected">Done</span> : <button className="achievement-collect loot-claim" type="button" aria-busy={redeeming && collection?.id === quest.id || undefined} disabled={!done || redeeming || !!collection || !onClaimQuest} onClick={() => void claimQuest(quest.id)}>Claim</button>}
          </article>;
        })}</div>
      </section>
      {!embedded && <section className="loot-section" aria-labelledby="loot-redeem-title">
        <h3 id="loot-redeem-title">Promo Code</h3>
        <form className="loot-redeem" onSubmit={async event => {
          event.preventDefault();
          if (!onRedeemPromo || redeeming || !code.trim()) return;
          setRedeeming(true); setMessage('');
          try { await onRedeemPromo(code); setCode(''); }
          catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to redeem promo code'); }
          finally { setRedeeming(false); }
        }}>
          <label className="sr-only" htmlFor="loot-code">Code</label>
          <input id="loot-code" value={code} onChange={event => { setCode(event.target.value); setMessage(''); }} maxLength={64} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="Enter code" />
          <button type="submit" className="achievement-collect loot-claim" disabled={!code.trim() || redeeming || !onRedeemPromo}>Claim</button>
        </form>
        <p role="status">{message}</p>
      </section>}
    </div>
    <CurrencyFooter autoHide collectionActive={!!collection} className="screen-currency-footer loot-balances" label="Balance" wallet={displayWallet} theme={theme} hatSkin={progress.equipped.hats} />
  </div>;
}

