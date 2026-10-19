// Browser game module for SiteFooter.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Mail, X, Volume2, VolumeX, Radio, Moon, Sparkles } from 'lucide-react';
import { AssetPreview, type PreviewAsset } from './AssetPreview';
import { SettingsDiamond } from './SettingsDiamond';

const sections = ['About', 'Privacy', 'Disclaimer', 'Preferences'] as const;
export type SiteSection = typeof sections[number] | 'Settings';
const sectionAssets: Record<SiteSection, PreviewAsset> = { About: 'coin', Privacy: 'briefcase', Disclaimer: 'bag', Preferences: 'banana', Settings: 'diamond' };

export function SiteFooter({ onOpen, theme, section, setSection, volume, onVolumeChange, animationsEnabled, onToggleAnimations, liveFeedEnabled, onToggleLiveFeed, onToggleTheme, highContrast, onToggleHighContrast, onResetDefaults }: { onOpen: () => void; theme: 'light' | 'dark'; section: SiteSection | null; setSection: (section: SiteSection | null) => void; volume: number; onVolumeChange: (volume: number) => void; animationsEnabled: boolean; onToggleAnimations: () => void; liveFeedEnabled: boolean; onToggleLiveFeed: () => void; onToggleTheme: () => void; highContrast: boolean; onToggleHighContrast: () => void; onResetDefaults: () => void }) {
  const [message, setMessage] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const panel = dialog.current;
    const app = panel?.closest('.game-app');
    const target = app?.querySelector<HTMLElement>('.share-dd-dialog')
      ?? app?.querySelector<HTMLElement>('.game-result')
      ?? app?.querySelector<HTMLElement>('.landing-menu-actions');
    const arena = app?.querySelector('.game-arena');
    if (!panel || !target || !arena) return;
    const syncPosition = () => {
      const overlay = panel.parentElement!;
      if (window.matchMedia('(pointer: coarse)').matches) {
        const header = app?.querySelector('header')?.getBoundingClientRect();
        const footer = app?.querySelector('.site-footer')?.getBoundingClientRect();
        const shell = app!.getBoundingClientRect();
        const feed = app?.querySelector('.desktop-live-feed-bar')?.getBoundingClientRect();
        const top = feed && feed.height > 0 ? feed.bottom : header?.bottom ?? shell.top;
        const bottom = footer && footer.height > 0 ? footer.top : shell.bottom;
        overlay.style.setProperty('--info-left', `${shell.left}px`);
        overlay.style.setProperty('--info-top', `${top}px`);
        overlay.style.setProperty('--info-width', `${shell.width}px`);
        overlay.style.setProperty('--info-height', `${Math.max(0, bottom - top)}px`);
        return;
      }
      const anchor = target.getBoundingClientRect();
      const area = arena.getBoundingClientRect();
      const left = Math.max(0, Math.min(area.left + 8, anchor.left));
      const right = Math.min(window.innerWidth, Math.max(area.right - 8, anchor.right));
      const top = Math.max(0, Math.min(area.top + 8, anchor.top));
      const bottom = Math.min(window.innerHeight, Math.max(area.bottom - 8, anchor.bottom));
      const width = Math.min(right - left, Math.max(560, anchor.width));
      const height = Math.min(bottom - top, Math.max(360, anchor.height));
      overlay.style.setProperty('--info-left', `${Math.max(left, Math.min(anchor.x + anchor.width / 2 - width / 2, right - width))}px`);
      overlay.style.setProperty('--info-top', `${Math.max(top, Math.min(anchor.y + anchor.height / 2 - height / 2, bottom - height))}px`);
      overlay.style.setProperty('--info-width', `${width}px`);
      overlay.style.setProperty('--info-height', `${height}px`);
    };
    const observer = new ResizeObserver(syncPosition);
    observer.observe(target);
    observer.observe(arena);
    for (const element of app!.querySelectorAll('header, .desktop-live-feed-bar, .site-footer')) observer.observe(element);
    window.addEventListener('resize', syncPosition);
    window.addEventListener('scroll', syncPosition, true);
    syncPosition();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncPosition);
      window.removeEventListener('scroll', syncPosition, true);
    };
  }, [section]);
  useEffect(() => {
    if (!section) return;
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus();
    return () => { previous?.focus(); };
  }, [section]);
  return <>
    <footer className="site-footer border-t border-[var(--line)] shrink-0 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-1 px-3 py-1 text-[10px] text-[var(--muted)] font-mono-term">
      <nav aria-label="Site information" className="flex flex-wrap items-center justify-start justify-self-start gap-3">
        {sections.map(item => <button key={item} type="button" className="hover:text-[var(--text)] underline underline-offset-2 cursor-pointer" onClick={() => { onOpen(); setMessage(''); setSection(item); }}>{item}</button>)}
      </nav>
    </footer>
    {section && <div className="site-info-overlay fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onPointerDown={event => event.stopPropagation()}>
      <div ref={dialog} role="dialog" aria-modal="false" aria-labelledby="site-info-title" className="site-info-dialog w-full max-w-xl max-h-[85dvh] overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl" onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Escape') setSection(null);
      }}>
        <div className="site-info-header relative flex justify-center items-center min-h-10 mb-4 px-10">
          <h2 id="site-info-title" className="site-info-title font-bold text-xl">{section}</h2>
          <button ref={close} type="button" aria-label="Close site information" onClick={() => setSection(null)} className="dialog-close mobile-dialog-close site-info-close absolute right-0 top-0 p-2 border border-[var(--line)] rounded hover:bg-[var(--alt)] cursor-pointer"><X className="w-5 h-5" aria-hidden="true" /></button>
        </div>
        <div className="site-info-content text-sm leading-relaxed">
          <div className="site-info-body" data-info-section={section}>
          <div className="site-info-artwork" data-info-asset={sectionAssets[section]} aria-hidden={section === 'Settings' ? undefined : true}>{section === 'Settings' ? <SettingsDiamond theme={theme} animationsEnabled={animationsEnabled} /> : <AssetPreview asset={sectionAssets[section]} theme={theme} />}</div>
          <div className="site-info-main space-y-3">
          {section === 'About' && <>
            <p><img src={`${import.meta.env.BASE_URL}images/${theme === 'dark' ? 'logo-inverted.png' : 'logo.png'}`} alt="Stonktrooper" className="relative -top-[1px] inline-block h-6 w-auto max-w-full align-middle" />{' '}is a game inspired by fictional financial markets, internet memes and experimental game design. It's an amalgamation of the author's experience with the real markets.</p>
            <p>The game is completely free to play. There are no purchases, subscriptions, paid upgrades or real-money gameplay. No account is required.</p>
            <p>If you have any idea or a suggestion about the game, feel free to contact me.</p>
            <div className="flex items-center justify-center gap-3" aria-label="Contact links">
              <a href="mailto:evangelion.conquest@gmail.com" aria-label="Email me" title="evangelion.conquest@gmail.com" className="site-info-contact-button inline-flex items-center justify-center p-2 rounded border border-[var(--line)] hover:bg-[var(--alt)] focus-visible:outline-2 focus-visible:outline-[var(--green)]">
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
              <label htmlFor="settings-volume" className="settings-label">{volume === 0 ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}<span>Sound (<strong className="font-bold">M</strong>)</span></label>
              <output htmlFor="settings-volume">{volume === 0 ? 'Muted' : `${volume}%`}</output>
              <input id="settings-volume" type="range" min="0" max="100" step="1" value={volume} onChange={event => onVolumeChange(Number(event.target.value))} aria-valuetext={volume === 0 ? 'Muted' : `${volume}%`} />
            </div>
            <button type="button" role="switch" aria-label="Night mode" aria-checked={theme === 'dark'} onClick={onToggleTheme} className="settings-toggle"><span className="settings-label"><Moon aria-hidden="true" /><span>Theme (<strong className="font-bold">N</strong>)</span></span><span className="settings-switch-state">{theme === 'dark' ? 'Night' : 'Day'}<span className="settings-switch-track" aria-hidden="true" /></span></button>
            <button type="button" role="switch" aria-label="Shmuck Feed" aria-checked={liveFeedEnabled} onClick={onToggleLiveFeed} className="settings-toggle"><span className="settings-label"><Radio aria-hidden="true" />Shmuck Feed</span><span className="settings-switch-state">{liveFeedEnabled ? 'On' : 'Off'}<span className="settings-switch-track" aria-hidden="true" /></span></button>
            <button type="button" role="switch" aria-label="Animations" aria-checked={animationsEnabled} onClick={onToggleAnimations} className="settings-toggle"><span className="settings-label"><Sparkles aria-hidden="true" />Animations</span><span className="settings-switch-state">{animationsEnabled ? 'On' : 'Off'}<span className="settings-switch-track" aria-hidden="true" /></span></button>
            <button type="button" role="switch" aria-label="High contrast" aria-checked={highContrast} onClick={onToggleHighContrast} className="settings-toggle"><span className="settings-label"><Moon aria-hidden="true" />High contrast</span><span className="settings-switch-state">{highContrast ? 'On' : 'Off'}<span className="settings-switch-track" aria-hidden="true" /></span></button>
            {message && <p role="status">{message}</p>}
          </div>}
          {section === 'Privacy' && <>
            <p>The game does not use analytics, advertising trackers or tracking cookies, and does not upload your score to a game server.</p>
            <p>Your browser stores the selected theme, volume, Shmuck Feed, high contrast and interface animation preferences locally. These settings are not sent by the game to the creator. Current gameplay and scores are held in memory.</p>
            <p>Share score generates its image locally. Score links include the displayed result in the URL. Anyone with the link can view or edit this self-reported value.</p>
            <p>Hosting: GitHub Pages. GitHub logs visitor IP addresses for security. This is separate from the game's local settings. See the <a className="underline text-[#38bdf8]" href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">GitHub Privacy Statement</a>.</p>
            <p>Fonts: this page loads fonts from Google Fonts. Your browser contacts Google to retrieve them, which exposes information such as your IP address to the provider. See <a className="underline text-[#38bdf8]" href="https://developers.google.com/fonts/faq/privacy" target="_blank" rel="noopener noreferrer">Google Fonts privacy information</a>.</p>
                     </>}
          {section === 'Disclaimer' && <>
            <p>For entertainment only. Prices, charts, headlines, characters and events are fictional and are not investment, financial or trading advice.</p>
            <p>Scores and in-game rewards have no monetary value. This is not a brokerage, trading platform or real-money gambling service.</p>
            <p>If you find any in-game bugs, count them as features!</p>
          </>}
          {section === 'Preferences' && <>
            <p>The game saves only theme, volume, Shmuck Feed, high contrast and interface animation preferences in this browser. <br></br> You can remove them below or through your browser's site-data settings.</p>
            <p>Removing the saved settings does not interrupt the current game. <br></br>Defaults apply after your next reload. Later preference changes may save new settings.</p>
            {message && <p role="status">{message}</p>}
          </>}
          </div>
          {section === 'About' && <p className="site-info-bottom about-copyright text-center font-mono-term text-[10px]">© Stonktrooper.lol<br />2026</p>}
          {section === 'Settings' && <div className="site-info-bottom pt-2">
              <button type="button" className="settings-reset-button preferences-clear-button block mx-auto w-full py-2.5 px-3 rounded-lg border font-bold text-xs font-mono-term cursor-pointer" onClick={() => { onResetDefaults(); setMessage('Default settings restored.'); }}>Reset to defaults</button>
            </div>}
          {section === 'Preferences' && <div className="site-info-bottom pt-2">
              <button type="button" className="preferences-clear-button block mx-auto w-full py-2.5 px-3 rounded-lg border font-bold text-xs font-mono-term cursor-pointer" onClick={() => {
                try { for (const key of ['cr_theme', 'stonker-sounds', 'cr_sound_enabled', 'cr_live_feed', 'cr_volume', 'cr_animations', 'cr_high_contrast']) localStorage.removeItem(key); setMessage('Saved theme, volume, Shmuck Feed, high contrast and interface animation preferences removed.'); }
                catch { setMessage('Unable to access browser storage. Use your browser site-data settings.'); }
              }}>Clear saved preferences</button>
            </div>}
          </div>
        </div>
      </div>
    </div>}
  </>;
}