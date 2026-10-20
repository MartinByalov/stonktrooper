// Browser game module for MechanicsGuide.
import { AssetPreview, PreviewAsset } from './AssetPreview';

const cards: { asset: PreviewAsset; below?: PreviewAsset; title: string; text: string }[] = [
  { asset: 'jump', title: 'Jump (Space Bar / W / ↑)', text: "Use the lighted zones for a double jump. \nYes, you need to click the jump button twice. \nAnd don't fall in gaps. \n\nFor Mobile tap the joystick." },
  { asset: 'fedora', below: 'briefcase', title: 'Shoot (Left Mouse Click)', text: 'Aim and throw your suitcase at enemies. \nCollect and throw a hat at your enemies but beware, there is a 50% chance they might like your style. \n\nOn Mobile tap the screen.' },
  { asset: 'coin', title: 'Coin (+10 pips)', text: 'Jump to collect.' },
  { asset: 'diamond', title: 'Diamond Hands (+250 pips)', text: "Don't drop it." },
  { asset: 'banknote', below: 'whale', title: 'To the Moon', text: "You can't jump on a Whale. \nShoot it for a guaranteed +500 pips or a small chance of a banknote ticket for a ride to the moon." },
  { asset: 'printer', below: 'pigeon'
    , title: 'Money Printer Go Brrr (pips x 10)', text: 'Pigeon (+150 pips) \n\nAccept the challenge and ride the waves or walk out in shame.' },
  { asset: 'banana', below: 'ape', title: 'Apes Together Strong', text: 'Banana for scale.' },
  { asset: 'tender', below: 'hawk', title: 'Tendies (pips x 2)', text: 'Hawk (+150 pips) \n\nDodge the offer or take a dumbster ride.' },
  { asset: 'bell', below: 'jerome', title: 'I Did Not Hear No Bell', text: "A / ← (Move Left)\n D / → (Move Right)\n S / ↓ (Does Nothing)\n\n3 lives.\n Difficulty rewards:\n+1000/+2000 /+3000 pips\n\nFor mobile use the joystick." },
  { asset: 'bull', below: 'bear', title: 'Bull / Bear (+50 pips)', text: 'Shoot or stomp them.' },
  { asset: 'bull-rider', below: 'bear-rider', title: 'Trend Rider (+100 pips)', text: 'Shoot or stomp them. \nFirst hit drops the rider, next hit kills the mount.' },
  { asset: 'swan', below: 'white', title: 'Bag Holder', text: "Swan (+200 pips) \n\nYou found yourself holding the bag? \nGood. Now you can't shoot too." },
];

export function MechanicsGuide({ theme }: { theme: 'light' | 'dark' }) {
  return <div className="mechanics-guide min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 text-xs leading-tight">
    {cards.map(card => <div key={card.asset} className="rounded border border-[var(--line)] bg-[var(--alt)] overflow-hidden flex flex-col">
      <div className="flex flex-1 items-stretch">
        <div className="mechanics-guide-visuals w-[88px] shrink-0 grid auto-rows-fr border-r border-[var(--line)] bg-[var(--bg)]/30">
          <div className="min-h-[72px] flex items-center justify-center px-1"><AssetPreview asset={card.asset} compact theme={theme} /></div>
          {card.below && <div className="min-h-[72px] border-t border-[var(--line)] flex items-center justify-center px-1"><AssetPreview asset={card.below} compact theme={theme} /></div>}
        </div>
        <div className="mechanics-guide-text min-w-0 flex-1 flex flex-col items-center text-center px-2 pt-1.5">
          <h3 className="mechanics-guide-title uppercase text-xs font-bold leading-tight px-2 pt-2 pb-1 mb-2 w-full shrink-0 min-h-[3em]">{card.title}</h3>
          <div className="mechanics-guide-description flex flex-1 w-full items-center justify-center">
            <p className="m-0 whitespace-pre-line">{card.text.split(/((?:Pigeon|Hawk|Swan) \(\+\d+ pips\)|A \/ ← \(Move Left\)|D \/ → \(Move Right\)|S \/ ↓ \(Does Nothing\)|\+\d+ pips)/g).map((part, index) => /^(?:(?:Pigeon|Hawk|Swan) \(\+\d+ pips\)|A \/ ← \(Move Left\)|D \/ → \(Move Right\)|S \/ ↓ \(Does Nothing\)|\+\d+ pips)$/.test(part) ? <strong key={index}>{part}</strong> : part)}</p>
          </div>
        </div>
      </div>
    </div>)}
  </div>;
}