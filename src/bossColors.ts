import type { BossKind } from './boxingRules';

// The name and remaining HP share the opponent's colour in both themes.
export function bossColors(kind: BossKind, darkMode: boolean): { foreground: string; track: string } {
  if (kind === 'paul') {
    return darkMode
      ? { foreground: '#c084fc', track: '#581c87' }
      : { foreground: '#6b21a8', track: '#f3e8ff' };
  }
  if (kind === 'janet') {
    return darkMode
      ? { foreground: '#4ade80', track: '#14532d' }
      : { foreground: '#166534', track: '#dcfce7' };
  }
  return darkMode
    ? { foreground: '#fb923c', track: '#7c2d12' }
    : { foreground: '#9a3412', track: '#ffedd5' };
}