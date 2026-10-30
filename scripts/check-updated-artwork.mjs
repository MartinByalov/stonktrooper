import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';

const root = resolve(import.meta.dirname, '..');
const output = join(root, 'visual-reviews', 'updated-artwork');
const profile = await mkdtemp(join(tmpdir(), 'stonktrooper-art-check-'));
const server = await createServer({ root, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
let browser, socket, call;
try {
  await mkdir(output, { recursive: true });
  await server.listen();
  browser = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', 'about:blank',
  ], { stdio: 'ignore' });
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  assert.ok(port);
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data), request = pending.get(message.id);
    if (!request) return;
    clearTimeout(request.timer); pending.delete(message.id);
    message.error ? request.reject(Error(JSON.stringify(message.error))) : request.resolve(message.result);
  };
  call = (method, params = {}) => new Promise((resolve, reject) => {
    const key = ++id;
    pending.set(key, { resolve, reject, timer: setTimeout(() => reject(Error(method)), 30000) });
    socket.send(JSON.stringify({ id: key, method, params }));
  });
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const settle = () => new Promise(resolve => setTimeout(resolve, 700));
  const screenshot = async name => {
    const shot = await call('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(output, name + '.png'), Buffer.from(shot.data, 'base64'));
  };
  await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  await call('Page.navigate', { url: origin });
  for (let i = 0; i < 100; i++) {
    if (await evaluate('!!document.querySelector(".desktop-home-art")')) break;
    await settle();
  }
  await settle();
  const home = await evaluate(`(()=>{
    const image=document.querySelector('.desktop-home-art'), button=document.querySelector('.landing-menu-guide-button');
    const a=image.getBoundingClientRect(), b=button.getBoundingClientRect();
    return {loaded:image.complete&&image.naturalWidth===1254,visible:a.width>0,top:a.top,bottom:a.bottom,buttonTop:b.top,src:image.currentSrc};
  })()`);
  assert.ok(home.loaded && home.visible, JSON.stringify(home));
  assert.ok(home.top >= 0 && home.bottom <= home.buttonTop + 4, JSON.stringify(home));
  assert.ok(home.bottom - home.top <= 150, 'Home artwork stays compact');
  await screenshot('desktop-home');
  for (const [width, height] of [[1280, 720], [1024, 600]]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await settle();
    const layout = await evaluate(`(()=>{
      const art=document.querySelector('.desktop-home-art').getBoundingClientRect();
      const guide=document.querySelector('.landing-menu-guide-button').getBoundingClientRect();
      return {top:art.top,bottom:art.bottom,guideTop:guide.top,width:art.width};
    })()`);
    assert.ok(layout.width > 0 && layout.top >= 0 && layout.bottom <= layout.guideTop + 4, JSON.stringify({ width, height, layout }));
    await screenshot('desktop-home-' + width);
  }
  const homeTransition = await evaluate(`(async()=>{
    document.querySelector('.how-to-mode-selector').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
    await new Promise(r=>requestAnimationFrame(r));
    document.querySelector('.landing-menu-play-button').click();
    await new Promise(r=>setTimeout(r,100));
    document.querySelector('.header-pause-control').click();
    await new Promise(r=>requestAnimationFrame(r));
    document.querySelector('.margin-call-home').click();
    const frames=[];
    for(let i=0;i<5;i++){
      await new Promise(r=>requestAnimationFrame(r));
      const chart=document.querySelector('.landing-menu-chart'),box=chart.getBoundingClientRect();
      const canvas=document.querySelector('.game-stage > canvas');
      frames.push({viewWidth:chart.viewBox.baseVal.width,width:box.width,viewHeight:chart.viewBox.baseVal.height,height:box.height,canvasVisibility:getComputedStyle(canvas).visibility});
    }
    return frames;
  })()`);
  console.log('Home transition frames:', JSON.stringify(homeTransition));
  for (const frame of homeTransition) {
    assert.equal(frame.canvasVisibility, 'hidden', 'No stale gameplay canvas on Home');
    assert.ok(Math.abs(frame.viewWidth - frame.width) < 1 && Math.abs(frame.viewHeight - frame.height) < 1,
      'Home chart is correctly sized from the first frame');
  }
  await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await settle();
  const rotatePlaceholder = await evaluate(`(async()=>{
    const panel=document.querySelector('.rotate-phone-placeholder'),image=panel.querySelector('img');
    await image.decode();
    return {coarse:matchMedia('(pointer:coarse)').matches,display:getComputedStyle(panel).display,
      loaded:image.naturalWidth===941&&image.naturalHeight===1672,fit:getComputedStyle(image).objectFit};
  })()`);
  assert.ok(rotatePlaceholder.coarse && rotatePlaceholder.loaded);
  assert.equal(rotatePlaceholder.display, 'flex');
  assert.equal(rotatePlaceholder.fit, 'contain');
  const portraitHero = await evaluate(`(async()=>{
    const art=document.querySelector('.desktop-home-art');await art.decode();
    const old=document.querySelector('.touch-menu-celebration');
    const a=art.getBoundingClientRect(),button=document.querySelector('.landing-menu-guide-button').getBoundingClientRect();
    return {loaded:art.naturalWidth===1254,display:getComputedStyle(art).display,oldDisplay:getComputedStyle(old).display,
      width:a.width,bottom:a.bottom,buttonTop:button.top};
  })()`);
  assert.ok(portraitHero.loaded && portraitHero.display==='block' && portraitHero.oldDisplay==='none', JSON.stringify(portraitHero));
  assert.ok(portraitHero.width>0 && portraitHero.bottom<=portraitHero.buttonTop+4, JSON.stringify(portraitHero));
  console.log('PASS portrait Home uses replacement artwork:', JSON.stringify(portraitHero));
  await screenshot('rotate-phone-portrait');
  await call('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
  await settle();
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.rotate-phone-placeholder')).display`), 'none');
  for (const [width,height] of [[760,359],[844,390],[667,375]]) {
    await call('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:true});
    for (const theme of ['light','dark']) {
      await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
      const currentTheme=await evaluate(`document.querySelector('.desktop-home-art').currentSrc.includes('-inverted')?'dark':'light'`);
      if(currentTheme!==theme) {
        await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'n',bubbles:true}))`);
      }
      await settle();
      const hero=await evaluate(`(async()=>{
        const image=document.querySelector('.desktop-home-art');await image.decode();
        const art=image.getBoundingClientRect(),button=document.querySelector('.landing-menu-guide-button').getBoundingClientRect();
        return {coarse:matchMedia('(pointer:coarse)').matches,display:getComputedStyle(image).display,oldDisplay:getComputedStyle(document.querySelector('.touch-menu-celebration')).display,src:image.currentSrc,loaded:image.naturalWidth===1254,top:art.top,bottom:art.bottom,width:art.width,buttonTop:button.top};
      })()`);
      assert.ok(hero.coarse&&hero.loaded&&hero.display==='block'&&hero.oldDisplay==='none',JSON.stringify(hero));
      assert.equal(hero.src.includes('-inverted'),theme==='dark');
      assert.ok(hero.width>0&&hero.top>=0&&Math.abs(hero.bottom-hero.buttonTop)<=4,JSON.stringify(hero));
      await screenshot('mobile-landscape-home-'+width+'-'+theme);
      console.log('PASS landscape touch Home artwork:',width,height,theme,JSON.stringify(hero));
    }
  }
  await call('Emulation.setTouchEmulationEnabled', { enabled: false });
  await call('Emulation.setDeviceMetricsOverride', { width: 1024, height: 600, deviceScaleFactor: 1, mobile: false });
  console.log('PASS rotate-phone portrait artwork and landscape dismissal');
  // Isolated component renders avoid editing game state or player storage.
  await call('Page.navigate', { url: origin + '/public/' });
  await settle();
  const result = await evaluate(`(async()=>{
    const react=await import('/node_modules/.vite/deps/react.js');window.React=react.default??react;
    const client=await import('/node_modules/.vite/deps/react-dom_client.js');window.createRoot=(client.default??client).createRoot;
    await import('/src/index.css');
    const {drawShareCard,shareCardBackground,formatShareScore}=await import('/src/shareCard.ts');
    const {MenuHero}=await import('/src/MenuHero.tsx');
    const {MenuCelebration}=await import('/src/MenuCelebration.tsx');
    window.artModules={drawShareCard,shareCardBackground};
    document.body.innerHTML='';
    const load=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error(src));i.src=src;});
    const results=[];
    for(const theme of ['light','dark']){
      const bg=await load(shareCardBackground(theme,'/'));
      const c=document.createElement('canvas');document.body.append(c);c.style.width='450px';
      const ctx=c.getContext('2d'),texts=[],fillText=ctx.fillText.bind(ctx);
      ctx.fillText=(text,x,y,...rest)=>{texts.push({text,x,y,maxWidth:rest[0],color:ctx.fillStyle,font:ctx.font});fillText(text,x,y,...rest);};
      drawShareCard(ctx,1234567,bg,theme);
      const expected=theme==='dark'?[1237,1271]:[1268,1240];
      if(c.width!==expected[0]||c.height!==expected[1])throw Error('Native size mismatch');
      if(texts[1].text!=='1,234,567'||texts[1].y<c.height*.44||texts[1].y>c.height*.50)throw Error('Score not in lid');
      if(texts[1].color!==(theme==='dark'?'#08795c':'#54d3ac'))throw Error('Share score must match Android palette');
      window['card_'+theme]=c.toDataURL('image/png');
      drawShareCard(ctx,Number.MAX_SAFE_INTEGER,bg,theme);
      if(!Number.isFinite(texts.at(-1).maxWidth))throw Error('Invalid long score');
      drawShareCard(ctx,1234567,bg,theme);
      const host=document.createElement('div');host.dataset.theme=theme;document.body.append(host);
      window.createRoot(host).render(window.React.createElement(MenuHero,{theme}));
      const celebration=document.createElement('div');document.body.append(celebration);
      window.createRoot(celebration).render(window.React.createElement(MenuCelebration,{theme}));
      results.push({theme,width:c.width,height:c.height,texts:texts.slice(0,2)});
    }
    if(formatShareScore(-1)!=='0')throw Error('Score formatting regression');
    return results;
  })()`);
  const buttonColors = await evaluate(`(()=>{
    const host=document.createElement('div');host.className='game-app';
    host.innerHTML='<div class="game-result-over"><button class="share-dd-open">Share DD</button></div>';document.body.append(host);
    const colors={};
    for(const theme of ['light','dark']){document.documentElement.dataset.theme=theme;colors[theme]=getComputedStyle(host.querySelector('button')).backgroundColor;}
    host.remove();return colors;
  })()`);
  assert.deepEqual(buttonColors, {light:'rgb(86, 157, 204)',dark:'rgb(56, 189, 248)'});
  const primaryColors = await evaluate(`(()=>{
    const host=document.createElement('div');host.className='game-app';
    host.innerHTML='<div class="landing-menu-actions"><button class="landing-menu-play-button menu-action-button">Start</button></div><div class="game-result game-result-over"><button class="continue-run margin-call-action">New Game</button></div><div class="game-result"><button class="continue-run margin-call-action">Continue</button></div>';
    document.body.append(host);
    const colors={};
    for(const theme of ['light','dark']){
      document.documentElement.dataset.theme=theme;
      colors[theme]=Array.from(host.querySelectorAll('button'),button=>{
        const style=getComputedStyle(button);
        return {label:button.textContent,background:style.backgroundColor,border:style.borderTopColor,color:style.color};
      });
    }
    host.remove();return colors;
  })()`);
  for (const [theme, expected] of [['light', 'rgb(84, 211, 172)'], ['dark', 'rgb(8, 121, 92)']]) {
    for (const button of primaryColors[theme]) {
      assert.equal(button.background, expected, theme + ' ' + button.label);
      assert.equal(button.border, expected, theme + ' ' + button.label + ' border');
      assert.equal(button.color, theme === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)', theme + ' primary text');
    }
  }
  console.log('PASS Android primary action theme colors:', JSON.stringify(primaryColors));
  for (const mobile of [false, true]) {
  await call('Emulation.setDeviceMetricsOverride', {width:mobile?844:1280,height:mobile?390:800,deviceScaleFactor:1,mobile});
  await call('Emulation.setTouchEmulationEnabled', {enabled:mobile});
  const themeDetails = await evaluate(`(()=>{
    const host=document.createElement('div');host.className='game-app';
    host.innerHTML='<h2 class="margin-call-title">Margin Call</h2><div class="game-result game-result-over"><div class="game-result-summary"><h2>LIQUIDATED</h2></div><button class="share-dd-open">Share DD</button><button class="continue-run">New Game</button></div><div class="game-result"><button class="continue-run">Continue</button></div><div class="landing-menu-actions"><button class="landing-menu-play-button">Start</button><div class="how-to-mode-buttons"><button class="how-to-mode-selector" data-mode="hard">Hard Mode</button><button class="how-to-mode-selector" data-mode="easy">Git Gud</button></div></div><div class="share-dd-actions"><button class="share-dd-copy">Share</button></div><span class="settings-label"><svg></svg></span><div class="settings-volume-row"><input type="range"></div><button aria-checked="true"><span class="settings-switch-track"></span></button>';
    document.body.append(host);const result={};
    // Sample final theme values rather than an in-flight background transition.
    host.querySelectorAll('*').forEach(element=>element.style.setProperty('transition','none','important'));
    for(const theme of ['light','dark']){
      document.documentElement.dataset.theme=theme;
      const style=selector=>getComputedStyle(host.querySelector(selector));
      for(const button of host.querySelectorAll('.continue-run,.landing-menu-play-button')){
        const s=getComputedStyle(button),day=theme==='light';
        if(s.color!==(day?'rgb(0, 0, 0)':'rgb(255, 255, 255)')||s.backgroundColor!==(day?'rgb(84, 211, 172)':'rgb(8, 121, 92)'))throw Error('Responsive primary action colors: '+button.textContent);
      }
      result[theme]={margin:style('.margin-call-title').color,loss:style('.game-result-summary h2').color,shareDD:style('.share-dd-open').color,share:style('.share-dd-copy').backgroundColor,shareInk:style('.share-dd-copy').color,hard:style('[data-mode="hard"]').backgroundColor,hardInk:style('[data-mode="hard"]').color,easy:style('[data-mode="easy"]').backgroundColor,easyInk:style('[data-mode="easy"]').color,settings:style('.settings-label svg').color,slider:style('input').accentColor,toggle:style('.settings-switch-track').backgroundColor};
    }
    host.remove();return result;
  })()`);
  for(const theme of ['light','dark']){
    const actual=themeDetails[theme],day=theme==='light';
    const blue=day?'rgb(86, 157, 204)':'rgb(56, 189, 248)';
    const loss=day?'rgb(185, 28, 28)':'rgb(255, 100, 103)';
    const white='rgb(255, 255, 255)',black='rgb(0, 0, 0)';
    assert.deepEqual(actual,{margin:day?'rgb(84, 211, 172)':'rgb(8, 121, 92)',loss,shareDD:day?white:black,share:blue,shareInk:white,hard:loss,hardInk:day?black:white,easy:'rgb(230, 177, 58)',easyInk:day?black:white,settings:blue,slider:blue,toggle:blue},theme+' Android theme details');
  }
  console.log('PASS '+(mobile?'touch/mobile':'desktop')+' Android result, mode and Settings colors:',JSON.stringify(themeDetails));
  }
  await call('Emulation.setTouchEmulationEnabled', {enabled:false});
  await call('Emulation.setDeviceMetricsOverride', {width:1280,height:800,deviceScaleFactor:1,mobile:false});
  await settle();
  assert.ok(await evaluate(`Array.from(document.querySelectorAll('img')).every(i=>i.complete&&i.naturalWidth>0)`), 'All day/night hero assets load');
  assert.ok(await evaluate(`document.querySelector('img[src$="desktop-home-page-inverted.webp"]').naturalWidth===1254`), 'Night desktop artwork loads');
  const guideCheck = await evaluate(`(async()=>{
    const {MechanicsGuide}=await import('/src/MechanicsGuide.tsx');
    const host=document.createElement('div');host.className='game-app';document.body.append(host);
    window.createRoot(host).render(window.React.createElement(MechanicsGuide,{theme:'dark'}));
    await new Promise(r=>setTimeout(r,250));
    const text=host.textContent;
    if(!text.includes('Avoid the gaps and use the highlighted zones for a double jump.'))throw Error('Jump copy');
    if(!text.includes('On mobile, tap the right of the screen to aim and shoot.'))throw Error('Shoot copy');
    if(!text.includes("Good.\\nNow you can't shoot too."))throw Error('Bag Holder line breaks');
    if(!text.includes('Watch your lives!')||!host.querySelector('[aria-label="3 hearts"]')||!text.includes('Difficulty rewards: +1000 / +2000 / +3000 pips'))throw Error('Android Bell description');
    if(/20%|No joystick|The chart keeps|Watch your hearts|35%/.test(text))throw Error('Obsolete guide text');
    const bird=host.querySelector('canvas[aria-label="pigeon game asset"]');
    const before=bird.toDataURL();await new Promise(r=>setTimeout(r,300));
    const changed=before!==bird.toDataURL();
    if(!changed&&!matchMedia('(prefers-reduced-motion: reduce)').matches)throw Error('Bird is not animated');
    const count=host.querySelectorAll('canvas[data-animated="true"]').length;
    if(count!==21)throw Error('Missing animated previews: '+count);
    host.remove();return {animatedPreviews:count,birdChanges:changed};
  })()`);
  for (const [width, height] of [[1920, 1080], [1440, 900], [1024, 600]]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    const layout = await evaluate(`(async()=>{
      const {ShareDD}=await import('/src/ShareDD.tsx');
      document.body.innerHTML='';
      const host=document.createElement('div');host.className='game-app';host.style.cssText='position:relative;width:100vw;height:100vh;container-type:size';document.body.append(host);
      window.createRoot(host).render(window.React.createElement(ShareDD,{score:16889,theme:'dark',onClose:()=>{}}));
      await new Promise(r=>setTimeout(r,700));
      const art=host.querySelector('.share-dd-image').getBoundingClientRect();
      return {width:art.width,height:art.height};
    })()`);
    assert.ok(layout.height > 100 && layout.height <= height * .63, JSON.stringify({ width, height, layout }));
    await screenshot('desktop-share-' + width);
  }
  console.log('PASS guide animations and desktop Share DD:', JSON.stringify(guideCheck));
  const bossHud = await evaluate(`(async()=>{
    const {CandleGame}=await import('/src/CandleGame.tsx');
    const host=document.createElement('div');host.className='game-app';
    host.innerHTML='<header><div class="header-logo-frame" style="width:180px;height:40px;margin-left:24px"></div></header><canvas class="desktop-live-feed" style="width:100%;height:36px"></canvas><div id="boss-hud-test"></div>';
    document.body.append(host);
    const root=window.createRoot(host.querySelector('#boss-hud-test'));
    const encounter={current:null};
    const proto=CanvasRenderingContext2D.prototype, originalText=proto.fillText, originalRect=proto.roundRect, originalFill=proto.fillRect;
    const texts=[],rects=[],fills=[];
    proto.fillRect=function(x,y,w,h){
      if(this.canvas.closest('#boss-hud-test'))fills.push({x,y,w,h,color:this.fillStyle});
      return originalFill.call(this,x,y,w,h);
    };
    proto.fillText=function(text,...args){
      if(this.canvas===host.querySelector('.desktop-live-feed'))texts.push(String(text));
      return originalText.call(this,text,...args);
    };
    proto.roundRect=function(x,y,w,h,...rest){
      if(this.canvas.closest('#boss-hud-test'))rects.push({x,y,w,h,canvasWidth:this.canvas.width});
      return originalRect.call(this,x,y,w,h,...rest);
    };
    const checks=[];
    try {
      for(const theme of ['light','dark']){
        document.documentElement.dataset.theme=theme;
        const props={theme,state:'play',liveFeedEnabled:true,bossEncounter:encounter,onStateChange:()=>{},onScoreUpdate:()=>{},onGameOver:()=>{}};
        encounter.current=null;
        root.render(window.React.createElement(CandleGame,{...props,key:theme,bossRequest:0}));
        await new Promise(r=>setTimeout(r,150));
        root.render(window.React.createElement(CandleGame,{...props,key:theme,bossRequest:1}));
        await new Promise(r=>setTimeout(r,100));
        if(!encounter.current)throw Error('Bell did not spawn boss');
        rects.length=0;texts.length=0;fills.length=0;
        await new Promise(r=>setTimeout(r,100));
        const {bossName}=await import('/src/boxingRules.ts');
        const expectedName=bossName(encounter.current.boss.kind);
        if(!texts.includes(expectedName))throw Error('Boss name missing from header Live Feed');
        if(texts.some(t=>t.includes(': ')))throw Error('News must yield to active boss in header');
        const canvas=host.querySelector('#boss-hud-test canvas'), bounds=canvas.getBoundingClientRect();
        const logo=host.querySelector('.header-logo-frame').getBoundingClientRect();
        const expectedWidth=logo.width/bounds.width*1920, expectedLeft=(logo.left-bounds.left)/bounds.width*1920;
        const tabs=rects.filter(r=>Math.abs(r.w-expectedWidth)<.1);
        const pips=tabs.find(r=>Math.abs(r.x-expectedLeft)<.1);
        const hearts=pips&&tabs.find(r=>Math.abs(r.x-expectedLeft)<.1 && r.y>pips.y+pips.h);
        if(!pips||!hearts)throw Error('HUD alignment mismatch '+JSON.stringify({expectedWidth,expectedLeft,tabs}));
        const divider=fills.find(r=>Math.abs(r.x-pips.x)<.1&&Math.abs(r.w-pips.w)<.1&&Math.abs(r.y-pips.y-pips.h)<.1);
        const expectedColor=theme==='light'?'#ffffff':'#000000';
        if(!divider||divider.color!==expectedColor||Math.abs(divider.h*bounds.height/840-1)>.01)throw Error('Missing theme divider');
        if(Math.abs(hearts.y-divider.y-divider.h)>.1||Math.abs(hearts.h-pips.h)>.1)throw Error('Hearts must sit directly below divider');
        checks.push({theme,bossHeader:expectedName,pipsWidth:pips.w,heartsWidth:hearts.w,left:pips.x,divider:divider.color,dividerCssHeight:1});
      }
    } finally {proto.fillText=originalText;proto.roundRect=originalRect;proto.fillRect=originalFill;root.unmount();host.remove();}
    return checks;
  })()`);
  console.log('PASS desktop boss header Live Feed and stacked HUD with theme divider:', JSON.stringify(bossHud));
  await call('Emulation.setDeviceMetricsOverride', {width:844,height:390,deviceScaleFactor:1,mobile:true});
  await call('Emulation.setTouchEmulationEnabled', {enabled:true});
  const mobileBoss = await evaluate(`(async()=>{
    const {CandleGame}=await import('/src/CandleGame.tsx');
    const {bossName}=await import('/src/boxingRules.ts');
    const host=document.createElement('div');host.className='game-app';
    host.innerHTML='<header><div class="header-logo-frame" style="width:120px;height:30px"></div></header><div class="desktop-live-feed-bar"><canvas class="desktop-live-feed" style="height:30px"></canvas></div><div id="mobile-boss-test"></div>';
    document.body.append(host);const root=window.createRoot(host.querySelector('#mobile-boss-test'));
    const encounter={current:null},texts=[],strips=[],original=CanvasRenderingContext2D.prototype.fillText,originalRoundRect=CanvasRenderingContext2D.prototype.roundRect;
    CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,...args){
      if(this.canvas.closest('#mobile-boss-test')){
        const transform=this.getTransform(),bounds=this.canvas.getBoundingClientRect();
        const a=new DOMPoint(x,y).matrixTransform(transform),b=new DOMPoint(x+w,y).matrixTransform(transform);
        strips.push({left:bounds.left+a.x/this.canvas.width*bounds.width,width:(b.x-a.x)/this.canvas.width*bounds.width});
      }
      return originalRoundRect.call(this,x,y,w,h,...args);
    };
    CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(this.canvas===host.querySelector('.desktop-live-feed'))texts.push(String(text));return original.call(this,text,...args);};
    const results=[];
    try{
      if(!matchMedia('(pointer: coarse)').matches)throw Error('Touch emulation inactive');
      for(const theme of ['light','dark']){
        document.documentElement.dataset.theme=theme;encounter.current=null;
        const props={theme,state:'play',liveFeedEnabled:true,bossEncounter:encounter,onStateChange:()=>{},onScoreUpdate:()=>{},onGameOver:()=>{}};
        root.render(window.React.createElement(CandleGame,{...props,key:theme,bossRequest:0}));await new Promise(r=>setTimeout(r,150));
        root.render(window.React.createElement(CandleGame,{...props,key:theme,bossRequest:1}));await new Promise(r=>setTimeout(r,100));
        if(!encounter.current)throw Error('Mobile Bell did not spawn');
        texts.length=0;await new Promise(r=>setTimeout(r,100));
        const name=bossName(encounter.current.boss.kind);
        if(!texts.includes(name)||texts.some(t=>t.includes(': ')))throw Error('Mobile boss header mismatch');
        const assertLogoStrip=()=>{
          const logo=host.querySelector('.header-logo-frame').getBoundingClientRect();
          if(!strips.some(s=>Math.abs(s.left-logo.left)<.5&&Math.abs(s.width-logo.width)<.5))throw Error('Mobile Pips must match logo CSS edges: '+JSON.stringify({logoLeft:logo.left,logoWidth:logo.width,strips}));
        };
        assertLogoStrip();strips.length=0;
        root.render(window.React.createElement(CandleGame,{...props,key:theme,bossRequest:1,state:'paused'}));await new Promise(r=>setTimeout(r,100));
        assertLogoStrip();
        root.render(window.React.createElement(CandleGame,{...props,key:theme,bossRequest:1,liveFeedEnabled:false}));await new Promise(r=>setTimeout(r,100));
        texts.length=0;await new Promise(r=>setTimeout(r,100));
        if(texts.length)throw Error('Disabled feed still draws boss title');
        results.push({theme,bossHeader:name,disabledFeedSilent:true,logoAlignedPips:true,pausedPipsAligned:true});
      }
    }finally{CanvasRenderingContext2D.prototype.fillText=original;CanvasRenderingContext2D.prototype.roundRect=originalRoundRect;root.unmount();host.remove();}
    return results;
  })()`);
  console.log('PASS touch/mobile boss header and disabled Live Feed:',JSON.stringify(mobileBoss));
  await call('Emulation.setTouchEmulationEnabled', {enabled:false});
  await call('Emulation.setDeviceMetricsOverride', {width:1280,height:800,deviceScaleFactor:1,mobile:false});
  const models = await evaluate(`(async()=>{
    const {drawAnimalCharacter}=await import('/src/animalRenderer.ts');
    const {drawHumanHead,drawApeAsset,drawSwanAsset}=await import('/src/assetRenderer.ts');
    const {drawRunnerLeg,drawSuitDetails,drawSuitCollar,drawFarRunnerArm,drawNearBriefcaseArm}=await import('/src/cosmeticModels.ts');
    const {drawBossEncounter}=await import('/src/bossRenderer.ts');
    const {createBossArena}=await import('/src/boxingRules.ts');
    document.body.innerHTML='';document.body.style.cssText='margin:0';
    const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=600;document.body.append(canvas);
    const ctx=canvas.getContext('2d');
    for(const [row,dark] of [false,true].entries()){
      const y=row*300;ctx.fillStyle=dark?'#000':'#fff';ctx.fillRect(0,y,1000,300);
      const draw=(x,paint)=>{ctx.save();ctx.translate(x,y+180);ctx.scale(1.8,1.8);paint();ctx.restore();};
      draw(65,()=>{
        drawFarRunnerArm(ctx,'suits-classic',dark,.8);
        drawRunnerLeg(ctx,'suits-classic','shoes-classic',dark,.8,false);
        drawRunnerLeg(ctx,'suits-classic','shoes-classic',dark,.8,true);
        drawSuitDetails(ctx,'suits-classic',dark,.8);
        ctx.save();ctx.translate(3,-42);ctx.scale(.8,.8);drawHumanHead(ctx,true,dark);ctx.restore();
        drawSuitCollar(ctx,'suits-classic',dark,.8);
        drawNearBriefcaseArm(ctx,'suits-classic','suitcase-classic',dark,.8);
      });
      for(const [index,type] of ['bear','bull','whale'].entries())draw(210+index*160,()=>drawAnimalCharacter(ctx,{type,phase:.8,attackTimer:0},false,false,dark));
      draw(680,()=>drawApeAsset(ctx,.8));
      draw(780,()=>drawSwanAsset(ctx,{kind:'pigeon',phase:.8,isCharging:false},dark));
      draw(905,()=>{const arena=createBossArena('jerome');arena.boss.x=0;arena.boss.y=0;drawBossEncounter(ctx,arena,dark);});
    }
    window.modelReview=canvas.toDataURL('image/png');
    return {width:canvas.width,height:canvas.height};
  })()`);
  await writeFile(join(output,'android-models-day-night.png'),Buffer.from((await evaluate('window.modelReview')).split(',')[1],'base64'));
  console.log('PASS browser model render gallery:', JSON.stringify(models));
  await settle();
  for (const theme of ['light', 'dark']) {
    const png = await evaluate(`window.card_${theme}`);
    await writeFile(join(output, `share-${theme}.png`), Buffer.from(png.split(',')[1], 'base64'));
  }
  console.log('PASS updated artwork:', JSON.stringify({ home, cards: result }));
} finally {
  if (socket?.readyState === WebSocket.OPEN) await call('Browser.close').catch(() => {});
  socket?.close(); browser?.kill(); await server.close();
  await new Promise(resolve => setTimeout(resolve, 700));
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}