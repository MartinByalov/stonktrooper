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
  assert.match(app, /<span className="flex w-3\.5 h-3\.5 items-center justify-center font-serif text-xl font-bold leading-none" aria-hidden="true">i<\/span>\s*<\/button>\s*<button\s+type="button"\s+onClick=\{\(\) => setTheme/);
  assert.doesNotMatch(app, /<Info/);
});

test('theme defaults to dark while preserving an explicitly saved light preference', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(app, /return localStorage\.getItem\('cr_theme'\) === 'light' \? 'light' : 'dark';\s*\} catch \{\s*return 'dark';/);
});

test('Easy mode and privacy links use sky blue and preference clearing matches paused How to Play', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const footer = readFileSync(new URL('./SiteFooter.tsx', import.meta.url), 'utf8');
  assert.match(app, /selectedMode === 'easy'[^\n]*bg-\[#38bdf8\]/);
  for (const label of ['GitHub Privacy Statement', 'Google Fonts privacy information']) {
    assert.match(footer, new RegExp(`<a className="underline text-\\[#38bdf8\\]"[^>]*>${label}</a>`));
  }
  const guide = app.match(/className="([^"]*)">How to Play<\/button>/);
  const preferences = footer.match(/className="([^"]*)" onClick=\{\(\) => \{\s*try \{ localStorage.removeItem/);
  assert(guide && preferences);
  assert(preferences[1].startsWith(`block mx-auto ${guide[1]}`));
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
  assert.match(footer, /Stonktrooper\.lol<\/span>/);
  assert.doesNotMatch(footer, /Free personal project/);
  assert.match(footer, /sm:grid-cols-\[1fr_auto_1fr\]/);
  assert.match(footer, /className="justify-self-start whitespace-nowrap"/);
  assert.match(footer, /aria-label="Site information" className="[^"]*justify-self-center/);
  assert.match(footer, /const sections = \['About', 'Privacy', 'Disclaimer', 'Preferences'\]/);
  assert.match(footer, /section === 'Preferences'/);
  assert.doesNotMatch(footer, /'Local data'/);
  assert.match(footer, /className="block mx-auto [^"]*" onClick/);
});

test('app renders the full site footer and keeps its links visible in landscape', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(app, /import \{ SiteFooter \} from '\.\/SiteFooter';/);
  assert.match(app, /<SiteFooter theme=\{theme\} section=\{siteSection\} setSection=\{setSiteSection\} onOpen=\{\(\) => \{ if \(state === 'play'\) setState\('paused'\); \}\} \/>/);
  assert.doesNotMatch(app, />Copyright<\/span>/);
  assert.match(css, /\.game-app footer \{ flex: 0 0 auto; height: auto;/);
});

test('mobile landscape retries fullscreen after rotation and keeps guide/result content scrollable', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(app, /if \(!portrait && awaitingLandscape\) \{\s*\/\/ The initial request is made from the START tap\.[\s\S]*?void requestMobileLandscape\(\);/);
  assert.match(css, /@media \(max-width: 1024px\) and \(orientation: landscape\) and \(pointer: coarse\)/);
  assert.match(css, /\.how-to-layout > \.mechanics-guide \{[\s\S]*?overflow-y: auto;[\s\S]*?grid-template-rows: none;/);
  assert.match(css, /\.game-result-over \{[\s\S]*?overflow: visible !important;/);
});

test('About starts its first sentence with an inline theme-aware logo and preference button has extra top spacing', () => {
  const footer = readFileSync(new URL('./SiteFooter.tsx', import.meta.url), 'utf8');
  assert.match(footer, /theme: 'light' \| 'dark'/);
  assert.match(footer, /section === 'About'[\s\S]*?<img src=\{`\$\{import\.meta\.env\.BASE_URL\}images\/\$\{theme === 'dark' \? 'logo-inverted\.png' : 'logo\.png'\}`\} alt="Stonktrooper"/);
  assert.doesNotMatch(footer, /<p>Stonktrooper is/);
  assert.match(footer, /<p><img[^>]*alt="Stonktrooper" className="relative -top-\[1px\] inline-block h-6 w-auto max-w-full align-middle" \/>\{' '\}is a game inspired/);
  assert.match(footer, /<div className="pt-2">\s*<button[^>]*[\s\S]*?>Clear saved preferences<\/button>\s*<\/div>/);
});