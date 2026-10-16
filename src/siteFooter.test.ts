// Regression checks for siteFooter.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('footer describes the free project and header opens About before the theme toggle instead of linking coffee', () => {
  const footer = readFileSync(new URL('./SiteFooter.tsx', import.meta.url), 'utf8');
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(footer, /game inspired by fictional financial markets/);
  assert.match(footer, /no purchases, subscriptions, paid upgrades/);
  assert.match(footer, /localStorage.removeItem\('cr_theme'\)/);
  assert.match(footer, /localStorage.removeItem\('stonker-sounds'\)/);
  assert.match(footer, /GitHub logs visitor IP addresses/);
  assert.match(footer, /Google Fonts/);
  assert.doesNotMatch(app, /<Coffee|ko-fi\.com/);
  assert.match(app, /aria-label="Open information about the game" aria-haspopup="dialog"/);
  assert.match(app, /if \(state === 'play'\) setState\('paused'\); setSoundMenuOpen\(false\); setSiteSection\('About'\)/);
  assert.match(app, /<span className="mobile-header-info-icon flex w-3 h-3 items-center justify-center font-serif text-lg font-bold leading-none" aria-hidden="true">i<\/span>\s*<\/button>\s*<button\s+type="button"\s+onClick=\{\(\) => setTheme/);
  assert.doesNotMatch(app, /<Info/);
});

test('theme defaults to dark while preserving an explicitly saved light preference', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(app, /return localStorage\.getItem\('cr_theme'\) === 'light' \? 'light' : 'dark';\s*\} catch \{\s*return 'dark';/);
});

test('Mode selector and privacy links use sky blue and preference clearing matches paused How to Play', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  const footer = readFileSync(new URL('./SiteFooter.tsx', import.meta.url), 'utf8');
  assert.match(app, /aria-label="Change game mode"/);
  assert.match(app, /onClick=\{handleModeSelectorClick\}/);
  assert.match(app, /onKeyDown=\{handleModeSelectorKeyDown\}/);
  assert.match(app, /selectedMode === 'hard' && <ChevronLeft className="how-to-mode-selector-arrow how-to-mode-selector-arrow-left" aria-hidden="true" \/>/);
  assert.match(app, /selectedMode === 'easy' && <ChevronRight className="how-to-mode-selector-arrow how-to-mode-selector-arrow-right" aria-hidden="true" \/>/);
  assert.match(app, /selectedMode === 'easy' \? 'There is no Easy Mode' : 'Hard Mode'/);
  assert.doesNotMatch(app, /selectedMode === 'hard'[^\n]*✓/);
  assert.doesNotMatch(app, /how-to-mode-selector[^\n]*font-bold/);
  assert.match(css, /\.how-to-mode-button\.is-selected\s*\{[\s\S]*text-decoration: underline;/);
  assert.match(css, /\.how-to-mode-selector\s*\{[\s\S]*position: relative;[\s\S]*justify-content: center;/);
  assert.match(css, /\.how-to-mode-selector-arrow\s*\{[\s\S]*position: absolute;[\s\S]*top: 50%;[\s\S]*transform: translateY\(-50%\);/);
  for (const label of ['GitHub Privacy Statement', 'Google Fonts privacy information']) {
    assert.match(footer, new RegExp(`<a className="underline text-\\[#38bdf8\\]"[^>]*>${label}</a>`));
  }
  const guide = app.match(/className="([^"]*)">How to Play<\/button>/);
  const preferences = footer.match(/className="([^"]*)" onClick=\{\(\) => \{\s*try \{ localStorage.removeItem/);
  assert(guide && preferences);
  assert(guide[1].includes('how-to-play-action'));
  assert(preferences[1].startsWith('block mx-auto'));
});

test('portrait mobile presents How to Play instead of a rotate prompt and keeps only info/theme header controls', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /rotate-prompt|Rotate your phone/);
  assert.match(css, /@media \(max-width: 1024px\) and \(orientation: portrait\) and \(pointer: coarse\)/);
  assert.match(css, /\.game-app \.header-controls > :not\(\.mobile-header-control\) \{\s*display: none;/);
  assert.match(css, /mobile-header-control/);
  assert.match(css, /min-width: 2rem/);
  assert.match(css, /\.how-to-layout > \.mechanics-guide \{[\s\S]*?grid-template-columns: 1fr;/);
});

test('portrait mobile separates the hero and controls from a fullscreen scrollable How to Play dialog', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(app, /mobileGuideOpen/);
  assert.match(app, /className="mobile-portrait-guide/);
  assert.match(app, /className="menu-action-button mobile-portrait-action-button mobile-portrait-how-to-play/);
  assert.match(app, />\s*How to Play\s*<\/button>/);
  assert.match(app, /className=\{`menu-action-button mobile-portrait-action-button how-to-mode-selector/);
  assert.match(app, /className="menu-action-button mobile-portrait-action-button w-full/);
  assert.match(app, /selectedMode === 'easy' \? 'There is no Easy Mode' : 'Hard Mode'/);
  assert.match(app, />\s*Start\s*<\/button>/);
  assert.match(app, /aria-label="Close How to Play"/);
  assert.match(app, /className="mobile-how-to-panel/);
  assert.match(css, /\.game-app \.desktop-initial-guide\s*\{\s*display: none;/);
  assert.match(css, /\.mobile-portrait-guide\s*\{\s*display: flex;/);
  assert.match(css, /\.mobile-portrait-action-button\s*\{\s*font-family: var\(--font-mono\);\s*\}/);
  assert.match(css, /\.how-to-mode-selector\s*\{[\s\S]*?font-family: var\(--font-mono\);[\s\S]*?font-size: 0\.875rem;[\s\S]*?font-weight: 700;[\s\S]*?line-height: 1\.25;/);
  assert.match(css, /\.menu-action-button\s*\{[\s\S]*?height: 2\.75rem;[\s\S]*?min-height: 2\.75rem;[\s\S]*?padding-top: 0;[\s\S]*?padding-bottom: 0;/);
  assert.match(css, /\.mobile-how-to-panel > \.mechanics-guide\s*\{[\s\S]*?overflow-y: auto;/);
  assert.match(css, /\.game-app \.site-footer\s*\{[\s\S]*?display: flex;[\s\S]*?flex-direction: column;[\s\S]*?align-items: center;/);
  assert.match(css, /\.game-app \.site-footer > nav,[\s\S]*?\.game-app \.site-footer > \.site-footer-copyright\s*\{[\s\S]*?align-self: center;[\s\S]*?text-align: center;/);
});

test('How to Play labels use theme-aware colors and title case', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(app, />\s*How to Play\s*<\/h2>/);
  assert.match(app, />\s*Start\s*<\/button>/);
  assert.match(app, /className="how-to-play-label[^>]*">How to Play<\/h2>/);
  assert.match(css, /\.how-to-play-heading\s*\{[\s\S]*?color: #fff;/);
  assert.match(css, /html\[data-theme="light"\] \.how-to-play-heading\s*\{[\s\S]*?color: #333a4b;[\s\S]*?background: transparent;/);
  assert.match(css, /\.how-to-play-label,[\s\S]*?\.mobile-portrait-how-to-play\s*\{[\s\S]*?color: #fff;[\s\S]*?border: 0;/);
  assert.match(css, /html\[data-theme="light"\] \.how-to-play-label,[\s\S]*?\.mobile-portrait-how-to-play\s*\{[\s\S]*?color: #333a4b;/);
});

test('day header controls use the requested dark blue color and paused overlays stay centered', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(app, /state === 'paused' \? 'pause-overlay' : ''/);
  assert.match(css, /html\[data-theme="light"\] \.game-app \.header-controls button\s*\{[\s\S]*?color: #333a4b;[\s\S]*?border-color: #333a4b;/);
  assert.match(css, /html\[data-theme="dark"\] \.game-app \.mobile-header-theme-icon\s*\{\s*color: #fff;/);
  assert.match(css, /\.pause-overlay\s*\{[\s\S]*?align-items: center !important;[\s\S]*?justify-content: center !important;/);
});

test('desktop and mobile menu controls share one fixed size', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.equal((app.match(/menu-action-button/g) || []).length, 6);
});

test('About offers supplied email, Discord and Reddit contacts with keyboard-accessible links', () => {
  const footer = readFileSync(new URL('./SiteFooter.tsx', import.meta.url), 'utf8');
  assert.match(footer, /If you have any idea or a suggestion about the game, feel free to contact me\./);
  assert.doesNotMatch(footer, /Optional creator support/);
  assert.match(footer, /href="mailto:evangelion\.conquest@gmail\.com" aria-label="Email me"/);
  assert.match(footer, /<Mail className="w-5 h-5" aria-hidden="true"/);
  assert.match(footer, /href="https:\/\/discord\.com\/users\/1560319187526615073" target="_blank" rel="noopener noreferrer" aria-label="Contact me on Discord"/);
  assert.match(footer, /querySelectorAll<HTMLElement>\('button:not\(:disabled\), a\[href\]'\)/);
  assert.match(footer, /href="https:\/\/www\.reddit\.com\/u\/NagatoKami\/" target="_blank" rel="noopener noreferrer" aria-label="Contact me on Reddit"/);
  assert.doesNotMatch(footer, /Neither-Exercise-612/);
  assert.match(footer, /title="Reddit"[^>]*>\s*<svg[^>]*className="w-5 h-5"[^>]*aria-hidden="true"/);
});

test('About shows a coffee support button below contacts with a styled cup and safe Ko-fi action', () => {
  const footer = readFileSync(new URL('./SiteFooter.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert(footer.indexOf('Support me at:') > footer.indexOf('Contact me on Reddit'));
  assert.match(footer, /<p>Support me at:<\/p>\s*<button id="about-coffee" className="coffee-link" type="button"/);
  assert.match(footer, /window\.open\('https:\/\/ko-fi\.com\/eon', '_blank', 'noopener,noreferrer'\)/);
  assert.match(footer, /<span className="coffee-cup" aria-hidden="true">♥<\/span>\s*Buy me a Ko-fi!/);
  assert.match(footer, /aria-label="Buy me a Ko-fi! \(opens in a new tab\)"/);
  assert.match(css, /\.coffee-cup \{[^}]*--coffee-cup-color: #fff;[^}]*background: var\(--coffee-cup-color\);[^}]*color: #e13947;/);
  assert.match(css, /\.coffee-cup::after \{[^}]*content: '';[^}]*border: 0\.2rem solid var\(--coffee-cup-color\);/);
  assert.match(css, /html:not\(\[data-theme="light"\]\) \.coffee-cup \{\s*--coffee-cup-color: var\(--bg\);/);
  assert.match(css, /\.coffee-link:focus-visible/);
  assert.match(css, /\.coffee-link \{[^}]*background: var\(--text\);[^}]*color: var\(--bg\);/);
});

test('footer keeps copyright left, navigation centered and preference clearing centered', () => {
  const footer = readFileSync(new URL('./SiteFooter.tsx', import.meta.url), 'utf8');
  assert.match(footer, /© Stonktrooper\.lol 2026<\/span>/);
  assert.doesNotMatch(footer, /new Date\(\)\.getFullYear\(\)/);
  assert.doesNotMatch(footer, /Free personal project/);
  assert.match(footer, /sm:grid-cols-\[1fr_auto_1fr\]/);
  assert.match(footer, /aria-label="Site information" className="[^"]*justify-start justify-self-start/);
  assert.match(footer, /className="site-footer-copyright justify-self-end whitespace-nowrap"/);
  assert.ok(footer.indexOf('aria-label="Site information"') < footer.indexOf('© Stonktrooper.lol 2026'));
  assert.match(footer, /const sections = \['About', 'Privacy', 'Disclaimer', 'Preferences'\]/);
  assert.match(footer, /section === 'Preferences'/);
  assert.doesNotMatch(footer, /'Local data'/);
  assert.match(footer, /className="block mx-auto [^"]*" onClick/);
});

test('mobile footer uses the requested portrait and landscape arrangements', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(css, /@media \(max-width: 1024px\) and \(orientation: landscape\) and \(pointer: coarse\) \{[\s\S]*?\.game-app \.site-footer\s*\{\s*grid-template-columns: 1fr auto;/);
  assert.match(css, /\.game-app \.site-footer > nav\s*\{[\s\S]*?grid-column: 2;[\s\S]*?grid-row: 1;[\s\S]*?justify-self: end;[\s\S]*?flex-wrap: nowrap;/);
  assert.match(css, /\.game-app \.site-footer > \.site-footer-copyright\s*\{[\s\S]*?grid-column: 1;[\s\S]*?grid-row: 1;[\s\S]*?justify-self: start;/);
  assert.match(css, /@media \(max-width: 1024px\) and \(orientation: portrait\) and \(pointer: coarse\) \{[\s\S]*?\.game-app \.site-footer\s*\{[\s\S]*?display: flex;[\s\S]*?flex-direction: column;[\s\S]*?align-items: center;[\s\S]*?justify-content: center;/);
  assert.match(css, /\.game-app \.site-footer > \.site-footer-copyright\s*\{[\s\S]*?order: 1;/);
  assert.match(css, /\.game-app \.site-footer > nav,[\s\S]*?\.game-app \.site-footer > \.site-footer-copyright\s*\{[\s\S]*?width: auto;[\s\S]*?align-self: center;[\s\S]*?text-align: center;/);
});

test('app renders the full site footer and keeps its links visible in landscape', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(app, /import \{ SiteFooter \} from '\.\/SiteFooter';/);
  assert.match(app, /<SiteFooter theme=\{theme\} section=\{siteSection\} setSection=\{setSiteSection\} onOpen=\{\(\) => \{ if \(state === 'play'\) setState\('paused'\); \}\} \/>/);
  assert.doesNotMatch(app, />Copyright<\/span>/);
  assert.match(css, /\.game-app footer \{ flex: 0 0 auto; height: auto;/);
});

test('portrait menu keeps the Live Feed strip visible below the header', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(css, /\.game-app \.game-overlay\.how-to-play-overlay\s*\{\s*inset: calc\(100% \* 56 \/ 840\) 0 0;/);
});

test('mobile landscape retries fullscreen after rotation and keeps guide/result content scrollable', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(app, /window\.matchMedia\('\(max-width: 1024px\) and \(pointer: coarse\)'\)/);
  assert.match(app, /void requestMobileLandscape\(\);\s*sound\.unlock\(\);\s*if \(window\.matchMedia\('\(max-width: 1024px\) and \(pointer: coarse\)'\)\.matches && window\.innerHeight > window\.innerWidth\)/);
  assert.match(app, /if \(!portrait && awaitingLandscape\) \{\s*\/\/ The initial request is made from the START tap\.[\s\S]*?void requestMobileLandscape\(\);/);
  assert.match(css, /@media \(max-width: 1024px\) and \(orientation: landscape\) and \(pointer: coarse\)/);
  assert.match(css, /\.how-to-layout > \.mechanics-guide \{[\s\S]*?overflow-y: auto;[\s\S]*?grid-template-rows: none;/);
  assert.match(css, /\.game-over-overlay\s*\{[\s\S]*?align-items: center;[\s\S]*?justify-content: center;/);
  assert.match(css, /\.game-result-over\s*\{[\s\S]*?max-height: calc\(100% - env\(safe-area-inset-top\)/);
  assert.match(css, /\.game-result-over \.game-result-content\s*\{[\s\S]*?overflow-y: auto;/);
  assert.doesNotMatch(css, /\.game-result-over\s*\{[\s\S]*?max-height: none;[\s\S]*?overflow: visible !important;/);
});

test('How to Play keeps the hero and controls inside the panel while descriptions scroll', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(css, /\.initial-guide\s*\{[\s\S]*?max-height: calc\(100% - 2px\);[\s\S]*?overflow: hidden;/);
  assert.match(css, /\.how-to-layout\s*\{[\s\S]*?flex: 1 1 auto;[\s\S]*?min-height: 0;[\s\S]*?overflow: hidden;/);
  assert.match(css, /\.how-to-layout > \.how-to-aside\s*\{[\s\S]*?min-height: 0;[\s\S]*?overflow: hidden;/);
  assert.match(css, /\.how-to-layout > \.mechanics-guide\s*\{[\s\S]*?overflow-y: auto;/);
  assert.match(css, /\.initial-guide \.mechanics-guide \{[\s\S]*?grid-template-rows: none;[\s\S]*?overflow-y: auto;/);
  assert.match(css, /\.initial-guide \.mechanics-guide \{[\s\S]*?grid-auto-rows: minmax\(min-content, 1fr\);[\s\S]*?align-content: stretch;/);
  assert.doesNotMatch(css, /\.initial-guide \.mechanics-guide \{[\s\S]*?grid-auto-rows: max-content;[\s\S]*?align-content: start;/);
  assert.match(css, /\.how-to-layout > \.how-to-aside > \.how-to-hero\s*\{[\s\S]*?flex: 1 1 auto;[\s\S]*?min-height: 0;/);
  assert.match(css, /\.how-to-layout > \.how-to-aside > \.how-to-controls\s*\{[\s\S]*?flex: 0 0 auto;/);
  assert.match(css, /\.initial-guide aside \{[\s\S]*?display: flex;[\s\S]*?flex-direction: column;[\s\S]*?height: 100%;[\s\S]*?overflow: hidden;/);
  assert.match(css, /\.initial-guide aside > div:first-child \{[\s\S]*?flex: 1 1 auto;[\s\S]*?overflow: hidden;/);
  assert.match(css, /\.initial-guide aside img \{[\s\S]*?height: 100%;[\s\S]*?object-fit: cover;/);
});

test('About starts its first sentence with an inline theme-aware logo and preference button has extra top spacing', () => {
  const footer = readFileSync(new URL('./SiteFooter.tsx', import.meta.url), 'utf8');
  assert.match(footer, /theme: 'light' \| 'dark'/);
  assert.match(footer, /section === 'About'[\s\S]*?<img src=\{`\$\{import\.meta\.env\.BASE_URL\}images\/\$\{theme === 'dark' \? 'logo-inverted\.png' : 'logo\.png'\}`\} alt="Stonktrooper"/);
  assert.doesNotMatch(footer, /<p>Stonktrooper is/);
  assert.match(footer, /<p><img[^>]*alt="Stonktrooper" className="relative -top-\[1px\] inline-block h-6 w-auto max-w-full align-middle" \/>\{' '\}is a game inspired/);
  assert.match(footer, /<div className="pt-2">\s*<button[^>]*[\s\S]*?>Clear saved preferences<\/button>\s*<\/div>/);
});
