import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Star } from 'lucide-react';
import { AssetPreview } from './AssetPreview';
import { CurrencyFooter } from './Exchange';
import { animateCurrencyFlights, CURRENCY_COLLECTION_HOLD } from './currencyFlight';
import type { Wallet } from './progression';

// About & Help star Easter egg: every tap giggles; a rare tap drops one coin.
export const STAR_COIN_CHANCE = 0.02;
const GIGGLE_DURATION = 700;
const GIGGLES = ['wiggle', 'hop', 'jelly', 'shiver'] as const;

export function AboutStar({ theme, wallet, hatSkin, onCoin, onPress, className = 'about-rate-us about-star' }: { theme: 'light' | 'dark'; wallet: Wallet; hatSkin: string; onCoin?: () => Promise<void>; onPress?: () => void; className?: string }) {
  const button = useRef<HTMLButtonElement>(null);
  const coin = useRef<HTMLSpanElement>(null);
  const [overlay, setOverlay] = useState<HTMLElement | null>(null);
  const [giggle, setGiggle] = useState(0);
  const [variant, setVariant] = useState<typeof GIGGLES[number]>('wiggle');
  // dropped: coin fell out of the star; confirmed: the account save succeeded.
  const [drop, setDrop] = useState<'dropped' | 'confirmed' | null>(null);
  const [flying, setFlying] = useState(false);
  const [credited, setCredited] = useState(0);
  const dropLock = useRef(false);
  useLayoutEffect(() => { setOverlay(button.current?.closest<HTMLElement>('.site-info-overlay') ?? null); }, []);
  useEffect(() => {
    if (!giggle) return;
    const timer = setTimeout(() => setGiggle(0), GIGGLE_DURATION);
    return () => clearTimeout(timer);
  }, [giggle]);
  const tap = () => {
    onPress?.();
    // Never repeat the previous giggle twice in a row.
    setVariant(previous => { const others = GIGGLES.filter(item => item !== previous); return others[Math.floor(Math.random() * others.length)]; });
    setGiggle(value => value + 1);
    if (!onCoin || dropLock.current || Math.random() >= STAR_COIN_CHANCE) return;
    dropLock.current = true;
    setCredited(0); setFlying(false); setDrop('dropped');
    onCoin().then(() => setDrop('confirmed'), () => { setDrop(null); dropLock.current = false; });
  };
  useEffect(() => {
    if (drop !== 'confirmed' || !overlay) return;
    let cancel = () => {};
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    // Let the coin land and the strip appear before measuring the flight.
    const startTimer = setTimeout(() => {
      const canvas = coin.current?.querySelector('canvas');
      const destination = overlay.querySelector('.about-star-balances [data-currency="coins"] canvas');
      const finish = () => { holdTimer = setTimeout(() => { setDrop(null); setFlying(false); dropLock.current = false; }, CURRENCY_COLLECTION_HOLD); };
      if (!canvas || !destination) { setCredited(1); finish(); return; }
      const bounds = canvas.getBoundingClientRect();
      const copy = document.createElement('canvas');
      copy.width = canvas.width; copy.height = canvas.height;
      copy.getContext('2d')?.drawImage(canvas, 0, 0);
      setFlying(true);
      cancel = animateCurrencyFlights(overlay, [{ canvas: copy, x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2, destination, amount: 1 }], setCredited, finish);
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500);
    return () => { clearTimeout(startTimer); clearTimeout(holdTimer); cancel(); };
  }, [drop, overlay]);
  const displayWallet = drop === 'confirmed' ? { ...wallet, coins: wallet.coins - Math.round(1 - credited) } : wallet;
  return <>
    <button ref={button} type="button" className={className} aria-label="Star" onClick={tap}>
      <span key={giggle} className="about-star-face" data-giggling={giggle > 0 ? variant : undefined}>
        <Star size={24} aria-hidden="true" />
        <svg className="about-star-eyes" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.4" cy="12.2" r="1.05" /><circle cx="13.6" cy="12.2" r="1.05" /></svg>
      </span>
      {drop && !flying && <span ref={coin} className="about-star-coin" aria-hidden="true"><AssetPreview asset="coin" theme={theme} currencyIcon /></span>}
    </button>
    {overlay && onCoin && createPortal(<CurrencyFooter autoHide collectionActive={!!drop} className="exchange-balances achievements-balances about-star-balances" label="Balance" wallet={displayWallet} theme={theme} hatSkin={hatSkin} />, overlay)}
  </>;
}
