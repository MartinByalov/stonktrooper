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
  assert.match(app, /setSoundMenuOpen\(false\); setSiteSection\('About'\)/);
  assert.match(app, /mobile-header-about-control[\s\S]*?mobile-header-info-icon[\s\S]*?<\/button>\s*<button[\s\S]*?onClick=\{\(\) => setTheme/);
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
  assert(preferences[1].startsWith('preferences-clear-button block mx-auto'));
  assert(preferences[1].includes('preferences-clear-button'));
  assert.match(css, /\.preferences-clear-button\s*\{[\s\S]*?background: #fff;[\s\S]*?color: #000;[\s\S]*?border-color: #fff;/);
  assert.match(css, /html\[data-theme="light"\] \.preferences-clear-button\s*\{[\s\S]*?background: #000;[\s\S]*?color: #fff;[\s\S]*?border-color: #000;/);
});

test('portrait mobile presents How to Play instead of a rotate prompt and keeps only info/theme header controls', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /rotate-prompt|Rotate your phone/);
  assert.match(css, /@media \(orientation: portrait\) and \(pointer: coarse\)/);
  assert.match(css, /\.game-app \.header-controls > :not\(\.mobile-header-control\) \{\s*display: none;/);
  assert.match(css, /mobile-header-control/);
  assert.match(css, /min-width: 2rem/);
  assert.match(css, /\.game-app \.header-controls\s*\{[\s\S]*?flex-direction: row;/);
  assert.match(css, /\.game-app \.header-controls > \.mobile-header-control\s*\{[^}]*width: 2rem;[^}]*height: 2rem;[^}]*min-width: 2rem;[^}]*min-height: 2rem;[^}]*flex: 0 0 2rem;/);
  assert.match(css, /\.game-app \.stonktrooper-logo\s*\{\s*height: 2rem;/);
  assert.match(css, /\.game-app \.mobile-header-about-control\s*\{\s*order: 1;/);
  assert.match(css, /\.game-app \.mobile-header-theme-control\s*\{\s*order: 2;/);
  assert.match(css, /\.game-app \.mobile-header-pause-control\s*\{\s*order: 3;/);
  assert.match(css, /\.game-app header\s*\{\s*--mobile-header-gutter: max\(8px, env\(safe-area-inset-top\), env\(safe-area-inset-right\)\);/);
  assert.match(css, /\.game-app header\s*\{[^}]*padding: var\(--mobile-header-gutter\) var\(--mobile-header-gutter\) var\(--mobile-header-gutter\)/);
  assert.match(app, /<button type="button" title="About"[\s\S]*?className="mobile-header-control mobile-header-about-control/);
  assert.match(app, /\{state === 'play' && <button[\s\S]*?chart-pause-control/);
  assert.match(css, /\.how-to-layout > \.mechanics-guide \{[\s\S]*?grid-template-columns: 1fr;/);
});

test('mobile information dialogs fit between the Live Feed and visible footer', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const footer = readFileSync(new URL('./SiteFooter.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(app, /footerRect = footer\?\.getBoundingClientRect\(\)/);
  assert.match(app, /--footer-inset-bottom/);
  assert.match(footer, /className="site-info-overlay fixed inset-0 z-50/);
  assert.match(footer, /className="dialog-close mobile-dialog-close site-info-close/);
  assert.match(css, /\.game-app \.fixed\.inset-0\.z-50\s*\{[\s\S]*?top: var\(--live-feed-bottom, 0px\);[\s\S]*?bottom: var\(--footer-inset-bottom, 0px\);/);
  assert.match(css, /\.site-info-dialog\s*\{\s*padding-inline: clamp\(32px, 4vw, 48px\);/);
  assert.match(css, /\.game-app \.site-info-overlay\.fixed\.inset-0\.z-50 > \.site-info-dialog\s*\{[\s\S]*?padding-inline: clamp\(22px, 6vw, 28px\);/);
  assert.match(css, /html:not\(\[data-theme="light"\]\) \.site-info-overlay \.site-info-close:hover[\s\S]*?border-color: #fff;/);
  assert.match(css, /html:not\(\[data-theme="light"\]\) \.site-info-overlay \.site-info-close:hover svg[\s\S]*?color: #fff;/);
});

test('portrait mobile separates the hero and controls from a fullscreen scrollable How to Play dialog', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(app, /mobileGuideOpen/);
  assert.match(app, /className="mobile-portrait-guide/);
  assert.match(app, /className="menu-action-button mobile-portrait-action-button mobile-portrait-how-to-play/);
  assert.doesNotMatch(app, /mobile-portrait-controls/);
  assert.match(app, />\s*How to Play\s*<\/button>/);
  assert.match(app, /className=\{`menu-action-button mobile-portrait-action-button how-to-mode-selector/);
  assert.match(app, /className="menu-action-button mobile-portrait-action-button w-full/);
  assert.match(app, /selectedMode === 'easy' \? 'There is no Easy Mode' : 'Hard Mode'/);
  assert.match(app, />\s*Start\s*<\/button>/);
  assert.match(app, /aria-label="Close How to Play"/);
  assert.match(app, /className="mobile-how-to-header relative flex h-10 items-center justify-center mb-3 px-10"/);
  assert.match(app, /className="dialog-close mobile-dialog-close mobile-how-to-close/);
  assert.match(app, /className="mobile-how-to-header relative flex h-10 items-center justify-center mb-3 px-10"[^>]*>[\s\S]*?id="mobile-guide-title"[\s\S]*?className="dialog-close mobile-dialog-close mobile-how-to-close/);
  assert.match(app, /className="mobile-how-to-panel/);
  assert.match(css, /\.game-app \.desktop-initial-guide\s*\{\s*display: none;/);
  assert.match(css, /\.mobile-portrait-guide\s*\{\s*display: flex;/);
  assert.match(css, /\.mobile-portrait-guide\s*\{[\s\S]*?justify-content: flex-end;[\s\S]*?gap: clamp\(8px, 2vh, 16px\);[\s\S]*?padding: 12px;/);
  assert.match(css, /\.mobile-portrait-action-button\s*\{[\s\S]*?display: flex;[\s\S]*?align-items: center;[\s\S]*?justify-content: center;[\s\S]*?text-align: center;[\s\S]*?font-size: 0\.875rem;[\s\S]*?font-weight: 700;/);
  assert.match(css, /\.mobile-portrait-hero\s*\{[\s\S]*?flex: 1 1 auto;[\s\S]*?max-height: none;/);
  assert.match(css, /\.how-to-mode-selector\s*\{[\s\S]*?font-family: var\(--font-mono\);[\s\S]*?font-size: 0\.875rem;[\s\S]*?font-weight: 700;[\s\S]*?line-height: 1\.25;/);
  assert.match(css, /\.menu-action-button\s*\{[\s\S]*?height: 2\.75rem;[\s\S]*?min-height: 2\.75rem;[\s\S]*?padding-top: 0;[\s\S]*?padding-bottom: 0;/);
  assert.match(css, /\.mobile-how-to-panel > \.mechanics-guide\s*\{[\s\S]*?overflow-y: auto;/);
  assert.match(css, /\.mobile-how-to-dialog\s*\{[\s\S]*?background: var\(--bg\);[\s\S]*?padding: 0;/);
  assert.match(css, /html\[data-theme="light"\] \.game-app \.mobile-how-to-dialog,[\s\S]*?html\[data-theme="light"\] \.game-app \.mobile-how-to-panel\s*\{[\s\S]*?background: #fff;/);
  assert.match(css, /html:not\(\[data-theme="light"\]\) \.game-app \.mobile-how-to-dialog,[\s\S]*?html:not\(\[data-theme="light"\]\) \.game-app \.mobile-how-to-panel\s*\{[\s\S]*?background: #000;/);
  assert.match(css, /\.mobile-how-to-panel\s*\{[\s\S]*?width: 100%;[\s\S]*?height: 100%;[\s\S]*?border-radius: 0;/);
  assert.match(css, /\.game-app \.mobile-how-to-panel \.how-to-play-label\s*\{[\s\S]*?background: transparent !important;/);
  assert.match(css, /html\[data-theme="light"\] \.game-app \.mobile-how-to-panel \.how-to-play-label\s*\{[\s\S]*?color: #000 !important;/);
  assert.match(css, /\.mobile-how-to-panel > \.mechanics-guide > div > div > div:last-child\s*\{[\s\S]*?justify-content: center;/);
  assert.match(css, /\.mobile-how-to-panel > \.mechanics-guide \.mechanics-guide-description\s*\{[\s\S]*?display: flex;[\s\S]*?flex: 1 1 auto;[\s\S]*?align-items: center;[\s\S]*?justify-content: center;/);
  assert.match(css, /\.game-app \.mobile-dialog-close\s*\{[^}]*width: 2rem;[^}]*height: 2rem;[^}]*min-width: 2rem;[^}]*min-height: 2rem;/);
  assert.match(css, /\.game-app \.mobile-how-to-panel \.mobile-how-to-header\s*\{[\s\S]*?position: relative;[\s\S]*?width: 100%;/);
  assert.match(css, /\.game-app \.mobile-how-to-dialog\.fixed\.inset-0\.z-50\s*\{\s*padding: 0;/);
  assert.match(css, /\.game-app \.mobile-how-to-panel\s*\{\s*--mobile-guide-bottom-gap: max\(8px, env\(safe-area-inset-bottom\)\);[\s\S]*?--mobile-guide-title-gap: var\(--mobile-theme-control-right, 1rem\);[\s\S]*?padding-top: var\(--mobile-guide-title-gap\);/);
  assert.match(css, /\.game-app \.mobile-how-to-panel \.mobile-how-to-header\s*\{[^}]*height: 2rem;[^}]*min-height: 2rem;[^}]*flex: 0 0 2rem;[^}]*margin-bottom: 0;/);
  assert.match(app, /className="dialog-close mobile-dialog-close mobile-how-to-close/);
  assert.match(app, /const themeControl = app\.querySelector<HTMLElement>\('\.mobile-header-theme-control'\)/);
  assert.match(app, /app\.style\.setProperty\('--mobile-theme-control-right', `\$\{Math\.max\(0, window\.innerWidth - themeRect\.right\)\}px`\)/);
  assert.match(app, /if \(themeControl\) observer\.observe\(themeControl\);/);
  assert.doesNotMatch(app, /--mobile-guide-close-right/);
  assert.doesNotMatch(app, /--mobile-guide-title-center-y/);
  assert.doesNotMatch(app, /mobile-guide-content-gap/);
  assert.match(css, /\.game-app \.mobile-how-to-panel \.mobile-how-to-header \.mobile-how-to-close\s*\{[^}]*width: 2rem;[^}]*min-width: 2rem;[^}]*height: 2rem;[^}]*min-height: 2rem;/);
  assert.match(css, /\.game-app \.mobile-how-to-panel \.mobile-how-to-header \.mobile-how-to-close\s*\{[^}]*position: absolute;[^}]*top: 50%;[^}]*right: 0;[^}]*transform: translateY\(-50%\);/);
  assert.match(css, /\.game-app \.mobile-how-to-panel\s*\{[^}]*padding-right: var\(--mobile-theme-control-right, 1rem\);/);
  assert.match(css, /\.mobile-how-to-panel > \.mechanics-guide\s*\{[^}]*margin-right: 0;/);
  assert.match(css, /\.mobile-how-to-panel > \.mechanics-guide\s*\{[^}]*margin-top: var\(--mobile-theme-control-right, 1rem\);/);
  assert.match(css, /html\[data-theme="light"\] \.game-app \.mobile-dialog-close\s*\{[\s\S]*?color: #000;[\s\S]*?border-color: #000;/);
  assert.match(css, /html:not\(\[data-theme="light"\]\) \.game-app \.mobile-dialog-close\s*\{[\s\S]*?color: #fff;[\s\S]*?border-color: #fff;/);
  assert.match(css, /\.game-app \.site-footer\s*\{[\s\S]*?display: flex;[\s\S]*?flex-direction: column;[\s\S]*?align-items: center;/);
  assert.match(css, /\.game-app \.site-footer > nav,[\s\S]*?\.game-app \.site-footer > \.site-footer-copyright\s*\{[\s\S]*?align-self: center;[\s\S]*?text-align: center;/);
});

test('How to Play labels use theme-aware colors and title case', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const mechanicsGuide = readFileSync(new URL('./MechanicsGuide.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(app, />\s*How to Play\s*<\/h2>/);
  assert.match(app, />\s*Start\s*<\/button>/);
  assert.match(app, /className="how-to-play-label[^>]*">How to Play<\/h2>/);
  assert.match(css, /\.how-to-play-heading\s*\{[\s\S]*?color: #fff;/);
  assert.match(css, /html\[data-theme="light"\] \.how-to-play-heading\s*\{[\s\S]*?color: #333a4b;[\s\S]*?background: transparent;/);
  assert.match(css, /\.how-to-play-label,[\s\S]*?\.mobile-portrait-how-to-play\s*\{[\s\S]*?color: #fff;[\s\S]*?border: 0;/);
  assert.match(css, /html\[data-theme="light"\] \.how-to-play-label,[\s\S]*?\.mobile-portrait-how-to-play\s*\{[\s\S]*?color: #333a4b;/);
  assert.match(css, /html\[data-theme="light"\] \.desktop-initial-guide \.how-to-play-heading,[\s\S]*?html\[data-theme="light"\] \.paused-guide-dialog \.how-to-play-label\s*\{[\s\S]*?color: #000;[\s\S]*?background: transparent !important;/);
  assert.match(mechanicsGuide, /className="mechanics-guide-title[^>]*">\{card.title\}<\/h3>/);
  assert.match(mechanicsGuide, /className="mechanics-guide-description flex flex-1 w-full items-center justify-center"/);
  assert.match(css, /\.initial-guide \.mechanics-guide-title\s*\{[\s\S]*?flex: 0 0 3em;[\s\S]*?height: 3em;[\s\S]*?align-items: flex-start;/);
});

test('landscape mobile and desktop information dialogs share styling and scroll only content', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  const shared = css.slice(css.indexOf('/* Desktop information titles'), css.indexOf('/* Pause guide spacing must not grow'));
  assert.match(shared, /@media \(pointer: fine\), \(orientation: landscape\) and \(pointer: coarse\)/);
  assert.match(shared, /> \.site-info-dialog\s*\{[^}]*max-width: 36rem;[^}]*height: auto;[^}]*max-height: 100%;[^}]*min-height: 0;[^}]*border-radius: 0\.75rem;[^}]*transform: none;[^}]*overflow: hidden;/);
  assert.match(shared, /> \.site-info-content\s*\{[^}]*display: block;[^}]*min-height: 0;[^}]*overflow-y: auto;[^}]*overscroll-behavior: contain;/);
  assert.match(shared, /> \.site-info-header\s*\{[^}]*flex: 0 0 2rem;/);
});

test('desktop site information titles align with header-sized close controls', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(css, /\.game-app \.site-info-dialog > \.site-info-header\s*\{[^}]*height: 2rem;[^}]*min-height: 2rem;[^}]*align-items: center;/);
  assert.match(css, /\.game-app \.site-info-header > \.site-info-title\s*\{[^}]*margin: 0;[^}]*line-height: 1;/);
  assert.match(css, /\.game-app \.site-info-header > \.site-info-close\s*\{[^}]*top: 50%;[^}]*right: 0;[^}]*transform: translateY\(-50%\);[^}]*width: 2rem;[^}]*height: 2rem;[^}]*background: var\(--alt\);/);
  assert.match(css, /html\[data-theme="light"\] \.game-app \.site-info-header > \.site-info-close\s*\{[^}]*color: #333a4b;[^}]*border-color: #333a4b;/);
});

test('information headings are lowered and both mobile orientations fill the How to Play bounds', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  const section = css.slice(css.indexOf('/* Information headings sit below'), css.indexOf('/* Mobile landscape landing uses'));
  assert.match(section, /@media \(pointer: fine\), \(pointer: coarse\)/);
  assert.match(section, /min-height: 4\.5rem;[\s\S]*?align-items: flex-end;/);
  assert.match(section, /\.site-info-header > \.site-info-title\s*\{\s*transform: translateY\(-4px\);/);
  assert.match(section, /@media \(pointer: coarse\)/);
  assert.doesNotMatch(section, /orientation:/);
  assert.match(section, /\.site-info-overlay\.fixed\.inset-0\.z-50\s*\{\s*padding: 0;/);
  assert.match(section, /height: 100%;\s*max-height: 100%;\s*max-width: none;/);
  assert.match(section, /top: var\(--site-info-mobile-gutter\);\s*right: var\(--site-info-mobile-gutter\);\s*transform: none;\s*display: inline-flex;/);
  assert.match(section, /> \.site-info-content\s*\{[^}]*display: block;[^}]*min-height: 0;[^}]*overflow-y: auto;/);
  assert.match(section, /background: transparent;\s*color: inherit;\s*border-color: currentColor;/);
});

test('desktop information close buttons have equal top and right panel insets', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  const desktop = css.slice(css.indexOf('/* Anchor desktop information close controls'), css.indexOf('/* The desktop landing guide fills'));
  assert.match(desktop, /@media \(pointer: fine\)/);
  assert.match(desktop, /> \.site-info-dialog\s*\{\s*position: relative;\s*--site-info-close-inset: 1\.25rem;/);
  assert.match(desktop, /> \.site-info-header\s*\{\s*position: static;/);
  assert.match(desktop, /> \.site-info-close\s*\{\s*top: var\(--site-info-close-inset\);\s*right: var\(--site-info-close-inset\);\s*transform: none;/);
});

test('desktop close buttons follow the dynamically sized Fullscreen control', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(app, /desktop-fullscreen-control/);
  assert.match(app, /--fullscreen-control-width/);
  assert.match(app, /--fullscreen-control-height/);
  assert.match(app, /--fullscreen-control-right/);
  assert.match(app, /--fullscreen-control-bottom/);
  assert.match(css, /\.game-app \.mobile-dialog-close\s*\{[\s\S]*?width: var\(--fullscreen-control-width, 2rem\);[\s\S]*?height: var\(--fullscreen-control-height, 2rem\);/);
  assert.match(css, /\.game-app \.paused-guide-dialog > \.how-to-guide-header > \.mobile-dialog-close\s*\{[^}]*position: absolute;[^}]*top: 50%;[^}]*right: 0;[^}]*transform: translateY\(-50%\);/);
});

test('desktop guides reuse the mobile theme and header spacing while retaining columns', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.equal((app.match(/className="how-to-guide-header/g) || []).length, 2);
  assert.match(css, /\.game-app \.desktop-initial-guide,\s*\.game-app \.paused-guide-dialog\s*\{[^}]*--guide-gutter: var\(--fullscreen-control-right, 1rem\);[^}]*padding: var\(--guide-gutter\);[^}]*border: 0;[^}]*border-radius: 0;/);
  assert.match(css, /html\[data-theme="light"\] \.game-app :is\(\.desktop-initial-guide, \.paused-guide-dialog\)\s*\{[^}]*background: #fff !important;/);
  assert.match(css, /html:not\(\[data-theme="light"\]\) \.game-app :is\(\.desktop-initial-guide, \.paused-guide-dialog\)\s*\{[^}]*background: #000 !important;/);
  assert.match(css, /\.game-app :is\(\.desktop-initial-guide, \.paused-guide-dialog\) > \.how-to-guide-header\s*\{[^}]*height: var\(--fullscreen-control-height, 2rem\);[^}]*margin: 0 0 var\(--guide-gutter\);[^}]*border: 0;/);
  assert.match(css, /\.game-app \.mobile-how-to-panel \.mobile-how-to-header \.mobile-how-to-close\s*\{[^}]*width: 2rem;[^}]*height: 2rem;/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
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

test('mobile information content has extra side padding and About support has balanced end spacing', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  const mobile = css.slice(css.indexOf('/* Both mobile orientations share'), css.indexOf('/* Mobile landscape landing uses'));
  const footer = readFileSync(new URL('./SiteFooter.tsx', import.meta.url), 'utf8');
  assert.match(mobile, /@media \(pointer: coarse\)/);
  assert.doesNotMatch(mobile, /orientation:/);
  assert.match(mobile, /> \.site-info-content\s*\{[^}]*padding-inline: 16px;[^}]*box-sizing: border-box;/);
  assert.doesNotMatch(mobile, /padding-bottom: 20px;/);
  assert.match(footer, /className="about-support space-y-2 pt-2 text-center"/);
});

test('all information sections measure their title inset and share a scrollable end gap', () => {
  const footer = readFileSync(new URL('./SiteFooter.tsx', import.meta.url), 'utf8');
  const privacy = footer.slice(footer.indexOf("section === 'Privacy'"), footer.indexOf("section === 'Disclaimer'"));
  assert.doesNotMatch(privacy, /className="pb-3"/);
  assert.match(footer, /title\.getBoundingClientRect\(\)\.top - panel\.getBoundingClientRect\(\)\.top/);
  assert.match(footer, /topGap - parseFloat\(style\.paddingBottom\) - parseFloat\(style\.borderBottomWidth\)/);
  assert.match(footer, /observer\.observe\(title\)/);
  assert.match(footer, /header\.getBoundingClientRect\(\)\.bottom - title\.getBoundingClientRect\(\)\.bottom/);
  assert.match(footer, /const contentGap = Math\.max\(0, topGap - headerTail\);/);
  assert.match(footer, /topGap - parseFloat\(style\.paddingLeft\) - parseFloat\(style\.borderLeftWidth\)/);
  assert.match(footer, /topGap - parseFloat\(style\.paddingRight\) - parseFloat\(style\.borderRightWidth\)/);
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(css, /> \.site-info-header\s*\{\s*margin-bottom: var\(--site-info-content-gap, 1rem\);/);
  assert.match(css, /padding-left: var\(--site-info-left-gap, 16px\);\s*padding-right: var\(--site-info-right-gap, 16px\);/);
  assert.match(css, /\.site-info-content::after\s*\{[^}]*height: var\(--site-info-end-gap, 0px\);[^}]*margin: 0;/);
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
  assert.match(footer, /className="preferences-clear-button block mx-auto [^"]*" onClick/);
});

test('mobile footer uses the requested portrait and landscape arrangements', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(css, /@media \(orientation: landscape\) and \(pointer: coarse\) \{[\s\S]*?\.game-app \.site-footer\s*\{\s*grid-template-columns: 1fr auto;/);
  assert.match(css, /\.game-app \.site-footer > nav\s*\{[\s\S]*?grid-column: 2;[\s\S]*?grid-row: 1;[\s\S]*?justify-self: end;[\s\S]*?flex-wrap: nowrap;/);
  assert.match(css, /\.game-app \.site-footer > \.site-footer-copyright\s*\{[\s\S]*?grid-column: 1;[\s\S]*?grid-row: 1;[\s\S]*?justify-self: start;/);
  assert.match(css, /@media \(orientation: portrait\) and \(pointer: coarse\) \{[\s\S]*?\.game-app \.site-footer\s*\{[\s\S]*?display: flex;[\s\S]*?flex-direction: column;[\s\S]*?align-items: center;[\s\S]*?justify-content: center;/);
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
  assert.match(css, /\.game-app \.game-overlay\.how-to-play-overlay\s*\{\s*inset: calc\(100% \* 48 \/ 840\) 0 0;/);
});

test('portrait site information fills the Live Feed-to-footer area and centers its content below the theme button', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(css, /\.game-app \.fixed\.inset-0\.z-50\s*\{[\s\S]*?top: var\(--live-feed-bottom, 0px\);[\s\S]*?bottom: var\(--footer-inset-bottom, 0px\);/);
  assert.match(css, /\.game-app \.site-info-overlay\.fixed\.inset-0\.z-50 > \.site-info-dialog\s*\{[\s\S]*?display: flex;[\s\S]*?flex-direction: column;[\s\S]*?justify-content: flex-start;[\s\S]*?height: 100%;/);
  assert.match(css, /\.game-app \.site-info-overlay\.fixed\.inset-0\.z-50 > \.site-info-dialog\s*\{[\s\S]*?justify-content: flex-start;/);
  assert.match(css, /\.game-app \.site-info-overlay\.fixed\.inset-0\.z-50 > \.site-info-dialog > \.site-info-header\s*\{[\s\S]*?flex: 0 0 auto;/);
  assert.match(css, /\.game-app \.site-info-overlay\.fixed\.inset-0\.z-50 > \.site-info-dialog > \.site-info-content\s*\{[\s\S]*?display: flex;[\s\S]*?flex: 1 1 auto;[\s\S]*?justify-content: center;[\s\S]*?margin-inline: auto;/);
  assert.match(css, /\.game-app \.site-info-overlay\.fixed\.inset-0\.z-50 > \.site-info-dialog > \.site-info-header > \.site-info-close\s*\{[\s\S]*?position: absolute;[\s\S]*?top: 50%;[\s\S]*?right: 0;[\s\S]*?transform: translateY\(-50%\);/);
});

test('mobile landscape retries fullscreen after rotation and keeps guide/result content scrollable', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  assert.match(app, /window\.matchMedia\('\(max-width: 1024px\) and \(pointer: coarse\)'\)/);
  assert.match(app, /void requestMobileLandscape\(\);\s*sound\.unlock\(\);\s*if \(window\.matchMedia\('\(max-width: 1024px\) and \(pointer: coarse\)'\)\.matches && window\.innerHeight > window\.innerWidth\)/);
  assert.match(app, /if \(!portrait && awaitingLandscape\) \{\s*\/\/ The initial request is made from the START tap\.[\s\S]*?void requestMobileLandscape\(\);/);
  assert.match(css, /@media \(orientation: landscape\) and \(pointer: coarse\)/);
  assert.match(css, /--mobile-header-gutter: max\(12px, env\(safe-area-inset-top\), env\(safe-area-inset-right\)\);/);
  assert.match(css, /\.game-app header\s*\{\s*padding-top: var\(--mobile-header-gutter\);[\s\S]*?padding-right: var\(--mobile-header-gutter\);/);
  assert.match(css, /\.how-to-layout > \.mechanics-guide \{[\s\S]*?overflow-y: auto;[\s\S]*?grid-template-rows: none;/);
  assert.match(css, /\.game-over-overlay\s*\{[\s\S]*?align-items: center;[\s\S]*?justify-content: center;/);
  assert.match(css, /\.game-result-over\s*\{[\s\S]*?max-height: calc\(100% - env\(safe-area-inset-top\)/);
  assert.match(css, /\.game-result-over \.game-result-content\s*\{[\s\S]*?overflow-y: auto;/);
  assert.doesNotMatch(css, /\.game-result-over\s*\{[\s\S]*?max-height: none;[\s\S]*?overflow: visible !important;/);
});

test('desktop landing guide fills all space between the measured Live Feed and footer', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  const landing = css.slice(css.indexOf('/* The desktop landing guide fills'), css.indexOf('.game-app .mobile-how-to-panel {', css.indexOf('/* The desktop landing guide fills')));
  assert.match(landing, /@media \(pointer: fine\)/);
  assert.match(landing, /\[data-state="menu"\] \.game-arena > \.game-overlay\.how-to-play-overlay\s*\{[^}]*inset: var\(--live-feed-height, calc\(100% \* 48 \/ 840\)\) 0 0;[^}]*padding: 0;[^}]*align-items: stretch;[^}]*justify-content: stretch;/);
  assert.match(landing, /> \.desktop-initial-guide\s*\{[^}]*flex: 1 1 auto;[^}]*width: 100%;[^}]*height: 100%;[^}]*max-width: none;[^}]*max-height: 100%;[^}]*margin: 0;/);
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
