import { useEffect, useState } from 'react';
import { AssetPreview } from './AssetPreview';
import { InfoSurprisePreview, type InfoFruit } from './InfoSurprisePreview';
import { FruitShine } from './FruitShine';

export function InfoArtwork({ asset, theme, animationsEnabled }: { asset: 'coin' | 'briefcase' | 'bag' | 'banana'; theme: 'light' | 'dark'; animationsEnabled: boolean }) {
  const [clicks, setClicks] = useState(0);
  const [clownVisible, setClownVisible] = useState(false);
  useEffect(() => {
    if (!clownVisible) return;
    const timer = window.setTimeout(() => setClownVisible(false), 2500);
    return () => window.clearTimeout(timer);
  }, [clownVisible, clicks]);
  const fruits = ['banana', 'orange', 'watermelon', 'kiwi', 'tomato'] as const;
  const fruit = fruits[Math.min(clicks, 4)];
  const scale = Math.max(0, 1 - clicks * 0.1);
  return <button type="button" className="info-artwork-button" data-asset={asset}
    disabled={asset === 'banana' && fruit === 'tomato'}
    data-fruit={asset === 'banana' ? fruit : undefined}
    data-clown={asset === 'bag' ? clownVisible : undefined}
    data-side={asset === 'coin' ? (clicks % 2 ? 'B' : 'M') : undefined}
    data-scale={asset === 'briefcase' ? scale : undefined}
    data-animate={animationsEnabled}
    aria-label={asset === 'coin' ? `Flip the coin, showing ${clicks % 2 ? 'B' : 'M'}` : asset === 'briefcase' ? 'Shrink the briefcase' : asset === 'bag' ? 'Surprise in the bag' : fruit === 'tomato' ? 'Tomato — the final fruit' : `Change the ${fruit}`}
    onClick={() => {
      setClicks(value => asset === 'banana' ? Math.min(4, value + 1) : asset === 'briefcase' ? Math.min(10, value + 1) : value + 1);
      if (asset === 'bag') setClownVisible(true);
    }}>
    {asset === 'coin' ? <span className="info-coin-rotation" style={{ transform: `rotateY(${clicks * 180}deg)` }}>
      <span className="info-coin-front"><AssetPreview asset="coin" theme={theme} animated /></span>
      <span className="info-coin-back"><AssetPreview asset="coin" theme={theme} coinLetter="B" animated /></span>
    </span> : asset === 'briefcase' ? <span className="info-briefcase-scale" style={{ transform: `scale(${scale})` }}><AssetPreview asset="briefcase" theme={theme} /></span>
      : asset === 'banana' ? <FruitShine animate={animationsEnabled}>{fruit === 'banana' ? <AssetPreview asset="banana" theme={theme} /> : <InfoSurprisePreview kind={fruit as InfoFruit} />}</FruitShine>
      : <span className="info-bag-surprise">
        <span className="info-bag-front"><AssetPreview asset="bag" theme={theme} /></span>
        <span className="info-bag-clown" aria-hidden="true"><span className="info-bag-clown-rise"><InfoSurprisePreview kind="clown" /></span></span>
      </span>}
  </button>;
}