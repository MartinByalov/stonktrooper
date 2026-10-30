import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';

const root = resolve(import.meta.dirname, '..');
const profile = await mkdtemp(join(tmpdir(), 'stonktrooper-touch-boss-'));
let browser, socket, closeBrowser;
const hook = `
  window.__combat = {
    setup(kind) {
      initGame();
      const g=gameRef.current;
      bossEncounter.current=null;
      g.currentState='play'; onStateChange('play');
      g.animals=[]; g.swans=[]; g.pickups=[]; g.cases=[]; g.marketEvents=[];
      for(const key of ['nextWhale','nextPigeon','nextSwan','nextBull','nextBear','nextZone','nextNewsIndex','nextCandleSurprise'])g[key]=Infinity;
      for(const c of g.C){c.hole=false;c.sp=true;c.top=500;c.bot=510;c.o=510;c.c=500;c.h=495;c.l=515;}
      g.p.y=500;g.p.previousY=500;g.p.vy=0;g.p.air=false;g.p.coy=6;g.p.jumps=0;
      g.p.doubleReady=true;g.cx=g.p.x-heroCameraOffset();g.cy=500-H*.62;
      if(kind)spawnBoss(kind);
    },
    step(count=1){for(let i=0;i<count;i++)update();const c=canvasRef.current;draw(c.getContext('2d'));},
    feed(){
      const g=gameRef.current;
      g.tickerScrollX=0;g.tickerQueue=[{news:{source:'REGRESSION',headline:'Bell feed stays visible'},width:0}];
      const texts=[],original=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(text,...args){texts.push(String(text));return original.call(this,text,...args);};
      try{const c=canvasRef.current;draw(c.getContext('2d'));}finally{CanvasRenderingContext2D.prototype.fillText=original;}
      return texts;
    },
    snapshot(){const g=gameRef.current,a=bossEncounter.current;return {state:g.currentState,x:g.p.x,y:g.p.y,held:g.held,buffer:g.p.buf,jumps:g.p.jumps,cases:g.cases.length,score:g.score,activity:g.activityPips,candles:g.C.length,carry:g.p.carry,hat:g.fedoraTimer,coins:g.coins,boss:a?{kind:a.boss.kind,health:a.boss.health,attack:a.boss.attack,behavior:a.boss.behavior,lives:a.player.lives,cases:a.cases.length,external:a.externalPlayer}:null};},
    pickups(){const g=gameRef.current;g.pickups.push({type:'coin',x:g.p.x,y:g.p.y-25,taken:false});},
    equip(){const g=gameRef.current;g.p.carry=200;g.p.shieldKind='diamond';g.fedoraTimer=400;g.fedoraCount=3;},
    spawn(kind){spawnBoss(kind);},
    absorb(){return bossEncounter.current.absorbBossHit();},
    lose(){bossEncounter.current.player.lives=0;},
    win(){bossEncounter.current.boss.health=0;},
    target(){const a=bossEncounter.current;return {x:a.boss.x,y:a.boss.y-35};},
    hit(){const a=bossEncounter.current; a.boss.behavior='roam';a.boss.behaviorTimer=100;a.boss.roamOffset=a.boss.x-a.player.x; a.cases.push({x:a.boss.x-30,y:a.boss.y-35,vx:12,vy:0,life:100});},
  };
`;
const server = await createServer({ root, logLevel: 'error', server: { host: '127.0.0.1', port: 0 }, plugins: [{
  name: 'touch-boss-regression', enforce: 'pre', transform(code, id) {
    if (id.replaceAll('\\','/').split('?')[0].endsWith('/src/App.tsx')) {
      return code.replace('  const liveFeedVisible = liveFeedEnabled;', '  window.__setTheme = setTheme;\n  window.__setLiveFeed = setLiveFeedEnabled;\n  const liveFeedVisible = liveFeedEnabled;');
    }
    if (!id.replaceAll('\\','/').split('?')[0].endsWith('/src/CandleGame.tsx')) return;
    return code.replaceAll('\r\n','\n')
      .replace('      if (disposed) return;', '      if (disposed) return;\n      return; // Regression test controls simulation frames.')
      .replace('  const draw = useCallback', hook+'\n  const draw = useCallback');
  },
}] });
try {
  const { touchAction } = await server.ssrLoadModule('/src/touchInput.ts');
  assert.equal(touchAction(99,100,1000, .05),null);
  assert.equal(touchAction(100,100,1000,.05),'jump');
  assert.equal(touchAction(289,100,1000,.05),'jump');
  assert.equal(touchAction(290,100,1000,.05),'shoot');
  assert.equal(touchAction(1050,100,1000,.05),null);
  const { createBossArena, stepBossArena, bossGlovePose } = await server.ssrLoadModule('/src/boxingRules.ts');
  const { bossAttackBoundary, stepChartBoss } = await server.ssrLoadModule('/src/chartBossRules.ts');
  const { paulTailPose } = await server.ssrLoadModule('/src/paulRules.ts');
  const { chartViewport, chartToScreen, screenToChart } = await server.ssrLoadModule('/src/chartViewport.ts');
  for (const mobile of [false,true]) for (const display of [{width:740,height:360},{width:915,height:412},{width:1440,height:900}]) {
    const view=chartViewport(mobile,1920,840,86,display),plot=1834;
    const playerX=mobile?view.x:250;
    for (const kind of ['jerome','paul','janet']) {
      const a=createBossArena(kind);
      Object.assign(a,{externalPlayer:true,runnerOffset:playerX,left:0,right:screenToChart({x:plot,y:0},view).x,heightAt:()=>400,safeHeightAt:()=>400,nextDrop:Infinity});
      a.bossLeft=bossAttackBoundary(playerX,0,plot,view.scaleX);a.bossRight=a.right-70;
      Object.assign(a.player,{x:playerX,y:400,grounded:true,invulnerable:0});
      Object.assign(a.boss,{x:a.bossRight,y:400,grounded:true,behavior:'approach'});
      for(let i=0;i<1500 && a.boss.behavior!=='attack';i++)stepChartBoss(a,()=>.5);
      assert.equal(a.boss.behavior,'attack');
      if(kind==='janet') {
        for(let i=0;i<90;i++){stepChartBoss(a,()=>.5);assert.ok(a.boss.x>=a.player.x+48);}
        continue;
      }
      a.boss.attack=kind==='jerome'?24:21;
      const pose=kind==='jerome'?bossGlovePose(a.boss):paulTailPose(a.boss);
      const tip=chartToScreen({x:a.boss.x-pose.x,y:0},view).x;
      const playerScreen=chartToScreen({x:playerX,y:0},view).x;
      assert.ok(Math.abs(tip-(playerScreen-plot*.03))<view.scaleX+1e-7,`Visible strike extends behind actual runner anchor (within AI arrival tolerance): ${JSON.stringify({kind,mobile,display,tip,playerScreen,bossX:a.boss.x,pose})}`);
      a.boss.attack=kind==='jerome'?48:60;
      for(let i=0;i<60;i++)stepBossArena(a,0,()=>.5);
      assert.equal(a.player.lives,2,'Grounded runner is hit by visible strike');
      const dodge=createBossArena(kind);
      Object.assign(dodge,{externalPlayer:true,runnerOffset:playerX,left:0,right:a.right,bossLeft:a.bossLeft,bossRight:a.bossRight,heightAt:()=>400,safeHeightAt:()=>400,nextDrop:Infinity});
      Object.assign(dodge.player,{x:playerX,y:250,grounded:false,invulnerable:0});
      Object.assign(dodge.boss,{x:a.boss.x,y:400,behavior:'attack',attackKind:kind==='paul'?'tail':'punch',attack:kind==='paul'?60:48,facing:-1,aimY:365,attackReachScale:a.boss.attackReachScale});
      for(let i=0;i<60;i++)stepBossArena(dodge,0,()=>.5);
      assert.equal(dodge.player.lives,3,'Jump avoids the same visible strike');
    }
  }
  console.log('PASS Bell attack reach, visible contact and jump dodge across desktop/mobile camera anchors');
  for (const kind of ['jerome', 'janet', 'paul']) {
    const a=createBossArena(kind);
    a.externalPlayer=true; a.runnerOffset=180; a.bossLeft=0; a.bossRight=1175;
    a.heightAt=()=>410; a.safeHeightAt=()=>410; a.nextDrop=Infinity;
    a.absorbBossHit=()=>true; a.boss.behaviorTimer=1;
    const behaviors=new Set();
    for(let frame=0;frame<1600;frame++){
      stepBossArena(a,0,()=>.5);behaviors.add(a.boss.behavior);
      assert.ok(a.boss.x>=a.player.x+48 && a.boss.x<=a.bossRight);
      assert.equal(a.player.x,180,'Boss AI never moves the normal runner');
    }
    assert.ok(['roam','approach','attack','recover'].every(b=>behaviors.has(b)),`${kind} completes the Android attack cycle`);
  }
  console.log('PASS touch boundaries and all three Android boss AI cycles');
  await server.listen();
  browser=spawn(process.env.EDGE_PATH??'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','about:blank'],{stdio:'ignore'});
  let port;
  for(let i=0;i<100;i++){try{port=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await new Promise(r=>setTimeout(r,100));}}
  assert.ok(port);
  const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let id=0;const pending=new Map(),errors=[];
  socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}};
  const call=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject,timer:setTimeout(()=>reject(Error(method)),15000)});socket.send(JSON.stringify({id:key,method,params}));});
  closeBrowser=()=>call('Browser.close');
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const settle=()=>new Promise(r=>setTimeout(r,200));
  const checkTouchGutters=async fullscreen=>{
    const gutters=await evaluate(`(()=>{const logo=document.querySelector('.header-logo-frame').getBoundingClientRect(),donate=document.querySelector('.home-coffee-link').getBoundingClientRect(),panel=document.querySelector('.landing-menu-panel').getBoundingClientRect();return {logo:logo.left,donate:donate.left-panel.left,bottom:panel.bottom-18-donate.bottom};})()`);
    assert.ok(Math.abs(gutters.logo-gutters.donate)<1,'Logo and Donate share left gutter: '+JSON.stringify(gutters));
    assert.ok(Math.abs(gutters.bottom-gutters.logo)<1,'Donate bottom gutter is measured above timestamp strip: '+JSON.stringify({fullscreen,...gutters}));
  };
  const checkFullPanel=async (panelSelector,closeSelector)=>{
    const layout=await evaluate(`(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};const b=document.querySelector(${JSON.stringify(closeSelector)}),r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {panel:rect(${JSON.stringify(panelSelector)}),close:rect(${JSON.stringify(closeSelector)}),full:rect('.desktop-fullscreen-control'),hit:!!hit&&(hit===b||b.contains(hit)),width:innerWidth,height:innerHeight};})()`);
    const touch=await evaluate(`matchMedia('(pointer: coarse)').matches`);
    if(touch){
      assert.ok(Math.abs(layout.panel.x)<1 && Math.abs(layout.panel.y)<1 && Math.abs(layout.panel.width-layout.width)<1 && Math.abs(layout.panel.height-layout.height)<1,'Mobile panel covers full viewport: '+JSON.stringify(layout));
      for(const axis of ['x','y','width','height'])assert.ok(Math.abs(layout.close[axis]-layout.full[axis])<1,'Mobile close matches fullscreen geometry: '+JSON.stringify(layout));
    }else{
      assert.ok(layout.panel.height<layout.height && layout.panel.y>0 && layout.panel.y+layout.panel.height<layout.height,'Desktop retains its original dialog below browser game chrome, not a fullscreen panel: '+JSON.stringify(layout));
    }
    assert.ok(layout.hit,'Close button is hit-testable');
    if(panelSelector==='.mobile-how-to-panel'){
      const columns=await evaluate(`(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height};};return {mobile:matchMedia('(pointer: coarse)').matches,hero:rect('.how-to-dialog-hero'),guide:rect('.how-to-dialog-content > .mechanics-guide'),header:rect('.mobile-how-to-header')};})()`);
      if(columns.mobile)assert.ok(columns.hero.height===0 && Math.abs(columns.guide.left)<1 && Math.abs(columns.guide.right-layout.width)<1 && Math.abs(columns.guide.top-columns.header.bottom)<1,'Mobile guide uses full width without artwork: '+JSON.stringify(columns));
      else assert.ok(columns.hero.height>0 && columns.hero.right<=columns.guide.left+1 && Math.abs(columns.hero.top-columns.header.top)<1 && columns.guide.top>columns.header.top,'Desktop guide retains side artwork alongside its original header and instructions: '+JSON.stringify(columns));
    }
  };
  const wait=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out: '+expression);};
  await call('Runtime.enable');await call('Page.enable');
  for(const [width,height] of [[740,240],[800,260],[915,300]]){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true});
    await call('Emulation.setTouchEmulationEnabled',{enabled:true});
    await call('Page.navigate',{url:`http://127.0.0.1:${server.httpServer.address().port}`});
    await wait(`!!window.__combat && !!document.querySelector('.landing-menu-guide-button')`);
    await settle();
    const layout=await evaluate(`(()=>{
      const panel=document.querySelector('.landing-menu-panel').getBoundingClientRect();
      const buttons=[...document.querySelectorAll('.landing-menu-actions .menu-action-button')].map(b=>{
        const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        return {top:r.top,bottom:r.bottom,height:r.height,hit:!!hit&&(hit===b||b.contains(hit)),textFits:b.scrollHeight<=b.clientHeight+1};
      });
      const art=document.querySelector('.donate-home-art .desktop-home-art').getBoundingClientRect();
      const donate=document.querySelector('.home-coffee-link').getBoundingClientRect();
      const q=document.querySelector('.landing-menu-quote'),quote=q.getBoundingClientRect();
      return {fullscreen:!!document.fullscreenElement,panel:{top:panel.top,bottom:panel.bottom},quote:{top:quote.top,bottom:quote.bottom,left:quote.left,right:quote.right,visible:q.checkVisibility()},art:{top:art.top,bottom:art.top+art.height*1235/1254,center:art.x+art.width/2},donate:{top:donate.top,center:donate.x+donate.width/2},buttons};
    })()`);
    assert.equal(layout.fullscreen,false,'Compact menu is checked outside fullscreen');
    await checkTouchGutters(false);
    assert.ok(layout.art.top>=layout.panel.top && Math.abs(layout.art.bottom-layout.donate.top)<1 && Math.abs(layout.art.center-layout.donate.center)<1,'Trader fits and stands centered on Donate: '+JSON.stringify(layout));
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.landing-menu-actions > .desktop-home-art')).display`),'none','No trader above windowed landscape actions');
    assert.equal(layout.buttons.length,4);
    assert.ok(Math.abs((layout.buttons[0].top+layout.buttons.at(-1).bottom)/2-(layout.panel.top+layout.panel.bottom-18)/2)<1,'Actions centered above timestamp strip: '+JSON.stringify(layout));
    assert.equal(layout.quote.visible,false,'Quote hidden in windowed landscape touch mode');
    assert.ok(layout.buttons.every(b=>b.top>=layout.panel.top && b.bottom<=layout.panel.bottom && b.hit && b.textFits),'All four compact actions fit and remain hit-testable: '+JSON.stringify(layout));
    assert.ok(layout.buttons.every(b=>b.height<=44),'Short browser viewport respects available action height');
    assert.equal(await evaluate(`!!Array.from(document.querySelectorAll('[role="status"]')).find(e=>/fullscreen|horizontal/i.test(e.textContent))`),false,'No fullscreen status strip on mobile');
    await call('Runtime.evaluate',{expression:`document.querySelector('.game-app').requestFullscreen()`,awaitPromise:true,userGesture:true});
    await settle();
    assert.equal(await evaluate(`!!document.fullscreenElement`),true,'Check actual fullscreen home layout');
    await checkTouchGutters(true);
    assert.equal(await evaluate(`document.querySelector('.landing-menu-quote').checkVisibility()`),false,'Mobile quote hidden in fullscreen');
    assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('.donate-home-art')).display`),'none','Donate trader visible in fullscreen');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.landing-menu-actions > .desktop-home-art')).display`),'none','No trader above mobile fullscreen actions');
    assert.ok(await evaluate(`(()=>{const a=document.querySelector('.donate-home-art .desktop-home-art').getBoundingClientRect(),d=document.querySelector('.home-coffee-link').getBoundingClientRect();return Math.abs(a.top+a.height*1235/1254-d.top)<1;})()`),'Visible shoes stand on Donate in fullscreen');
    await evaluate(`document.querySelector('.landing-menu-settings-button').click()`);await settle();
    await checkFullPanel('.site-info-dialog','.site-info-close');
    if(await evaluate(`matchMedia('(pointer: coarse)').matches`)){
      const gaps=await evaluate(`(()=>{const r=s=>document.querySelector(s).getBoundingClientRect(),high=r('[aria-label="High contrast"]'),diamond=r('.settings-diamond-button canvas'),reset=r('.settings-reset-button');return {above:diamond.top-high.bottom,below:reset.top-diamond.bottom};})()`);
      assert.ok(gaps.above>=0 && Math.abs(gaps.above-gaps.below)<1,'Settings diamond has equal gaps above and below: '+JSON.stringify(gaps));
    }
    assert.equal(await evaluate(`document.querySelector('.settings-diamond-button canvas').dataset.animated`),'true','Settings easter egg animates');
    await evaluate(`document.querySelector('.site-info-close').click();document.querySelector('.landing-menu-guide-button').click()`);await settle();
    await checkFullPanel('.mobile-how-to-panel','.mobile-how-to-close');
    await evaluate(`document.querySelector('.mobile-how-to-close').click()`);await settle();
    await evaluate('document.exitFullscreen()');
    await settle();
    console.log(`PASS ${width}x${height}: non-fullscreen home art and four responsive actions fit`);
  }
  for(const [width,height,mobile] of [[740,360,true],[915,412,true],[1440,900,false]]){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile});
    await call('Emulation.setTouchEmulationEnabled',{enabled:mobile});
    await call('Page.navigate',{url:`http://127.0.0.1:${server.httpServer.address().port}`});
    await wait(`!!window.__combat && !!document.querySelector('.landing-menu-guide-button')`);
    assert.equal(await evaluate(`!!document.querySelector('.header-boss-control')`),false,'Bell is removed from browser header');
    const priceColumn=await evaluate(`(()=>{const chart=document.querySelector('.landing-menu-chart'),plot=chart.querySelector('clipPath rect'),labels=[...chart.querySelectorAll('[data-menu-price-label]')],width=chart.viewBox.baseVal.width,plotWidth=plot.width.baseVal.value;return {width:width-plotWidth,gutters:labels.map(label=>{const b=label.getBBox();return {left:b.x-plotWidth,right:width-b.x-b.width};})};})()`);
    assert.equal(priceColumn.width,mobile?28:54,'Only mobile Home price column is narrowed');
    if(mobile)assert.ok(priceColumn.gutters.every(g=>Math.abs(g.left-g.right)<1),'Mobile Home prices have equal left/right gutters: '+JSON.stringify(priceColumn));
    const checkWideActions = async selector => {
      const alignment=await evaluate(`Array.from(document.querySelectorAll(${JSON.stringify(selector)})).filter(b=>b.getClientRects().length).map(b=>{const s=getComputedStyle(b),key=b.querySelector('.new-game-space-key');return {align:s.alignItems,justify:s.justifyContent,line:parseFloat(s.lineHeight),font:parseFloat(s.fontSize),keyBottom:key?getComputedStyle(key).bottom:null};})`);
      assert.ok(alignment.every(b=>b.align==='center' && b.justify==='center' && Math.abs(b.line-b.font)<.1),'Action labels use a centered single-line box: '+JSON.stringify(alignment));
      assert.ok(alignment.every(b=>b.keyBottom===null || b.keyBottom==='5px'),'Space symbol raised by 2px');
      const buttons=await evaluate(`Array.from(document.querySelectorAll(${JSON.stringify(selector)})).filter(b=>b.getClientRects().length).map(b=>{const r=b.getBoundingClientRect();return {width:r.width,height:r.height,font:parseFloat(getComputedStyle(b).fontSize)};})`);
      assert.ok(buttons.length,'Wide actions exist: '+selector);
      for(const button of buttons){
        assert.ok(Math.abs(button.width-Math.min(260,Math.max(148,width*.22)))<1,'Action width matches Android: '+JSON.stringify(button));
        assert.ok(Math.abs(button.height-Math.min(54,Math.max(44,height*.11)))<1,'Action height matches Android: '+JSON.stringify(button));
        assert.ok(Math.abs(button.font-Math.min(16,Math.max(12,height*.032)))<.1,'Action font matches Android');
      }
    };
    await checkWideActions('.landing-menu-actions .menu-action-button');
    const pickupAssets=['coin','printer','tender','banana','banknote','diamond','bag','bell'];
    const homeFrames=await evaluate(`Array.from(document.querySelectorAll('[data-menu-asset] canvas[data-animated="true"]')).map(c=>({asset:c.closest('[data-menu-asset]').dataset.menuAsset,pixels:c.toDataURL()}))`);
    assert.deepEqual([...new Set(homeFrames.map(f=>f.asset))].sort(),[...pickupAssets].sort(),'All requested home pickups are animated');
    await new Promise(resolve=>setTimeout(resolve,450));
    const homeLater=await evaluate(`Array.from(document.querySelectorAll('[data-menu-asset] canvas[data-animated="true"]')).map(c=>c.toDataURL())`);
    assert.ok(homeFrames.every((f,i)=>f.pixels!==homeLater[i]),'Every requested home pickup changes animation frame');
    const gutters=await evaluate(`(()=>{const logo=document.querySelector('.header-logo-frame').getBoundingClientRect(),full=document.querySelector('.desktop-fullscreen-control').getBoundingClientRect(),donate=document.querySelector('.home-coffee-link'),panel=donate.offsetParent.getBoundingClientRect(),d=donate.getBoundingClientRect();const button=document.querySelector('.landing-menu-play-button'),s=getComputedStyle(button);return {left:logo.left,right:innerWidth-full.right,donateLeft:d.left-panel.left,donateBottom:panel.bottom-d.bottom,paddingTop:s.paddingTop,paddingBottom:s.paddingBottom};})()`);
    assert.ok(gutters.right<= (mobile?3:2)+.1,'Fullscreen retains compact right gutter: '+JSON.stringify(gutters));
    if(!mobile)assert.ok(Math.abs(gutters.donateLeft-gutters.donateBottom)<2,'Donate symmetric left/bottom gutters: '+JSON.stringify(gutters));
    if(mobile){
      const painted=await evaluate(`(()=>{const icon=document.querySelector('.desktop-fullscreen-control svg'),r=icon.getBoundingClientRect(),b=icon.getBBox(),v=icon.viewBox.baseVal,s=r.width/v.width,stroke=parseFloat(getComputedStyle(icon).strokeWidth)||0;const right=innerWidth-(r.left+(b.x+b.width+stroke/2-v.x)*s);const logo=document.querySelector('.header-logo-frame').getBoundingClientRect();const donate=document.querySelector('.home-coffee-link').getBoundingClientRect();return {right,logo:logo.left,donate:donate.left};})()`);
      assert.ok(Math.abs(painted.logo-painted.right)<1,'Logo left matches painted fullscreen right: '+JSON.stringify(painted));
      assert.ok(Math.abs(painted.donate-painted.logo)<1,'Donate left aligns with logo: '+JSON.stringify(painted));
    }
    assert.equal(gutters.paddingTop,gutters.paddingBottom,'Plain action text has vertically symmetric padding');
    const readChrome = () => evaluate(`(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};return {logo:rect('.header-logo-frame'),fullscreen:rect('.desktop-fullscreen-control'),donate:rect('.home-coffee-link'),feed:rect(${mobile ? "'.mobile-header-feed'" : "'.desktop-live-feed'"})};})()`);
    await settle();
    const stableChrome=await readChrome();
    for(let pass=0;pass<8;pass++){
      await evaluate(`window.dispatchEvent(new Event('resize'))`);
      await settle();
      const current=await readChrome();
      for(const key of Object.keys(stableChrome))for(const axis of ['x','y','width','height'])assert.ok(Math.abs(current[key][axis]-stableChrome[key][axis])<1,'Chrome must not drift after layout updates: '+JSON.stringify({key,axis,before:stableChrome[key],after:current[key]}));
    }
    assert.ok(stableChrome.logo.x<32,'Logo stays at screen edge');
    assert.ok(width-stableChrome.fullscreen.x-stableChrome.fullscreen.width<32,'Fullscreen stays at screen edge');
    if(mobile){
      const chrome=await evaluate(`(()=>{const h=document.querySelector('header').getBoundingClientRect();const b=document.querySelector('.desktop-fullscreen-control').getBoundingClientRect();const f=document.querySelector('.desktop-live-feed-bar').getBoundingClientRect();const m=document.querySelector('.mobile-header-feed').getBoundingClientRect();return {header:h.height,button:b.width,feed:f.height,inlineWidth:m.width,inlineTop:m.top,inlineBottom:m.bottom,top:h.top,bottom:h.bottom};})()`);
      assert.ok(chrome.button>=40,'Touch fullscreen control is at least 40px');
      assert.equal(chrome.feed,0,'No separate feed row on mobile');
      assert.ok(chrome.header<=56 && chrome.inlineWidth>0 && chrome.inlineTop>=chrome.top && chrome.inlineBottom<=chrome.bottom,'Feed fits inside compact header');
    }
    await evaluate(`document.querySelector('.landing-menu-settings-button').click()`);await settle();
    await checkFullPanel('.site-info-dialog','.site-info-close');
    await evaluate(`(()=>{const s=document.querySelector('[aria-label="Shmuck Feed"]');if(s.getAttribute('aria-checked')!=='true')s.click();})()`);await settle();
    assert.equal(await evaluate(`document.querySelector('[aria-label="Shmuck Feed"] .settings-switch-state').textContent`),'On');
    await evaluate(`document.querySelector('[aria-label="Shmuck Feed"]').click()`);await settle();
    assert.ok(await evaluate(`document.querySelector('[aria-label="Shmuck Feed"]').textContent.includes('Off')`));
    assert.equal(await evaluate(`document.querySelector('[aria-label="Shmuck Feed"]').getAttribute('aria-checked')`),'false');
    await evaluate(`document.querySelector('[aria-label="Shmuck Feed"]').click();document.querySelector('.site-info-close').click()`);await settle();
    await evaluate(`document.querySelector('.landing-menu-guide-button').click()`);await settle();
    await checkFullPanel('.mobile-how-to-panel','.mobile-how-to-close');
    const guide=await evaluate(`document.querySelector('.mechanics-guide').textContent`);
    assert.ok(guide.includes('A mighty foe joins your ride.'));
    if(mobile){
      const dividers=await evaluate(`(()=>{const guide=document.querySelector('.mechanics-guide'),art=guide.querySelector('.mechanics-guide-visuals'),a=art.getBoundingClientRect();return Array.from(guide.querySelectorAll('.touch-control-preview')).map(p=>{const d=p.querySelector('.touch-aligned-divider').getBoundingClientRect();return Math.abs((d.left-p.getBoundingClientRect().left)-(a.width-parseFloat(getComputedStyle(art).borderRightWidth)));});})()`);
      assert.ok(dividers.length===4 && dividers.every(delta=>delta<1),'All four touch dividers align with the artwork/description border: '+JSON.stringify(dividers));
      assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('[data-touch-control]')).map(e=>e.dataset.touchControl)`),['jump','double-jump','shoot','hat-weapon'],'Four Android touch demonstrations replace desktop controls');
      const frames=await evaluate(`Array.from(document.querySelectorAll('.touch-control-preview canvas')).map(c=>({width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height,pixels:c.toDataURL()}))`);
      assert.ok(frames.every(f=>f.width>0 && f.height>0 && Math.abs(f.width/f.height-360/220)<.01),'All demonstrations have visible correctly proportioned canvases');
      await new Promise(resolve=>setTimeout(resolve,650));
      const later=await evaluate(`Array.from(document.querySelectorAll('.touch-control-preview canvas')).map(c=>c.toDataURL())`);
      assert.ok(frames.every((f,i)=>f.pixels!==later[i]),'All four demonstrations animate');
      assert.ok(!guide.includes('Space Bar')&&!guide.includes('Left Mouse Click'),'No desktop control cards on mobile');
    }else{
      assert.ok(guide.includes('Space')&&guide.includes('tap the left of the screen'));
      assert.equal(await evaluate(`document.querySelectorAll('[data-touch-control]').length`),0,'Desktop guide unchanged');
    }
    assert.ok(!guide.includes('use the joystick')&&!guide.includes('Move Left'));
    await evaluate(`document.querySelector('.mobile-how-to-close').click();window.__combat.setup()`);await settle();
    assert.equal(await evaluate(`!!document.querySelector('.mobile-joystick')`),false);
    const rect=await evaluate(`(()=>{const r=document.querySelector('.game-stage canvas').getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height}})()`);
    const left={x:rect.left+rect.width*.1,y:rect.top+rect.height*.5,id:1};
    const right={x:rect.left+rect.width*.6,y:rect.top+rect.height*.5,id:2};
    if(mobile){
      await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left]});
      assert.equal(await evaluate('window.__combat.snapshot().held'),true);
      assert.equal(await evaluate('window.__combat.snapshot().cases'),0,'Left tap never shoots');
      await evaluate('window.__combat.step()');
      await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left,right]});
      assert.ok(await evaluate('window.__combat.snapshot().cases>0'),'Second finger shoots while jumping');
      await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      assert.equal(await evaluate('window.__combat.snapshot().held'),false);
      await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left]});
      assert.equal(await evaluate('window.__combat.snapshot().jumps'),2,'Second left tap double-jumps');
      await call('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
      assert.equal(await evaluate('window.__combat.snapshot().held'),false);
    }else{
      await call('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
      assert.equal(await evaluate('window.__combat.snapshot().held'),true);
      await call('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
      await call('Input.dispatchMouseEvent',{type:'mousePressed',x:left.x,y:left.y,button:'left',clickCount:1});
      await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:left.x,y:left.y,button:'left',clickCount:1});
      assert.ok(await evaluate('window.__combat.snapshot().cases>0'),'Desktop left click still shoots, including left side');
    }
    for(const kind of ['jerome','janet','paul']){
      await evaluate(`window.__combat.setup('${kind}')`);await settle();
      const feed=await evaluate('window.__combat.feed()');
      assert.ok(feed.some(text=>text.includes('REGRESSION: Bell feed stays visible')),`${kind}: enabled Live Feed remains rendered during boss fight`);
      const name = {jerome:'Jeromé',janet:'Janét',paul:'Pául'}[kind];
      assert.ok(feed.includes(name),`${kind}: boss name is drawn with Live Feed on`);
      await evaluate('window.__setLiveFeed(false)');await settle();
      const withoutFeed=await evaluate('window.__combat.feed()');
      assert.ok(withoutFeed.includes(name),`${kind}: boss name is drawn with Live Feed off`);
      assert.ok(!withoutFeed.some(text=>text.includes('REGRESSION: Bell feed stays visible')),'Disabled feed stays hidden');
      await evaluate('window.__setLiveFeed(true)');await settle();
      const before=await evaluate('window.__combat.snapshot()');
      await evaluate('window.__combat.step(30)');
      const after=await evaluate('window.__combat.snapshot()');
      assert.equal(after.state,'play');assert.ok(after.x>before.x,'Runner keeps moving during Bell');
      assert.ok(after.boss.external);assert.equal(after.boss.lives,3);
      await evaluate('window.__combat.hit();window.__combat.step(4)');
      assert.ok((await evaluate('window.__combat.snapshot().boss.health'))<before.boss.health,'Projectile damages '+kind);
      await evaluate(`document.querySelector('.header-pause-control').click()`);await settle();
      const paused=await evaluate('window.__combat.snapshot()');
      await checkWideActions('.pause-overlay .game-result-actions > button');
      if(mobile) assert.ok(await evaluate(`parseFloat(getComputedStyle(document.querySelector('.pause-overlay > .game-result')).paddingTop)>=16`),'Margin Call has expanded vertical padding');
      await evaluate('window.__combat.step(10)');
      assert.deepEqual(await evaluate('window.__combat.snapshot()'),paused,'Pause freezes both run and boss');
      await evaluate(`document.querySelector('.header-pause-control').click()`);await settle();
      const score=await evaluate('window.__combat.snapshot().activity');
      await evaluate('window.__combat.win();window.__combat.step()');
      const won=await evaluate('window.__combat.snapshot()');
      assert.equal(won.boss,null);assert.equal(won.state,'play');
      assert.equal(won.activity-score,kind==='janet'?1000:kind==='jerome'?2000:3000);
    }
    await evaluate(`window.__combat.setup();window.__combat.equip();window.__combat.spawn('jerome')`);
    assert.equal(await evaluate('window.__combat.snapshot().carry'),200,'Bell preserves the diamond');
    assert.equal(await evaluate('window.__combat.snapshot().hat'),400,'Bell preserves hat weapon');
    assert.equal(await evaluate('window.__combat.absorb()'),true,'Diamond protects against boss contact');
    assert.equal(await evaluate('window.__combat.snapshot().carry'),0,'Diamond absorbs only one contact');
    assert.equal(await evaluate('window.__combat.absorb()'),false);
    const coins=await evaluate('window.__combat.snapshot().coins');
    await evaluate('window.__combat.pickups();window.__combat.step()');
    assert.equal(await evaluate('window.__combat.snapshot().coins'),coins+1,'Normal pickups stay collectible during Bell');
    await evaluate('window.__combat.lose();window.__combat.step()');await settle();
    assert.equal(await evaluate('window.__combat.snapshot().state'),'over','Boss knockout uses normal game over');
    assert.equal(await evaluate('window.__combat.snapshot().boss'),null);
    if(mobile){
      await call('Runtime.evaluate',{expression:`document.querySelector('.game-app').requestFullscreen()`,awaitPromise:true,userGesture:true});
      await settle();
      assert.equal(await evaluate(`document.fullscreenElement===document.querySelector('.game-app')`),true,'Test actual fullscreen Share layout');
    }
    const beforeShare=await evaluate(`(()=>{const r=document.querySelector('.share-dd-open').getBoundingClientRect();return {width:r.width,left:r.left};})()`);
    await evaluate(`document.querySelector('.share-dd-open').click()`);await settle();
    await checkWideActions('.game-result-over .game-result-actions > button');
    const share=await evaluate(`(()=>{const a=document.querySelector('.share-dd-actions');return {display:getComputedStyle(a).display,buttons:[...a.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})};})()`);
    assert.equal(share.display,'grid','Shares replace wide Share DD with one row');
    assert.equal(share.buttons.length,4);
    for(const theme of ['light','dark']){
      await evaluate(`window.__setTheme(${JSON.stringify(theme)})`);
      await new Promise(resolve=>setTimeout(resolve,500));
      const colors=await evaluate(`Array.from(document.querySelectorAll('.share-dd-actions-host button')).map(b=>{const s=getComputedStyle(b);return {background:s.backgroundColor,ink:s.color};})`);
      const expected=theme==='light'?{background:'rgb(86, 157, 204)',ink:'rgb(255, 255, 255)'}:{background:'rgb(56, 189, 248)',ink:'rgb(0, 0, 0)'};
      assert.ok(colors.every(c=>c.background===expected.background && c.ink===expected.ink),'Share buttons use theme blue with contrasting icons: '+JSON.stringify({theme,colors}));
    }
    const shareVisibility=await evaluate(`Array.from(document.querySelectorAll('.share-dd-actions-host button')).map(b=>{const r=b.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {label:b.getAttribute('aria-label'),width:r.width,height:r.height,visible:b.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}),hit:!!hit&&(hit===b||b.contains(hit)),cover:hit?.outerHTML.slice(0,300)};})`);
    assert.ok(shareVisibility.every(b=>b.visible&&b.hit&&b.width>20&&b.height>20),'Share buttons visibly painted and hit-testable: '+JSON.stringify(shareVisibility));
    assert.equal(await evaluate(`!!document.querySelector('.share-dd-open, .share-dd-close')`),false,'No duplicate Share DD or close X');
    assert.ok(share.buttons.every(b=>Math.abs(b.width-b.height)<1),'All share buttons square');
    assert.ok(Math.abs(share.buttons[0].x-beforeShare.left)<1,'Shares retain action left edge');
    assert.ok(Math.abs(share.buttons.at(-1).x+share.buttons.at(-1).width-share.buttons[0].x-beforeShare.width)<1,'Share row matches wide action width');
    const art=await evaluate(`(()=>{const r=document.querySelector('.share-dd-image').getBoundingClientRect();return {left:r.left,right:r.right};})()`);
    assert.ok(Math.abs((art.left+art.right)/2-beforeShare.left/2)<1,'Artwork centered in left space');
    console.log(`PASS ${width}x${height}: guide, ${mobile?'multitouch jump/shoot/double jump/cancel':'keyboard/mouse'}, three live-chart bosses, damage, pause/resume, victory, knockout and preserved pickups`);
  }
  assert.deepEqual(errors,[],'No browser exceptions');
}finally{
  await closeBrowser?.().catch(()=>{});socket?.close();browser?.kill();await server.close();
  await new Promise(r=>setTimeout(r,500));await rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200});
}