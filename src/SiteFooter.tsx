// Browser game module for SiteFooter.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Mail, X } from 'lucide-react';

const sections = ['About', 'Privacy', 'Disclaimer', 'Preferences'] as const;
export type SiteSection = typeof sections[number];

export function SiteFooter({ onOpen, theme, section, setSection }: { onOpen: () => void; theme: 'light' | 'dark'; section: SiteSection | null; setSection: (section: SiteSection | null) => void }) {
  const [message, setMessage] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const panel = dialog.current;
    const title = panel?.querySelector<HTMLElement>('.site-info-title');
    if (!panel || !title) return;
    const syncEndGap = () => {
      const style = getComputedStyle(panel);
      const topGap = title.getBoundingClientRect().top - panel.getBoundingClientRect().top;
      // The panel's bottom padding already contributes to the visible end gap.
      const endGap = Math.max(0, topGap - parseFloat(style.paddingBottom) - parseFloat(style.borderBottomWidth));
      panel.style.setProperty('--site-info-end-gap', `${endGap}px`);
      const leftGap = Math.max(0, topGap - parseFloat(style.paddingLeft) - parseFloat(style.borderLeftWidth));
      const rightGap = Math.max(0, topGap - parseFloat(style.paddingRight) - parseFloat(style.borderRightWidth));
      panel.style.setProperty('--site-info-left-gap', `${leftGap}px`);
      panel.style.setProperty('--site-info-right-gap', `${rightGap}px`);
      const header = title.parentElement;
      if (header) {
        const headerTail = header.getBoundingClientRect().bottom - title.getBoundingClientRect().bottom;
        const contentGap = Math.max(0, topGap - headerTail);
        panel.style.setProperty('--site-info-content-gap', `${contentGap}px`);
      }
    };
    const observer = new ResizeObserver(syncEndGap);
    observer.observe(panel);
    observer.observe(title);
    window.addEventListener('resize', syncEndGap);
    syncEndGap();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncEndGap);
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
      <span className="site-footer-copyright justify-self-end whitespace-nowrap">© Stonktrooper.lol 2026</span>
    </footer>
    {section && <div className="site-info-overlay fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onPointerDown={event => event.stopPropagation()}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="site-info-title" className="site-info-dialog w-full max-w-xl max-h-[85dvh] overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl" onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Escape') setSection(null);
        if (event.key === 'Tab') {
          const buttons = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]');
          if (!buttons?.length) return;
          const first = buttons[0], last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }}>
        <div className="site-info-header relative flex justify-center items-center min-h-10 mb-4 px-10">
          <h2 id="site-info-title" className="site-info-title font-bold text-xl">{section}</h2>
          <button ref={close} type="button" aria-label="Close site information" onClick={() => setSection(null)} className="dialog-close mobile-dialog-close site-info-close absolute right-0 top-0 p-2 border border-[var(--line)] rounded hover:bg-[var(--alt)] cursor-pointer"><X className="w-5 h-5" aria-hidden="true" /></button>
        </div>
        <div className="site-info-content text-sm leading-relaxed">
          <div className="site-info-body space-y-3">
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
            <div className="about-support space-y-2 pt-2 text-center">
              <p>Support me at:</p>
              <button id="about-coffee" className="coffee-link" type="button" aria-label="Buy me a Ko-fi! (opens in a new tab)" onClick={() => window.open('https://ko-fi.com/eon', '_blank', 'noopener,noreferrer')}>
                <span className="coffee-cup" aria-hidden="true">♥</span>
                Buy me a Ko-fi!
              </button>
            </div>
          </>}
          {section === 'Privacy' && <>
            <p>The game does not use analytics, advertising trackers or tracking cookies, and does not upload your score to a game server.</p>
            <p>Your browser stores the selected theme and sound preferences locally. These settings are not sent by the game to the creator. Current gameplay and scores are held in memory.</p>
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
            <p>The game saves only theme and sound preferences in this browser. <br></br> You can remove them below or through your browser's site-data settings.</p>
            <p>Removing the saved settings does not interrupt the current game. <br></br>Defaults apply after your next reload. Later preference changes may save new settings.</p>
            <div className="pt-2">
              <button type="button" className="preferences-clear-button block mx-auto w-full py-2.5 px-3 rounded-lg border font-bold text-xs font-mono-term cursor-pointer" onClick={() => {
                try { localStorage.removeItem('cr_theme'); localStorage.removeItem('stonker-sounds'); setMessage('Saved theme and sound preferences removed.'); }
                catch { setMessage('Unable to access browser storage. Use your browser site-data settings.'); }
              }}>Clear saved preferences</button>
            </div>
            {message && <p role="status">{message}</p>}
          </>}
          </div>
        </div>
      </div>
    </div>}
  </>;
}