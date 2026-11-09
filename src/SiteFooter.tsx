import { ActionLabel } from './ActionLabel';
import { DisconnectGoogle, DisconnectGoogleNote } from './DisconnectGoogle';
import { CloseButton } from './CloseButton';
// Browser game module for SiteFooter.
import { useEffect, useRef, useState } from 'react';
import { Mail, Volume2, VolumeX, Pause, Moon, Sparkles } from 'lucide-react';
import { AssetPreview, type PreviewAsset } from './AssetPreview';
import { SettingsDiamond } from './SettingsDiamond';
import { StonksDialog } from './StonksDialog';
import { InfoArtwork } from './InfoArtwork';
import { AboutStar } from './AboutStar';
import type { GameEvent, Wallet } from './progression';
import { LegalDocumentView } from './LegalDocumentView';
import { PRIVACY_POLICY, TERMS } from './legal';
import './credits.css';

const sections = ['About', 'Privacy', 'Terms', 'Preferences'] as const;
const footerLabel = (item: string) => item === 'Terms' ? 'Terms & Conditions' : item;
export type SiteSection = typeof sections[number] | 'Settings';
const sectionAssets: Record<SiteSection, PreviewAsset> = { About: 'coin', Privacy: 'briefcase', Terms: 'bag', Preferences: 'banana', Settings: 'diamond' };

export function SiteFooter({ showNavigation = true, onProgress, onOpen, theme, section, setSection, volume, onVolumeChange, animationsEnabled, onToggleAnimations, liveFeedPaused, onToggleLiveFeedPause, onToggleTheme, highContrast, onToggleHighContrast, onResetDefaults, onDisconnect, wallet, hatSkin, onStarCoin }: { onDisconnect?: () => Promise<void>; showNavigation?: boolean; onProgress?: (event: GameEvent) => void; wallet: Wallet; hatSkin: string; onStarCoin?: () => Promise<void>; onOpen: () => void; theme: 'light' | 'dark'; section: SiteSection | null; setSection: (section: SiteSection | null) => void; volume: number; onVolumeChange: (volume: number) => void; animationsEnabled: boolean; onToggleAnimations: () => void; liveFeedPaused: boolean; onToggleLiveFeedPause: () => void; onToggleTheme: () => void; highContrast: boolean; onToggleHighContrast: () => void; onResetDefaults: () => void }) {
  const [message, setMessage] = useState('');
  // About & Help is one section: Privacy and Terms & Conditions are public pages of their own, opened from the footer links.
  const credits = section === 'About';
  const infoSection = section;
  useEffect(() => { setMessage(''); }, [section]);
  const [stonksOpen, setStonksOpen] = useState(false);
  useEffect(() => { if (section !== 'About') setStonksOpen(false); }, [section]);
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!section) return;
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus();
    return () => { previous?.focus(); };
  }, [section]);
  return <>
    {showNavigation && <footer className="site-footer border-t border-[var(--line)] shrink-0 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-1 px-3 py-1 text-[10px] text-[var(--muted)] font-mono-term">
      <nav aria-label="Site information" className="flex flex-wrap items-center justify-start justify-self-start gap-3">
        {sections.map(item => {
          const open = () => { onOpen(); setMessage(''); setSection(item); };
          const page = item === 'About' ? 'about/' : item === 'Privacy' ? 'privacy/' : item === 'Terms' ? 'terms/' : null;
          const className = 'hover:text-[var(--text)] underline underline-offset-2 cursor-pointer';
          // The public address is a real link (crawlers follow it); a normal click opens the section here, keeping offline play.
          return page
            ? <a key={item} href={`${import.meta.env.BASE_URL}${page}`} className={className} onClick={event => { if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); open(); }}>{footerLabel(item)}</a>
            : <button key={item} type="button" className={className} onClick={open}>{footerLabel(item)}</button>;
        })}
      </nav>
    </footer>}
    {section && <div className="site-info-overlay fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onPointerDown={event => event.stopPropagation()}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="site-info-title" className="site-info-dialog w-full max-w-xl max-h-[85dvh] overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl" onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Escape') setSection(null);
      }}>
        <div className="site-info-header relative flex justify-center items-center min-h-10 mb-4 px-10">
          {credits && <AboutStar theme={theme} wallet={wallet} hatSkin={hatSkin} onCoin={onStarCoin} />}
          <h2 id="site-info-title" className="site-info-title font-bold text-xl">{credits ? 'About & Help' : footerLabel(section)}</h2>
          <CloseButton ref={close} type="button" aria-label="Close site information" onClick={() => setSection(null)} className="dialog-close mobile-dialog-close site-info-close absolute right-0 top-0 p-2 border border-[var(--line)] rounded hover:bg-[var(--alt)] cursor-pointer" />
        </div>
        <div className={`site-info-content text-sm leading-relaxed${credits ? ' credits-layout' : ''}`}>
          <div className="site-info-body" data-info-section={infoSection} tabIndex={credits ? 0 : undefined}>
          <div className="site-info-artwork" data-info-asset={sectionAssets[infoSection!]}>{infoSection === 'Settings' ? <SettingsDiamond theme={theme} animationsEnabled={animationsEnabled} onProgress={onProgress} /> : <InfoArtwork key={infoSection} asset={sectionAssets[infoSection!] as 'coin' | 'briefcase' | 'bag' | 'banana'} theme={theme} animationsEnabled={animationsEnabled} onProgress={onProgress} />}</div>
          <div className="site-info-main space-y-3">
          {infoSection === 'About' && <>
            <p><img src={`${import.meta.env.BASE_URL}images/${theme === 'dark' ? 'logo-inverted.png' : 'logo.png'}`} alt="Stonktrooper" className="relative -top-[1px] inline-block h-6 w-auto max-w-full align-middle" />{' '}is a game inspired by fictional financial markets, internet memes and experimental game design. It's an amalgamation of the author's experience with the real markets.</p>
            <p>The game is free to play. There are no purchases, subscriptions, paid upgrades or real-money gameplay. Signing in with Google is optional; your outfit is kept in your own Google Drive.</p>
            <p>If you have any idea or a suggestion about the game, feel free to contact me.</p>
            <div className="about-contact-links flex items-center justify-center gap-3" aria-label="Contact links">
              <a href="mailto:contact@stonktrooper.lol" aria-label="Email me" title="contact@stonktrooper.lol" className="site-info-contact-button inline-flex items-center justify-center p-2 rounded border border-[var(--line)] hover:bg-[var(--alt)] focus-visible:outline-2 focus-visible:outline-[var(--green)]">
                <Mail className="w-5 h-5" aria-hidden="true" />
              </a>
              <a href="https://discord.com/users/1560319187526615073" target="_blank" rel="noopener noreferrer" aria-label="Contact me on Discord" title="Discord" className="site-info-contact-button inline-flex items-center justify-center p-2 rounded border border-[var(--line)] hover:bg-[var(--alt)] focus-visible:outline-2 focus-visible:outline-[var(--green)]">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
                  <path d="M20.3 4.4a19.8 19.8 0 0 0-4.9-1.5l-.6 1.2a18.3 18.3 0 0 0-5.6 0l-.6-1.2a19.8 19.8 0 0 0-4.9 1.5C.6 9 .0 13.5.3 17.9a20 20 0 0 0 6 3l1.2-2a12.7 12.7 0 0 1-1.9-.9l.5-.4a14.2 14.2 0 0 0 11.8 0l.5.4a12.7 12.7 0 0 1-1.9.9l1.2 2a20 20 0 0 0 6-3c.4-5.1-.8-9.5-3.4-13.5ZM8 15.3c-1.1 0-1.9-1-1.9-2.2S6.9 10.9 8 10.9s1.9 1 1.9 2.2-.8 2.2-1.9 2.2Zm8 0c-1.1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2Z" />
                </svg>
              </a>
              <a href="https://www.reddit.com/u/NagatoKami/" target="_blank" rel="noopener noreferrer" aria-label="Contact me on Reddit" title="Reddit" className="site-info-contact-button inline-flex items-center justify-center p-2 rounded border border-[var(--line)] hover:bg-[var(--alt)] focus-visible:outline-2 focus-visible:outline-[var(--green)]">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m12 8 1-5 5 1" />
                  <circle cx="20" cy="4" r="2" />
                  <path d="M4.2 10.7a2.5 2.5 0 1 0-1.5 4.8M19.8 10.7a2.5 2.5 0 1 1 1.5 4.8" />
                  <ellipse cx="12" cy="14.5" rx="9" ry="6.5" />
                  <circle cx="8.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
                  <circle cx="15.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
                  <path d="M8 17c2 1.5 6 1.5 8 0" />
                </svg>
              </a>
            </div>
          </>}
          {section === 'Settings' && <div className="settings-options">
            <div className="settings-volume-row">
              <label htmlFor="settings-volume" className="settings-label">{volume === 0 ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}<span>Sound</span></label>
              <output htmlFor="settings-volume">{volume === 0 ? 'Muted' : `${volume}%`}</output>
              <input id="settings-volume" type="range" min="0" max="100" step="1" value={volume} onChange={event => onVolumeChange(Number(event.target.value))} aria-valuetext={volume === 0 ? 'Muted' : `${volume}%`} />
            </div>
            <button type="button" role="switch" aria-label="Night mode" aria-checked={theme === 'dark'} onClick={onToggleTheme} className="settings-toggle"><span className="settings-label"><Moon aria-hidden="true" /><span>Theme</span></span><span className="settings-switch-state">{theme === 'dark' ? 'Night' : 'Day'}<span className="settings-switch-track" aria-hidden="true" /></span></button>
            <button type="button" role="switch" aria-label="Shmuck Feed" aria-checked={!liveFeedPaused} onClick={onToggleLiveFeedPause} className="settings-toggle"><span className="settings-label"><Pause aria-hidden="true" />Shmuck Feed</span><span className="settings-switch-state">{liveFeedPaused ? 'Paused' : 'Running'}<span className="settings-switch-track" aria-hidden="true" /></span></button>
            <button type="button" role="switch" aria-label="Animations" aria-checked={animationsEnabled} onClick={onToggleAnimations} className="settings-toggle"><span className="settings-label"><Sparkles aria-hidden="true" />Animations</span><span className="settings-switch-state">{animationsEnabled ? 'On' : 'Off'}<span className="settings-switch-track" aria-hidden="true" /></span></button>
            <button type="button" role="switch" aria-label="High contrast" aria-checked={highContrast} onClick={onToggleHighContrast} className="settings-toggle"><span className="settings-label"><Moon aria-hidden="true" />High contrast</span><span className="settings-switch-state">{highContrast ? 'On' : 'Off'}<span className="settings-switch-track" aria-hidden="true" /></span></button>
          </div>}
          {infoSection === 'Privacy' && <LegalDocumentView document={PRIVACY_POLICY} />}
          {infoSection === 'Terms' && <LegalDocumentView document={TERMS} />}
          {section === 'Preferences' && <>
            <p>The game saves only theme, volume, Live Feed pause, high contrast and interface animation preferences in this browser. <br></br> You can remove them below or through your browser's site-data settings.</p>
            <p>Removing the saved settings does not interrupt the current game. <br></br>Defaults apply after your next reload. Later preference changes may save new settings.</p>
            {onDisconnect && <DisconnectGoogleNote />}
          </>}
          </div>
          {infoSection === 'About' && <p className="site-info-bottom about-copyright text-center font-mono-term text-[10px]"><button type="button" className="stonks-copyright-button" aria-label="Open The Stonks" title="The Stonks" onClick={event => { event.currentTarget.focus(); onOpen(); setStonksOpen(true); }}>©</button> Stonktrooper.lol<br />2026</p>}
          {section === 'Settings' && <div className="site-info-bottom pt-2">
              <button type="button" className="settings-reset-button preferences-clear-button block mx-auto w-full py-2.5 px-3 rounded-lg border font-bold text-xs font-mono-term cursor-pointer" onClick={() => { onResetDefaults(); setMessage('Settings Restored'); }}><span aria-live="polite"><ActionLabel>{message || 'Default Settings'}</ActionLabel></span></button>
            </div>}
          {section === 'Preferences' && <div className="site-info-bottom preferences-actions pt-2">
              <button type="button" className="preferences-clear-button block mx-auto w-full py-2.5 px-3 rounded-lg border font-bold text-xs font-mono-term cursor-pointer" onClick={() => {
                try { for (const key of ['cr_theme', 'stonker-sounds', 'cr_sound_enabled', 'cr_live_feed', 'cr_live_feed_paused', 'cr_volume', 'cr_animations', 'cr_high_contrast']) localStorage.removeItem(key); setMessage('Preferences removed'); }
                catch { setMessage('Unable to access browser storage. Use your browser site-data settings.'); }
              }}><span aria-live="polite">{message || 'Clear saved preferences'}</span></button>
              {onDisconnect && <DisconnectGoogle onDisconnect={onDisconnect} />}
            </div>}
          </div>
        </div>
      </div>
    </div>}
    {stonksOpen && section === 'About' && <StonksDialog onClose={() => setStonksOpen(false)} />}
  </>;
}