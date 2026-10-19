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
  const checkGuideFrame = async () => {
    const frame = await evaluate(`(() => {
      const style = selector => getComputedStyle(document.querySelector(selector));
      const panel=style('.mobile-how-to-panel'), header=style('.mobile-how-to-header');
      const close=style('.mobile-how-to-close'), title=style('#mobile-guide-title');
      const grid=style('.how-to-dialog-content > .mechanics-guide');
      const cards=[...document.querySelectorAll('.how-to-dialog-content > .mechanics-guide > div')];
      for (const visual of document.querySelectorAll('.mobile-how-to-panel .mechanics-guide-visuals')) {
        if (Math.abs(visual.getBoundingClientRect().width-100)>0.1) throw new Error('Guide image columns must be 100px wide');
        for (const canvas of visual.querySelectorAll('canvas')) {
          const r=canvas.getBoundingClientRect();
          if (Math.abs(r.width-84)>0.1 || Math.abs(r.height-84)>0.1) throw new Error('Guide previews must be 84px square');
        }
      }
      for (const card of cards) {
        if (card.scrollWidth>card.clientWidth+1) throw new Error('Larger guide images must not cause horizontal card overflow');
        const text=card.querySelector('.mechanics-guide-description');
        if (text.scrollWidth>text.clientWidth+1) throw new Error('Guide descriptions must still fit beside enlarged images');
      }
      const p=document.querySelector('.mobile-how-to-panel').getBoundingClientRect();
      const x=document.querySelector('.mobile-how-to-close').getBoundingClientRect();
      const desktop=matchMedia('(pointer: fine)').matches;
      const expectedColor=getComputedStyle(document.querySelector('.game-app')).getPropertyValue('--bg').trim();
      const probe=document.createElement('span'); probe.style.color=expectedColor; document.body.append(probe);
      const secondary=getComputedStyle(probe).color; probe.remove();
      if (!desktop && panel.borderTopColor!==secondary) throw new Error('Guide lines must use the secondary theme color');
      if (desktop && (['Top','Right','Bottom','Left'].some(side=>panel['border'+side+'Width']!=='0px')
        || panel.borderRadius!=='0px' || style('.how-to-dialog-hero').borderRadius!=='0px')) throw new Error('Desktop guide must be frameless with square corners');
      if (Math.abs(p.right-x.right-2)>0.1 || Math.abs(x.top-p.top-2)>0.1) throw new Error('Guide X must have 2px top/right outer insets');
      for (const selector of ['.mobile-how-to-header', '.how-to-dialog-hero', '.mechanics-guide > div']) {
        const divider=getComputedStyle(document.querySelector('.mobile-how-to-panel '+selector));
        if (divider.borderBottomWidth !== '0px' && divider.borderBottomColor !== secondary) throw new Error('Guide dividers must use the secondary theme color');
        if (divider.borderRightWidth !== '0px' && divider.borderRightColor !== secondary) throw new Error('Guide vertical dividers must use the secondary theme color');
      }
      return {frame:panel.borderTopWidth, gap:panel.gap, padding:panel.padding,
        header:header.borderTopWidth, headerGap:header.marginBottom, divider:header.borderBottomWidth,
        close:close.borderTopWidth, title:title.borderTopWidth, gridGap:grid.gap,
        cards:cards.every(card=>getComputedStyle(card).borderRadius==='0px'),
        rowDivider:getComputedStyle(cards[0]).borderBottomWidth};
    })()`);
    const desktop = await evaluate("matchMedia('(pointer: fine)').matches");
    assert.deepEqual(frame, {frame:desktop?'0px':'1px',gap:'0px',padding:'0px',header:'0px',headerGap:'0px',divider:'1px',close:'0px',title:'0px',gridGap:'0px',cards:true,rowDivider:'1px'}, 'How to Play uses contiguous divided sections and no desktop outer frame');
  };
  const checkInfoCard = async selector => {
    const layout = await evaluate(`(() => {
      const panel=document.querySelector('.site-info-dialog'), p=panel.getBoundingClientRect();
      const target=document.querySelector('${selector}').getBoundingClientRect();
      const title=panel.querySelector('.site-info-title').getBoundingClientRect();
      const close=panel.querySelector('.site-info-close').getBoundingClientRect();
      const overlay=getComputedStyle(panel.parentElement);
      if(matchMedia('(pointer: coarse)').matches) {
        const header=document.querySelector('header').getBoundingClientRect();
        const footer=document.querySelector('.site-footer').getBoundingClientRect();
        const bottom=footer.height>0?footer.top:document.querySelector('.game-app').getBoundingClientRect().bottom;
        if(Math.abs(p.top-header.bottom)>1 || Math.abs(p.bottom-bottom)>1 || Math.abs(p.width-innerWidth)>1) throw new Error('Mobile information fills all space between header and footer');
        const fullscreen=document.querySelector('.desktop-fullscreen-control').getBoundingClientRect();
        if(Math.abs(close.right-fullscreen.right)>0.1 || close.width!==fullscreen.width) throw new Error('Mobile information X must align below Fullscreen');
      }
      return {covers:p.left<=target.left+1 && p.right>=target.right-1 && p.top<=target.top+1 && p.bottom>=target.bottom-1,
        headerAligned:Math.abs(title.y+title.height/2-close.y-close.height/2)<1,
        transparent:overlay.backgroundColor==='rgba(0, 0, 0, 0)',
        closeReachable:panel.querySelector('.site-info-close').contains(document.elementFromPoint(close.x+close.width/2,close.y+close.height/2))};
    })()`);
    assert.deepEqual(layout, {covers:true,headerAligned:true,transparent:true,closeReachable:true}, `Information card overlays ${selector}`);
  };
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
  const fallingFaces = await evaluate(`(async () => {
    const { drawFallingCharacter, drawCharacterHat, drawBriefcase } = await import('/src/assetRenderer.ts');
    for (const dark of [false, true]) {
      const canvas = document.createElement('canvas'); canvas.width = 120; canvas.height = 120;
      const ctx = canvas.getContext('2d'); ctx.translate(60, 60);
      drawBriefcase(ctx, dark);
      const clasp = [...ctx.getImageData(60, 67, 1, 1).data];
      const expected = dark ? 0 : 255;
      if (!clasp.every((value, index) => value === (index === 3 ? 255 : expected))) {
        throw new Error('Briefcase clasp must be black on white and white on black');
      }
      ctx.resetTransform(); ctx.clearRect(0, 0, 120, 120);
      ctx.translate(60, 60); ctx.scale(-0.65, 0.65);
      drawCharacterHat(ctx, false, false, dark);
      // Bird scalp is 6 units above the accessory origin; the brim must overlap it.
      if (ctx.getImageData(60, 54, 1, 1).data[3] < 128 || ctx.getImageData(65, 60, 1, 1).data[3] !== 0) {
        throw new Error('Bird hat must sit on the scalp without covering the eye');
      }
    }
    const flight = frame => {
      const ctx = document.createElement('canvas').getContext('2d'), translations = [];
      const translate = ctx.translate.bind(ctx);
      ctx.translate = (x, y) => { translations.push({x,y}); translate(x,y); };
      drawFallingCharacter(ctx, frame, false, false, false, true);
      return translations.filter(point => point.y < -25);
    };
    const start = flight(0), later = flight(10);
    if (!(start.length === 2 && later.length === 2 && later[0].x < start[0].x
      && later[1].x > start[1].x && later.every((point,i) => point.y < start[i].y))) {
      throw new Error('Hat and briefcase must fly upward on opposite sides of the falling hero');
    }
    for (const dark of [false, true]) {
      const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 160;
      const ctx = canvas.getContext('2d'); ctx.translate(80, 100); ctx.scale(3, 3);
      drawCharacterHat(ctx, false, true, dark);
      const pixel = (x, y) => [...ctx.getImageData(x, y, 1, 1).data];
      for (const y of [49, 55, 64, 73, 79, 85]) {
        const occupied = Array.from({ length: 160 }, (_, x) => x).filter(x => pixel(x, y)[3] > 128);
        if (!occupied.length || Math.abs(occupied[0] + occupied.at(-1) - 159) > 1) {
          throw new Error('Frontal falling hat must have a centered crown and brim in both themes');
        }
      }
      if (pixel(80, 85)[3] === 0 || pixel(80, 95)[3] !== 0) {
        throw new Error('Frontal brim must sit on the forehead without covering the eyes');
      }
    }
    const results = [];
    for (const dark of [false, true]) for (const hat of [false, true]) for (const frame of [0, 10, 20, 30]) {
      const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 160;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = dark ? '#000000' : '#ffffff'; ctx.fillRect(0, 0, 160, 160);
      ctx.translate(80, 140); ctx.scale(2, 2);
      drawFallingCharacter(ctx, frame, false, false, dark, hat);
      const pixel = (x, y) => [...ctx.getImageData(x, y, 1, 1).data];
      results.push({ dark, hat, frame, eyes: [pixel(73, 37), pixel(86, 37)], scalp: pixel(80, 23), waist: pixel(102, 84) });
    }
    return results;
  })()`);
  for (const pose of fallingFaces) {
    for (const eye of pose.eyes) assert.ok(eye[0] < 70 && eye[1] < 70 && eye[2] < 80 && eye[3] === 255,
      `Both falling eyes are visible: ${JSON.stringify(pose)}`);
    assert.deepEqual(pose.waist.slice(0, 3), pose.dark ? [0, 0, 0] : [255, 255, 255], 'Human falling suit has a tapered waist');
    assert.deepEqual(pose.scalp.slice(0, 3), [254, 215, 170], 'Falling hero is bald while the hat flies away');
  }
  console.log('PASS falling human eyes and tapered suit in both themes, with/without hat and both hand poses');
  await evaluate(`(async () => {
    const { drawAnimalCharacter } = await import('/src/animalRenderer.ts');
    const { drawSwanAsset } = await import('/src/assetRenderer.ts');
    for (const dark of [false, true]) for (const mount of ['bear', 'bull']) {
      const canvas=document.createElement('canvas'); canvas.width=240; canvas.height=240;
      const ctx=canvas.getContext('2d'); ctx.translate(120,160);
      const legs=[], curves=[], ellipses=[]; let leg;
      const move=ctx.moveTo.bind(ctx), line=ctx.lineTo.bind(ctx), curve=ctx.quadraticCurveTo.bind(ctx), ellipse=ctx.ellipse.bind(ctx);
      ctx.moveTo=(x,y)=>{leg=y===-26 ? [[x,y]] : null; if(leg) legs.push(leg); move(x,y);};
      ctx.lineTo=(x,y)=>{if(leg) leg.push([x,y]); line(x,y);};
      ctx.quadraticCurveTo=(...args)=>{curves.push(args);curve(...args);};
      ctx.ellipse=(...args)=>{ellipses.push(args);ellipse(...args);};
      drawAnimalCharacter(ctx,{type:mount==='bear'?'bull':'bear',mount,phase:0.8,attackTimer:0},false,false,dark,false,false,false,true);
      if(legs.length!==4) throw new Error('Mount preview must have four legs');
      for(let i=0;i<4;i+=2) {
        const profile=points=>points.map(([x,y])=>[Number((x-points[0][0]).toFixed(5)),y]);
        if(JSON.stringify(profile(legs[i]))!==JSON.stringify(profile(legs[i+1]))) throw new Error('Preview hind legs must match front legs');
      }
      const whip=curves.some(args=>JSON.stringify(args)==='[43,-25,36,-14]');
      const stub=ellipses.some(args=>args[0]===30 && args[1]===-31 && args[2]===5 && args[3]===4);
      if(whip!==(mount==='bull') || stub!==(mount==='bear')) throw new Error('Bear must have a short tail; bull retains its long tail');
    }
    for(const phase of [0,0.8,2]) for(const isCharging of [false,true]) {
      const canvas=document.createElement('canvas');canvas.width=120;canvas.height=120;
      const ctx=canvas.getContext('2d');ctx.translate(60,60);
      drawSwanAsset(ctx,{kind:'pigeon',phase,isCharging});
      const pixel=(x,y)=>ctx.getImageData(x+60,y+60,1,1).data[3];
      if(pixel(25,8)<128 || pixel(19,5)<128) throw new Error('Pigeon tail must blend continuously into the body');
    }
  })()`);
  console.log('PASS bear/bull tail anatomy, matching preview leg profiles and seamless pigeon tail');
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
      assert.ok(Math.abs(headerInsets.left-headerInsets.right)<0.1, `Logo matches visible Fullscreen icon inset: ${JSON.stringify(headerInsets)}`);
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
      const homeEdges = await evaluate("(() => {const r=document.querySelector('.landing-menu-panel').getBoundingClientRect(), a=document.querySelector('.game-arena').getBoundingClientRect();return {left:r.left-a.left,right:a.right-r.right,top:r.top-a.top,bottom:a.bottom-r.bottom};})()");
      assert.ok(Object.values(homeEdges).every(gap=>Math.abs(gap)<1), `Home chart has no outer gutters: ${JSON.stringify(homeEdges)}`);
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
      assert.equal(menu.feed.y - menu.header.bottom, 0, 'No gap above Live Feed');
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
        assert.equal(responsive.header, 36, 'Header keeps compact 36px height');
        assert.equal(responsive.footerFont, 10, 'Compact footer keeps readable 10px text');
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
          leftInset: rect.left - chart.left, bottomInset: chart.bottom - rect.bottom,
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
      assert.ok(homeStyle.insideChart && Math.abs(homeStyle.leftInset - homeStyle.logoLeft) < 1 && Math.abs(homeStyle.bottomInset - homeStyle.logoLeft - 8) < 1, 'Donate keeps its left gutter and sits 8px higher');
      assert.ok(await evaluate("(() => {const chart=document.querySelector('.landing-menu-chart'), width=chart.viewBox.baseVal.width, labels=[...chart.querySelectorAll('text')].filter(label=>parseFloat(label.getAttribute('x'))>width-54);return labels.length>0 && labels.every(label=>/^-?[0-9]+$/.test(label.textContent) && Number(label.textContent)%10===0);})()"), 'Home price labels are round multiples of ten');
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
      const chrome = await evaluate(`(() => {
        const fullscreen=document.querySelector('.desktop-fullscreen-control').getBoundingClientRect();
        const close=document.querySelector('.mobile-how-to-close').getBoundingClientRect();
        const header=getComputedStyle(document.querySelector('header'));
        const headerRect=document.querySelector('header').getBoundingClientRect();
        const feed=document.querySelector('.desktop-live-feed-bar').getBoundingClientRect();
        const footerRect=document.querySelector('.site-footer').getBoundingClientRect();
        const feedStyle=getComputedStyle(document.querySelector('.desktop-live-feed-bar'));
        const panel=document.querySelector('.mobile-how-to-panel').getBoundingClientRect();
        const footer=getComputedStyle(document.querySelector('.site-footer'));
        return { fullscreenRight:innerWidth-fullscreen.right, closeRight:innerWidth-close.right,
          fullscreenTop:fullscreen.top-headerRect.top, fullscreenBottom:headerRect.bottom-fullscreen.bottom,
          headerHeight:headerRect.height, feedHeight:feed.height, footerHeight:footerRect.height,
          feedBorder:feedStyle.borderBottomColor, feedBorderWidth:feedStyle.borderBottomWidth,
          closeTop:close.top-panel.top, closeInset:panel.right-close.right,
          above:fullscreen.bottom<=close.top, headerColor:header.borderBottomColor,
          footerColor:footer.borderTopColor, headerWidth:header.borderBottomWidth, footerWidth:footer.borderTopWidth };
      })()`);
      assert.ok(chrome.above, 'Fullscreen remains above the guide');
      assert.equal(chrome.fullscreenTop, 2, 'Fullscreen top gap is 2px');
      assert.equal(chrome.fullscreenBottom, 2, 'Fullscreen bottom gap is 2px, including header border');
      assert.equal(chrome.fullscreenRight, 2, 'Fullscreen right gap is 2px');
      assert.equal(chrome.closeTop, 2);
      assert.equal(chrome.closeInset, 2);
      assert.equal(chrome.fullscreenRight, chrome.closeRight, 'Fullscreen aligns with X including the guide frame');
      assert.equal(chrome.headerHeight, 36);
      assert.equal(chrome.feedHeight, chrome.headerHeight);
      assert.equal(chrome.footerHeight, chrome.headerHeight / 2);
      assert.equal(chrome.headerColor, theme === 'light' ? 'rgb(235, 235, 235)' : 'rgb(37, 48, 68)');
      assert.equal(chrome.footerColor, chrome.headerColor, 'Header/footer use the secondary theme color');
      assert.equal(chrome.feedBorder, chrome.footerColor, 'Live Feed separator matches footer');
      assert.equal(chrome.feedBorderWidth, '1px');
      assert.equal(chrome.headerWidth, '1px');
      assert.equal(chrome.footerWidth, '1px');
      console.log(`PASS chrome ${width}x${height} ${theme}: Fullscreen gaps top=${chrome.fullscreenTop}px bottom=${chrome.fullscreenBottom}px right=${chrome.fullscreenRight}px`);
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
      assert.ok(guide.heroWidth > 0 && Math.abs(guide.heroRight-guide.cardsX)<1, 'Illustration meets cards without a gutter');
      await checkGuideFrame();
      assert.equal(guide.columns.split(' ').length, 2, 'Two guide columns');
      assert.equal(guide.cardBackground, theme === 'dark' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
      assert.equal(guide.headerBackground, guide.cardBackground, 'Header matches cards');
      assert.equal(guide.closeBackground, 'rgba(0, 0, 0, 0)', 'Transparent X');
      assert.ok(guide.closeReachable, 'X is hit-testable');
      await evaluate("document.querySelector('.mobile-how-to-close').click()");
      await evaluate("document.querySelector('.site-footer nav button').click()");
      await settle();
      await checkInfoCard('.landing-menu-actions');
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
  await call('Runtime.evaluate', { expression: "document.querySelector('.landing-menu-actions > button:last-child').click()", userGesture: true });
  await settle();
  const playing = await evaluate(`new Promise(resolve => setTimeout(() => {
    const result = {
      feed: getComputedStyle(document.querySelector('.desktop-live-feed-bar')).display,
      footer: getComputedStyle(document.querySelector('.site-footer')).display,
      liveFeed: document.querySelector('.game-app').dataset.liveFeed,
      hudInset: parseFloat(document.querySelector('.game-stage').style.getPropertyValue('--game-hud-inset')),
      hudTop: parseFloat(document.querySelector('.game-stage').style.getPropertyValue('--game-hud-top-inset')),
      iconInset: parseFloat(getComputedStyle(document.querySelector('.game-app')).getPropertyValue('--content-edge-inset')),
      joystickLeft: document.querySelector('.mobile-joystick').getBoundingClientRect().left,
      joystickBottom: document.querySelector('.game-stage').getBoundingClientRect().bottom-document.querySelector('.mobile-joystick').getBoundingClientRect().bottom,
    };
    document.querySelector('.header-pause-control').click();
    resolve(result);
  }, 50))`);
  assert.equal(playing.feed, 'none', 'Mobile gameplay hides feed');
  assert.equal(playing.footer, 'none', 'Mobile gameplay hides footer');
  assert.equal(playing.liveFeed, 'false', 'Canvas feed disabled during mobile gameplay');
  assert.ok(Math.abs(playing.hudInset-playing.iconInset)<0.1 && Math.abs(playing.joystickLeft-playing.hudInset)<0.1, 'Pips and joystick match visible Fullscreen icon inset: '+JSON.stringify(playing));
  assert.ok(Math.abs(playing.hudTop-playing.hudInset)<0.1 && Math.abs(playing.joystickBottom-playing.hudInset)<0.1, 'Pips top and joystick bottom use the same edge inset');
  await evaluate('document.exitFullscreen()');
  await settle();
  assert.notEqual(await evaluate("getComputedStyle(document.querySelector('.site-footer')).display"), 'none', 'Pause restores footer');
  assert.equal(await evaluate("document.querySelector('.game-app').dataset.liveFeed"), 'true', 'Pause restores enabled feed');
  assert.ok(await evaluate("!!document.querySelector('.header-pause-control[aria-label=\"Resume game\"] .lucide-play') && !document.querySelector('.header-pause-control .lucide-pause')"), 'Paused game shows Play instead of Pause');
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
  await evaluate("document.querySelector('.mobile-browser-fallback')?.click()");
  await settle();
  await checkInfoCard('.game-result');
  await evaluate("document.querySelector('.site-info-close').click()");
  await settle();
  assert.equal(await evaluate("document.querySelector('.game-app').dataset.state"), 'paused', 'Closing Settings preserves pause');
  await evaluate("document.querySelector('.margin-call-settings').click()");
  await settle();
  await evaluate("document.querySelector('.header-pause-control').click()");
  await settle();
  assert.equal(await evaluate("document.querySelector('.game-app').dataset.state"), 'play', 'Header Play resumes behind information card');
  assert.ok(await evaluate("!!document.querySelector('.header-pause-control[aria-label=\"Pause game\"] .lucide-pause') && !document.querySelector('.header-pause-control .lucide-play')"), 'Resumed game shows Pause instead of Play');
  assert.equal(await evaluate("!!document.querySelector('.site-info-dialog')"), false, 'Resuming dismisses information card');
  await evaluate("document.querySelector('.header-pause-control').click()");
  await settle();
  await evaluate("document.querySelector('.margin-call-home').click()");
  await settle();
  assert.equal(await evaluate("document.querySelector('.game-app').dataset.state"), 'menu', 'Home returns to start screen');
  console.log('PASS Margin Call button order and shared corner radius');
  await call('Emulation.setTouchEmulationEnabled', { enabled: false });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: 'http://127.0.0.1:5537/?score=123' });
  await settle();
  await settle();
  for (const [width, height, touch] of [[1440, 900, false], [844, 390, true], [667, 375, true], [320, 568, true]]) {
    await call('Emulation.setTouchEmulationEnabled', { enabled: touch });
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: touch });
    for (const theme of ['light', 'dark']) {
      await evaluate(`if (document.documentElement.dataset.theme !== '${theme}') window.dispatchEvent(new KeyboardEvent('keydown', {key:'n', bubbles:true}));`);
      await evaluate('document.activeElement?.blur()');
      await settle();
      await evaluate(`(() => {
        const panel=document.querySelector('.share-dd-dialog'), p=panel.getBoundingClientRect();
        const image=document.querySelector('.share-dd-image').getBoundingClientRect();
        const actions=document.querySelector('.share-dd-actions').getBoundingClientRect();
        const full=document.querySelector('.desktop-fullscreen-control');
        const style=getComputedStyle(full);
        const f={width:parseFloat(style.width),height:parseFloat(style.height)};
        if(getComputedStyle(panel).backgroundColor!=='${theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)'}') throw new Error('Share DD must use the information window theme');
        if(actions.right>image.left || actions.bottom>p.bottom || Math.abs(actions.bottom-(p.bottom-13))>1) throw new Error('Share buttons must sit bottom-left outside the image');
        for(const button of document.querySelectorAll('.share-dd-close, .share-dd-actions > button')) {
          const r=button.getBoundingClientRect(), s=getComputedStyle(button);
          if(r.width!==f.width || r.height!==f.height || s.borderRadius!==style.borderRadius) throw new Error('Share buttons must match Fullscreen dimensions');
          if(button.matches('.share-dd-copy')) {
            if(s.backgroundColor!=='rgb(8, 121, 92)') throw new Error('Share must stay green');
          } else if(s.backgroundColor!==style.backgroundColor || s.color!==style.color || s.borderTopColor!==style.borderTopColor) throw new Error('Share controls must match Fullscreen colors: '+JSON.stringify({button:button.className,actual:[s.backgroundColor,s.color,s.borderTopColor],expected:[style.backgroundColor,style.color,style.borderTopColor]}));
          if(r.left<p.left || r.right>p.right || r.top<p.top || r.bottom>p.bottom) throw new Error('Share controls must fit the window');
        }
        const canvas=document.querySelector('.share-dd-canvas');
        if(canvas.width!==1448 || canvas.height!==1086 || getComputedStyle(canvas).objectFit!=='contain') throw new Error('Share artwork must keep its original proportions');
      })()`);
      console.log('PASS themed Share DD, Fullscreen controls and external artwork actions '+width+'x'+height+' '+theme);
    }
  }
  await call('Emulation.setTouchEmulationEnabled', { enabled: false });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await settle();
  for (const section of ['About', 'Privacy', 'Disclaimer', 'Preferences']) {
    await evaluate(`[...document.querySelectorAll('.site-footer nav button')].find(b=>b.textContent.trim()==='${section}').click()`);
    await settle();
    await checkInfoCard('.share-dd-dialog');
    await evaluate("document.querySelector('.site-info-close').click()");
    await settle();
    assert.ok(await evaluate("!!document.querySelector('.share-dd-dialog')"), 'Closing information preserves Share DD');
  }
  await evaluate("document.querySelector('.share-dd-close').click()");
  const liquidated = await evaluate(`Array.from(document.querySelectorAll('.game-result-over .margin-call-action, .game-result-over .share-dd-open, .game-result-over .liquidated-how-to-play')).map(button => {const r=button.getBoundingClientRect(); return {width:r.width,height:r.height};})`);
  assert.ok(liquidated.length === 3 && liquidated.every(size => size.width === desktopHomeButton.width && size.height === desktopHomeButton.height), 'Liquidated buttons match home dimensions');
  for (const [width, height, touch] of [[1440, 900, false], [844, 390, true], [667, 375, true]]) {
    await call('Emulation.setTouchEmulationEnabled', { enabled: touch });
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: touch });
    await settle();
    for (const theme of ['light', 'dark']) {
      await evaluate(`document.documentElement.dataset.theme = '${theme}'`);
      await settle();
      if (!touch) await checkHover(['.liquidated-home'], theme);
      const layout = await evaluate(`(() => {
        const buttons = [...document.querySelectorAll('.game-result-actions > button')];
        const share = getComputedStyle(document.querySelector('.share-dd-open'));
        return { summary: document.querySelector('.game-result-summary').getBoundingClientRect().width,
          backdropFilter: getComputedStyle(document.querySelector('.liquidated-backdrop')).filter,
          backdropFill: getComputedStyle(document.querySelector('.liquidated-backdrop > rect')).fill,
          crane: getComputedStyle(document.querySelector('.liquidated-backdrop > g[stroke]')).stroke,
          birdHead: getComputedStyle(document.querySelector('.liquidated-backdrop g > circle')).fill,
          birdAccessories: ['.liquidated-bird-hat', '.liquidated-bird-briefcase'].map(selector => {
            const item = document.querySelector(selector);
            return {count: document.querySelectorAll(selector).length, bird: item.parentElement.dataset.liquidatedBird,
              fill: getComputedStyle(item).fill, width: item.getBoundingClientRect().width,
              image: item.querySelector('image')?.getAttribute('href')?.startsWith('data:image/png')};
          }),
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
      assert.ok(await evaluate("(() => {const icon=document.querySelector('.new-game-space-key'), button=icon.closest('button').getBoundingClientRect(), label=icon.previousElementSibling.getBoundingClientRect(), r=icon.getBoundingClientRect();return r.width===64 && r.bottom<=button.bottom && Math.abs(label.top+label.height/2-button.top-button.height/2)<1;})()"), 'Wide Space hint leaves New Game text vertically centered');
      assert.equal(layout.backdropFilter, 'none', 'Liquidated preserves natural bird colors without inversion');
      const paper = theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)';
      const ink = theme === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
      assert.equal(layout.backdropFill, paper, 'Liquidated scene background follows theme');
      assert.equal(layout.crane, ink, 'Crane contrasts with scene background');
      assert.equal(layout.birdHead, ink, 'Bird heads contrast with scene background');
      assert.deepEqual(layout.birdAccessories.map(item => item.bird), ['1', '3'], 'First bird wears the hat; third holds the briefcase');
      assert.ok(layout.birdAccessories.every(item => item.count === 1 && item.fill === ink && item.width > 0 && item.image), 'Bird accessories use actual game renderers, black in Day and white in Night');
      assert.equal(layout.summaryBackground, ink, 'All-time High panel contrasts with scene');
      await evaluate("document.querySelector('.site-footer nav button').click()");
      await settle();
      await checkInfoCard('.game-result');
      await evaluate("document.querySelector('.site-info-close').click()");
      await evaluate("document.querySelector('.share-dd-open').click()");
      await settle();
      for (const section of ['About', 'Privacy', 'Disclaimer', 'Preferences']) {
        await evaluate(`[...document.querySelectorAll('.site-footer nav button')].find(b=>b.textContent.trim()==='${section}').click()`);
        await settle();
        await checkInfoCard('.share-dd-dialog');
        await evaluate("document.querySelector('.site-info-close').click()");
        await settle();
      }
      await evaluate("document.querySelector('.share-dd-close').click()");
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
  for (const [width, height] of [[320, 568], [390, 844], [430, 932]]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
    await settle();
    for (const theme of ['light', 'dark']) {
      await evaluate(`document.documentElement.dataset.theme='${theme}'`);
      await settle();
      const portrait = await evaluate(`(() => {
        const chart=document.querySelector('.landing-menu-chart'), r=chart.getBoundingClientRect();
        const header=document.querySelector('header').getBoundingClientRect();
        const feed=document.querySelector('.desktop-live-feed-bar').getBoundingClientRect();
        const footer=document.querySelector('.site-footer').getBoundingClientRect();
        const fullscreen=document.querySelector('.desktop-fullscreen-control').getBoundingClientRect();
        if (header.height!==36 || feed.height!==36 || footer.height!==18 || feed.top!==header.bottom
          || (fullscreen.width>0 && (fullscreen.top-header.top!==2 || header.bottom-fullscreen.bottom!==2 || innerWidth-fullscreen.right!==2))) {
          throw new Error('Portrait chrome dimensions: '+JSON.stringify({header:header.height,feed:feed.height,footer:footer.height,gap:feed.top-header.bottom,top:fullscreen.top-header.top,bottom:header.bottom-fullscreen.bottom,right:innerWidth-fullscreen.right}));
        }
        const menu=document.querySelector('.landing-menu-actions').getBoundingClientRect();
        const coffee=document.querySelector('.home-coffee-link').getBoundingClientRect();
        const overlaps=(a,b)=>a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top;
        const assets=[...chart.querySelectorAll('foreignObject')].map(el=>el.getBoundingClientRect());
        const candles=[...chart.querySelectorAll('g[clip-path] > g')];
        return {layout:chart.dataset.layout, width:r.width, height:r.height, viewWidth:chart.viewBox.baseVal.width,
          count:assets.length, assetsFit:assets.every(a=>a.left>=r.left && a.right<=r.right-42 && a.top>=r.top && a.bottom<=r.bottom-24),
          clear:assets.every(a=>!overlaps(a,menu) && !overlaps(a,coffee)),
          candleWidth:candles[0].querySelector('rect').getAttribute('width'),
          plotWidth:parseFloat(chart.querySelector('#landing-chart-plot rect').getAttribute('width')),
          priceLabels:[...chart.querySelectorAll('text')].filter(label=>/^[0-9]+[.][0-9]{2}$/.test(label.textContent)).length,
          lastCandleX:parseFloat(candles.at(-1).querySelector('path').getAttribute('d').match(/M([\\d.]+)/)[1])-r.width,
          overflow:document.documentElement.scrollWidth>innerWidth };
      })()`);
      assert.equal(portrait.layout, 'portrait');
      assert.ok(portrait.height>portrait.width && Math.abs(portrait.width-portrait.viewWidth)<1, 'Portrait chart uses native vertical dimensions');
      assert.equal(portrait.count, 0, 'Portrait Home chart has no models');
      assert.ok(await evaluate("(() => {const hero=document.querySelector('.landing-menu-actions .menu-celebration').getBoundingClientRect(), button=document.querySelector('.landing-menu-guide-button').getBoundingClientRect();return hero.width>0 && hero.bottom<=button.top+1;})()"), 'Portrait keeps the hero above How to Play');
      assert.ok(await evaluate("(() => {const button=document.querySelector('.desktop-fullscreen-control'),r=button.getBoundingClientRect();return r.width===32 && r.height===32 && button.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})()"), 'Portrait Fullscreen is visible and reachable');
      assert.equal(portrait.candleWidth, '3.6');
      assert.equal(portrait.priceLabels, 0, 'Portrait Home has no price labels');
      assert.ok(await evaluate("(() => {const chart=document.querySelector('.landing-menu-chart'),label=[...chart.querySelectorAll('text')].find(label=>label.textContent==='04:20');return !!label && Math.abs(parseFloat(label.getAttribute('x'))-chart.viewBox.baseVal.width/2)<0.1;})()"), 'Portrait time axis centers on 04:20');
      assert.ok(Math.abs(portrait.plotWidth-portrait.viewWidth)<1, 'Portrait plot extends edge to edge without a price column');
      assert.ok(portrait.lastCandleX<0 && portrait.lastCandleX>-12, 'Candles fill the full portrait plot');
      assert.equal(portrait.overflow, false);
      console.log(`PASS portrait chart ${width}x${height} ${theme}: ${portrait.count} decorations, no overlap`);
    }
  }
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await settle();
  assert.equal(await evaluate("!!document.querySelector('.landscape-required')"), false, 'No fullscreen entry popup');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('header')).visibility"), 'visible');
  assert.ok(await evaluate("(() => {const panel=document.querySelector('.landing-menu-panel').getBoundingClientRect(), button=document.querySelector('.landing-menu-guide-button'), r=button.getBoundingClientRect();return panel.height>300 && r.left>=0 && r.right<=innerWidth && button.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})()"), 'Portrait Home fills available space with reachable actions');
  for (const theme of ['light', 'dark']) {
    await evaluate(`document.documentElement.dataset.theme='${theme}'`);
    await evaluate("document.querySelector('.landing-menu-guide-button').click()");
    await settle();
    assert.ok(await evaluate("(() => {const panel=document.querySelector('.mobile-how-to-panel').getBoundingClientRect(), cards=document.querySelector('.how-to-dialog-content').getBoundingClientRect();return panel.left===0 && panel.right<=innerWidth && cards.height>0 && panel.bottom<=innerHeight;})()"), 'Portrait guide fills width and scrolls within viewport');
    await checkGuideFrame();
    await evaluate("document.querySelector('.mobile-how-to-close').click()");
    for (const section of ['Settings', 'About', 'Privacy', 'Disclaimer', 'Preferences']) {
      await evaluate(section === 'Settings' ? "document.querySelector('.landing-menu-settings-button').click()" : `[...document.querySelectorAll('.site-footer nav button')].find(b=>b.textContent.trim()==='${section}').click()`);
      await settle();
      assert.ok(await evaluate("(() => {const panel=document.querySelector('.site-info-dialog'), r=panel.getBoundingClientRect(), close=panel.querySelector('.site-info-close'), c=close.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth+1 && r.bottom<=innerHeight+1 && close.contains(document.elementFromPoint(c.x+c.width/2,c.y+c.height/2));})()"), `${section} fits portrait with reachable close`);
      await checkInfoCard('.landing-menu-actions');
      await evaluate("document.querySelector('.site-info-close').click()");
    }
  }
  console.log('PASS portrait Home, How to Play and all information windows in both themes');
  await call('Runtime.evaluate', { expression: "document.querySelector('.desktop-fullscreen-control').click()", userGesture: true });
  await settle();
  assert.ok(await evaluate("document.fullscreenElement===document.querySelector('.game-app')"), 'Portrait Fullscreen enters fullscreen');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.site-footer')).display"), 'none', 'Mobile Fullscreen hides footer');
  await evaluate("document.querySelector('.landing-menu-settings-button').click()");
  await settle();
  await checkInfoCard('.landing-menu-actions');
  await evaluate("document.querySelector('.site-info-close').click(); document.querySelector('.desktop-fullscreen-control').click()");
  await settle();
  assert.equal(await evaluate('!!document.fullscreenElement'), false, 'Fullscreen control exits fullscreen');
  console.log('PASS portrait Fullscreen toggle, hidden footer and fullscreen information bounds');
  for (const action of ['Start', 'Continue', 'New Game']) {
    await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await settle();
    if (action === 'New Game') {
      await call('Page.navigate', { url: 'http://127.0.0.1:5537/?score=123' });
      await settle();
      await settle();
      await evaluate("document.querySelector('.share-dd-close').click()");
    }
    await evaluate("window.__landscapeLocks=0; Object.defineProperty(screen.orientation,'lock',{configurable:true,value:async orientation=>{if(orientation!=='landscape') throw new Error('Expected landscape lock'); window.__landscapeLocks++;}})");
    await call('Runtime.evaluate', { expression: `[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='${action}').click()`, userGesture: true });
    await settle();
    assert.ok(await evaluate("document.fullscreenElement===document.querySelector('.game-app')"), action+' enters mobile fullscreen directly');
    assert.notEqual(await evaluate("document.querySelector('.game-app').dataset.state"), 'play', action+' never starts gameplay in portrait');
    assert.equal(await evaluate('window.__landscapeLocks'), 1, action+' automatically locks landscape');
    assert.equal(await evaluate("!!document.querySelector('.mobile-landscape-prompt')"), false, action+' shows no rotation prompt');
    await call('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
    await settle();
    assert.equal(await evaluate("document.querySelector('.game-app').dataset.state"), 'play', action+' starts only after landscape fullscreen');
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.site-footer')).display"), 'none', action+' keeps footer hidden');
    assert.ok(await evaluate('innerWidth>innerHeight'), action+' uses landscape orientation');
    await evaluate('document.exitFullscreen()');
    await settle();
    assert.equal(await evaluate("document.querySelector('.game-app').dataset.state"), 'paused', 'Exiting mobile fullscreen pauses gameplay');
  }
  console.log('PASS mobile Start, Continue and New Game block portrait and start in landscape fullscreen; exit pauses');
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