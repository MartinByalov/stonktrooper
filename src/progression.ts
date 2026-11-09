import { QUESTS, questCounters, questDone, validQuestWeek, weeklyQuests, type WeeklyQuests } from './quests';
import { VAULT_REWARD_IDS, VAULT_TARGET, validVaultMonth, vaultReward, vaultRuns, type MonthlyVault } from './vault';
import { validScoreReward, type ScoreReward } from './scoreRewards';
export const CURRENCIES = ['coins', 'diamonds', 'bags', 'hats', 'tenders', 'bells', 'bananas'] as const;
export type Currency = typeof CURRENCIES[number];
export const CATEGORIES = ['candles', 'hats', 'suitcase', 'suits', 'shoes', 'pets', 'mounts'] as const;
export type Category = typeof CATEGORIES[number];
export const categoryLabels: Record<Category, string> = { candles: 'Candles', hats: 'Hats', suitcase: 'Bags', suits: 'Suits', shoes: 'Shoes', pets: 'Pets', mounts: 'Mounts' };
export type RewardKind = 'revive' | 'doubleCoins';
export type Wallet = Record<Currency, number>;
export const emptyWallet = (): Wallet => ({ coins: 0, diamonds: 0, bags: 0, hats: 0, tenders: 0, bells: 0, bananas: 0 });
export const currencyLabels: Record<Currency, string> = {
  coins: 'Coins', diamonds: 'Diamonds', bags: 'Bags', hats: 'Hats', tenders: 'Chicken tenders', bells: 'Bells', bananas: 'Bananas',
};
export interface Skin {
  id: string;
  name: string;
  description?: string;
  category: Category;
  cost: Partial<Wallet>;
  light: [string, string];
  dark: [string, string];
  chart?: 'renko' | 'heikin-ashi' | 'hollow' | 'ohlc';
  achievementId?: string;
  promoCode?: string;
  // Monthly Vault reward: never sold in Exchange, only claimed from its month's Vault.
  vault?: boolean;
  // Granted only by a Monthly Squeeze event; never bought and never tied to a personal achievement.
  monthly?: boolean;
}
// Shared purchase/display pricing: small costs round up; larger costs use tidy tiers.
export function roundExchangePrice(value: number): number {
  if (value <= 0) return 0;
  if (value < 50) return Math.ceil(value / 10) * 10;
  const step = value < 1000 ? 50 : 250;
  return Math.round(value / step) * step;
}
// Final shared recipes: coins are the base; secondary currencies diversify collection goals.
const exchangeRecipes: Record<string, Partial<Wallet>> = {
  'candles-ocean': { coins: 450, diamonds: 30, bags: 10 },
  'candles-orchid': { coins: 900, tenders: 50, bells: 10, bananas: 20 },
  'candles-amber': { coins: 600, diamonds: 50, tenders: 20 },
  'candles-neon': { coins: 1000, diamonds: 50, hats: 20, bananas: 30 },
  'candles-hollow': { coins: 1250, bags: 50, diamonds: 30, hats: 10 },
  'candles-ohlc': { coins: 1500, bells: 20, bags: 50, tenders: 20 },
  'candles-heikin': { coins: 7250, diamonds: 200, bells: 30, hats: 50, bags: 100 },
  'candles-renko': { coins: 11250, diamonds: 300, bells: 50, hats: 100, bags: 200, bananas: 100 },
  'hats-gold': { coins: 600, hats: 100, diamonds: 30 },
  'hats-cone': { coins: 650, hats: 50, tenders: 20 },
  'hats-top': { coins: 1250, hats: 100, bags: 50, bells: 10 },
  'hats-ocean': { coins: 1000, hats: 100, diamonds: 30, bags: 30 },
  'hats-orchid': { coins: 850, hats: 100, bananas: 30 },
  'hats-cap': { coins: 550, hats: 50, bags: 20 },
  'hats-crown': { coins: 17500, diamonds: 250, bags: 100, hats: 150, bells: 50 },
  'hats-christmas': { coins: 850, hats: 100, bells: 10, tenders: 20 },
  'hats-cowboy': { coins: 950, bags: 100, hats: 30, tenders: 20 },
  'hats-paper': { coins: 350, bags: 50, bananas: 10 },
  'hats-tinfoil': { coins: 700, bells: 20, diamonds: 30, bags: 20 },
  'hats-lid': { coins: 1500, hats: 120, bags: 60, bells: 20 },
  'hats-propeller': { coins: 15000, diamonds: 150, hats: 100, tenders: 150, bells: 50, bananas: 200 },
  'suitcase-orchid': { coins: 1250, bags: 150, bells: 20, hats: 30 },
  'suitcase-duffel': { coins: 750, bags: 100, tenders: 30 },
  'suitcase-dynamite': { coins: 1250, bags: 100, tenders: 50, bells: 10 },
  'suitcase-backpack': { coins: 900, bags: 100, diamonds: 30, bananas: 20 },
  'suitcase-tote': { coins: 650, bags: 50, bananas: 20 },
  'suitcase-pizza': { coins: 15000, diamonds: 150, bags: 250, hats: 100, tenders: 200, bells: 50 },
  'suitcase-bowling': { coins: 950, bags: 100, hats: 30 },
  'suitcase-boombox': { coins: 1000, bags: 100, bells: 10, diamonds: 30 },
  'suits-ocean': { coins: 750, hats: 50, diamonds: 30 },
  'suits-orchid': { coins: 1000, diamonds: 50, bags: 50, tenders: 30 },
  'suits-gold': { coins: 1500, bags: 100, hats: 50, bells: 10 },
  'suits-tracksuit': { coins: 950, hats: 100, tenders: 30, bananas: 20 },
  'suits-prison': { coins: 15000, diamonds: 250, bags: 300, hats: 100, bells: 50, bananas: 100 },
  'suits-pajamas': { coins: 900, bags: 50, bananas: 30 },
  'suits-squeeze': { coins: 1000, hats: 50, bags: 100, tenders: 30 },
  'suits-too-big': { coins: 1750, diamonds: 100, bags: 100, hats: 50 },
  'suits-money': { coins: 20000, diamonds: 300, bags: 250, hats: 100, tenders: 100, bells: 50 },
  'shoes-sneakers': { coins: 450, hats: 30, diamonds: 20 },
  'shoes-boots': { coins: 700, bags: 50, tenders: 20 },
  'shoes-loafers': { coins: 850, bells: 20, bags: 30, diamonds: 20 },
  'shoes-high-tops': { coins: 1500, diamonds: 50, hats: 50, bananas: 30 },
  'shoes-slides': { coins: 550, bananas: 50, bags: 20 },
  'shoes-air-margins': { coins: 1250, diamonds: 50, hats: 50, bells: 10 },
  'shoes-just-dip': { coins: 800, hats: 50, bags: 30, bananas: 20 },
  'shoes-four-losses': { coins: 900, bags: 50, diamonds: 30 },
  'shoes-paper-paws': { coins: 1000, bananas: 100, tenders: 30, hats: 20 },
  'shoes-moon': { coins: 15000, diamonds: 250, hats: 100, tenders: 100, bells: 50, bananas: 100 },
  'shoes-chanclas': { coins: 650, bananas: 50, tenders: 20 },
  'shoes-rug-pull': { coins: 1750, diamonds: 60, bags: 60, tenders: 30 },
  'mounts-penny': { coins: 30000, diamonds: 500, bags: 400, hats: 200, tenders: 200, bells: 120, bananas: 200 },
  'pets-hamster': { coins: 850, bananas: 50, diamonds: 30, bags: 30 },
  'pets-black-swan': { coins: 1000, bells: 20, diamonds: 30, hats: 20 },
  'pets-rabbit': { coins: 950, hats: 50, tenders: 30, bananas: 20 },
  'pets-yacht': { coins: 500, bags: 50, diamonds: 20 },
  'pets-rock': { coins: 200, bags: 5 },
  'pets-steak': { coins: 250, tenders: 20, bags: 10 },
  'pets-snail': { coins: 300, bananas: 20, diamonds: 10 },
  'pets-box': { coins: 350, bags: 30, tenders: 10 },
  'pets-brick': { coins: 2500, diamonds: 50, bags: 100, tenders: 30, bananas: 20 },
  'pets-duck': { coins: 650, hats: 50, bananas: 20 },
  'pets-printer': { coins: 25000, diamonds: 400, bags: 300, hats: 150, tenders: 150, bells: 100, bananas: 150 },
  'pets-shiba': { coins: 1500, diamonds: 50, bananas: 50, hats: 20 },
  'pets-dead-cat': { coins: 1000, bells: 20, bags: 50, tenders: 20 },
  'pets-ostrich': { coins: 1250, tenders: 100, hats: 30, bananas: 30 },
  'pets-bag': { coins: 17500, diamonds: 200, bags: 500, hats: 100, tenders: 100, bells: 50, bananas: 100 },
};
export const SKINS: Skin[] = [
  { id: 'mounts-classic', name: 'Default Mount', description: 'Borrowed horsepower.', category: 'mounts', cost: {}, light: ['#64748b', '#cbd5e1'], dark: ['#94a3b8', '#e2e8f0'] },
  { id: 'mounts-penny', name: 'Penny Stock', description: 'Low price. High hopes.', category: 'mounts', cost: { coins: 30000 }, light: ['#e2a831', '#c22d2f'], dark: ['#f8d466', '#e8706a'] },
  { id: 'mounts-wednesday', name: 'Wednesday Reins', description: 'Hop on, my dudes.', category: 'mounts', monthly: true, cost: {}, light: ['#4d883e', '#d4dfa1'], dark: ['#80b95b', '#f0edb2'] },
  { id: 'candles-classic', name: 'Classic', category: 'candles', cost: {}, light: ['#54d3ac', '#b91c1c'], dark: ['#08795c', '#ff6467'] },
  { id: 'candles-ocean', name: 'Ocean / Coral', category: 'candles', cost: { coins: 1500, diamonds: 8 }, light: ['#0369a1', '#c2410c'], dark: ['#38bdf8', '#fb923c'] },
  { id: 'candles-orchid', name: 'Jade / Orchid', category: 'candles', cost: { coins: 3000, tenders: 15, bells: 5 }, light: ['#047857', '#a21caf'], dark: ['#34d399', '#e879f9'] },
  { id: 'candles-amber', name: 'Amber / Indigo', category: 'candles', cost: { coins: 2000, diamonds: 12 }, light: ['#b45309', '#4338ca'], dark: ['#fbbf24', '#a5b4fc'] },
  { id: 'candles-neon', name: 'Cyber Market', category: 'candles', cost: { coins: 3500, diamonds: 18 }, light: ['#00856a', '#bf1682'], dark: ['#49ffd1', '#ff62cd'] },
  { id: 'candles-hollow', name: 'Hollow Hands', category: 'candles', chart: 'hollow', cost: { coins: 4000, bags: 20 }, light: ['#12643f', '#a62135'], dark: ['#71e6a1', '#ff8094'] },
  { id: 'candles-ohlc', name: 'Old School OHLC', category: 'candles', chart: 'ohlc', cost: { coins: 5000, bells: 12 }, light: ['#0e7490', '#be123c'], dark: ['#67e8f9', '#fda4af'] },
  { id: 'candles-heikin', name: 'Heikin-Ashi', category: 'candles', chart: 'heikin-ashi', cost: { coins: 9000, diamonds: 45, bells: 15 }, light: ['#028468', '#c45428'], dark: ['#6ee7b7', '#fdba74'] },
  { id: 'candles-renko', name: 'Renko', category: 'candles', chart: 'renko', cost: { coins: 14000, diamonds: 70, bells: 25 }, light: ['#2563eb', '#9333ea'], dark: ['#93c5fd', '#d8b4fe'] },
  { id: 'hats-classic', name: 'Classic Fedora', description: 'Old-school style. New-school losses.', category: 'hats', cost: {}, light: ['#111318', '#ffffff'], dark: ['#f8fafc', '#111318'] },
  { id: 'hats-gold', name: 'Gold Standard', description: 'Pegged to gold. Backed by vibes.', category: 'hats', cost: { coins: 2000, hats: 25 }, light: ['#a16207', '#422006'], dark: ['#facc15', '#713f12'] },
  { id: 'hats-ocean', name: 'Blue Chip', description: 'A blue-chip look for a penny-stock budget.', category: 'hats', cost: { coins: 3500, hats: 40, diamonds: 10 }, light: ['#0369a1', '#f0f9ff'], dark: ['#7dd3fc', '#0c4a6e'] },
  { id: 'hats-orchid', name: 'Orchid Fedora', description: 'Your portfolio could use some color.', category: 'hats', cost: { coins: 2800, hats: 30 }, light: ['#86198f', '#fae8ff'], dark: ['#e879f9', '#4a044e'] },
  { id: 'hats-cap', name: 'Buy the Dip Cap', description: 'Cap backwards. Conviction forwards.', category: 'hats', cost: { coins: 1800, hats: 18 }, light: ['#2563eb', '#1e40af'], dark: ['#93c5fd', '#1e3a8a'] },
  { id: 'hats-crown', name: 'King of the Bulls', description: 'Royal bullishness.', category: 'hats', cost: { coins: 6500, diamonds: 25 }, light: ['#e5b437', '#ef4444'], dark: ['#e2e8f0', '#a855f7'] },
  { id: 'hats-christmas', name: 'Santa Rally', description: 'Dear Santa, just one green December.', category: 'hats', cost: { coins: 2800, hats: 25 }, light: ['#c62838', '#f3d49b'], dark: ['#9f1239', '#e0f2fe'] },
  { id: 'hats-cowboy', name: 'Bull Market Cowboy', description: 'Ride the bull. Mind the leverage.', category: 'hats', cost: { coins: 3200, bags: 25 }, light: ['#9a6537', '#3e291c'], dark: ['#e7c99b', '#61432e'] },
  { id: 'hats-paper', name: 'Anonymous Bagholder', description: 'Hide your face, not your cost basis.', category: 'hats', cost: { coins: 1200, bags: 12 }, light: ['#bc9562', '#30251b'], dark: ['#f2dfb8', '#6b5139'] },
  { id: 'hats-tinfoil', name: 'Tin-Foil Analyst', description: 'Every dip is a conspiracy.', category: 'hats', cost: { coins: 2400, bells: 8 }, light: ['#b9c6cf', '#64748b'], dark: ['#dbeafe', '#647ea3'] },
  { id: 'hats-propeller', name: 'Smooth Brain', description: 'No thoughts. Just helicopter money.', category: 'hats', cost: { coins: 3000, bananas: 20 }, light: ['#f59e0b', '#e94343'], dark: ['#c4b5fd', '#f9a8d4'] },
  { id: 'suitcase-classic', name: 'Classic Case', description: 'All business. Mostly bad business.', category: 'suitcase', cost: {}, light: ['#05070a', '#ffffff'], dark: ['#ffffff', '#000000'] },
  { id: 'suitcase-orchid', name: 'Hostile Takeover', description: 'Pack light. Acquire everything.', category: 'suitcase', cost: { coins: 4000, bags: 50, bells: 8 }, light: ['#86198f', '#fae8ff'], dark: ['#f0abfc', '#581c87'] },
  { id: 'suitcase-duffel', name: 'Gym & Losses', description: 'Heavy bags. Negative gains.', category: 'suitcase', cost: { coins: 2500, bags: 30 }, light: ['#17645a', '#d3e7d7'], dark: ['#99f6e4', '#134e4a'] },
  { id: 'suitcase-backpack', name: 'Exit Liquidity Pack', description: 'Someone else packed your bags.', category: 'suitcase', cost: { coins: 3000, bags: 35 }, light: ['#bf642e', '#fef3c7'], dark: ['#a5b4fc', '#312e81'] },
  { id: 'suitcase-tote', name: 'Emotional Baggage', description: 'Every bad trade comes with feelings.', category: 'suitcase', cost: { coins: 2200, bags: 20 }, light: ['#e2c69b', '#693b61'], dark: ['#fce7f3', '#86198f'] },
  { id: 'suitcase-pizza', name: 'Emergency Package', description: 'Tendies for the next market meltdown.', category: 'suitcase', cost: { coins: 4500, tenders: 35 }, light: ['#c7312a', '#fff2cd'], dark: ['#fff1d6', '#b91c1c'] },
  { id: 'suitcase-bowling', name: 'Margin Strike', description: 'Ten pins. One margin call.', category: 'suitcase', cost: { coins: 3200, bags: 25 }, light: ['#433065', '#b8a3dc'], dark: ['#c4b5fd', '#f5f3ff'] },
  { id: 'suitcase-boombox', name: 'Bass Market', description: 'All bass. No bear market.', category: 'suitcase', cost: { coins: 3600, bags: 30 }, light: ['#334155', '#38bdf8'], dark: ['#cbd5e1', '#a855f7'] },
  { id: 'suits-classic', name: 'Corporate Casualty', description: 'Business attire. Personal losses.', category: 'suits', cost: {}, light: ['#1e293b', '#e11d48'], dark: ['#1e293b', '#e11d48'] },
  { id: 'suits-ocean', name: 'Blue Chip Drip', description: 'Premium threads. Discount portfolio.', category: 'suits', cost: { coins: 2500, hats: 20 }, light: ['#075985', '#fbbf24'], dark: ['#0284c7', '#fde68a'] },
  { id: 'suits-orchid', name: 'Hostile Tailoring', description: 'Dressed for a hostile takeover.', category: 'suits', cost: { coins: 3500, diamonds: 15 }, light: ['#86198f', '#34d399'], dark: ['#c026d3', '#6ee7b7'] },
  { id: 'suits-gold', name: 'Golden Handcuffs', description: 'Great benefits. No exit strategy.', category: 'suits', cost: { coins: 5000, bags: 40 }, light: ['#a16207', '#1e293b'], dark: ['#eab308', '#a78bfa'] },
  { id: 'suits-swim', name: 'Swim Shady', description: 'Swimming in unrealized losses.', category: 'suits', achievementId: 'whale-rider', cost: {}, light: ['#fed7aa', '#ec4899'], dark: ['#fed7aa', '#39ff14'] },
  { id: 'suits-tracksuit', name: 'Margin Tracksuit', description: 'Warming up for a margin call.', category: 'suits', cost: { coins: 3200, hats: 25 }, light: ['#79334c', '#54263b'], dark: ['#23856d', '#a7f3d0'] },
  { id: 'suits-prison', name: 'Insider Trading', description: 'The dress code after the verdict.', category: 'suits', cost: { coins: 4500, bells: 15 }, light: ['#f17925', '#fff2d8'], dark: ['#94a3b8', '#f1f5f9'] },
  { id: 'suits-pajamas', name: 'Sleep Trader', description: 'Markets open. Eyes closed.', category: 'suits', cost: { coins: 3000, bags: 20 }, light: ['#6578ac', '#f4e3a2'], dark: ['#2dd4bf', '#fce7f3'] },
  { id: 'shoes-classic', name: 'Corporate Soles', description: 'Clock in. Cash out. Repeat.', category: 'shoes', cost: {}, light: ['#090d16', '#475569'], dark: ['#94a3b8', '#e2e8f0'] },
  { id: 'shoes-sneakers', name: 'Bull Run', description: 'Built for rallies. Used for exits.', category: 'shoes', cost: { coins: 1500, hats: 12 }, light: ['#f8fafc', '#2563eb'], dark: ['#38bdf8', '#fef08a'] },
  { id: 'shoes-boots', name: 'Stop Loss Stompers', description: 'Reinforced toes. Unprotected downside.', category: 'shoes', cost: { coins: 2400, bags: 18 }, light: ['#854d0e', '#d6a76b'], dark: ['#d6b48b', '#fef3c7'] },
  { id: 'shoes-loafers', name: 'Dividend Loafers', description: 'Penny slots. Quarterly payouts.', category: 'shoes', cost: { coins: 2800, bells: 8 }, light: ['#713f12', '#d4af37'], dark: ['#c084fc', '#fef08a'] },
  { id: 'shoes-high-tops', name: 'Higher Highs', description: 'High tops. Higher expectations.', category: 'shoes', cost: { coins: 3200, diamonds: 12 }, light: ['#7c3aed', '#a3e635'], dark: ['#c4b5fd', '#d9f99d'] },
  { id: 'shoes-slides', name: 'Liquid Slides', description: 'Open toes. Liquid assets.', category: 'shoes', cost: { coins: 1800, bananas: 15 }, light: ['#047857', '#a7f3d0'], dark: ['#a3e635', '#d9f99d'] },
  { id: 'shoes-air-margins', name: 'Air Margins', description: 'Extra cushion. No safety margin.', category: 'shoes', cost: { coins: 3800, diamonds: 15 }, light: ['#b91c1c', '#fff7ed'], dark: ['#a5b4fc', '#fef08a'] },
  { id: 'shoes-just-dip', name: 'Just Dip It', description: 'Buy the dip. Wear the drawdown.', category: 'shoes', cost: { coins: 2600, hats: 22 }, light: ['#e2e8f0', '#0f766e'], dark: ['#2dd4bf', '#ccfbf1'] },
  { id: 'shoes-four-losses', name: 'Four Straight Losses', description: 'Four losses. Keep the tally.', category: 'shoes', cost: { coins: 3000, bags: 24 }, light: ['#1e293b', '#f8fafc'], dark: ['#c4b5fd', '#fff1f2'] },
  { id: 'shoes-paper-paws', name: 'Paper Paws', description: 'Soft steps. Paper hands.', category: 'shoes', cost: { coins: 3400, bananas: 25 }, light: ['#d97706', '#292524'], dark: ['#fde68a', '#a16207'] },
  { id: 'shoes-chanclas', name: 'Recession Chanclas', description: 'Budget cuts. Open toes.', category: 'shoes', cost: { coins: 1900, bags: 15 }, light: ['#b45309', '#fef3c7'], dark: ['#c4b5fd', '#fef3c7'] },
  { id: 'shoes-clown', name: 'DD Stompers', description: 'Clown-sized toes. Pocket-sized due diligence.', category: 'shoes', achievementId: 'coin-flipper', cost: {}, light: ['#dc2626', '#facc15'], dark: ['#f472b6', '#a3e635'] },
  { id: 'shoes-moon', name: 'To the Moon Sneakers', description: 'Lightning at your heels. Bags on the moon.', category: 'shoes', vault: true, cost: { coins: 4000, diamonds: 16 }, light: ['#7e22ce', '#fde047'], dark: ['#93c5fd', '#f9a8d4'] },
  { id: 'hats-cone', name: 'The Warning Sign', description: 'Risk ahead. Obviously.', category: 'hats', cost: { coins: 2100, hats: 18 }, light: ['#ea580c', '#fff7ed'], dark: ['#fb923c', '#ecfeff'] },
  { id: 'hats-top', name: 'Hostile Top Hat', description: 'Rent is due.', category: 'hats', cost: { coins: 4200, hats: 30 }, light: ['#18181b', '#b91c1c'], dark: ['#cbd5e1', '#fbbf24'] },
  { id: 'suitcase-dynamite', name: 'Earnings Surprise', description: 'Explosive quarterly results.', category: 'suitcase', cost: { coins: 3800, bags: 30 }, light: ['#b91c1c', '#fbbf24'], dark: ['#fb7185', '#fde68a'] },
  { id: 'suits-squeeze', name: 'Short Squeeze Suit', description: 'Tailored under pressure.', category: 'suits', cost: { coins: 3400, hats: 24 }, light: ['#6b7280', '#2563eb'], dark: ['#cbd5e1', '#38bdf8'] },
  { id: 'suits-too-big', name: 'Too Big To Fail', description: 'Systemically wide shoulders.', category: 'suits', cost: { coins: 6200, diamonds: 28 }, light: ['#153faa', '#f97373'], dark: ['#2563eb', '#67e8f9'] },
  { id: 'suits-money', name: 'Money Printer Suit', description: 'Dressed for quantitative easing.', category: 'suits', cost: { coins: 7200, bells: 20 }, light: ['#166534', '#9333ea'], dark: ['#4ade80', '#fde047'] },
  { id: 'pets-hamster', name: 'High-Frequency Hamster', description: 'Trades per squeak: 1,000.', category: 'pets', cost: { coins: 2900, bananas: 20 }, light: ['#c48a52', '#fff1d6'], dark: ['#f2bc78', '#fef3c7'] },
  { id: 'pets-black-swan', name: 'Swan Jr.', description: 'Tiny. Unexpected.', category: 'pets', cost: { coins: 3600, bells: 10 }, light: ['#18181b', '#dc2626'], dark: ['#ffffff', '#fb7185'] },
  { id: 'pets-rabbit', name: 'The Earnings Magician', description: 'Now you see the profits...', category: 'pets', cost: { coins: 3200, hats: 20 }, light: ['#ffffff', '#f9a8d4'], dark: ['#ffffff', '#fbcfe8'] },
  { id: 'pets-yacht', name: 'Yacht', description: 'Offshore. On a budget.', category: 'pets', cost: { coins: 1700, bags: 15 }, light: ['#e2e8f0', '#2563eb'], dark: ['#bae6fd', '#818cf8'] },
  { id: 'pets-rock', name: 'Rock', description: 'Diamond hands. Granite brain.', category: 'pets', cost: { coins: 200, bags: 5 }, light: ['#78716c', '#d6d3d1'], dark: ['#a8a29e', '#e7e5e4'] },
  { id: 'pets-steak', name: 'Steak', description: 'High steaks. Low balance.', category: 'pets', cost: { coins: 800, tenders: 5 }, light: ['#be123c', '#fecdd3'], dark: ['#f43f5e', '#ffe4e6'] },
  { id: 'pets-snail', name: 'Snailord', description: 'Slow trades. Royal returns.', category: 'pets', cost: { coins: 1000, bananas: 5 }, light: ['#8273bd', '#f1c17b'], dark: ['#afa0e1', '#f9d69a'] },
  { id: 'pets-box', name: 'Box', description: 'Unpack your unrealized losses.', category: 'pets', cost: { coins: 1200, bags: 8 }, light: ['#b7793b', '#f5d0a0'], dark: ['#d4a373', '#fef3c7'] },
  { id: 'pets-potato', name: 'Potato', description: 'A couch potato with market exposure.', category: 'pets', promoCode: 'potat', cost: {}, light: ['#b88746', '#f5d0a0'], dark: ['#d6ab6f', '#fef3c7'] },
  { id: 'pets-stick', name: 'Stick', description: 'Branching out your portfolio.', category: 'pets', achievementId: 'stick-around', cost: {}, light: ['#854d0e', '#d6a76b'], dark: ['#a16207', '#fde68a'] },
  { id: 'pets-brick', name: 'Brick', description: 'Building support, one brick at a time.', category: 'pets', cost: { coins: 700, bags: 5 }, light: ['#b45339', '#f5b49f'], dark: ['#d46a4e', '#fed7aa'] },
  { id: 'pets-duck', name: 'Goose', description: 'Honks louder than the opening bell.', category: 'pets', cost: { coins: 2200, hats: 15 }, light: ['#ffffff', '#f59e0b'], dark: ['#ffffff', '#fbbf24'] },
  { id: 'pets-printer', name: 'Money Printer', description: 'Your smallest quantitative easing team.', category: 'pets', cost: { coins: 25000, diamonds: 100, bells: 25 }, light: ['#334155', '#86efac'], dark: ['#64748b', '#bbf7d0'] },
  { id: 'pets-shiba', name: 'Doggo', description: 'Much portfolio. Very drawdown.', category: 'pets', cost: { coins: 5000, diamonds: 20 }, light: ['#d78b36', '#fff1d6'], dark: ['#f0a54b', '#fff7ed'] },
  { id: 'pets-dead-cat', name: 'Cat named Bounce', description: 'Nine lives. One more bounce.', category: 'pets', cost: { coins: 3500, bells: 8 }, light: ['#64748b', '#cbd5e1'], dark: ['#94a3b8', '#e2e8f0'] },
  { id: 'pets-ostrich', name: 'Ostrich', description: 'Head in the sand. Long on everything.', category: 'pets', cost: { coins: 4500, tenders: 25 }, light: ['#292524', '#f9a8d4'], dark: ['#57534e', '#fbcfe8'] },
  { id: 'hats-ath', name: 'All-Time Highness', description: 'Bought the top. Wears it proudly.', category: 'hats', vault: true, cost: {}, light: ['#10b981', '#ef4444'], dark: ['#34d399', '#fb7185'] },
  { id: 'hats-lid', name: 'Liquidation Lid', description: 'Blown open by a margin call.', category: 'hats', cost: { coins: 4800, hats: 35 }, light: ['#1f2937', '#9f1239'], dark: ['#475569', '#e11d48'] },
  { id: 'suitcase-diamond-hands', name: 'Diamond Hands', description: 'Unbreakable grip. Unsellable conviction.', category: 'suitcase', vault: true, cost: {}, light: ['#38bdf8', '#e0f2fe'], dark: ['#7dd3fc', '#f0f9ff'] },
  { id: 'suitcase-event-horizon', name: 'Event Horizon', description: 'Everything goes in. Nothing comes out.', category: 'suitcase', vault: true, cost: {}, light: ['#334155', '#a78bfa'], dark: ['#475569', '#c4b5fd'] },
  { id: 'suitcase-severance', name: 'Severance Package', description: 'Packed in five minutes. Escorted out in two.', category: 'suitcase', vault: true, cost: {}, light: ['#c08a52', '#7a5232'], dark: ['#d6a36b', '#f5d6a8'] },
  { id: 'shoes-rug-pull', name: 'Rug-Pull Runners', description: 'Fast exits. Floor not included.', category: 'shoes', cost: { coins: 4200, diamonds: 18 }, light: ['#1e293b', '#ef4444'], dark: ['#475569', '#f87171'] },
  { id: 'pets-bag', name: 'Emotional Support Bag', description: 'Carries your feelings, not your losses.', category: 'pets', cost: { coins: 2000, bags: 20 }, light: ['#398650', '#b6d88b'], dark: ['#51a666', '#d0e7a7'] },
].map(skin => {
  const recipe = exchangeRecipes[skin.id];
  if (Object.keys(skin.cost).length && !recipe) throw new Error(`Missing Exchange recipe: ${skin.id}`);
  const cost: Partial<Wallet> = recipe ? Object.fromEntries(Object.entries(recipe).map(([currency, amount]) => [currency, roundExchangePrice(amount)])) : {};
  return { ...skin, cost } as Skin;
});
export const defaults: Record<Category, string> = { candles: 'candles-classic', hats: 'hats-classic', suitcase: 'suitcase-classic', suits: 'suits-classic', shoes: 'shoes-classic', pets: 'pets-rock', mounts: 'mounts-classic' };
// `defaults` stays what the renderers fall back to. A new player owns and wears no Pet: the Rock is bought like the others.
export const startingOutfit: Record<Category, string> = { ...defaults, pets: '' };
const startingOwned = Object.values(defaults).filter(id => id !== defaults.pets);
export interface PlayerTitle {
  id: string;
  name: string;
  description?: string;
  achievementId?: string;
  cost: Partial<Wallet>;
}
export const TITLES: PlayerTitle[] = [
  { id: 'title-hedgelock', name: 'Hedgelock', description: 'Your hedge against common sense.', achievementId: 'title-hedgelock', cost: {} },
  { id: 'title-copiumancer', name: 'Copiumancer', description: 'Turning losses into bullish forecasts.', achievementId: 'title-copiumancer', cost: {} },
  { id: 'title-wickzard', name: 'Wickzard', description: 'Every wick is a magic trick.', achievementId: 'title-wickzard', cost: {} },
  { id: 'title-bagsquire', name: 'Bagsquire', description: 'Carrying bags with noble conviction.', achievementId: 'title-bagsquire', cost: {} },
  { id: 'title-stonksworn', name: 'Stonksworn', description: 'An oath to hold through every dip.', achievementId: 'title-stonksworn', cost: {} },
  { id: 'title-coinqueror', name: 'Coinqueror', description: 'One coin closer to world domination.', achievementId: 'title-coinqueror', cost: {} },
];
export const equippedTitle = (p: Progress): PlayerTitle | undefined =>
  TITLES.find(title => title.id === p.equippedTitle && p.ownedTitles.includes(title.id));
export interface RunProgress {
  id: string;
  startedAt: number;
  collected: Wallet;
  pips: number;
  ath: number;
  status: 'playing' | 'dead' | 'finished';
  revived: boolean;
  doubled: boolean;
  settled?: boolean;
}
export interface Progress {
  schema: 1;
  wallet: Wallet;
  lifetime: Wallet;
  deaths: number;
  throws: number;
  kills: Record<string, number>;
  feats: Partial<Record<Feat, number>>;
  rewardedAchievements: string[];
  scoreRewards: ScoreReward[];
  // Legacy one-time quest claims; Weekly Quests use `weekly` instead.
  claimedQuests: string[];
  weekly: WeeklyQuests | null;
  vault: MonthlyVault | null;
  bestPips: number;
  bestAth: number;
  ownedTitles: string[];
  equippedTitle: string | null;
  bestClassic: number;
  bestAssisted: number;
  runs: number;
  loginDays: string[];
  owned: string[];
  equipped: Record<Category, string>;
  run: RunProgress | null;
}
export const newProgress = (): Progress => ({
  schema: 1, wallet: emptyWallet(), lifetime: emptyWallet(), deaths: 0, throws: 0, kills: {}, feats: {}, rewardedAchievements: [], scoreRewards: [], claimedQuests: [], weekly: null, vault: null,
  bestPips: 0, bestAth: 0, ownedTitles: [], equippedTitle: null, bestClassic: 0, bestAssisted: 0, runs: 0, loginDays: [],
  owned: [...startingOwned], equipped: { ...startingOutfit }, run: null,
});
export const FEATS = ['dumpster-stomp', 'stomp', 'whale-ride', 'printer', 'diamond-drop', 'coin-flip', 'vanishing-case', 'clown-bag', 'tomato'] as const;
export type Feat = typeof FEATS[number];
export type GameEvent = { type: 'collect'; currency: Currency } | { type: 'kill'; enemy: string } | { type: 'throw' } | { type: 'feat'; feat: Feat };
export type ProgressCommand = GameEvent
  | { type: 'login' }
  | { type: 'redeemPromo'; code: string }
  | { type: 'grantMonthly'; skinId: string }
  | { type: 'start'; id: string; now: number }
  | { type: 'death'; pips: number; ath?: number }
  | { type: 'finish'; pips?: number; ath?: number }
  | { type: 'equipTitle'; titleId: string | null }
  | { type: 'purchaseTitle'; titleId: string }
  | { type: 'reward'; kind: RewardKind; runId: string }
  | { type: 'purchase'; skinId: string }
  | { type: 'claimAchievement'; achievementId: string }
  | { type: 'questWeek'; week: string }
  | { type: 'claimQuest'; questId: string; week: string }
  | { type: 'vaultMonth'; month: string }
  | { type: 'claimVault'; testOpen?: boolean; month?: string }
  | { type: 'starCoin' }
  | { type: 'equip'; skinId: string };
const count = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const validAth = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER / 100;
const recordBest = (p: Progress) => {
  const run = p.run;
  if (!run) return;
  p.bestPips = Math.max(p.bestPips, run.pips);
  p.bestAth = Math.max(p.bestAth, run.ath);
  if (run.revived) p.bestAssisted = Math.max(p.bestAssisted, run.pips);
  else p.bestClassic = Math.max(p.bestClassic, run.pips);
};
const settleRun = (p: Progress) => {
  if (!p.run || p.run.settled !== false) return;
  for (const currency of CURRENCIES) p.wallet[currency] += p.run.collected[currency];
  p.run.settled = true;
};
export function canReward(p: Progress, kind: RewardKind): boolean {
  const run = p.run;
  if (!run) return false;
  return kind === 'revive' ? run.status === 'dead' && !run.revived && !run.doubled
    : run.status !== 'playing' && !run.doubled && run.collected.coins > 0;
}
// Account actions are validated and cloud-confirmed by useProgression.
export function applyCommand(previous: Progress, command: ProgressCommand, verified = false, now = Date.now()): Progress {
  const p: Progress = structuredClone(previous);
  p.feats ??= {};
  p.rewardedAchievements ??= [];
  p.bestAth ??= 0;
  p.ownedTitles ??= [];
  p.equippedTitle ??= null;
  p.weekly ??= null;
  p.vault ??= null;
  if (p.run) p.run.ath ??= 0;
  const run = p.run;
  switch (command.type) {
    case 'vaultMonth':
      // Adopt a newer month; its Games Played count from today's total.
      if (!verified) throw new Error('Sign in with Google to refresh the Vault');
      if (!validVaultMonth(command.month)) throw new Error('Invalid Vault month');
      if (p.vault && p.vault.month >= command.month) return previous;
      p.vault = { month: command.month, baselineRuns: p.runs };
      break;
    case 'claimVault': {
      if (!verified) throw new Error('Sign in with Google to claim the Vault');
      if (command.month !== undefined && !validVaultMonth(command.month)) throw new Error('Invalid Vault month');
      const reward = command.month ? vaultReward(command.month) : VAULT_REWARD_IDS[0];
      if (p.owned.includes(reward)) return previous;
      if (!command.testOpen) {
        if (!command.month || p.vault?.month !== command.month) throw new Error('The Monthly Vault is refreshing. Please retry.');
        if (vaultRuns(p, command.month) < VAULT_TARGET) throw new Error(`Complete ${VAULT_TARGET} Games Played this month to open the Vault`);
      }
      p.owned.push(reward);
      break;
    }
    case 'questWeek':
      // Adopt a newer Google week; its baseline is today's lifetime counters.
      if (!verified) throw new Error('Sign in with Google to refresh quests');
      if (!validQuestWeek(command.week)) throw new Error('Invalid quest week');
      if (p.weekly && p.weekly.week >= command.week) return previous;
      p.weekly = { week: command.week, baseline: questCounters(p), claimed: [] };
      break;
    case 'claimQuest': {
      if (!verified) throw new Error('Sign in with Google to claim quests');
      if (!validQuestWeek(command.week)) throw new Error('Invalid quest week');
      const quest = weeklyQuests(command.week).find(q => q.id === command.questId);
      if (!quest) throw new Error('This quest is not active this week');
      const weekly = p.weekly;
      if (weekly?.week !== command.week) throw new Error('Weekly quests are refreshing. Please retry.');
      if (weekly.claimed.includes(quest.id)) return previous;
      if (!questDone(p, quest, command.week)) throw new Error('Quest incomplete');
      p.wallet.coins += quest.coins;
      weekly.claimed.push(quest.id);
      break;
    }
    case 'starCoin':
      // About & Help star Easter egg; the rare roll happens in the UI.
      if (!verified) throw new Error('Sign in with Google to collect coins');
      p.wallet.coins += 1;
      break;
    case 'grantMonthly': {
      // Monthly Squeeze reward: only items flagged monthly, added once, to the player's own save.
      const skin = SKINS.find(item => item.id === command.skinId);
      if (!skin?.monthly) throw new Error('Not a Monthly Squeeze item');
      if (!p.owned.includes(skin.id)) p.owned.push(skin.id);
      break;
    }
    case 'redeemPromo': {
      if (typeof command.code !== 'string' || command.code.length > 64) throw new Error('Invalid promo code');
      const skin = SKINS.find(item => item.promoCode === command.code.trim().toLowerCase());
      if (!skin) throw new Error('Invalid promo code');
      if (p.owned.includes(skin.id)) throw new Error('You already own this reward');
      p.owned.push(skin.id);
      break;
    }
    case 'login': {
      // Login days use the UTC calendar day.
      const day = new Date(now).toISOString().slice(0, 10);
      p.loginDays ??= [];
      if (p.loginDays.length >= 10 || p.loginDays.some(previousDay => previousDay >= day)) return previous;
      p.loginDays.push(day);
      break;
    }
    case 'feat':
      if (!FEATS.includes(command.feat)) throw new Error('Unknown feat');
      if (['dumpster-stomp', 'stomp', 'whale-ride', 'printer'].includes(command.feat) && run?.status !== 'playing') return previous;
      p.feats[command.feat] = (p.feats[command.feat] ?? 0) + 1;
      break;
    case 'start':
      if (!command.id || command.id.length > 100 || !count(command.now)) throw new Error('Invalid run');
      if (run?.id === command.id) return previous;
      recordBest(p);
      settleRun(p);
      p.run = { id: command.id, startedAt: command.now, collected: emptyWallet(), pips: 0, ath: 0, status: 'playing', revived: false, doubled: false, settled: false };
      p.runs++;
      break;
    case 'collect':
      if (!run || run.status !== 'playing') return previous;
      if (!CURRENCIES.includes(command.currency)) throw new Error('Unknown currency');
      if (run.settled !== false) p.wallet[command.currency]++;
      p.lifetime[command.currency]++; run.collected[command.currency]++;
      break;
    case 'kill':
      if (!run || run.status !== 'playing') return previous;
      if (!/^[a-z][a-z0-9-]{0,39}$/.test(command.enemy) || ['__proto__', 'constructor', 'prototype'].includes(command.enemy)) throw new Error('Invalid enemy');
      p.kills[command.enemy] = (p.kills[command.enemy] ?? 0) + 1;
      break;
    case 'throw':
      if (run?.status !== 'playing') return previous;
      p.throws++;
      break;
    case 'death':
      if (!run || run.status !== 'playing') return previous;
      if (!count(command.pips)) throw new Error('Invalid PIPS');
      if (command.ath !== undefined && !validAth(command.ath)) throw new Error('Invalid ATH');
      run.ath = Math.round((command.ath ?? 0) * 100) / 100;
      run.pips = command.pips; run.status = run.revived ? 'finished' : 'dead'; p.deaths++;
      if (run.status === 'finished') settleRun(p);
      recordBest(p);
      break;
    case 'finish':
      if (!run || run.status === 'finished') return previous;
      if (command.pips !== undefined && !count(command.pips)) throw new Error('Invalid PIPS');
      if (command.ath !== undefined && !validAth(command.ath)) throw new Error('Invalid ATH');
      if (run.status === 'playing') run.ath = Math.round((command.ath ?? 0) * 100) / 100;
      if (run.status === 'playing' && command.pips !== undefined) run.pips = command.pips;
      run.status = 'finished'; settleRun(p); recordBest(p);
      break;
    case 'reward':
      if (!verified || !run || run.id !== command.runId || !canReward(p, command.kind)) throw new Error('Reward unavailable');
      if (command.kind === 'revive') { run.revived = true; run.status = 'playing'; }
      else { settleRun(p); p.wallet.coins += run.collected.coins; run.doubled = true; run.status = 'finished'; }
      break;
    case 'claimAchievement': {
      const achievement = MOBILE_ACHIEVEMENTS.find(item => item.id === command.achievementId);
      if (!achievement) throw new Error('Unknown achievement');
      if (p.rewardedAchievements.includes(achievement.id)) return previous;
      if (achievement.value(p) < achievement.target) throw new Error('Achievement incomplete');
      for (const currency of CURRENCIES) p.wallet[currency] += achievement.reward[currency] ?? 0;
      for (const skin of SKINS.filter(s => s.achievementId === achievement.id)) if (!p.owned.includes(skin.id)) p.owned.push(skin.id);
      for (const title of TITLES.filter(t => t.achievementId === achievement.id)) if (!p.ownedTitles.includes(title.id)) p.ownedTitles.push(title.id);
      p.rewardedAchievements.push(achievement.id);
      break;
    }
    case 'equipTitle': {
      if (command.titleId !== null && !TITLES.some(t => t.id === command.titleId && p.ownedTitles.includes(t.id))) throw new Error('Title is locked');
      p.equippedTitle = command.titleId;
      break;
    }
    case 'purchaseTitle': {
      const title = TITLES.find(t => t.id === command.titleId);
      if (!verified || !title) throw new Error('Title purchase unavailable');
      if (p.ownedTitles.includes(title.id)) return previous;
      if (title.achievementId) throw new Error('Claim the required achievement to unlock this title');
      if (!CURRENCIES.every(c => count(title.cost[c] ?? 0))) throw new Error('Invalid title price');
      for (const c of CURRENCIES) if (p.wallet[c] < (title.cost[c] ?? 0)) throw new Error('Not enough currency');
      for (const c of CURRENCIES) p.wallet[c] -= title.cost[c] ?? 0;
      p.ownedTitles.push(title.id);
      break;
    }
    case 'purchase': {
      if (!verified) throw new Error('Sign in with Google to unlock skins');
      const skin = SKINS.find(s => s.id === command.skinId);
      if (!skin) throw new Error('Unknown skin');
      if (p.owned.includes(skin.id)) return previous;
      if (skin.vault) throw new Error('Claim this item from the Monthly Vault');
      if (skin.monthly) throw new Error('This item unlocks through Monthly Squeeze');
      if (skin.achievementId) throw new Error('Collect the required achievement to unlock this skin');
      if (skin.promoCode) throw new Error('Use a promo code in Loot to unlock this skin');
      for (const currency of CURRENCIES) if (p.wallet[currency] < (skin.cost[currency] ?? 0)) throw new Error('Not enough currency');
      for (const currency of CURRENCIES) p.wallet[currency] -= skin.cost[currency] ?? 0;
      p.owned.push(skin.id);
      break;
    }
    case 'equip': {
      const skin = SKINS.find(s => s.id === command.skinId);
      if (!verified || !skin || !p.owned.includes(skin.id)) throw new Error('Skin is locked');
      p.equipped[skin.category] = skin.id;
      break;
    }
    default: throw new Error('Unknown command');
  }
  if (!CURRENCIES.every(c => count(p.wallet[c]) && count(p.lifetime[c])) || !Object.values(p.feats).every(count)) throw new Error('Balance overflow');
  return p;
}
const validWeekly = (weekly: unknown): boolean => {
  if (weekly === null) return true;
  const w = weekly as WeeklyQuests;
  if (!w || typeof w !== 'object' || !validQuestWeek(w.week) || !w.baseline || typeof w.baseline !== 'object'
    || !w.baseline.lifetime || !CURRENCIES.every(c => count(w.baseline.lifetime[c]))
    || !count(w.baseline.throws) || !count(w.baseline.kills) || !Array.isArray(w.claimed)) return false;
  const active = weeklyQuests(w.week);
  return w.claimed.every(id => active.some(q => q.id === id)) && new Set(w.claimed).size === w.claimed.length;
};
export function readProgress(raw: string | null, strict = false): Progress {
  const invalid = (): Progress => {
    if (strict) throw new Error('Invalid saved progress. Existing data was preserved.');
    return newProgress();
  };
  try {
    const p = JSON.parse(raw ?? 'null') as Progress;
    // Add the new currency without discarding existing schema-1 guest/cloud saves.
    if (p?.schema === 1) {
      p.feats ??= {};
      p.rewardedAchievements ??= [];
      p.scoreRewards ??= [];
      p.claimedQuests ??= [];
      p.weekly ??= null;
      p.vault ??= null;
      // A currency added after the week began starts at zero for that week.
      if (p.weekly?.baseline?.lifetime && typeof p.weekly.baseline.lifetime === 'object') {
        for (const currency of CURRENCIES) p.weekly.baseline.lifetime[currency] ??= 0;
      }
      p.loginDays ??= [];
      p.bestAth ??= 0;
      p.ownedTitles ??= [];
      p.equippedTitle ??= null;
      if (p.run) p.run.ath ??= 0;
      // Older versions credited collections immediately. Never credit them again.
      if (p.run) p.run.settled ??= true;
      for (const wallet of [p.wallet, p.lifetime, p.run?.collected]) {
        if (wallet && typeof wallet === 'object' && !Array.isArray(wallet) && !Object.hasOwn(wallet, 'bananas')) wallet.bananas = 0;
      }
    }
    if (p?.schema !== 1 || !CURRENCIES.every(c => count(p.wallet?.[c]) && count(p.lifetime?.[c]))
      || ![p.deaths, p.throws, p.runs, p.bestPips, p.bestClassic, p.bestAssisted].every(count)
      || !validAth(p.bestAth) || !Array.isArray(p.ownedTitles) || !p.ownedTitles.every(id => typeof id === 'string')
      || !(p.equippedTitle === null || typeof p.equippedTitle === 'string')
      || !Array.isArray(p.owned) || !p.equipped || !p.kills || typeof p.kills !== 'object'
      || !Object.values(p.kills).every(count)
      || !p.feats || typeof p.feats !== 'object' || Array.isArray(p.feats) || !Object.entries(p.feats).every(([key, value]) => FEATS.includes(key as Feat) && count(value))
      || !Array.isArray(p.rewardedAchievements) || !p.rewardedAchievements.every(id => typeof id === 'string')
      || !Array.isArray(p.scoreRewards) || !p.scoreRewards.every(validScoreReward)
      || !Array.isArray(p.claimedQuests) || !p.claimedQuests.every(id => QUESTS.some(q => q.id === id))
      || new Set(p.claimedQuests).size !== p.claimedQuests.length
      || !validWeekly(p.weekly)
      || !(p.vault === null || (p.vault && typeof p.vault === 'object' && validVaultMonth(p.vault.month) && count(p.vault.baselineRuns)))
      || new Set(p.scoreRewards.map(r => r.id)).size !== p.scoreRewards.length
      || !Array.isArray(p.loginDays) || p.loginDays.length > 10
      || !p.loginDays.every((day, index) => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)
        && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day
        && (!index || day > p.loginDays[index - 1]))) return invalid();
    if (p.run && (!['playing', 'dead', 'finished'].includes(p.run.status) || typeof p.run.id !== 'string'
      || typeof p.run.settled !== 'boolean' || (p.run.status === 'finished' && !p.run.settled)
      || !count(p.run.startedAt) || !count(p.run.pips) || !validAth(p.run.ath) || typeof p.run.revived !== 'boolean' || typeof p.run.doubled !== 'boolean'
      || !CURRENCIES.every(c => count(p.run!.collected?.[c])))) return invalid();
    // Retired 4x4 owners retain a usable Brick without resetting their save.
    const retiredCases: Record<string, string> = { 'suitcase-gold': 'suitcase-duffel', 'suitcase-ocean': 'suitcase-backpack' };
    p.owned = p.owned.map(id => retiredCases[id] ?? id);
    p.equipped.suitcase = retiredCases[p.equipped.suitcase] ?? p.equipped.suitcase;
    if (p.owned.includes('pets-brick-4x4')) p.owned.push('pets-brick');
    if (p.equipped.pets === 'pets-brick-4x4') p.equipped.pets = 'pets-brick';
    p.owned = [...new Set([...p.owned.filter(id => SKINS.some(s => s.id === id)), ...startingOwned])];
    // Previously claimed achievements and purchased cosmetics retain their unlocks.
    if (p.rewardedAchievements.includes('pool-of-liquidity') && !p.owned.includes('suits-swim')) p.owned.push('suits-swim');
    for (const skin of SKINS.filter(s => s.achievementId && p.rewardedAchievements.includes(s.achievementId))) if (!p.owned.includes(skin.id)) p.owned.push(skin.id);
    for (const category of CATEGORIES) {
      if (!SKINS.some(s => s.id === p.equipped[category] && s.category === category && p.owned.includes(s.id))) p.equipped[category] = startingOutfit[category];
    }
    p.ownedTitles = [...new Set(p.ownedTitles.filter(id => TITLES.some(t => t.id === id)))];
    for (const title of TITLES) if (title.achievementId && p.rewardedAchievements.includes(title.achievementId) && !p.ownedTitles.includes(title.id)) p.ownedTitles.push(title.id);
    if (!p.ownedTitles.includes(p.equippedTitle ?? '')) p.equippedTitle = null;
    return p;
  } catch (error) { if (strict) throw error; return newProgress(); }
}
export const skinColors = (id: string, dark: boolean): [string, string] => {
  const skin = SKINS.find(s => s.id === id) ?? SKINS[0];
  return dark ? skin.dark : skin.light;
};
export interface Achievement {
  id: string; name: string; description: string; target: number; difficulty: number;
  art: 'egg' | 'market' | 'dumpster' | 'mage' | 'bag' | 'crown' | 'rocket';
  reward: Partial<Wallet>; value: (p: Progress) => number;
  requirements?: Partial<Wallet>;
}
// Coins and diamonds, plus at most one thematic currency or cosmetic unlock.
const achievementRewards: Record<string, Partial<Wallet>> = {
  butterfingers: { coins: 75, diamonds: 1 },
  'coin-flipper': { coins: 150, diamonds: 2 },
  'stick-around': { coins: 300, diamonds: 5 },
  stomp: { coins: 200, diamonds: 3, hats: 3 },
  printer: { coins: 300, diamonds: 5, bells: 2 },
  'paper-hands': { coins: 250, diamonds: 3, bags: 5 },
  bagholder: { coins: 350, diamonds: 5, bags: 5 },
  mage: { coins: 400, diamonds: 5 },
  'tender-enjoyer': { coins: 350, diamonds: 5, tenders: 5 },
  apes: { coins: 350, diamonds: 5, bananas: 5 },
  'hat-collector': { coins: 400, diamonds: 5, hats: 10 },
  'dumpster-enjoyer': { coins: 600, diamonds: 8, tenders: 10 },
  'bull-market': { coins: 600, diamonds: 8, hats: 5 },
  'bear-market': { coins: 600, diamonds: 8, bags: 10 },
  'whale-rider': { coins: 750, diamonds: 10 },
  'emotional-baggage': { coins: 750, diamonds: 10, bags: 15 },
  boss: { coins: 1000, diamonds: 10, bells: 5 },
  'all-time-high': { coins: 1500, diamonds: 15 },
};
export const ACHIEVEMENTS: Achievement[] = ([
  { id: 'butterfingers', name: 'Diamond Hands? Butterfingers', description: 'Drop the Settings diamond', target: 1, difficulty: 1, art: 'egg', reward: { coins: 75 }, value: p => p.feats?.['diamond-drop'] ?? 0 },
  { id: 'clown-bag', name: 'Due Diligence: Clown Inside', description: 'Find the clown in the Terms bag', target: 1, difficulty: 1, art: 'egg', reward: { bags: 2 }, value: p => p.feats?.['clown-bag'] ?? 0 },
  { id: 'tomato', name: 'Banana for Scale. Tomato for Chaos.', description: 'Turn the Preferences banana into a tomato', target: 1, difficulty: 1, art: 'egg', reward: { bananas: 3 }, value: p => p.feats?.tomato ?? 0 },
  { id: 'vanishing-case', name: 'Offshore Account', description: 'Shrink the Privacy briefcase out of existence', target: 1, difficulty: 1, art: 'bag', reward: { bags: 3 }, value: p => p.feats?.['vanishing-case'] ?? 0 },
  { id: 'coin-flipper', name: 'Technical Analysis, Apparently', description: 'Flip the About coin 25 times', target: 25, difficulty: 2, art: 'egg', reward: { coins: 150 }, value: p => p.feats?.['coin-flip'] ?? 0 },
  { id: 'stick-around', name: 'Stick around', description: 'Log in for 10 days', target: 10, difficulty: 8, art: 'bag', reward: {}, value: p => p.loginDays?.length ?? 0 },
  { id: 'stomp', name: 'Hostile Feetover', description: 'Stomp 250 enemies', target: 250, difficulty: 3, art: 'rocket', reward: { coins: 200, hats: 3 }, value: p => p.feats?.stomp ?? 0 },
  { id: 'printer', name: 'Quantitative Wheeeasing', description: 'Activate Money Printer 100 times', target: 100, difficulty: 8, art: 'market', reward: { coins: 300 }, value: p => p.feats?.printer ?? 0 },
  { id: 'paper-hands', name: 'Paper Hands', description: 'Get liquidated 100 times', target: 100, difficulty: 2, art: 'bag', reward: { coins: 250, bags: 5 }, value: p => p.deaths },
  { id: 'bagholder', name: 'Bagholder', description: 'Collect 1000 bags', target: 1000, difficulty: 4, art: 'bag', reward: { coins: 350, bags: 5 }, value: p => p.lifetime.bags },
  { id: 'mage', name: 'What are you? A mage?', description: 'Collect 1000 diamonds', target: 1000, difficulty: 5, art: 'mage', reward: { coins: 400, diamonds: 5 }, value: p => p.lifetime.diamonds },
  { id: 'tender-enjoyer', name: 'Tender Enjoyer', description: 'Collect 500 chicken tenders', target: 500, difficulty: 7, art: 'crown', reward: { coins: 350, tenders: 5 }, value: p => p.lifetime.tenders },
  { id: 'apes', name: 'Board of Ape Directors', description: 'Collect 1000 bananas', target: 1000, difficulty: 6, art: 'crown', reward: { coins: 350, bananas: 5 }, value: p => p.lifetime.bananas },
  { id: 'hat-collector', name: 'Hat Collector', description: 'Collect 1000 hats', target: 1000, difficulty: 9, art: 'crown', reward: { coins: 400, hats: 10 }, value: p => p.lifetime.hats },
  { id: 'dumpster-enjoyer', name: 'Dumbster Enjoyer', description: 'Stomp 1000 enemies while riding the dumpster', target: 1000, difficulty: 13, art: 'dumpster', reward: { coins: 600, tenders: 10 }, value: p => p.feats?.['dumpster-stomp'] ?? 0 },
  { id: 'bull-market', name: 'Bulldozer', description: 'Defeat 2500 bulls', target: 2500, difficulty: 10, art: 'market', reward: { coins: 600, diamonds: 8 }, value: p => p.kills.bull ?? 0 },
  { id: 'bear-market', name: 'Bear Buster', description: 'Defeat 2500 bears', target: 2500, difficulty: 11, art: 'market', reward: { coins: 600, diamonds: 8 }, value: p => p.kills.bear ?? 0 },
  { id: 'whale-rider', name: 'Too Big to Walk', description: 'Mount a whale 250 times', target: 250, difficulty: 12, art: 'rocket', reward: { coins: 750, bags: 10 }, value: p => p.feats?.['whale-ride'] ?? 0 },
  { id: 'emotional-baggage', name: 'Emotional Baggage', description: 'Throw 10000 suitcases', target: 10000, difficulty: 14, art: 'bag', reward: { coins: 750, bags: 15 }, value: p => p.throws },
  { id: 'boss', name: 'Your Rate Hike Has Been Declined', description: 'Defeat 250 bosses', target: 250, difficulty: 15, art: 'crown', reward: { coins: 1000, bells: 5 }, value: p => (p.kills.jerome ?? 0) + (p.kills.paul ?? 0) + (p.kills.janet ?? 0) },
  { id: 'all-time-high', name: 'All-Time High', description: 'Reach 100,000 PIPS in one run', target: 100000, difficulty: 16, art: 'rocket', reward: { coins: 1500, diamonds: 15 }, value: p => p.bestPips },
] satisfies Achievement[] as Achievement[]).concat([
  ...[['hedgelock', 'Hedgelock', 10000], ['copiumancer', 'Copiumancer', 50000], ['wickzard', 'Wickzard', 100000]].map(([id, name, target], index): Achievement => ({
    id: `title-${id}`, name: `${name}`, target: Number(target), difficulty: 17 + index,
    description: `Reach ${Number(target).toLocaleString('en-US')} PIPS in one run`, art: 'mage', reward: {}, value: p => p.bestPips,
  })),
  ...[['bagsquire', 'Bagsquire', 1000000], ['stonksworn', 'Stonksworn', 100000000], ['coinqueror', 'Coinqueror', 1000000000]].map(([id, name, target], index): Achievement => ({
    id: `title-${id}`, name: `${name}`, target: Number(target), difficulty: 20 + index,
    description: `Reach a Score of ${Number(target).toLocaleString('en-US')} in one run`, art: 'crown', reward: {}, value: p => p.bestAth,
  })),
]).map((item): Achievement => {
  const reward = achievementRewards[item.id] ?? item.reward;
  return { ...item, reward };
}).sort((a, b) => a.difficulty - b.difficulty);

// Website-only dialogs have no mobile entry; keep feat and reward IDs for legacy saves.
export const MOBILE_ACHIEVEMENTS = ACHIEVEMENTS.filter(item => !['clown-bag', 'tomato', 'vanishing-case', 'stick-around'].includes(item.id));
// Counted toward the shared Monthly Squeeze, so listed as Monthly Effort; others are personal.
export const MONTHLY_EFFORT_ACHIEVEMENTS: readonly string[] = ['paper-hands', 'coin-flipper', 'apes', 'printer', 'whale-rider', 'emotional-baggage'];

export const claimableAchievements = (progress: Progress) => MOBILE_ACHIEVEMENTS.filter(item =>
  item.value(progress) >= item.target && !progress.rewardedAchievements?.includes(item.id));

// Provisional acquisition effort in coin-equivalent units, not owned/equipped state.
const currencyEffort: Wallet = { coins: 1, diamonds: 30, bags: 30, hats: 200, tenders: 100, bells: 500, bananas: 100 };
export function cosmeticDifficulty(skin: Skin): number {
  if (skin.monthly) return 160000; // Keeps the place it had in the list, among the hardest unlocks.
  if (skin.achievementId) {
    if (skin.achievementId === 'coin-flipper') return 100;
    if (skin.achievementId === 'stick-around') return 10000;
    return (ACHIEVEMENTS.find(item => item.id === skin.achievementId)?.difficulty ?? 100) * 10000;
  }
  return CURRENCIES.reduce((total, currency) => total + (skin.cost[currency] ?? 0) * currencyEffort[currency], 0);
}
export function cosmeticsByDifficulty(category: Category): Skin[] {
  return SKINS.filter(skin => skin.category === category).sort((a, b) => cosmeticDifficulty(a) - cosmeticDifficulty(b));
}