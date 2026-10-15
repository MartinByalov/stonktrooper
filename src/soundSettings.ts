// Browser game module for soundSettings.
export const SOUND_CATEGORIES = [
  { id: 'jump', label: 'Jump', group: 'Player' },
  { id: 'doubleJump', label: 'Double jump', group: 'Player' },
  { id: 'briefcase', label: 'Briefcase throw', group: 'Player' },
  { id: 'fedoraThrow', label: 'Fedora throw', group: 'Player' },
  { id: 'fedoraFly', label: 'Fedora flight', group: 'Player' },
  { id: 'fedoraHit', label: 'Fedora hit', group: 'Player' },
  { id: 'banana', label: 'Banana throw', group: 'Player' },
  { id: 'hit', label: 'Hit', group: 'Player' },
  { id: 'gameOver', label: 'Game over', group: 'Player' },
  { id: 'bull', label: 'Bull · Moo', group: 'Enemies' },
  { id: 'bear', label: 'Bear · Roar', group: 'Enemies' },
  { id: 'bat', label: 'Bat · Swing', group: 'Enemies' },
  { id: 'chainsaw', label: 'Chainsaw', group: 'Enemies' },
  { id: 'whale', label: 'Whale', group: 'Enemies' },
  { id: 'swan', label: 'Swan', group: 'Enemies' },
  { id: 'coin', label: 'Coin / Banana pickup', group: 'Pickups' },
  { id: 'diamond', label: 'Diamond pickup', group: 'Pickups' },
  { id: 'bag', label: 'Bag · Heavy thud', group: 'Pickups' },
  { id: 'tender', label: 'Chicken tender · Cluck', group: 'Pickups' },
  { id: 'rocket', label: 'Banknote / Rocket', group: 'Pickups' },
  { id: 'music', label: 'Background music', group: 'Music' },
] as const;
export type SoundCategory = typeof SOUND_CATEGORIES[number]['id'];
export const SOUND_VARIANTS = ['default', 'soft', 'arcade', 'deep', 'bright', 'glitch', 'organic', 'off'] as const;
export type SoundVariant = typeof SOUND_VARIANTS[number];
export type SoundSettings = Record<SoundCategory, SoundVariant>;
export const defaultSoundSettings = (): SoundSettings => Object.fromEntries(SOUND_CATEGORIES.map(item => [item.id, 'default'])) as SoundSettings;
export const loadSoundSettings = (): SoundSettings => {
  const settings = defaultSoundSettings();
  try {
    const saved = JSON.parse(localStorage.getItem('stonker-sounds') || '{}');
    for (const { id } of SOUND_CATEGORIES) {
      if (SOUND_VARIANTS.includes(saved?.[id])) settings[id] = saved[id];
    }
  } catch { /* Storage may be unavailable. */ }
  return settings;
};