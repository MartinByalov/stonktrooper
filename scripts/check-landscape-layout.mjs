import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';

const root = resolve(import.meta.dirname, '..');
const profile = await mkdtemp(join(tmpdir(), 'stonktrooper-layout-'));
const pending = new Map();
let browser, server, socket, id = 0;
try {
  server = await createServer({ root, server: { host: '127.0.0.1', port: 5537, strictPort: true }, logLevel: 'error' });
  await server.listen();
  browser = spawn(process.env.EDGE_PATH ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', 'about:blank',
  ], { stdio: 'ignore' });
  let launchError;
  browser.on('error', error => { launchError = error; });
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (launchError) throw launchError;
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  assert.ok(port, 'Headless browser started');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (!request) return;
    clearTimeout(request.timer);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject, timer: setTimeout(() => reject(new Error(`Timeout: ${method}`)), 15000) });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  const evaluate = async expression => {
    const response = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  };
  const settle = () => evaluate('new Promise(resolve => setTimeout(resolve, 350))');
  await call('DOM.enable');
  await call('CSS.enable');
  const checkHover = async (selectors, theme) => {
    for (const selector of selectors) {
      const { root } = await call('DOM.getDocument');
      const { nodeId } = await call('DOM.querySelector', { nodeId: root.nodeId, selector });
      assert.ok(nodeId, `Hover target exists: ${selector}`);
      const before = await evaluate(`getComputedStyle(document.querySelector('${selector}')).color`);
      await call('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover'] });
      await settle();
      const style = await evaluate(`(() => {const s=getComputedStyle(document.querySelector('${selector}')); return {background:s.backgroundColor,color:s.color};})()`);
      assert.equal(style.background, theme === 'light' ? 'rgb(38, 38, 38)' : 'rgb(229, 237, 246)', `${selector} hover in ${theme}`);
      assert.equal(style.color, before, 'Hover preserves text contrast');
      await call('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
      await settle();
    }
  };
  await call('Page.navigate', { url: 'http://127.0.0.1:5537' });
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await evaluate('!!document.querySelector(".landing-menu-panel")')) break;
    await settle();
  }
  for (const [width, height, touch] of [[1440, 900, false], [844, 390, true], [667, 375, true]]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: touch });
    await call('Emulation.setTouchEmulationEnabled', { enabled: touch });
    await settle();
    for (const theme of ['light', 'dark']) {
      await evaluate(`if (document.documentElement.dataset.theme !== '${theme}') {
        document.querySelector('.landing-menu-settings-button').click();
      }`);
      await settle();
      await evaluate(`if (document.documentElement.dataset.theme !== '${theme}') {
        document.querySelector('button[aria-label="Night mode"]').click();
      }`);
      await settle();
      await evaluate("document.querySelector('.site-info-close')?.click()");
      await settle();
      if (!touch) await checkHover(['.landing-menu-guide-button', '.landing-menu-settings-button'], theme);
      const menu = await evaluate(`(() => {
        const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom }; };
        return { header:rect('header'), feed:rect('.desktop-live-feed-bar'), menu:rect('.landing-menu-panel'),
          touch:matchMedia('(pointer: coarse)').matches, oldMenu:!!document.querySelector('.mobile-portrait-guide'),
          buttons:[...document.querySelectorAll('.landing-menu-actions button')].map(b => ({ text:b.textContent.trim(), ...(() => {const r=b.getBoundingClientRect();return {y:r.y,bottom:r.bottom};})() })),
          overflow:document.documentElement.scrollWidth > innerWidth };
      })()`);
      assert.equal(menu.touch, touch, 'Pointer emulation');
      const headerInsets = await evaluate(`(() => {
        const header=document.querySelector('header').getBoundingClientRect();
        const logo=document.querySelector('.header-logo-frame').getBoundingClientRect();
        const icon=document.querySelector('.desktop-fullscreen-control svg');
        const rect=icon.getBoundingClientRect(), bounds=icon.getBBox(), box=icon.viewBox.baseVal;
        const right=rect.left+(bounds.x+bounds.width+parseFloat(getComputedStyle(icon).strokeWidth)/2-box.x)*rect.width/box.width;
        return {left:logo.left-header.left,right:header.right-right};
      })()`);
      assert.ok(Math.abs(headerInsets.left-headerInsets.right)<1, `Header balances logo against painted fullscreen icon: ${JSON.stringify(headerInsets)}`);
      const homeActions = await evaluate(`(() => {
        const buttons = [...document.querySelectorAll('.landing-menu-actions button')];
        const rects = buttons.map(button => button.getBoundingClientRect());
        return { sizes: rects.map(r => ({width:r.width,height:r.height})),
          shadows: buttons.map(button => getComputedStyle(button).boxShadow),
          gaps: rects.slice(1).map((r,i) => r.top-rects[i].bottom) };
      })()`);
      const actionGap = touch ? Math.max(3, Math.min(height / 100, 6)) : 4;
      assert.ok(homeActions.sizes.every(size => Math.abs(size.width-homeActions.sizes[0].width)<0.1 && Math.abs(size.height-homeActions.sizes[0].height)<0.1), 'All Home buttons have identical dimensions');
      assert.ok(homeActions.gaps.every(gap => Math.abs(gap-actionGap)<0.1), `Home actual gaps are equal: ${JSON.stringify(homeActions.gaps)}`);
      assert.ok(homeActions.shadows.every(shadow => shadow === 'none'), 'Home buttons have no shadows distorting gaps');
      assert.equal(menu.oldMenu, false, 'No separate portrait menu');
      assert.equal(menu.overflow, false, 'No horizontal document overflow');
      const scenery = await evaluate(`(() => {
        const controls = document.querySelector('.landing-menu-actions').getBoundingClientRect();
        const donate = document.querySelector('.home-coffee-link').getBoundingClientRect();
        const overlaps = (a,b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        return [...document.querySelectorAll('[data-menu-asset]')].map(element => {
          const canvas = element.querySelector('canvas');
          const pixels = canvas.getContext('2d').getImageData(0,0,160,160).data;
          const r = element.getBoundingClientRect();
          return {asset:element.dataset.menuAsset,painted:pixels.some((value,i) => i%4===3 && value>0),
            grounded:element.dataset.grounded==='true',
            groundError: Math.abs(Number(element.getAttribute('y')) + Number(element.getAttribute('height')) - Number(element.dataset.candleTop)),
            overlaps:overlaps(r,controls)||overlaps(r,donate)};
        });
      })()`);
      assert.equal(scenery.length, 17, 'Home displays the simplified decorative cast');
      assert.ok(scenery.every(item => item.painted && !item.overlaps), `All game assets render without covering controls or Donate: ${JSON.stringify({width,height,failed:scenery.filter(item=>!item.painted||item.overlaps)})}`);
      assert.ok(scenery.filter(item => item.grounded).every(item => item.groundError < 1), 'Walking characters stand on chart candles');
      const hero = await evaluate(`(() => {const r=document.querySelector('.menu-celebration').getBoundingClientRect();const b=document.querySelector('.landing-menu-guide-button').getBoundingClientRect();return {center:Math.abs(r.left+r.width/2-b.left-b.width/2),gap:b.top-r.bottom};})()`);
      assert.ok(hero.center < 1 && Math.abs(hero.gap) < 1, 'Rear-facing character stands on the centred How to Play top border');
      const heroClipped = await evaluate(`(() => {
        const hero = document.querySelector('.menu-celebration');
        const r = hero.getBoundingClientRect();
        for (let ancestor = hero.parentElement; ancestor; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor);
          const bounds = ancestor.getBoundingClientRect();
          if (['hidden','clip','auto','scroll'].includes(style.overflowY) && (r.top < bounds.top - 1 || r.bottom > bounds.bottom + 1)) return true;
          if (['hidden','clip','auto','scroll'].includes(style.overflowX) && (r.left < bounds.left - 1 || r.right > bounds.right + 1)) return true;
        }
        return false;
      })()`);
      assert.equal(heroClipped, false, 'Celebrating character is not clipped by any ancestor');
      assert.ok(!scenery.some(item => ['bag', 'wolf', 'turtle', 'fedora', 'briefcase', 'bull-rider', 'bear-rider', 'dumpster'].includes(item.asset)), 'Excluded assets do not appear on the chart');
      assert.equal(menu.feed.y - menu.header.bottom, 4, 'Header to feed gap');
      assert.ok(menu.menu.width > width - 24, 'Full-width landing chart');
      assert.deepEqual(menu.buttons.map(button => button.text.replace(/\s+/g, ' ')), ['How to Play', 'Settings', 'Hard Mode', 'Start'], 'Home button order');
      assert.ok(menu.buttons[0].y >= menu.menu.y && menu.buttons[3].bottom <= menu.menu.bottom, 'Menu buttons fit');
      if (touch) {
        const responsive = await evaluate(`(() => {
          const rect = selector => document.querySelector(selector).getBoundingClientRect();
          return { action: rect('.landing-menu-settings-button').height, header: rect('header').height,
            footerFont: parseFloat(getComputedStyle(document.querySelector('.site-footer')).fontSize),
            chartHeight: rect('.landing-menu-chart').height, panelHeight: rect('.landing-menu-panel').height };
        })()`);
        assert.ok(Math.abs(responsive.action - height * 0.09) < 1, 'Actions scale with viewport height');
        assert.ok(Math.abs(responsive.header - height * 0.09) < 1, 'Header scales with viewport height');
        assert.ok(Math.abs(responsive.footerFont - height * 0.027) < 1, 'Footer scales with viewport height');
        assert.ok(Math.abs(responsive.chartHeight - responsive.panelHeight) < 3, 'Chart fills available panel');
        await evaluate("document.querySelector('.landing-menu-settings-button').click()");
        await settle();
        await evaluate("document.querySelector('button[aria-label=\"Live Feed\"]').click(); document.querySelector('.site-info-close').click()");
        await settle();
        const hiddenFeed = await evaluate(`(() => {
          const bar = document.querySelector('.desktop-live-feed-bar');
          return { hidden: bar.hidden, height: bar.getBoundingClientRect().height,
            margin: getComputedStyle(bar).marginTop,
            reserved: parseFloat(document.querySelector('.game-app').style.getPropertyValue('--live-feed-height')) };
        })()`);
        assert.deepEqual(hiddenFeed, { hidden: true, height: 0, margin: '0px', reserved: 0 }, 'Disabled mobile feed removes entire strip and reserved space');
        await evaluate("document.querySelector('.landing-menu-settings-button').click()");
        await settle();
        await evaluate("document.querySelector('button[aria-label=\"Live Feed\"]').click(); document.querySelector('.site-info-close').click()");
        await settle();
      }
      const homeStyle = await evaluate(`(() => {
        const logo = document.querySelector('.stonktrooper-logo').getBoundingClientRect();
        const coffee = document.querySelector('.home-coffee-link');
        const rect = coffee.getBoundingClientRect();
        const label = coffee.querySelector('.donate-label').getBoundingClientRect();
        const cup = coffee.querySelector('.coffee-cup').getBoundingClientRect();
        const chart = document.querySelector('.landing-menu-chart').getBoundingClientRect();
        const settings = document.querySelector('.landing-menu-settings-button');
        const guide = document.querySelector('.landing-menu-guide-button').getBoundingClientRect();
        return { labelOffset: label.top + label.height / 2 - (rect.top + rect.height / 2),
          cupOffset: cup.top + cup.height / 2 - (rect.top + rect.height / 2),
          width: rect.width, height: rect.height, logoWidth: logo.width, left: rect.left, logoLeft: logo.left,
          leftInset: rect.left - chart.left, bottomInset: chart.bottom - 18 - rect.bottom,
          insideChart: coffee.parentElement.matches('.landing-menu-panel') && rect.top >= chart.top && rect.right <= chart.right,
          bottom: innerHeight - rect.bottom, background: getComputedStyle(coffee).backgroundColor,
          cupColor: getComputedStyle(coffee.querySelector('.coffee-cup')).backgroundColor,
          textColor: getComputedStyle(coffee).color,
          settingsBackground: getComputedStyle(settings).backgroundColor, settingsColor: getComputedStyle(settings).color,
          sameSize: settings.getBoundingClientRect().width === guide.width && settings.getBoundingClientRect().height === guide.height,
          hit: document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('.home-coffee-link') === coffee };
      })()`);
      assert.ok(Math.abs(homeStyle.width - homeStyle.logoWidth) < 1, 'Ko-fi matches logo width');
      assert.equal(homeStyle.height, 36, 'Donate has a compact 36px height');
      assert.ok(Math.abs(homeStyle.labelOffset) < 1 && Math.abs(homeStyle.cupOffset) < 1, 'Donate text and icon are vertically centered');
      assert.ok(homeStyle.insideChart && Math.abs(homeStyle.leftInset - homeStyle.logoLeft) < 1 && Math.abs(homeStyle.bottomInset - homeStyle.logoLeft) < 1, 'Ko-fi inside chart above time axis with matching gutters');
      assert.equal(homeStyle.background, 'rgb(114, 164, 242)');
      const dayColor = 'rgb(0, 0, 0)', nightColor = 'rgb(255, 255, 255)';
      assert.equal(homeStyle.cupColor, theme === 'light' ? dayColor : nightColor, 'Theme cup color');
      assert.equal(homeStyle.textColor, theme === 'light' ? dayColor : nightColor, 'Theme Donate text color');
      await call('DOM.enable');
      await call('CSS.enable');
      const { root: domRoot } = await call('DOM.getDocument');
      const { nodeId: coffeeNode } = await call('DOM.querySelector', { nodeId: domRoot.nodeId, selector: '.home-coffee-link' });
      await call('CSS.forcePseudoState', { nodeId: coffeeNode, forcedPseudoClasses: ['hover'] });
      const hovered = await evaluate(`(() => { const b = document.querySelector('.home-coffee-link'); return { text: getComputedStyle(b).color, cup: getComputedStyle(b.querySelector('.coffee-cup')).backgroundColor, background: getComputedStyle(b).backgroundColor }; })()`);
      assert.equal(hovered.text, theme === 'light' ? nightColor : dayColor, 'Hover swaps text theme');
      assert.equal(hovered.cup, theme === 'light' ? nightColor : dayColor, 'Hover swaps cup theme');
      assert.equal(hovered.background, 'rgb(114, 164, 242)', 'Hover preserves blue background');
      await call('CSS.forcePseudoState', { nodeId: coffeeNode, forcedPseudoClasses: [] });
      assert.equal(homeStyle.settingsBackground, theme === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
      assert.equal(homeStyle.settingsColor, theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)');
      assert.ok(homeStyle.sameSize && homeStyle.hit, 'Settings size and Ko-fi hit target');
      const footer = await evaluate(`(() => {
        const nav = document.querySelector('.site-footer > nav');
        return { rows: new Set([...nav.children].map(button => button.getBoundingClientRect().y)).size,
          copyright: document.querySelector('.site-footer').textContent.includes('2026') };
      })()`);
      assert.equal(footer.rows, 1, 'Footer links stay on one row');
      assert.equal(footer.copyright, false, 'Copyright removed from footer');
      await evaluate("document.querySelector('.landing-menu-guide-button').click()");
      await settle();
      const guide = await evaluate(`(() => {
        const get = selector => document.querySelector(selector);
        const hero=get('.how-to-dialog-hero').getBoundingClientRect(), cards=get('.how-to-dialog-content > .mechanics-guide').getBoundingClientRect();
        const close=get('.mobile-how-to-close'), r=close.getBoundingClientRect();
        return { heroWidth:hero.width, heroRight:hero.right, cardsX:cards.x,
          columns:getComputedStyle(get('.how-to-dialog-content > .mechanics-guide')).gridTemplateColumns,
          cardBackground:getComputedStyle(get('.how-to-dialog-content > .mechanics-guide > div')).backgroundColor,
          headerBackground:getComputedStyle(get('.mobile-how-to-header')).backgroundColor,
          closeBackground:getComputedStyle(close).backgroundColor,
          closeReachable:close.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)) };
      })()`);
      assert.ok(guide.heroWidth > 0 && guide.heroRight < guide.cardsX, 'Illustration left of cards');
      assert.equal(guide.columns.split(' ').length, 2, 'Two guide columns');
      assert.equal(guide.cardBackground, theme === 'dark' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
      assert.equal(guide.headerBackground, guide.cardBackground, 'Header matches cards');
      assert.equal(guide.closeBackground, 'rgba(0, 0, 0, 0)', 'Transparent X');
      assert.ok(guide.closeReachable, 'X is hit-testable');
      await evaluate("document.querySelector('.mobile-how-to-close').click()");
      await evaluate("document.querySelector('.site-footer nav button').click()");
      await settle();
      assert.equal(await evaluate(`(() => {
        const copyright = document.querySelector('.about-copyright');
        return !!copyright && copyright === copyright.parentElement.lastElementChild
          && copyright.innerText === '© Stonktrooper.lol\\n2026';
      })()`), true, 'Two-line copyright is last in About');
      await evaluate("document.querySelector('.site-info-close').click()");
      console.log(`PASS ${width}x${height} ${touch ? 'touch' : 'mouse'} ${theme}`);
    }
  }
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await call('Emulation.setTouchEmulationEnabled', { enabled: false });
  await settle();
  assert.equal(await evaluate("document.querySelectorAll('.header-sound-control, .mobile-header-theme-control, .mobile-header-about-control').length"), 0, 'Sound, theme and info icons removed');
  await evaluate("document.querySelector('.landing-menu-settings-button').click()");
  await settle();
  const settingsStyle = await evaluate(`(() => {
    const panel = document.querySelector('.settings-options');
    return { icon: getComputedStyle(panel.querySelector('svg')).color,
      slider: getComputedStyle(panel.querySelector('input')).accentColor,
      activeSwitch: getComputedStyle(panel.querySelector('[aria-checked="true"] .settings-switch-track')).backgroundColor,
      removedText: /WORKSPACE PREFERENCES|Disable decorative animations/.test(panel.textContent) };
  })()`);
  assert.equal(settingsStyle.icon, 'rgb(56, 189, 248)');
  assert.equal(settingsStyle.slider, 'rgb(56, 189, 248)');
  assert.equal(settingsStyle.activeSwitch, 'rgb(56, 189, 248)');
  assert.equal(settingsStyle.removedText, false);
  assert.equal(await evaluate("document.querySelector('label[for=\"settings-volume\"]').textContent.trim()"), 'Sound (M)');
  assert.ok(await evaluate("document.querySelector('[aria-label=\"Night mode\"] .settings-label').textContent.includes('(N)')"), 'Settings displays theme shortcut');
  await evaluate("Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(document.querySelector('#settings-volume'), '0'); document.querySelector('#settings-volume').dispatchEvent(new Event('input', {bubbles:true})); document.querySelector('button[aria-label=\"Live Feed\"]').click()");
  await settle();
  assert.equal(await evaluate("localStorage.getItem('cr_sound_enabled')"), 'false');
  await evaluate("document.querySelector('button[aria-label=\"Interface animations\"]').click()");
  await settle();
  assert.equal(await evaluate("document.querySelector('.game-app').dataset.animations"), 'false');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.game-overlay')).backdropFilter"), 'none');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.game-app')).transitionDuration"), '0s');
  assert.equal(await evaluate("localStorage.getItem('cr_live_feed')"), 'false');
  assert.equal(await evaluate("document.querySelector('.desktop-live-feed-bar').getBoundingClientRect().height"), 0, 'Feed hidden without reserved space');
  await call('Page.reload');
  await settle();
  await settle();
  assert.equal(await evaluate("document.querySelector('.game-app').dataset.liveFeed"), 'false', 'Feed preference survives reload');
  await evaluate("document.querySelector('.landing-menu-settings-button').click()");
  await settle();
  assert.equal(await evaluate("document.querySelector('#settings-volume').value"), '0', 'Sound preference survives reload');
  assert.equal(await evaluate("document.querySelector('button[aria-label=\"Interface animations\"]').getAttribute('aria-checked')"), 'false', 'Animation preference survives reload');
  await evaluate("Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(document.querySelector('#settings-volume'), '65'); document.querySelector('#settings-volume').dispatchEvent(new Event('input', {bubbles:true})); document.querySelector('button[aria-label=\"Live Feed\"]').click(); document.querySelector('.site-info-close').click()");
  await settle();
  assert.equal(await evaluate("localStorage.getItem('cr_volume')"), '65', 'Volume slider saves intermediate levels');
  assert.equal(await evaluate("import('/src/audio.ts').then(({sound}) => sound.masterVolume)"), 0.65, 'Audio master volume updated');
  const desktopHomeButton = await evaluate("(() => { const r=document.querySelector('.landing-menu-settings-button').getBoundingClientRect(); return {width:r.width,height:r.height}; })()");
  await call('Emulation.setTouchEmulationEnabled', { enabled: true });
  await call('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
  await settle();
  const homeButton = await evaluate("(() => { const r=document.querySelector('.landing-menu-settings-button').getBoundingClientRect(); return {width:r.width,height:r.height}; })()");
  const homeStyle = await evaluate("(() => { const s=getComputedStyle(document.querySelector('.landing-menu-settings-button')); return {radius:s.borderRadius, gap:getComputedStyle(document.querySelector('.landing-menu-actions')).gap}; })()");
  assert.ok(homeButton.width < desktopHomeButton.width && homeButton.height < desktopHomeButton.height, 'Mobile actions scale down from desktop');
  await evaluate("document.querySelector('.landing-menu-actions > button:last-child').click()");
  const playing = await evaluate(`new Promise(resolve => setTimeout(() => {
    const result = {
      feed: getComputedStyle(document.querySelector('.desktop-live-feed-bar')).display,
      footer: getComputedStyle(document.querySelector('.site-footer')).display,
      liveFeed: document.querySelector('.game-app').dataset.liveFeed,
    };
    document.querySelector('.header-pause-control').click();
    resolve(result);
  }, 50))`);
  assert.equal(playing.feed, 'none', 'Mobile gameplay hides feed');
  assert.equal(playing.footer, 'none', 'Mobile gameplay hides footer');
  assert.equal(playing.liveFeed, 'false', 'Canvas feed disabled during mobile gameplay');
  await settle();
  assert.notEqual(await evaluate("getComputedStyle(document.querySelector('.site-footer')).display"), 'none', 'Pause restores footer');
  assert.equal(await evaluate("document.querySelector('.game-app').dataset.liveFeed"), 'true', 'Pause restores enabled feed');
  const pause = await evaluate(`(() => {
    const headerRadius = getComputedStyle(document.querySelector('.header-pause-control')).borderRadius;
    return { sizes:[...document.querySelectorAll('.pause-overlay .margin-call-action')].map(button => { const r=button.getBoundingClientRect(); return {width:r.width,height:r.height}; }), buttons:[...document.querySelectorAll('.pause-overlay .margin-call-action')].map(button => button.textContent.trim()),
      radii:[...document.querySelectorAll('.pause-overlay .game-result, .pause-overlay .margin-call-action')].map(element => getComputedStyle(element).borderRadius), headerRadius };
  })()`);
  assert.deepEqual(pause.buttons, ['Home', 'Settings', 'Continue'], 'Margin Call button order');
  assert.ok(pause.sizes.every(size => size.width === homeButton.width && size.height === homeButton.height), 'Pause buttons match home dimensions');
  assert.ok(pause.radii.length === 4 && pause.radii.every(radius => radius === homeStyle.radius), 'Pause panel and buttons match Home corner radius');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.game-result-actions')).gap"), homeStyle.gap, 'Pause gap matches Home');
  for (const [width, height, touch] of [[1440, 900, false], [844, 390, true], [667, 375, true]]) {
    await call('Emulation.setTouchEmulationEnabled', { enabled: touch });
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: touch });
    await settle();
    for (const theme of ['light', 'dark']) {
      await evaluate(`document.documentElement.dataset.theme = '${theme}'`);
      const actions = await evaluate(`(() => {
        const buttons = [...document.querySelectorAll('.game-result-actions > button')];
        const rects = buttons.map(button => button.getBoundingClientRect());
        return {sizes:rects.map(r => ({width:r.width,height:r.height})),
          shadows:buttons.map(button => getComputedStyle(button).boxShadow),
          gaps:rects.slice(1).map((r,i) => r.top-rects[i].bottom)};
      })()`);
      const expectedWidth = touch ? Math.min(width*0.34,320) : desktopHomeButton.width;
      const expectedHeight = touch ? Math.max(28,Math.min(height*0.09,48)) : desktopHomeButton.height;
      const expectedGap = touch ? Math.max(3,Math.min(height/100,6)) : 4;
      assert.ok(actions.sizes.every(r => Math.abs(r.width-expectedWidth)<0.1 && Math.abs(r.height-expectedHeight)<0.1), 'Margin Call dimensions match Home');
      assert.ok(actions.gaps.every(gap => Math.abs(gap-expectedGap)<0.1), 'Margin Call actual gaps match Home');
      assert.ok(actions.shadows.every(shadow => shadow === 'none'), 'Margin Call buttons have no shadows');
      console.log(`PASS Margin Call ${width}x${height} ${theme}: button gaps ${actions.gaps.join(' / ')}px`);
    }
  }
  for (const theme of ['light', 'dark']) {
    await evaluate(`document.documentElement.dataset.theme = '${theme}'`);
    await checkHover(['.margin-call-home', '.margin-call-settings'], theme);
  }
  await evaluate("document.querySelector('.margin-call-settings').click()");
  await settle();
  assert.ok(await evaluate("!!document.querySelector('#settings-volume')"), 'Pause Settings opens settings');
  await evaluate("document.querySelector('.site-info-close').click()");
  await settle();
  assert.equal(await evaluate("document.querySelector('.game-app').dataset.state"), 'paused', 'Closing Settings preserves pause');
  await evaluate("document.querySelector('.margin-call-home').click()");
  await settle();
  assert.equal(await evaluate("document.querySelector('.game-app').dataset.state"), 'menu', 'Home returns to start screen');
  console.log('PASS Margin Call button order and shared corner radius');
  await call('Emulation.setTouchEmulationEnabled', { enabled: false });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: 'http://127.0.0.1:5537/?score=123' });
  await settle();
  await settle();
  await evaluate("document.querySelector('.share-dd-close').click()");
  const liquidated = await evaluate(`Array.from(document.querySelectorAll('.game-result-over .margin-call-action, .game-result-over .share-dd-open, .game-result-over .liquidated-how-to-play')).map(button => {const r=button.getBoundingClientRect(); return {width:r.width,height:r.height};})`);
  assert.ok(liquidated.length === 3 && liquidated.every(size => size.width === desktopHomeButton.width && size.height === desktopHomeButton.height), 'Liquidated buttons match home dimensions');
  for (const [width, height, touch] of [[1440, 900, false], [844, 390, true], [667, 375, true]]) {
    await call('Emulation.setTouchEmulationEnabled', { enabled: touch });
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: touch });
    await settle();
    for (const theme of ['light', 'dark']) {
      await evaluate(`document.documentElement.dataset.theme = '${theme}'`);
      if (!touch) await checkHover(['.liquidated-home'], theme);
      const layout = await evaluate(`(() => {
        const buttons = [...document.querySelectorAll('.game-result-actions > button')];
        const share = getComputedStyle(document.querySelector('.share-dd-open'));
        return { summary: document.querySelector('.game-result-summary').getBoundingClientRect().width,
          backdropFilter: getComputedStyle(document.querySelector('.liquidated-backdrop')).filter,
          backdropFill: getComputedStyle(document.querySelector('.liquidated-backdrop > rect')).fill,
          crane: getComputedStyle(document.querySelector('.liquidated-backdrop > g[stroke]')).stroke,
          birdHead: getComputedStyle(document.querySelector('.liquidated-backdrop g > circle')).fill,
          summaryBackground: getComputedStyle(document.querySelector('.game-result-summary')).backgroundColor,
          shadows: buttons.map(button => getComputedStyle(button).boxShadow),
          labels: buttons.map(button => button.textContent.trim()),
          share: {background:share.backgroundColor, color:share.color},
          gap: parseFloat(getComputedStyle(document.querySelector('.game-result-actions')).gap),
          sizes: buttons.map(button => { const r=button.getBoundingClientRect(); return {width:r.width,height:r.height,radius:getComputedStyle(button).borderRadius}; }),
          gaps: buttons.slice(1).map((button,i) => button.getBoundingClientRect().top-buttons[i].getBoundingClientRect().bottom) };
      })()`);
      const expectedGap = touch ? Math.max(3, Math.min(height / 100, 6)) : 4;
      assert.deepEqual(layout.labels, ['Home', 'Share DD', 'New Game'], 'Liquidated button order');
      assert.ok(await evaluate("(() => {const icon=document.querySelector('.new-game-space-key'), button=icon.closest('button').getBoundingClientRect(), label=icon.previousElementSibling.getBoundingClientRect(), r=icon.getBoundingClientRect();return r.top>=label.bottom && r.bottom<=button.bottom;})()"), 'Space hint sits below New Game inside the button');
      assert.equal(layout.backdropFilter, 'none', 'Liquidated preserves natural bird colors without inversion');
      const paper = theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)';
      const ink = theme === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
      assert.equal(layout.backdropFill, paper, 'Liquidated scene background follows theme');
      assert.equal(layout.crane, ink, 'Crane contrasts with scene background');
      assert.equal(layout.birdHead, ink, 'Bird heads contrast with scene background');
      assert.equal(layout.summaryBackground, ink, 'All-time High panel contrasts with scene');
      assert.ok(layout.shadows.every(shadow => shadow === 'none'), 'Button shadows do not distort the visible gaps');
      assert.deepEqual(layout.share, {background:'rgb(56, 189, 248)', color:'rgb(255, 255, 255)'}, 'Share DD blue background and white text in both themes');
      const expectedHeight = touch ? Math.max(28, Math.min(height * 0.09, 48)) : 44;
      const expectedWidth = touch ? Math.min(width * 0.34, 320) : desktopHomeButton.width;
      assert.ok(layout.sizes.every(size => Math.abs(size.width-expectedWidth)<1 && Math.abs(size.height-expectedHeight)<1 && size.radius===homeStyle.radius), `Liquidated uses shared Home dimensions and corners: ${JSON.stringify({width,height,theme,layout,expectedWidth,expectedHeight,homeStyle})}`);
      assert.ok(Math.abs(layout.summary-expectedWidth)<1, 'All-time High matches button width');
      assert.ok(Math.abs(layout.gap-expectedGap)<0.1 && layout.gaps.every(gap => Math.abs(gap-expectedGap)<1), 'Liquidated actual gaps match Home');
      assert.ok(Math.abs(layout.gaps[0]-layout.gaps[1])<0.1, 'Home/Share and Share/New Game gaps are equal');
      console.log(`PASS Liquidated ${width}x${height} ${theme}: button gaps ${layout.gaps.join(' / ')}px`);
    }
  }
  console.log('PASS Settings persistence and Liquidated button dimensions');
  await evaluate("document.querySelector('.share-dd-open').click()");
  await settle();
  assert.ok(await evaluate("!!document.querySelector('.share-dd-close')"), 'Liquidated Share DD opens sharing');
  await evaluate("document.querySelector('.share-dd-close').click()");
  await settle();
  await evaluate("document.querySelector('.liquidated-home').click()");
  await settle();
  assert.equal(await evaluate("document.querySelector('.game-app').dataset.state"), 'menu', 'Liquidated Home returns to start screen');
  await call('Emulation.setTouchEmulationEnabled', { enabled: true });
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await settle();
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.landscape-required')).display"), 'flex');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('header')).visibility"), 'hidden');
  console.log('PASS portrait shows rotation prompt instead of a separate menu');
} finally {
  for (const request of pending.values()) clearTimeout(request.timer);
  socket?.close();
  if (browser && browser.exitCode === null) {
    const exited = new Promise(resolve => browser.once('exit', resolve));
    browser.kill();
    await exited;
  }
  await server?.close();
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}