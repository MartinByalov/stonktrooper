// Explicit product manifest: presence permits validation, not ownership, claiming or gameplay use.
export const DRIP_ITEM_IDS_BY_SLOT = Object.freeze({
  candles: Object.freeze([
    'candles-classic', 'candles-ocean', 'candles-orchid', 'candles-amber',
    'candles-neon', 'candles-hollow', 'candles-ohlc', 'candles-heikin', 'candles-renko',
  ] as const),
  hats: Object.freeze([
    'hats-classic', 'hats-gold', 'hats-ocean', 'hats-orchid', 'hats-cap',
    'hats-crown', 'hats-christmas', 'hats-cowboy', 'hats-paper', 'hats-tinfoil',
    'hats-propeller', 'hats-cone', 'hats-top', 'hats-ath', 'hats-lid',
  ] as const),
  suitcase: Object.freeze([
    'suitcase-classic', 'suitcase-orchid', 'suitcase-duffel', 'suitcase-backpack',
    'suitcase-tote', 'suitcase-pizza', 'suitcase-bowling', 'suitcase-boombox',
    'suitcase-dynamite', 'suitcase-diamond-hands', 'suitcase-event-horizon', 'suitcase-severance',
  ] as const),
  suits: Object.freeze([
    'suits-classic', 'suits-ocean', 'suits-orchid', 'suits-gold', 'suits-swim',
    'suits-tracksuit', 'suits-prison', 'suits-pajamas', 'suits-squeeze', 'suits-too-big', 'suits-money',
  ] as const),
  shoes: Object.freeze([
    'shoes-classic', 'shoes-sneakers', 'shoes-boots', 'shoes-loafers', 'shoes-high-tops',
    'shoes-slides', 'shoes-air-margins', 'shoes-just-dip', 'shoes-four-losses',
    'shoes-paper-paws', 'shoes-chanclas', 'shoes-clown', 'shoes-moon', 'shoes-rug-pull',
  ] as const),
  pets: Object.freeze([
    'pets-hamster', 'pets-black-swan', 'pets-rabbit', 'pets-yacht', 'pets-rock',
    'pets-steak', 'pets-snail', 'pets-box', 'pets-potato', 'pets-stick', 'pets-brick',
    'pets-duck', 'pets-printer', 'pets-shiba', 'pets-dead-cat', 'pets-ostrich', 'pets-bag',
  ] as const),
  mounts: Object.freeze(['mounts-classic', 'mounts-penny', 'mounts-wednesday'] as const),
});

export type DripSlot = keyof typeof DRIP_ITEM_IDS_BY_SLOT;
export type DripItemId = typeof DRIP_ITEM_IDS_BY_SLOT[DripSlot][number];

// Product selection approved on 2026-11-05. No monthly rotation is implied.
export const VAULT_RESERVE_IDS = Object.freeze([
  'candles-renko', 'candles-heikin', 'candles-ohlc', 'candles-orchid',
  'hats-ath', 'hats-crown', 'hats-lid',
  'suitcase-diamond-hands', 'suitcase-event-horizon', 'suitcase-severance',
  'suits-prison', 'suits-money',
  'shoes-moon', 'shoes-high-tops', 'shoes-rug-pull',
  'pets-printer', 'pets-bag', 'pets-dead-cat', 'pets-brick',
  'mounts-penny', 'mounts-wednesday',
] as const satisfies readonly DripItemId[]);

const vault = new Set<string>(VAULT_RESERVE_IDS);
export const DRIP_ITEMS = Object.freeze(Object.entries(DRIP_ITEM_IDS_BY_SLOT).flatMap(([slot, ids]) =>
  ids.map(id => Object.freeze({ id, slot: slot as DripSlot, availability: vault.has(id) ? 'vault' as const : 'standard' as const }))));

const byId = new Map<string, typeof DRIP_ITEMS[number]>(DRIP_ITEMS.map(item => [item.id, item]));

export function dripItem(id: string) {
  return byId.get(id);
}

// Fail closed: a new legacy skin enters Drip only through an explicit manifest update.
export function isStandardDripItem(id: string): boolean {
  return byId.get(id)?.availability === 'standard';
}