// Browser game module for MechanicsGuide.
import { AssetPreview, PreviewAsset } from './AssetPreview';
import { skinColors } from './modelColors';

const cards: { asset: PreviewAsset; below?: PreviewAsset; title: string; text: string }[] = [
  { asset: 'jump', title: 'Jump (Space Bar / W / ↑)', text: 'Avoid the gaps and use the highlighted zones for a double jump.\n\nOn mobile, tap the left of the screen to jump. Tap again in a highlighted zone to double jump.' },
  { asset: 'fedora', below: 'briefcase', title: 'Shoot (Left Mouse Click)', text: 'Aim and throw your suitcase. Collect and throw your hat, but beware as your enemies may like your style.\n\nOn mobile, tap the right of the screen to aim and shoot.' },
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
  { asset: 'swan', below: 'white', title: 'Bag Holder', text: "Swan (+200 pips)\n\nYou found yourself holding the bag?\nGood.\nNow you can't shoot too." },
];

export function MechanicsGuide({ theme }: { theme: 'light' | 'dark' }) {
  const [, heartColor] = skinColors('candles-classic', theme === 'dark');
  return <div className="mechanics-guide min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 text-xs leading-tight">
    {cards.map(card => <div key={card.asset} data-paired-visuals={card.below ? 'true' : undefined} className="rounded border border-[var(--line)] bg-[var(--alt)] overflow-hidden flex flex-col">
      <div className="flex flex-1 items-stretch">
        <div className="mechanics-guide-visuals w-[88px] shrink-0 grid auto-rows-fr border-r border-[var(--line)] bg-[var(--bg)]/30">
          <div className="min-h-[72px] flex items-center justify-center px-1"><AssetPreview asset={card.asset} compact theme={theme} animated /></div>
          {card.below && <div className="min-h-[72px] border-t border-[var(--line)] flex items-center justify-center px-1"><AssetPreview asset={card.below} compact theme={theme} animated /></div>}
        </div>
        <div className="mechanics-guide-text min-w-0 flex-1 flex flex-col items-center text-center px-2 pt-1.5">
          <h3 className="mechanics-guide-title uppercase text-xs font-bold leading-tight px-2 pt-2 pb-1 mb-2 w-full shrink-0 min-h-[3em]">{card.title}</h3>
          <div className="mechanics-guide-description flex flex-1 w-full items-center justify-center">
            {card.asset === 'bell' ? <p className="m-0 whitespace-pre-line">
              {card.text}<br /><br />
              <strong>Watch your lives!</strong><br />
              <span style={{ color: heartColor, fontSize: '1.5em', lineHeight: 1.4 }} role="img" aria-label="3 hearts">♥ ♥ ♥</span><br /><br />
              <strong>Difficulty rewards:</strong> +1000 / +2000 / +3000 pips
            </p> : <p className="m-0 whitespace-pre-line">{card.text.split(/((?:Pigeon|Hawk|Swan) \(\+\d+ pips\)|A \/ ← \(Move Left\)|D \/ → \(Move Right\)|S \/ ↓ \(Does Nothing\)|\+\d+ pips)/g).map((part, index) => /^(?:(?:Pigeon|Hawk|Swan) \(\+\d+ pips\)|A \/ ← \(Move Left\)|D \/ → \(Move Right\)|S \/ ↓ \(Does Nothing\)|\+\d+ pips)$/.test(part) ? <strong key={index}>{part}</strong> : part)}</p>}
          </div>
        </div>
      </div>
    </div>)}
  </div>;
}