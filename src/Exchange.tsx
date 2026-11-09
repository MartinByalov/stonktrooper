import { CloseButton } from './CloseButton';
import { AboutStar } from './AboutStar';
import { VAULT_REWARD_IDS, VAULT_TARGET, vaultReward, vaultRuns } from './vault';
import { LOCAL_SANDBOX } from './localSandbox';
import { isStandardDripItem } from './dripCatalogue';
import { useSqueezeProgress, SQUEEZE_REWARD_ID } from './MonthlySqueezeHome';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChartCandlestick, LockKeyholeOpen, Moon, Sun, Shirt, PawPrint, Footprints, Carrot, Award, Briefcase } from 'lucide-react';
import { AssetPreview, type PreviewAsset } from './AssetPreview';
import { CATEGORIES, categoryLabels, CURRENCIES, currencyLabels, MOBILE_ACHIEVEMENTS, TITLES, cosmeticsByDifficulty, equippedTitle, type Category, type Currency, type Progress, type Wallet } from './progression';
import { CosmeticPreview } from './CosmeticPreview';
import { AchievementArtwork } from './AchievementArtwork';
import { ExchangeMarket } from './ExchangeMarket';
import { animateCurrencyFlights, CURRENCY_COLLECTION_HOLD } from './currencyFlight';

const assets: Record<typeof CURRENCIES[number], PreviewAsset> = {
  coins: 'coin', diamonds: 'diamond', bags: 'bag', hats: 'fedora', tenders: 'tender', bells: 'bell', bananas: 'banana',
};
export type CurrencyCollectionOrigins = Partial<Record<Currency, { x: number; y: number }>>;

export function captureCurrencyOrigins(stash: HTMLElement | null): CurrencyCollectionOrigins {
  const origins: CurrencyCollectionOrigins = {};
  for (const currency of CURRENCIES) {
    const canvas = stash?.querySelector<HTMLCanvasElement>(`[data-currency="${currency}"] canvas`);
    if (!canvas) continue;
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width > 0 && bounds.height > 0) origins[currency] = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
  }
  return origins;
}
export function WalletBar({ wallet, theme, className = '', hatSkin = 'hats-classic', currencies = CURRENCIES, infinite = false }: { wallet: Wallet; theme: 'light' | 'dark'; className?: string; hatSkin?: string; currencies?: readonly Currency[]; infinite?: boolean }) {
  return <div className={`wallet-bar ${className}`} aria-label="Currency balances">
    {currencies.map(currency => <span key={currency} data-currency={currency} title={currencyLabels[currency]} aria-label={`${currencyLabels[currency]}: ${infinite ? 'Infinity' : wallet[currency]}`}>
      <AssetPreview asset={assets[currency]} theme={theme} currencyIcon animated hatSkin={hatSkin} /><b>{infinite ? '∞' : wallet[currency].toLocaleString()}</b>
    </span>)}
  </div>;
}
// Two sentences read as two lines, e.g. "Past performance." / "New colors."
const sentenceLines = (text: string) => {
  const sentences = text.match(/[^.!?]+[.!?]+/g)?.map(sentence => sentence.trim());
  return sentences?.length === 2 ? sentences.map(sentence => <span key={sentence} className="skin-description-line">{sentence}</span>) : text;
};

export function CurrencyFooter({ wallet, theme, label, hatSkin, className = '', coinsOnly = false, currencies, infinite = false, doubleCoins = false, animateCollection = false, collectionBaseline, collectionOrigins, transientCollection = false, collapsible = false, collectionActive = false, autoHide = false, onCollectionComplete }: { wallet: Wallet; theme: 'light' | 'dark'; label: 'Collected' | 'Balance' | 'Current stash:'; hatSkin: string; className?: string; showLabel?: boolean; coinsOnly?: boolean; currencies?: readonly Currency[]; infinite?: boolean; doubleCoins?: boolean; animateCollection?: boolean; collectionBaseline?: Wallet; collectionOrigins?: CurrencyCollectionOrigins; transientCollection?: boolean; collapsible?: boolean; collectionActive?: boolean; autoHide?: boolean; onCollectionComplete?: () => void }) {
  const root = useRef<HTMLElement>(null);
  const collectionComplete = useRef(onCollectionComplete);
  collectionComplete.current = onCollectionComplete;
  const target = { ...wallet, coins: wallet.coins * (doubleCoins ? 2 : 1) };
  const initial = { ...target };
  if (animateCollection) for (const currency of CURRENCIES) initial[currency] = collectionBaseline?.[currency] ?? 0;
  const shown = useRef(initial);
  const collectionStarted = useRef(false);
  const [animatedWallet, setAnimatedWallet] = useState(initial);
  const [celebrating, setCelebrating] = useState(false);
  const [collectionVisible, setCollectionVisible] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [autoVisible, setAutoVisible] = useState(collectionActive);
  useEffect(() => {
    if (!autoHide) return;
    if (collectionActive) { setAutoVisible(true); return; }
    const timer = setTimeout(() => setAutoVisible(false), 300);
    return () => clearTimeout(timer);
  }, [autoHide, collectionActive]);
  const drawerExpanded = expanded || collectionActive;
  useEffect(() => {
    if (collectionActive) setExpanded(false);
  }, [collectionActive]);
  const signature = CURRENCIES.map(currency => target[currency]).join(':');
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    if (!animateCollection) {
      shown.current = target; setAnimatedWallet(target); return;
    }
    // Reveal before measuring destinations when a new bonus arrives.
    host.style.removeProperty('display');
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const firstCollection = !collectionStarted.current;
    collectionStarted.current = true;
    const baseline = firstCollection ? { ...target } : { ...shown.current };
    if (firstCollection) for (const currency of CURRENCIES) baseline[currency] = collectionBaseline?.[currency] ?? 0;
    const hasRewards = CURRENCIES.some(currency => target[currency] > baseline[currency]);
    if (collapsible && hasRewards) { setExpanded(true); setCollecting(true); }
    let cancel = () => {};
    const start = () => {
    const sources = CURRENCIES.flatMap(currency => {
      const canvas = host.querySelector<HTMLCanvasElement>(`[data-currency="${currency}"] canvas`);
      if (!canvas || target[currency] <= baseline[currency]) return [];
      const bounds = canvas.getBoundingClientRect();
      // Stash is removed on Give Up, so use its captured icon positions; coin bonuses keep their flight.
      const origin = firstCollection ? collectionOrigins?.[currency] : undefined;
      return [{ canvas, destination: canvas, amount: target[currency] - baseline[currency],
        x: origin?.x ?? (firstCollection ? window.innerWidth / 2 : bounds.left + bounds.width / 2),
        y: origin?.y ?? (firstCollection ? window.innerHeight / 2 : Math.max(90, bounds.top - Math.min(220, window.innerHeight * .35))),
      }];
    });
    setCelebrating(sources.length > 0);
    setCollectionVisible(sources.length > 0);
    // A transformed footer is a containing block for fixed particles; keep flights in the result overlay.
    const flightHost = host.closest<HTMLElement>('.game-overlay') ?? host;
    cancel = animateCurrencyFlights(flightHost, sources, fraction => {
      const next = { ...target };
      for (const currency of CURRENCIES) next[currency] = Math.round(baseline[currency] + (target[currency] - baseline[currency]) * fraction);
      shown.current = next; setAnimatedWallet(next);
    }, () => {
      setCelebrating(false);
      hideTimer = setTimeout(() => {
        setCollectionVisible(false); setCollecting(false);
        if (collapsible) setExpanded(false);
        collectionComplete.current?.();
      }, CURRENCY_COLLECTION_HOLD);
    });
    };
    // Finish expanding before measuring targets or launching particles.
    const startTimer = setTimeout(start, collapsible && hasRewards && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 0);
    return () => { clearTimeout(startTimer); cancel(); clearTimeout(hideTimer); };
    // The signature covers every numeric target, so cosmetic rerenders must not restart flights.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateCollection, signature]);
  const displayWallet = animateCollection ? animatedWallet : target;
  const collectionHidden = !collapsible && transientCollection && animateCollection && !collectionVisible;
  const canCollapse = collapsible && drawerExpanded && !collecting && !collectionActive;
  return <footer ref={root} className={`currency-footer ${className}`} style={collectionHidden ? { display: 'none' } : undefined} data-auto-hide={autoHide || undefined} data-auto-visible={autoVisible || undefined} data-collapsible={collapsible || undefined} data-expanded={collapsible ? drawerExpanded : undefined} data-collection-hidden={collectionHidden || undefined} data-coins-doubling={(celebrating && doubleCoins) || undefined} role={canCollapse ? 'button' : undefined} tabIndex={canCollapse ? 0 : undefined} onClick={canCollapse ? () => setExpanded(false) : undefined} onKeyDown={canCollapse ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setExpanded(false); } } : undefined} aria-label={canCollapse ? 'Collapse currency balances' : label === 'Balance' ? 'Available balance' : 'Collected this run'}>
    {collapsible && !drawerExpanded && <button type="button" className="currency-strip-toggle" aria-label="Expand currency balances" aria-expanded={false} disabled={collecting || collectionActive} onClick={() => setExpanded(true)}>
      <AssetPreview asset="coin" theme={theme} currencyIcon animated />
    </button>}
    <WalletBar wallet={displayWallet} theme={theme} hatSkin={hatSkin} currencies={currencies ?? (coinsOnly ? ['coins'] : CURRENCIES)} infinite={infinite} />
    {doubleCoins && <span className="coin-double-feedback" role="status">Coins ×2</span>}
  </footer>;
}
// A top hat drawn like the other line icons (24px grid, 2px stroke) to match their size.
function HatIcon({ size }: { size: number }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.5 19.5h19" /><path d="M6 19.5V5.5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v14" /><path d="M6 14.5h12" />
  </svg>;
}

export function Exchange({ progress, theme, name, busy, error, onClose, onSignIn, onBuy, onTitle, onBuyTitle, onVault, animationsEnabled = true, vaultMonth = null, cataloguePreview = false, driveProfile = false, initialTab, focusSkin }: {
  // Open on a category and scroll one card into view (the Home Monthly Squeeze card uses it).
  initialTab?: Category | 'titles'; focusSkin?: string;
  cataloguePreview?: boolean;
  // The player's own Drive profile: their owned items can be equipped; nothing is bought here.
  driveProfile?: boolean;
  vaultMonth?: string | null;
  progress: Progress; theme: 'light' | 'dark'; name?: string; busy: boolean; error: string;
  onClose: () => void; onSignIn: () => void; onBuy: (id: string) => void;
  onVault?: () => void;
  animationsEnabled?: boolean;
  onTitle?: (id: string | null) => void;
  onBuyTitle?: (id: string) => void;
}) {
  const [tab, setTab] = useState<Category | 'titles'>(initialTab ?? 'candles');
  const squeeze = useSqueezeProgress();
  const gridRef = useRef<HTMLDivElement>(null);
  // Desktop: the X sits above the last column's day/night toggle, as far from the right as the top.
  useLayoutEffect(() => {
    const overlay = root.current;
    if (!overlay) return;
    const measure = () => {
      const toggles = Array.from(overlay.querySelectorAll<HTMLElement>('.skin-mode-toggle'));
      if (!toggles.length) return;
      const right = Math.max(...toggles.map(toggle => toggle.getBoundingClientRect().right));
      const gap = overlay.getBoundingClientRect().right - right;
      if (gap > 0 && gap < 80) overlay.style.setProperty('--exchange-corner-gap', `${Math.round(gap * 10) / 10}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(overlay);
    const grid = overlay.querySelector('.exchange-grid');
    if (grid) observer.observe(grid);
    measure();
    return () => observer.disconnect();
  }, [tab]);
  useEffect(() => {
    if (!focusSkin) return;
    gridRef.current?.querySelector(`[data-skin="${focusSkin}"]`)?.scrollIntoView({ block: 'center' });
  }, [focusSkin, tab]);
  const [previewModes, setPreviewModes] = useState<Record<string, 'light' | 'dark'>>({});
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const previousOwned = useRef(progress.owned);
  const testBalance = !cataloguePreview && (LOCAL_SANDBOX || import.meta.env.DEV) && !name;
  // Only this month's Vault reward appears unowned (as a secret card); other Vault items stay off.
  const monthReward = vaultMonth ? vaultReward(vaultMonth) : VAULT_REWARD_IDS[0];
  // The shop lists only the 60 standard Drip items; reserved and achievement rewards show once owned.
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const added = progress.owned.filter(id => !previousOwned.current.includes(id));
    previousOwned.current = progress.owned;
    if (!added.length) return;
    setUnlocked(current => [...new Set([...current, ...added])]);
  }, [progress.owned]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.querySelector<HTMLButtonElement>('[aria-label="Close Exchange"]')?.focus();
    return () => previous?.focus();
  }, []);
  return <div ref={root} className="exchange-overlay" role="dialog" aria-modal="true" aria-labelledby="exchange-title"
    onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'Escape' && !busy) onClose();
      if (event.key === 'Tab') {
        const items = [...(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled)') ?? [])];
        const next = event.shiftKey ? items.at(-1) : items[0];
        if ((event.shiftKey && document.activeElement === items[0]) || (!event.shiftKey && document.activeElement === items.at(-1))) { event.preventDefault(); next?.focus(); }
      }
    }}>
    <div className="exchange-heading"><AboutStar className="about-star exchange-star" theme={theme} wallet={progress.wallet} hatSkin={progress.equipped.hats} /><h2 id="exchange-title">Exchange</h2>
      <CloseButton type="button" className="dialog-close exchange-close" aria-label="Close Exchange" disabled={busy} onClick={onClose} /></div>
    <div className="exchange-body">
    <aside className="exchange-sidebar">
    <nav className="exchange-category" aria-label="Exchange categories">
      {CATEGORIES.map(value => <button key={value} type="button" data-category={value} aria-pressed={tab === value} onClick={() => setTab(value)}>
        <span aria-hidden="true">{value === 'candles' ? <ChartCandlestick size={24} /> : value === 'suits' ? <Shirt size={24} /> : value === 'shoes' ? <Footprints size={24} /> : value === 'pets' ? <PawPrint size={24} /> : value === 'mounts' ? <Carrot size={24} /> : value === 'suitcase' ? <Briefcase size={24} /> : <HatIcon size={24} />}</span>
        <span>{categoryLabels[value]}</span>
      </button>)}
      {!cataloguePreview && <button type="button" data-category="titles" aria-pressed={tab === 'titles'} onClick={() => setTab('titles')}><span aria-hidden="true"><Award size={24} /></span><span>Titles</span></button>}
    </nav>
    <div className="exchange-dressing-room" role="group" aria-label="Equipped outfit" data-hat={progress.equipped.hats} data-suitcase={progress.equipped.suitcase} data-suit={progress.equipped.suits} data-pet={progress.equipped.pets} data-candles={progress.equipped.candles}>
      <ExchangeMarket theme={theme} animationsEnabled={animationsEnabled} equipped={progress.equipped} showMount={tab === 'mounts'} title={tab === 'titles' ? equippedTitle(progress)?.name : undefined} />
    </div>
    </aside>
    <div className="exchange-content">
      {cataloguePreview && !driveProfile && <p role="status" className="exchange-mounts-description">Standard Drip preview — not your account inventory. Vault reserves and Titles are excluded. Achievements are moving to Monthly Squeeze (group effort). Purchases and equipping are disabled; displayed prices and unlock requirements are legacy references only.</p>}
      {tab === 'mounts' && <p className="exchange-mounts-description">Mounts appear only during temporary rides: tame a whale, or stomp a rider mount for a chance to ride it. Unlike Pets, they do not follow you permanently.</p>}
      {error && <p role="alert" className="exchange-error">{error}</p>}
      {!cataloguePreview && !name && <button type="button" disabled={busy} onClick={onSignIn}>Sign in with Google</button>}
      {tab === 'titles' ? <div className="exchange-titles">
        <div className="exchange-grid title-grid">
          <article data-title="no-title" data-owned={true} data-equipped={!progress.equippedTitle}>
            <h3>No Title</h3>
            <div className="achievement-image title-artwork"><AchievementArtwork id="no-title" art="crown" theme={theme} /></div>
            <p className="title-description">Let your outfit do the talking.</p>
            <div className="skin-actions"><button type="button" className="skin-purchase" aria-label="Equip No Title" data-equipped={!progress.equippedTitle} disabled={cataloguePreview || busy || !progress.equippedTitle || !onTitle} onClick={() => { if (!cataloguePreview) onTitle?.(null); }}>{cataloguePreview ? 'Preview only' : !progress.equippedTitle ? 'Equipped' : 'Equip'}</button></div>
          </article>
          {TITLES.map(title => {
          const owned = progress.ownedTitles.includes(title.id);
          const active = progress.equippedTitle === title.id;
          const achievement = MOBILE_ACHIEVEMENTS.find(item => item.id === title.achievementId);
          const affordable = CURRENCIES.every(c => progress.wallet[c] >= (title.cost[c] ?? 0));
          return <article key={title.id} data-title={title.id} data-owned={owned} data-equipped={active}>
            <h3>{title.name}</h3>
            {achievement && <div className="achievement-image title-artwork"><AchievementArtwork id={achievement.id} art={achievement.art} theme={theme} /></div>}
            <p className="title-description">{owned ? title.description : achievement?.description ?? title.description}</p>
            {!owned && !achievement && <div className="skin-cost">{CURRENCIES.filter(c => title.cost[c]).map(c => <span key={c}>{title.cost[c]!.toLocaleString()}<AssetPreview asset={assets[c]} theme={theme} currencyIcon /></span>)}</div>}
            <div className="skin-actions"><button type="button" className="skin-purchase" data-equipped={active} data-progress={!owned && !!achievement || undefined} disabled={cataloguePreview || busy || active || (owned ? !onTitle : !!achievement || !name || !affordable || !onBuyTitle)} onClick={() => { if (!cataloguePreview) { if (owned) onTitle?.(title.id); else onBuyTitle?.(title.id); } }}>{cataloguePreview ? 'Preview only' : active ? 'Equipped' : owned ? 'Equip' : achievement ? `Progress: ${Math.round(Math.max(0, Math.min(achievement.target, achievement.value(progress))))}/${achievement.target}` : 'Buy'}</button></div>
          </article>;
        })}</div>
      </div> : <div ref={gridRef} className="exchange-grid">{cosmeticsByDifficulty(tab).filter(skin => cataloguePreview ? isStandardDripItem(skin.id) || (driveProfile && progress.owned.includes(skin.id)) : progress.owned.includes(skin.id) || skin.id === monthReward || (!!squeeze && skin.id === SQUEEZE_REWARD_ID) || (isStandardDripItem(skin.id) && !skin.achievementId && !skin.monthly)).map(skin => {
          const owned = progress.owned.includes(skin.id), active = progress.equipped[skin.category] === skin.id;
          const hiddenVault = !cataloguePreview && !!skin.vault && !owned;
          const achievement = MOBILE_ACHIEVEMENTS.find(a => a.id === skin.achievementId);
          const afford = testBalance || CURRENCIES.every(c => progress.wallet[c] >= (skin.cost[c] ?? 0));
          const mode = previewModes[skin.id] ?? theme;
          return <article key={skin.id} data-skin={skin.id} data-mode={mode} data-owned={owned} data-equipped={active} data-unlocked={unlocked.includes(skin.id)} onAnimationEnd={event => {
            if (event.animationName === 'skin-unlock') setUnlocked(current => current.filter(id => id !== skin.id));
          }}>
            <div className="skin-artwork" data-mode={mode}>
            <h3>{hiddenVault ? 'Vault' : skin.name}</h3>
            <div className="skin-preview" role="img" aria-label={hiddenVault ? 'Secret Monthly Vault item' : `${skin.name}, ${mode === 'light' ? 'day' : 'night'} preview`}>
              {hiddenVault ? <img className="exchange-vault-art" src="/achievements/vault-closed.png" alt="Closed Vault" /> : <CosmeticPreview skin={skin} theme={mode} animationsEnabled={animationsEnabled} />}
              {unlocked.includes(skin.id) && <span className="skin-unlock-feedback" role="status" aria-label={`${skin.name} unlocked`}><LockKeyholeOpen size={28} /></span>}
            </div>
              {hiddenVault || owned || achievement || skin.promoCode || skin.monthly ? <div className="skin-description" aria-label={hiddenVault ? 'Secret reward description' : `${skin.name} description`}>{sentenceLines(hiddenVault ? 'No insider info.' : !owned && skin.promoCode ? 'Unlock with a promo code in Loot.' : !owned && achievement ? achievement.description : skin.description ?? ({ candles: 'Past performance. New colors.', hats: 'Top off your trading look.', suitcase: 'Holding all your losses.', suits: 'Dress for the bailout.', shoes: 'Running from margin calls.', pets: 'A little company through every dip.', mounts: 'Temporary leverage.' }[skin.category]))}</div> : <div className="skin-cost" aria-label={`${skin.name} price`}>
                {CURRENCIES.filter(c => skin.cost[c]).map(c => <span key={c} aria-label={`${skin.cost[c]} ${currencyLabels[c]}`}>
                  <b>{skin.cost[c]!.toLocaleString()}</b><AssetPreview asset={assets[c]} theme={theme} currencyIcon hatSkin={progress.equipped.hats} />
                </span>)}
              </div>}
            </div>
            <div className="skin-actions">
              {hiddenVault ? <span className="skin-purchase vault-progress-label" data-progress="true" role="status">Progress: {Math.min(VAULT_TARGET, vaultRuns(progress, vaultMonth))}/{VAULT_TARGET}</span> : !owned && !!skin.monthly ? <span className="skin-purchase vault-progress-label" data-progress="true" role="status">Progress: {squeeze?.participants ?? '—'}/{squeeze?.target ?? ''}</span> : <button className="skin-purchase" data-equipped={active} data-progress={!owned && !!achievement || undefined} type="button" disabled={(cataloguePreview && !(driveProfile && owned)) || (!cataloguePreview && !name && !testBalance && !(owned && skin.promoCode)) || busy || active || (!owned && (!!skin.promoCode || !!skin.monthly || !!achievement || !afford))} onClick={() => { if (!cataloguePreview || (driveProfile && owned)) onBuy(skin.id); }}>{cataloguePreview && !(driveProfile && owned) ? (driveProfile ? (skin.monthly ? 'Monthly Squeeze' : 'Locked') : 'Preview only') : active ? 'Equipped' : owned ? 'Equip' : skin.promoCode ? 'Promo Code' : skin.monthly ? 'Monthly Squeeze' : achievement ? `Progress: ${Math.round(Math.max(0, Math.min(achievement.target, achievement.value(progress))))}/${achievement.target}` : 'Buy'}</button>}
            </div>
              <button className="skin-mode-toggle" data-mode={mode} type="button" aria-pressed={mode === 'dark'} aria-label={`Preview ${skin.name} in ${mode === 'light' ? 'night' : 'day'} mode`} title={`Switch to ${mode === 'light' ? 'night' : 'day'} preview`} onClick={() => setPreviewModes(current => ({ ...current, [skin.id]: mode === 'light' ? 'dark' : 'light' }))}>
                {mode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
          </article>;
        })}</div>}
    </div>
    </div>
    {!cataloguePreview && <CurrencyFooter collapsible className="exchange-balances" label="Balance" wallet={progress.wallet} theme={theme} hatSkin={progress.equipped.hats} infinite={testBalance} />}
  </div>;
}

