// Browser game module for MechanicsGuide.
import { AssetPreview, PreviewAsset } from './AssetPreview';
import { TouchControlPreview, type TouchControl } from './TouchControlPreview';
import { skinColors } from './progression';
import './mechanicsGuide.css';

const cards: { asset: PreviewAsset; below?: PreviewAsset; control?: TouchControl; title: string; text: string }[] = [
  { asset: 'jump', control: 'jump', title: 'Jump', text: 'Avoid the gaps!' },
  { asset: 'jump', control: 'double-jump', title: 'Double Jump', text: 'Use the highlighted zones to double jump.' },
  { asset: 'briefcase', control: 'shoot', title: 'Shoot', text: 'Aim and shoot ahead your suitcase. Aim...' },
  { asset: 'fedora', control: 'hat-weapon', title: 'Throw', text: 'Fabulous weapon acquired. Throw your hat and pray, as your enemies may like your style.' },
  { asset: 'coin', title: 'Coin (+10 pips)', text: 'Jump to collect.' },
  { asset: 'diamond', title: 'Diamond Hands (+250 pips)', text: "Don't drop it." },
  { asset: 'banknote', below: 'whale', title: 'To the Moon', text: "You can't jump on a Whale. \nShoot it for a guaranteed +500 pips or a small chance of a banknote ticket for a ride to the moon." },
  { asset: 'printer', below: 'pigeon'
    , title: 'Money Printer Go Brrr (pips x 10)', text: 'Pigeon (+150 pips) \n\nAccept the challenge and ride the waves or walk out in shame.' },
  { asset: 'banana', below: 'ape', title: 'Apes Together Strong', text: 'Banana for scale.' },
  { asset: 'tender', below: 'hawk', title: 'Tendies (pips x 2)', text: 'Hawk (+150 pips) \n\nDodge the offer or take a dumbster ride.' },
  { asset: 'bell', below: 'jerome', title: "I DIDN'T HEAR NO BELL", text: 'A mighty foe joins your ride.' },
  { asset: 'bull', below: 'bear', title: 'Bull / Bear (+50 pips)', text: 'Shoot or stomp them.' },
  { asset: 'bull-rider', below: 'bear-rider', title: 'Trend Rider (+100 pips)', text: 'Shoot or stomp them. \nFirst hit drops the rider, next hit kills the mount.' },
  { asset: 'swan', below: 'white', title: 'Bag Holder', text: "Swan (+200 pips) \n\nYou found yourself holding the bag? \nGood.\nNow you can't shoot too." },
];

export function MechanicsGuide({ theme, candleSkin = 'candles-classic' }: { theme: 'light' | 'dark'; candleSkin?: string }) {
  const [, heartColor] = skinColors(candleSkin, theme === 'dark');
  return <div className="mechanics-guide min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 text-xs leading-tight">
    {cards.map(card => <div key={card.control ?? card.asset} data-touch-control={card.control} data-paired-visuals={!card.control && card.below ? 'true' : undefined} className="rounded border border-[var(--line)] bg-[var(--alt)] overflow-hidden flex flex-col">
      {card.control && <div className="mechanics-card-heading mechanics-control-heading border-b border-[var(--line)] px-2 py-2 text-center">
        <h3 className="m-0 uppercase text-xs font-bold leading-tight">{card.title}</h3>
        <p className="m-0 mt-1 whitespace-pre-line">{card.text}</p>
      </div>}
      {!card.control && <div className="mechanics-card-body flex flex-1 items-stretch">
        {!card.control && <div className="mechanics-guide-visuals w-[88px] shrink-0 grid auto-rows-fr border-r border-[var(--line)] bg-[var(--bg)]/30">
          <div className="min-h-[72px] flex items-center justify-center px-1"><AssetPreview asset={card.asset} compact theme={theme} animated /></div>
          {card.below && <div className="min-h-[72px] border-t border-[var(--line)] flex items-center justify-center px-1"><AssetPreview asset={card.below} compact theme={theme} animated /></div>}
        </div>}
        <div className="mechanics-guide-text min-w-0 flex-1 flex flex-col items-center text-center px-2 pt-1.5">
          <h3 className="mechanics-guide-title uppercase text-xs font-bold leading-tight">{card.title}</h3>
          <div className="mechanics-guide-description flex flex-1 w-full items-center justify-center">
            {card.asset === 'bell' ? <p className="m-0 whitespace-pre-line">
              {card.text}<br /><br />
              <strong>Watch your lives!</strong><br />
              <span style={{ color: heartColor, fontSize: '1.5em', lineHeight: 1.4 }} role="img" aria-label="3 hearts">♥ ♥ ♥</span><br /><br />
              <strong>Difficulty rewards:</strong> +1000 / +2000 / +3000 pips
            </p> : <p className="m-0 whitespace-pre-line">{card.text.split(/((?:Pigeon|Hawk|Swan) \(\+\d+ pips\)|A \/ ← \(Move Left\)|D \/ → \(Move Right\)|S \/ ↓ \(Does Nothing\)|\+\d+ pips)/g).map((part, index) => /^(?:(?:Pigeon|Hawk|Swan) \(\+\d+ pips\)|A \/ ← \(Move Left\)|D \/ → \(Move Right\)|S \/ ↓ \(Does Nothing\)|\+\d+ pips)$/.test(part) ? <strong key={index}>{part}</strong> : part)}</p>}
          </div>
        </div>
      </div>}
      {card.control && <TouchControlPreview action={card.control} theme={theme} candleSkin={candleSkin} />}
    </div>)}
  </div>;
}