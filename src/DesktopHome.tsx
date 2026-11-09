import type { ReactNode } from 'react';
import { DesktopMenuCelebration } from './DesktopMenuCelebration';
import { MenuQuote } from './MenuQuote';
import { ActionLabel } from './ActionLabel';

// Desktop Home page laid out like the browser version; Android buttons are added later by the owner.
export function DesktopHome({ theme, chart, extra, landingScore, liveFeedVisible, onGuide, onSettings, children }: {
  theme: 'light' | 'dark';
  chart: ReactNode;
  // Rendered over the chart (the Monthly Squeeze card).
  extra?: ReactNode;
  landingScore: ReactNode | null;
  liveFeedVisible: boolean;
  onGuide: () => void;
  onSettings: () => void;
  // Home buttons that come from the android version (Play as Guest, Sign in / Sign up, ...).
  children?: ReactNode;
}) {
  return <section className={`landing-menu-panel rounded border border-[var(--line)]${landingScore ? ' landing-menu-shared-score' : ''}`} aria-label="Game menu">
    {chart}
    {extra}
    {landingScore}
    <button className="coffee-link home-coffee-link" type="button" aria-label="Donate (opens in a new tab)" onClick={() => window.open('https://ko-fi.com/eon', '_blank', 'noopener,noreferrer')}>
      {!landingScore && <span className="donate-home-art" aria-hidden="true"><DesktopMenuCelebration theme={theme} /></span>}
      <span className="coffee-cup" aria-hidden="true">♥</span>
      <span className="donate-label">Donate</span>
    </button>
    <div className="landing-menu-actions how-to-controls w-full flex flex-col gap-1">
      {!landingScore && <MenuQuote liveFeedEnabled={liveFeedVisible} />}
      {!landingScore && <DesktopMenuCelebration theme={theme} />}
      <button type="button" onClick={onSettings} aria-haspopup="dialog" className="landing-menu-settings-button menu-action-button w-full rounded border border-[var(--line)] bg-[var(--panel)] text-[var(--text)] font-bold font-mono-term cursor-pointer"><ActionLabel>Settings</ActionLabel></button>
      <button type="button" onClick={onGuide} aria-haspopup="dialog" className="landing-menu-guide-button menu-action-button w-full rounded border border-black bg-black text-white font-bold font-mono-term cursor-pointer"><ActionLabel>How to Play</ActionLabel></button>
      {children}
    </div>
  </section>;
}
