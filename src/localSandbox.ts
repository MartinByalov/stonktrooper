import { CURRENCIES, SKINS, TITLES, type Progress } from './progression';
import { vaultMonth, vaultReward } from './vault';

// Explicit opt-in build flag. Sandbox data never shares the real guest save or server.
export const LOCAL_SANDBOX = import.meta.env?.VITE_LOCAL_SANDBOX === 'true';
export const SANDBOX_BALANCE = 1_000_000_000;
export function sandboxProgress(progress: Progress): Progress {
  const next = structuredClone(progress);
  for (const currency of CURRENCIES) next.wallet[currency] = SANDBOX_BALANCE;
  // Every cosmetic is wearable for testing, except this month's Vault reward, which stays
  // claimable so the Vault itself can be tested.
  const reward = vaultReward(vaultMonth(Date.now()));
  next.owned = [...new Set([...next.owned.filter(id => id !== reward), ...SKINS.filter(skin => skin.id !== reward).map(skin => skin.id)])];
  next.ownedTitles = [...new Set([...next.ownedTitles, ...TITLES.map(title => title.id)])];
  return next;
}