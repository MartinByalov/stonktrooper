import { CloseButton } from './CloseButton';
import { LOCAL_SANDBOX } from './localSandbox';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {} from 'lucide-react';
import { CurrencyFooter } from './Exchange';
import { animateCurrencyFlights, CURRENCY_COLLECTION_HOLD } from './currencyFlight';
import { MOBILE_ACHIEVEMENTS, MONTHLY_EFFORT_ACHIEVEMENTS, CURRENCIES, currencyLabels, SKINS, TITLES, type Currency, type Progress } from './progression';
import { AssetPreview, type PreviewAsset } from './AssetPreview';
import { AchievementArtwork } from './AchievementArtwork';
import { CosmeticPreview } from './CosmeticPreview';

const currencies: Record<typeof CURRENCIES[number], PreviewAsset> = {
  coins: 'coin', diamonds: 'diamond', bags: 'bag', hats: 'fedora', tenders: 'tender', bells: 'bell', bananas: 'banana',
};

export function Achievements({ embedded = false, progress, theme, onClose, onCollect, monthly }: { embedded?: boolean; progress: Progress; theme: 'light' | 'dark'; onClose: () => void; onCollect?: (id: string) => void | Promise<void>; monthly?: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [collection, setCollection] = useState<{ id: string; sources: { currency: Currency; canvas: HTMLCanvasElement; x: number; y: number }[] } | null>(null);
  const collectionLock = useRef(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  useLayoutEffect(() => {
    const cards = root.current?.querySelectorAll<HTMLElement>('article:has(.achievement-collect)');
    if (!cards?.length) return;
    const update = () => {
      for (const card of cards) {
        const button = card.querySelector<HTMLButtonElement>('.achievement-collect');
        if (!button) continue;
        const style = getComputedStyle(card);
        const height = card.getBoundingClientRect().height - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth);
        const gap = Math.max(12, (height - button.getBoundingClientRect().height) / 2);
        const value = `${gap}px`;
        if (card.style.getPropertyValue('--achievement-claim-gap') !== value) card.style.setProperty('--achievement-claim-gap', value);
      }
    };
    const observer = new ResizeObserver(update);
    for (const card of cards) observer.observe(card);
    update();
    return () => observer.disconnect();
  }, [progress]);
  const [credited, setCredited] = useState(0);
  const confirmed = !!collection && progress.rewardedAchievements.includes(collection.id);
  const reward = MOBILE_ACHIEVEMENTS.find(item => item.id === collection?.id)?.reward;
  const displayWallet = { ...progress.wallet };
  if (confirmed && reward) for (const currency of CURRENCIES) {
    displayWallet[currency] -= Math.round((reward[currency] ?? 0) * (1 - credited));
  }
  const collect = async (id: string) => {
    if (!onCollect || collectionLock.current) return;
    collectionLock.current = true;
    setClaiming(true); setClaimError('');
    const sources: NonNullable<typeof collection>['sources'] = [];
    for (const currency of CURRENCIES) {
      const canvas = root.current?.querySelector<HTMLCanvasElement>(`[data-achievement="${id}"] .achievement-reward [data-currency="${currency}"] canvas`);
      if (!canvas) continue;
      const bounds = canvas.getBoundingClientRect();
      const copy = document.createElement('canvas');
      copy.width = canvas.width; copy.height = canvas.height;
      copy.getContext('2d')?.drawImage(canvas, 0, 0);
      sources.push({ currency, canvas: copy, x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 });
    }
    setCredited(0);
    setCollection({ id, sources });
    try { await onCollect(id); }
    catch (error) {
      collectionLock.current = false; setCollection(null);
      setClaimError(error instanceof Error ? error.message : 'Achievement claim failed. Please retry.');
    } finally { setClaiming(false); }
  };
  useEffect(() => {
    if (!collection || confirmed || claiming) return;
    // A rejected/no-op claim must not leave every Claim button locked.
    const timer = setTimeout(() => { setCollection(null); collectionLock.current = false; }, 5000);
    return () => clearTimeout(timer);
  }, [collection, confirmed, claiming]);
  useEffect(() => {
    if (!collection || !confirmed) return;
    const host = root.current;
    if (!host) return;
    let cancel = () => {};
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    const startTimer = setTimeout(() => {
    const sources = collection.sources.flatMap(source => {
      const destination = host.querySelector(`.achievements-balances [data-currency="${source.currency}"] canvas`);
      return destination ? [{ ...source, destination, amount: reward?.[source.currency] ?? 0 }] : [];
    });
    cancel = animateCurrencyFlights(host, sources, setCredited, () => {
      holdTimer = setTimeout(() => {
        setCollection(null); collectionLock.current = false;
      }, CURRENCY_COLLECTION_HOLD);
    });
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300);
    return () => { clearTimeout(startTimer); clearTimeout(holdTimer); cancel(); };
  }, [collection, confirmed]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    if (!embedded) root.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { if (!embedded) previous?.focus(); };
  }, []);

  const renderAchievement = (item: typeof MOBILE_ACHIEVEMENTS[number]) => {
        const value = LOCAL_SANDBOX ? item.target : Math.min(item.target, item.value(progress));
        const rewarded = progress.rewardedAchievements?.includes(item.id);
        return <article key={item.id} data-achievement={item.id} data-difficulty={item.difficulty} data-complete={value >= item.target} data-rewarded={rewarded} style={{ backgroundSize: `${rewarded ? 100 : value / item.target * 100}% 100%` }}>
          <div className="achievement-image"><AchievementArtwork art={item.art} id={item.id} theme={theme} />
          </div>
          <div className="achievement-details"><h3>{item.name}</h3><p>{item.id === 'coin-flipper' ? 'Flip the About & Help coin 25 times' : item.description}</p>
            {!rewarded && item.requirements && <div className="achievement-requirements" aria-label="Lifetime collection requirements">
              {CURRENCIES.filter(currency => item.requirements?.[currency]).map(currency => {
                const target = item.requirements![currency]!;
                const count = Math.min(target, progress.lifetime[currency]);
                return <span key={currency} data-currency={currency} role="progressbar" aria-label={currencyLabels[currency]} aria-valuemin={0} aria-valuemax={target} aria-valuenow={count}>
                  {count.toLocaleString()}/{target.toLocaleString()}<AssetPreview asset={currencies[currency]} theme={theme} currencyIcon hatSkin={progress.equipped.hats} />
                </span>;
              })}
            </div>}
            {(!rewarded || collection?.id === item.id) && <div className="achievement-reward" aria-label="Completion reward">
              <span>Reward</span>
              {TITLES.filter(title => title.achievementId === item.id).map(title => <span key={title.id} className="achievement-title-reward">Title: {title.name}</span>)}
              {CURRENCIES.filter(currency => item.reward[currency]).map(currency => <span key={currency} data-currency={currency} aria-label={`${item.reward[currency]} ${currencyLabels[currency]}`}>
                +{item.reward[currency]}<AssetPreview asset={currencies[currency]} theme={theme} currencyIcon hatSkin={progress.equipped.hats} />
              </span>)}
              {SKINS.filter(skin => skin.achievementId === item.id).map(skin => <span key={skin.id} className="achievement-cosmetic-reward" title={skin.name}>
                {skin.category === 'mounts' ? 'Mount:' : skin.category === 'pets' ? 'Pet:' : skin.category === 'shoes' ? 'Shoes:' : 'Item:'}
                <span className="achievement-reward-icon" role="img" aria-label={skin.name}><CosmeticPreview skin={skin} theme={theme} animationsEnabled={false} centerArtwork /></span>
              </span>)}
            </div>}
          </div>
          {!rewarded && value < item.target && <strong className="achievement-count" role="progressbar" aria-label={item.name} aria-valuemin={0} aria-valuemax={item.target} aria-valuenow={value}>{item.requirements ? `${Math.floor(value / item.target * 100)}%` : `${Math.round(value)}/${item.target}`}</strong>}
          <div className="achievement-actions">
            {rewarded && <span className="achievement-done-stamp" aria-label="Achievement collected">Done</span>}
            {value >= item.target && !rewarded && <button type="button" className="achievement-collect" aria-label={`Claim ${item.name} reward`} aria-busy={claiming && collection?.id === item.id || undefined} disabled={!onCollect || !!collection} onClick={() => void collect(item.id)}>Claim</button>}
          </div>
        </article>;
  };
  const effort = MOBILE_ACHIEVEMENTS.filter(item => MONTHLY_EFFORT_ACHIEVEMENTS.includes(item.id));
  const personal = MOBILE_ACHIEVEMENTS.filter(item => !MONTHLY_EFFORT_ACHIEVEMENTS.includes(item.id));
  return <div ref={root} className={embedded ? 'achievements-overlay achievements-embedded' : 'achievements-overlay exchange-overlay'} role={embedded ? undefined : 'dialog'} aria-modal={embedded ? undefined : true} aria-labelledby={embedded ? undefined : 'achievements-title'}
    onKeyDown={embedded ? undefined : event => {
      event.stopPropagation();
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const buttons = root.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length-1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}>
    {!embedded && <div className="exchange-heading"><h2 id="achievements-title">Achievements</h2>
      <CloseButton type="button" className="dialog-close exchange-close" aria-label="Close Achievements" onClick={onClose} />
    </div>}
    <div className="exchange-content">
      <section className="achievements-section" aria-label="Personal achievements">
        <div className="achievements-grid">{personal.map(renderAchievement)}</div></section>
      <section className="achievements-section" aria-labelledby="achievements-effort"><h3 id="achievements-effort" className="achievements-section-title">Monthly Effort</h3>
        {monthly}
        <div className="achievements-grid">{effort.map(renderAchievement)}</div></section>
    </div>
    {claimError && <p role="alert">{claimError}</p>}
    <CurrencyFooter infinite={LOCAL_SANDBOX} autoHide collectionActive={!!collection} className="exchange-balances achievements-balances" label="Balance" wallet={displayWallet} theme={theme} hatSkin={progress.equipped.hats} />
  </div>;
}