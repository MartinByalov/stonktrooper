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
  server = await createServer({ root, plugins: [{
    name: 'countdown-regression-hook', enforce: 'pre',
    transform(code, id) {
      if (process.env.CHECK_SHARE_LAYOUT === '1' && id.replaceAll('\\', '/').endsWith('/src/App.tsx')) {
        return code.replace(/useState(?:<GameState>)?\(['"]menu['"]\)/, "useState('over')");
      }
      if (process.env.CHECK_LANDSCAPE_EDGES === '1' && id.replaceAll('\\', '/').endsWith('/src/index.css')) {
        return code.replace(/env\(safe-area-inset-(left|right|top|bottom)\)/g, (_, side) => `var(--test-safe-${side}, 0px)`);
      }
      if (!id.replaceAll('\\', '/').endsWith('/src/CandleGame.tsx')) return;
      return code.replace('  const draw = useCallback', `  window.__checkVolumes = () => {
        const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        const fillRect = ctx.fillRect.bind(ctx), bars = [];
        ctx.fillRect = (x, y, width, height) => {
          if (height > 0 && height <= 40 && Math.abs(y + height - (H - TIME_AXIS_HEIGHT)) < 0.01) {
            const matrix = ctx.getTransform();
            bars.push({ bottom: matrix.d * (y + height) + matrix.f,
              scaleY: matrix.d, left: matrix.a * x + matrix.e, width: width * matrix.a });
          }
          fillRect(x, y, width, height);
        };
        const g = gameRef.current, state = g.currentState;
        g.currentState = 'paused';
        try { draw(ctx); return { bars, baseline: H - TIME_AXIS_HEIGHT,
          barWidth: (CW - 3) * renderViewport.current.scaleX }; }
        finally { g.currentState = state; }
      };
      window.__checkCountdown = () => {
        const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        const savedTimer = gameRef.current.hawkTimer;
        const savedState = gameRef.current.currentState;
        gameRef.current.hawkTimer = 300; gameRef.current.currentState = 'menu';
        try {
          drawTopTickerTape(ctx);
          const pixel = [...ctx.getImageData(1, 0, 1, 1).data];
          return { pixel, tapeHeight: feedLayout.current.tapeHeight };
        } finally { gameRef.current.hawkTimer = savedTimer; gameRef.current.currentState = savedState; }
      };
  const draw = useCallback`);
    },
  }], server: { host: '127.0.0.1', port: 5537, strictPort: true }, logLevel: 'error' });
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
  const waitForSelector = async selector => {
    for (let attempt=0; attempt<100; attempt++) {
      if(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    throw new Error('Timed out waiting for '+selector);
  };
  if (process.env.CHECK_DEFAULT_THEME === '1') {
    await call('Page.navigate',{url:'http://127.0.0.1:5537/'});
    await waitForSelector('.landing-menu-panel');
    for (const [saved,expected] of [[null,'light'],['dark','dark'],['light','light'],['invalid','light']]) {
      await evaluate(saved === null ? "localStorage.removeItem('cr_theme')" : `localStorage.setItem('cr_theme',${JSON.stringify(saved)})`);
      await call('Page.navigate',{url:'http://127.0.0.1:5537/'});
      await waitForSelector('.landing-menu-panel');
      await settle();
      assert.equal(await evaluate('document.documentElement.dataset.theme'),expected);
      console.log('PASS initial theme saved='+saved+' renders '+expected);
    }
  } else if (process.env.CHECK_MENU_FEET === '1') {
    for (const [width,height,mobile] of [[1920,1080,false],[1440,900,false],[844,390,true],[390,844,true],[360,640,true]]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
      await call('Emulation.setTouchEmulationEnabled',{enabled:mobile});
      await call('Page.navigate',{url:'http://127.0.0.1:5537/'});
      await waitForSelector('.menu-celebration');
      await settle();
      for (const theme of ['light','dark']) {
        const result=await evaluate(`(() => {
          document.documentElement.dataset.theme='${theme}';
          const svg=document.querySelector('.menu-celebration'), r=svg.getBoundingClientRect();
          const button=document.querySelector('.landing-menu-guide-button').getBoundingClientRect();
          const shoeBottom=r.top+106.5/140*r.width;
          return {gap:button.top-shoeBottom,center:Math.abs(r.left+r.width/2-button.left-button.width/2)};
        })()`);
        assert.ok(Math.abs(result.gap)<0.1 && result.center<1,JSON.stringify({width,height,theme,...result}));
        console.log('PASS shoe baseline on How to Play border '+width+'x'+height+' '+theme);
      }
    }
  } else if (process.env.CHECK_INFO_SURPRISES === '1') {
    for (const [width,height,mobile] of [[1440,900,false],[844,390,true],[390,844,true]]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
      await call('Emulation.setTouchEmulationEnabled',{enabled:mobile});
      for (const theme of ['light','dark']) {
        await call('Page.navigate',{url:'http://127.0.0.1:5537/'});
        await waitForSelector('.landing-menu-panel');
        const result=await evaluate(`(async()=>{
          const {default:React}=await import('/node_modules/.vite/deps/react.js');
          const {default:{createRoot}}=await import('/node_modules/.vite/deps/react-dom_client.js');
          const {InfoArtwork}=await import('/src/InfoArtwork.tsx');
          const host=document.createElement('div');host.className='game-app';
          host.style.cssText='position:fixed;top:200px;left:100px;z-index:9999';document.body.append(host);
          const root=createRoot(host);
          root.render(React.createElement('div',null,...['bag','banana'].map(asset=>React.createElement(InfoArtwork,{key:asset,asset,theme:'${theme}',animationsEnabled:false}))));
          const settle=()=>new Promise(r=>setTimeout(r,100));await settle();
          const bag=host.querySelector('[data-asset="bag"]');bag.click();await settle();
          const painted=canvas=>{
            const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
            let top=canvas.height,bottom=0;
            for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>16){top=Math.min(top,y);bottom=Math.max(bottom,y);}
            const r=canvas.getBoundingClientRect();return {top:r.top+top/canvas.height*r.height,bottom:r.top+(bottom+1)/canvas.height*r.height};
          };
          const clown=painted(bag.querySelector('.info-bag-clown canvas'));
          const sack=painted(bag.querySelector('.info-bag-front canvas'));
          const banana=host.querySelector('[data-asset="banana"]');
          const fruits=[banana.dataset.fruit];
          for(let i=0;i<4;i++){banana.click();await settle();fruits.push(banana.dataset.fruit);}
          const result={clown,sack,height:bag.getBoundingClientRect().height,fruits,disabled:banana.disabled};root.unmount();host.remove();return result;
        })()`);
        assert.ok(Math.abs(result.clown.bottom-result.sack.top)<0.5,JSON.stringify(result));
        assert.deepEqual(result.fruits,['banana','orange','watermelon','kiwi','tomato']);
        assert.equal(result.disabled,true);
        console.log('PASS clown above bag and watermelon sequence '+width+'x'+height+' '+theme);
      }
    }
  } else if (process.env.CHECK_GUIDE_ALIGNMENT === '1') {
    for (const [width,height,mobile] of [[1440,900,false],[844,390,true],[390,844,true],[360,640,true]]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
      await call('Emulation.setTouchEmulationEnabled',{enabled:mobile});
      for (const theme of ['light','dark']) {
        await call('Page.navigate',{url:'http://127.0.0.1:5537/'});
        await waitForSelector('.landing-menu-panel');
        const results = await evaluate(`(async () => {
          const {default:React}=await import('/node_modules/.vite/deps/react.js');
          const {default:{createRoot}}=await import('/node_modules/.vite/deps/react-dom_client.js');
          const {MechanicsGuide}=await import('/src/MechanicsGuide.tsx');
          document.documentElement.dataset.theme='${theme}';
          const host=document.createElement('div');host.className='game-app';
          host.style.cssText='position:fixed;inset:0;overflow:auto;z-index:9999';
          host.innerHTML='<div class="mobile-how-to-panel"><div class="how-to-dialog-content"></div></div>';
          document.body.append(host);
          const root=createRoot(host.querySelector('.how-to-dialog-content'));
          root.render(React.createElement(MechanicsGuide,{theme:'${theme}'}));
          await new Promise(r=>setTimeout(r,400));
          const results=Array.from(host.querySelectorAll('.mechanics-guide > div')).map(card=>{
            const p=card.querySelector('p').getBoundingClientRect();
            const description=card.querySelector('.mechanics-guide-description').getBoundingClientRect();
            const title=card.querySelector('h3').getBoundingClientRect();
            const second=card.querySelector('.mechanics-guide-visuals > div:nth-child(2)');
            return {title:card.querySelector('h3').textContent,paired:!!second,
              error:Math.abs((p.top+p.bottom)/2-(second ? second.getBoundingClientRect().top : (description.top+description.bottom)/2)),
              overlap:title.bottom-p.top};
          });
          root.unmount();host.remove();return results;
        })()`);
        assert.equal(results.length,12);
        for(const result of results) {
          assert.ok(result.error<=1,JSON.stringify({width,height,theme,...result}));
          assert.ok(result.overlap<=1, 'Heading overlaps description: '+JSON.stringify({width,height,theme,...result}));
        }
        console.log('PASS guide text alignment '+width+'x'+height+' '+theme);
      }
    }
  } else if (process.env.CHECK_SHARE_LAYOUT === '1') {
    for (const [width,height,mobile] of [[1440,900,false],[844,390,true],[390,844,true],[360,640,true]]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
      await call('Emulation.setTouchEmulationEnabled',{enabled:mobile});
      for (const theme of ['light','dark']) {
        await call('Page.navigate',{url:'http://127.0.0.1:5537/'});
        await waitForSelector('.share-dd-open');
        await evaluate(`localStorage.setItem('cr_theme','${theme}')`);
        await call('Page.navigate',{url:'http://127.0.0.1:5537/'});
        await waitForSelector('.game-result-summary');
        await evaluate("document.querySelector('.share-dd-open').click()");
        await waitForSelector('.share-dd-canvas');
        await evaluate(`(async()=>{for(let i=0;i<100;i++){if(document.querySelector('.share-dd-dialog').style.getPropertyValue('--share-art-ratio'))return;await new Promise(r=>setTimeout(r,50));}throw new Error('Share artwork did not render');})()`);
        await settle();
        const result=await evaluate(`(() => {
          const r=s=>document.querySelector(s).getBoundingClientRect(), actions=r('.game-result-actions'), overlay=r('.game-over-overlay'), art=r('.share-dd-image'), footer=r('.site-footer'), social=r('.share-dd-actions');
          return {hidden:!document.querySelector('.game-result-summary'),centered:Math.abs(actions.top+actions.height/2-overlay.top-overlay.height/2)<2,bottom:Math.abs(art.bottom-footer.bottom)<2,beside:art.left>=social.right+7};
        })()`);
        assert.equal(result.hidden,true);assert.equal(result.centered,true,JSON.stringify(result));
        if(mobile&&height>width){assert.equal(result.bottom,true,JSON.stringify(result));assert.equal(result.beside,true,JSON.stringify(result));}
        await evaluate("document.querySelector('.share-dd-close').click()");
        await waitForSelector('.game-result-summary');
        console.log('PASS Share DD summary, centered controls and artwork '+width+'x'+height+' '+theme);
      }
    }
  } else if (process.env.CHECK_IMAGE_LOADING === '1') {
    for (const [width, height, mobile] of [[1440,900,false],[844,390,true],[390,844,true]]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
      await call('Emulation.setTouchEmulationEnabled', { enabled: mobile });
      for (const theme of ['light','dark']) for (const shareOpen of [false,true]) {
        await call('Page.navigate', { url: 'http://127.0.0.1:5537/' });
        await waitForSelector('.landing-menu-panel');
        const result=await evaluate(`(async () => {
          const {default:React}=await import('/node_modules/.vite/deps/react.js');
          const {default:{createRoot}}=await import('/node_modules/.vite/deps/react-dom_client.js');
          const {LiquidatedBackdrop}=await import('/src/LiquidatedBackdrop.tsx');
          const host=document.createElement('div');document.body.append(host);
          const root=createRoot(host);root.render(React.createElement(LiquidatedBackdrop,{theme:'${theme}',shareOpen:${shareOpen}}));
          await new Promise(r=>setTimeout(r,100));
          const img=host.querySelector('img');await img.decode();
          const bounds=img.getBoundingClientRect();
          const result={count:host.querySelectorAll('img').length,url:img.currentSrc,cover:getComputedStyle(img).objectFit,visible:bounds.width>0&&bounds.height>0};
          root.unmount();host.remove();return result;
        })()`);
        const name=`crane${mobile && height>width && shareOpen ? '-portrait' : ''}${theme==='dark' ? '-inverted' : ''}`;
        assert.equal(result.count,1);
        assert.ok(new RegExp('/images/'+name+'(-small)?\\.webp$').test(result.url),JSON.stringify(result));
        assert.equal(result.cover,'cover');assert.equal(result.visible,true);
        console.log('PASS optimized image '+width+'x'+height+' '+theme+' share='+shareOpen+' '+result.url);
      }
    }
  } else if (process.env.CHECK_FOOTER_TEXT === '1') {
    for (const [width, height, mobile] of [[1920, 900, false], [844, 390, true], [359, 798, true], [320, 640, true]]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
      await call('Emulation.setTouchEmulationEnabled', { enabled: mobile });
      for (const theme of ['light', 'dark']) {
        await call('Page.navigate', { url: 'http://127.0.0.1:5537/' });
        await waitForSelector('.site-footer');
        await evaluate(`localStorage.setItem('cr_theme','${theme}')`);
        await call('Page.navigate', { url: 'http://127.0.0.1:5537/' });
        await waitForSelector('.site-footer');
        await evaluate('document.fonts.ready');
        await settle();
        const result = await evaluate(`(() => {
          const nav=document.querySelector('.site-footer nav'), buttons=[...nav.querySelectorAll('button')];
          return {
            oneRow:new Set(buttons.map(b=>b.getBoundingClientRect().top)).size===1,
            inside:buttons.every(b=>{const r=b.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}),
            plain:buttons.every(b=>{const s=getComputedStyle(b);return s.backgroundColor==='rgba(0, 0, 0, 0)'&&s.fontWeight==='400'&&s.textShadow==='none'&&s.fontSize==='11px'&&b.children.length===0;})
          };
        })()`);
        assert.deepEqual(result, { oneRow: true, inside: true, plain: true });
        await evaluate("[...document.querySelectorAll('.site-footer button')].find(b=>b.textContent==='Disclaimer').click()");
        await waitForSelector('.site-info-dialog');
        assert.equal(await evaluate("document.querySelector('.site-info-title').textContent"), 'Disclaimer');
        if (mobile) {
          await evaluate("document.querySelector('.info-artwork-button').click()");
          await settle();
          assert.equal(await evaluate(`(() => {
            const clown=document.querySelector('.info-bag-clown'), bag=document.querySelector('.info-bag-front');
            const canvas=clown.querySelector('canvas'), r=canvas.getBoundingClientRect();
            const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
            const dialog=document.querySelector('.site-info-dialog').getBoundingClientRect();
            let visible=true;
            for(let y=0;y<canvas.height;y++) for(let x=0;x<canvas.width;x++) {
              if(pixels.data[(y*canvas.width+x)*4+3]<=16) continue;
              const px=r.left+(x+0.5)*r.width/canvas.width, py=r.top+(y+0.5)*r.height/canvas.height;
              if(px<dialog.left||px>dialog.right||py<dialog.top||py>dialog.bottom) visible=false;
            }
            return visible && getComputedStyle(clown).opacity==='1' && Number(getComputedStyle(clown).zIndex)>Number(getComputedStyle(bag).zIndex);
          })()`), true, 'Entire clown head is inside the dialog and layered in front of the bag');
        }
        await evaluate("document.querySelector('.site-info-close').click();document.querySelector('.landing-menu-settings-button').click()");
        await waitForSelector('.settings-reset-button');
        await evaluate("document.querySelector('.settings-reset-button').click()");
        assert.equal(await evaluate("document.querySelector('.settings-reset-button').textContent"), 'Default settings restored');
        assert.equal(await evaluate("!!document.querySelector('.site-info-main [role=status]')"), false);
        await evaluate("document.querySelector('.site-info-close').click();[...document.querySelectorAll('.site-footer button')].find(b=>b.textContent==='Preferences').click()");
        await waitForSelector('.preferences-clear-button');
        assert.equal(await evaluate("document.querySelector('.preferences-clear-button').textContent"), 'Clear saved preferences');
        await evaluate("localStorage.setItem('cr_volume','0.2');document.querySelector('.preferences-clear-button').click()");
        assert.equal(await evaluate("document.querySelector('.preferences-clear-button').textContent"), 'Preferences removed');
        assert.equal(await evaluate("localStorage.getItem('cr_volume')"), null);
        assert.equal(await evaluate("!!document.querySelector('.site-info-main [role=status]')"), false);
        console.log('PASS footer text and Disclaimer button '+width+'x'+height+' '+theme);
      }
    }
  } else if (process.env.CHECK_MUSIC_VOLUME === '1') {
    await call('Page.navigate', { url: 'http://127.0.0.1:5537/' });
    await waitForSelector('.landing-menu-panel');
    const levels = await evaluate(`(async () => {
      const {SoundController}=await import('/src/audio.ts');
      const controller=new SoundController(), peaks=[];
      const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(value){peaks.push(value);}});
      const node=()=>({connect(){},disconnect(){},start(){},stop(){},frequency:param(),Q:param(),gain:param()});
      controller.ctx={currentTime:0,createOscillator:node,createGain:node,createBiquadFilter:node,destination:{}};
      controller.musicNote(440,0.4,0.1,'triangle');
      controller.tone(440,220,0.4,0.1);
      return peaks;
    })()`);
    assert.ok(Math.abs(levels[0] - 0.3) < 1e-10 && levels[1] === 0.1, 'Background notes are boosted 3x while effect envelopes stay unchanged');
    console.log('PASS background music 3x gain, unchanged sound-effect gain');
  } else if (process.env.CHECK_LANDSCAPE_EDGES === '1') {
    await call('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
    await call('Emulation.setTouchEmulationEnabled', { enabled: true });
    for (const insets of [{ left: 0, right: 0, top: 0, bottom: 0 }, { left: 44, right: 0, top: 0, bottom: 21 }, { left: 0, right: 44, top: 0, bottom: 21 }]) {
      await call('Page.navigate', { url: 'http://127.0.0.1:5537/' });
      await waitForSelector('.landing-menu-panel');
      await evaluate(`Object.entries(${JSON.stringify(insets)}).forEach(([side,value])=>document.documentElement.style.setProperty('--test-safe-'+side,value+'px')); window.dispatchEvent(new Event('resize'))`);
      await settle();
      const measure = async playing => evaluate(`(() => {
        const app=document.querySelector('.game-app'), ar=app.getBoundingClientRect(), svg=document.querySelector('.desktop-fullscreen-control svg');
        const r=svg.getBoundingClientRect(), b=svg.getBBox(), v=svg.viewBox.baseVal;
        const gap=ar.right-(r.left+(b.x+b.width+parseFloat(getComputedStyle(svg).strokeWidth)/2-v.x)*r.width/v.width);
        const logo=document.querySelector('.header-logo-frame').getBoundingClientRect().left-ar.left;
        const values={gap,logo};
        if (${playing}) {
          const stage=document.querySelector('.game-stage'), sr=stage.getBoundingClientRect(), joystick=document.querySelector('.mobile-joystick').getBoundingClientRect();
          values.pips=parseFloat(stage.style.getPropertyValue('--game-hud-inset'));
          values.joystick=joystick.left-ar.left;
          values.joystickBottom=sr.bottom-joystick.bottom;
        } else {
          const panel=document.querySelector('.landing-menu-panel').getBoundingClientRect(), donate=document.querySelector('.home-coffee-link').getBoundingClientRect();
          values.donate=donate.left-panel.left;
          values.donateBottom=panel.bottom-18-donate.bottom;
        }
        return values;
      })()`);
      const check = values => {
        for (const [name, value] of Object.entries(values)) assert.ok(Math.abs(value-values.gap)<1, `${name} matches Fullscreen with ${JSON.stringify(insets)}: ${JSON.stringify(values)}`);
      };
      check(await measure(false));
      await call('Runtime.evaluate', { expression: "document.querySelector('.desktop-fullscreen-control').click()", userGesture: true });
      await settle();
      check(await measure(false));
      await call('Runtime.evaluate', { expression: "document.querySelector('.landing-menu-actions > button:last-child').click()", userGesture: true });
      await waitForSelector('.mobile-joystick');
      await settle();
      check(await measure(true));
      await evaluate("document.exitFullscreen()");
      await settle();
      if (await evaluate("document.querySelector('.game-app').dataset.state==='paused'")) {
        await evaluate("document.querySelector('.header-pause-control').click()");
        await waitForSelector('.mobile-joystick');
        await settle();
      }
      check(await measure(true));
      console.log('PASS mobile landscape Home/gameplay edges, fullscreen/windowed, safe area '+JSON.stringify(insets));
    }
  } else if (process.env.CHECK_JOYSTICK === '1') {
    await call('Page.navigate', { url: 'http://127.0.0.1:5537/' });
    await waitForSelector('.landing-menu-panel');
    const result = await evaluate(`(async () => {
      const {joystickDirection}=await import('/src/joystickGesture.ts');
      const {createBossArena,stepBossArena}=await import('/src/boxingRules.ts');
      const check=(condition,message)=>{if(!condition) throw new Error(message);};
      for(const [x,y,expectedX,expectedY] of [[0,-1,0,-1],[-0.7,-0.7,-1,-1],[0.7,-0.7,1,-1],[-1,0,-1,0],[1,0,1,0],[0,0,0,0],[0,1,0,0],[-0.7,0.7,-1,0],[0.7,0.7,1,0],[0.1,-1,0,-1]]) {
        const direction=joystickDirection(x,y);
        check(direction.x===expectedX && direction.y===expectedY,'Sector '+x+','+y);
      }
      for(const direction of [-1,0,1]) {
        const a=createBossArena();
        a.left=-10000; a.right=10000; a.heightAt=()=>300; a.safeHeightAt=()=>300;
        a.player.x=0; a.player.y=300; a.player.invulnerable=10000;
        a.boss.x=9000; a.nextDrop=a.nextBird=a.nextCandleSurprise=Infinity;
        a.joystickJumpHeld=true; a.doubleJumpAt=()=>true;
        let jumps=0;
        for(let frame=0;frame<200;frame++) {
          const vy=a.player.vy;
          stepBossArena(a,direction,()=>0.5);
          if(vy>=0 && a.player.vy<0) jumps++;
          check(a.player.jumps<=1,'Holding must not consume an airborne double jump');
        }
        check(jumps>=3,'Repeated jumps without further pointer events');
        check(direction===0 ? a.player.x===0 : a.player.x*direction>0,'Jump plus movement');
        a.joystickJumpHeld=false;
        for(let frame=0;frame<100;frame++) stepBossArena(a,0,()=>0.5);
        check(a.player.grounded && a.player.vy===0,'Release stops repeated jumping');
      }
      const {default:React}=await import('/node_modules/.vite/deps/react.js');
      const {default:{createRoot}}=await import('/node_modules/.vite/deps/react-dom_client.js');
      const {MobileJoystick}=await import('/src/MobileJoystick.tsx');
      const host=document.createElement('div');document.body.append(host);
      const root=createRoot(host), moves=[];let presses=0,releases=0;
      const render=enabled=>root.render(React.createElement(MobileJoystick,{movementEnabled:enabled,onMove:(x,y)=>moves.push([x,y]),onPress:()=>presses++,onRelease:()=>releases++}));
      render(true); await new Promise(r=>setTimeout(r,100));
      const el=host.firstElementChild;el.setPointerCapture=()=>{};
      const rect=el.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,r=rect.width*0.29;
      const send=(type,x,y)=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,clientX:cx+x*r,clientY:cy+y*r}));
      send('pointerdown',-0.7,-0.7);check(JSON.stringify(moves.at(-1))==='[-1,-1]' && presses===0,'Upper diagonal works on initial touch');
      send('pointermove',0,-1);check(JSON.stringify(moves.at(-1))==='[0,-1]','Slide to straight up');
      send('pointermove',1,0);check(JSON.stringify(moves.at(-1))==='[1,0]','Middle line stops jumping');
      send('pointermove',0.7,-0.7);check(JSON.stringify(moves.at(-1))==='[1,-1]','Slide to upper right');
      send('pointerup',0.7,-0.7);check(JSON.stringify(moves.at(-1))==='[0,0]' && releases===1,'Release clears both axes');
      send('pointerdown',0,-1);send('pointercancel',0,-1);check(JSON.stringify(moves.at(-1))==='[0,0]','Cancel clears input');
      send('pointerdown',0,-1);window.dispatchEvent(new Event('blur'));check(JSON.stringify(moves.at(-1))==='[0,0]','Blur clears input');
      render(false);await new Promise(r=>setTimeout(r,50));
      send('pointerdown',0,0);check(presses===1,'Normal mode retains tap to jump');send('pointerup',0,0);
      root.unmount();host.remove();return true;
    })()`);
    assert.equal(result,true);
    console.log('PASS joystick sectors, initial touch, dragging, continuous jump physics, diagonal movement, release/cancel/blur and normal tap');
  } else if (process.env.CHECK_LANDING_SCORE === '1') {
    for (const [width, height, mobile, touch = mobile] of [[1920, 800, false], [1440, 900, false], [844, 390, true], [798, 354, true, false], [390, 844, true], [359, 798, true, false], [360, 640, true]]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
      await call('Emulation.setTouchEmulationEnabled', { enabled: touch });
      for (const theme of ['light', 'dark']) {
        await call('Page.navigate', { url: 'http://127.0.0.1:5537/' });
        await waitForSelector('.landing-menu-panel');
        await evaluate(`localStorage.setItem('cr_theme','${theme}')`);
        await call('Page.navigate', { url: 'http://127.0.0.1:5537/?score=37135' });
        await waitForSelector('.landing-score canvas:not([hidden])');
        await settle();
        assert.equal(await evaluate("document.querySelector('.game-app').dataset.state"), 'menu');
        assert.equal(await evaluate("!!document.querySelector('.menu-celebration, .share-dd-dialog, .game-result')"), false);
        assert.equal(await evaluate("document.querySelector('.landing-score').getAttribute('aria-label')"), 'Shared best score: 37,135');
        const layout = await evaluate(`(async () => {
          const r=s=>document.querySelector(s).getBoundingClientRect();
          const art=r('.landing-score canvas'), panel=r('.landing-menu-panel'), actions=r('.landing-menu-actions'), donate=r('.home-coffee-link'), guide=r('.landing-menu-guide-button'), footer=r('.site-footer');
          const overlap=(a,b)=>a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top;
          const canvas=document.querySelector('.landing-score canvas'), ctx=canvas.getContext('2d');
          const target=${height > width} ? guide : donate;
          // Independently measure native alpha bounds to locate the body axis
          // and higher shoe, rather than centering the briefcase-inclusive box.
          const image=new Image(); image.src='/images/score-back${theme === 'dark' ? '-inverted' : ''}.png'; await image.decode();
          const probe=document.createElement('canvas'); probe.width=image.naturalWidth; probe.height=image.naturalHeight;
          const pc=probe.getContext('2d'); pc.drawImage(image,0,0);
          const pixels=pc.getImageData(0,0,probe.width,probe.height);
          let minX=probe.width,minY=probe.height,maxX=-1,maxY=-1;
          for(let y=0;y<probe.height;y++) for(let x=0;x<probe.width;x++) {
            if(pixels.data[(y*probe.width+x)*4+3]<=16) continue;
            minX=Math.min(minX,x); maxX=Math.max(maxX,x); minY=Math.min(minY,y); maxY=Math.max(maxY,y);
          }
          const axis=(probe.width*0.407-minX)/(maxX-minX+1), baseline=(probe.height*0.965-minY)/(maxY-minY+1);
          const grounded={left:art.left,right:art.right,top:art.top,bottom:art.top+art.height*baseline};
          return { visible:art.width>0 && art.height>0, inside:art.left>=panel.left && art.right<=panel.right && art.top>=panel.top && art.bottom<=(${mobile} ? panel.bottom : footer.bottom)+1,
            overlap:${mobile} ? grounded.bottom>target.top+1 : overlap(art,actions)||overlap(art,donate), painted:ctx.getImageData(canvas.width/2,canvas.height/2,1,1).data[3]>0,
            anchored: ${mobile} ? Math.abs(grounded.bottom-target.top)<1 && Math.abs(art.left+art.width*axis-target.left-target.width/2)<1 && art.bottom>target.top : Math.abs(art.bottom-footer.bottom)<1 && Math.abs(art.left-donate.right-8)<1,
            smaller: ${mobile && height > width} ? art.height<=288.1 : true,
            centered: ${mobile && height > width} ? Math.abs(actions.top+actions.height/2-panel.top-panel.height/2)<1 : true };
        })()`);
        if (layout.overlap) console.log(await evaluate("JSON.stringify(['.landing-score canvas','.landing-menu-panel','.landing-menu-actions','.home-coffee-link'].map(s=>[s,document.querySelector(s).getBoundingClientRect().toJSON()]))"));
        assert.deepEqual(layout, { visible: true, inside: true, overlap: false, painted: true, anchored: true, smaller: true, centered: true }, `${width}x${height} ${theme}: ${JSON.stringify(layout)}`);
        console.log(`PASS shared score Home ${width}x${height} ${theme}`);
      }
    }
    for (const query of ['', '?score=invalid', '?score=-1']) {
      await call('Page.navigate', { url: `http://127.0.0.1:5537/${query}` });
      await waitForSelector('.menu-celebration');
      assert.equal(await evaluate("document.querySelector('.landing-score')"), null);
    }
    console.log('PASS normal Home and invalid score links keep the celebration hero');
  } else {
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
        const heading=card.querySelector('.mechanics-guide-title').getBoundingClientRect();
        const paragraph=text.querySelector('p').getBoundingClientRect();
        const bottom=card.getBoundingClientRect().bottom-parseFloat(getComputedStyle(card).borderBottomWidth);
        if(Math.abs((paragraph.top-heading.bottom)-(bottom-paragraph.bottom))>1) throw new Error('Guide description has equal gaps below its heading and above the card bottom: '+JSON.stringify({title:card.querySelector('h3').textContent,above:paragraph.top-heading.bottom,below:bottom-paragraph.bottom}));
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
      const settings=panel.querySelector('.settings-options');
      if(settings) {
        const labels=[...settings.querySelectorAll('.settings-label')].map(label=>label.textContent.trim());
        if(JSON.stringify(labels)!==JSON.stringify(['Sound (M)','Theme (N)','Shmuck Feed','Animations','High contrast'])) throw new Error('Settings order: Sound, Theme, Shmuck Feed, Animations, High contrast');
        const shortcuts=[...settings.querySelectorAll('.settings-label strong')];
        if(shortcuts.map(key=>key.textContent).join('')!=='MN' || shortcuts.some(key=>parseInt(getComputedStyle(key).fontWeight,10)<700)) throw new Error('Settings shortcut letters M and N are bold');
      }
      if(matchMedia('(pointer: coarse)').matches) {
        if(['borderTopLeftRadius','borderTopRightRadius','borderBottomLeftRadius','borderBottomRightRadius'].some(key=>parseFloat(getComputedStyle(panel)[key])!==0)) throw new Error('Mobile information panels must have square corners');
        const header=document.querySelector('header').getBoundingClientRect();
        const footer=document.querySelector('.site-footer').getBoundingClientRect();
        const feed=document.querySelector('.desktop-live-feed-bar').getBoundingClientRect();
        const top=feed.height>0?feed.bottom:header.bottom;
        const bottom=footer.height>0?footer.top:document.querySelector('.game-app').getBoundingClientRect().bottom;
        if(Math.abs(p.top-top)>1 || Math.abs(p.bottom-bottom)>1 || Math.abs(p.width-innerWidth)>1) throw new Error('Mobile information fills all space below the feed (or header when disabled) and above the footer');
        if(Math.abs(close.top-p.top-(p.right-close.right))>0.1) throw new Error('Mobile information X has equal top and right insets');
        const fullscreen=document.querySelector('.desktop-fullscreen-control').getBoundingClientRect();
        if(Math.abs(close.right-fullscreen.right)>0.1 || close.width!==fullscreen.width) throw new Error('Mobile information X must align below Fullscreen');
        const style=getComputedStyle(panel);
        if(style.borderTopWidth!=='0px' || style.borderBottomWidth!=='0px') throw new Error('Mobile information must not double the feed/footer separators');
        const content=panel.querySelector('.site-info-content'), body=panel.querySelector('.site-info-body');
        const c=content.getBoundingClientRect(), b=body.getBoundingClientRect();
        const heading=panel.querySelector('.site-info-header').getBoundingClientRect();
        const art=panel.querySelector('.site-info-artwork'), a=art.getBoundingClientRect();
        const expectedAssets={About:'coin',Privacy:'briefcase',Disclaimer:'bag',Preferences:'banana',Settings:'diamond'};
        if(art.dataset.infoAsset!==expectedAssets[panel.querySelector('.site-info-title').textContent]) throw new Error('Information section uses its matching game artwork');
        const canvas=art.querySelector('canvas'), image=canvas.getBoundingClientRect();
        const section=body.dataset.infoSection, afterContent=['Settings','About','Disclaimer'].includes(section);
        const iconSize=section==='Disclaimer'?52:64;
        if(image.width!==iconSize || image.height!==iconSize || Math.abs(a.left+a.width/2-p.left-p.width/2)>1 || a.top<heading.bottom-1) throw new Error('Mobile information artwork has the correct size and horizontal alignment');
        if(!canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3 && v>0)) throw new Error('Information artwork is painted');
        const bottomItem=panel.querySelector('.site-info-bottom');
        const main=panel.querySelector('.site-info-main').getBoundingClientRect();
        if(section==='Settings' && Math.abs(main.top+content.scrollTop-heading.bottom-8)>1) throw new Error('Mobile Settings starts 8px below its heading in both orientations');
        if(afterContent) {
          if(image.top<main.bottom) throw new Error('Settings, About and Disclaimer artwork follows the section content');
          if(bottomItem && image.bottom>bottomItem.getBoundingClientRect().top) throw new Error('About coin stays above copyright');
        } else if(Math.abs((image.top+image.height/2)-(heading.bottom+main.top)/2+content.scrollTop/2)>1) throw new Error('Information icon is vertically centered between heading and first content element');
        if(bottomItem && b.height<=c.height+1) {
          const bottomRect=bottomItem.getBoundingClientRect(), button=bottomItem.querySelector('button');
          if(button) {
            const r=button.getBoundingClientRect();
            if(section==='Preferences') {
              if(Math.abs((r.top+r.bottom-main.bottom-p.bottom)/2)>1) throw new Error('Clear preferences is centered between the text and panel bottom');
            } else if(Math.abs(p.bottom-r.bottom-8)>1) throw new Error('Reset stays in the bottom action row');
          } else if(Math.abs(p.bottom-bottomRect.bottom)>1) throw new Error('Copyright stays at the panel bottom');
        }
        if(b.height<=c.height) {
          if(Math.abs((b.top-heading.bottom)-(p.bottom-b.bottom))>1) throw new Error('Mobile information body is centered between heading and panel bottom');
        } else {
          if(b.top+content.scrollTop<c.top-1 || !['auto','scroll'].includes(getComputedStyle(content).overflowY)) throw new Error('Long information content starts at the top and remains scrollable: '+JSON.stringify({bodyTop:b.top,contentTop:c.top,scroll:content.scrollTop,overflow:getComputedStyle(content).overflowY,bodyHeight:b.height,contentHeight:c.height}));
        }
      }
      if(matchMedia('(pointer: fine)').matches) {
        const content=panel.querySelector('.site-info-content'), body=panel.querySelector('.site-info-body');
        const c=content.getBoundingClientRect(), b=body.getBoundingClientRect();
        const art=panel.querySelector('.site-info-artwork'), canvas=art.querySelector('canvas'), image=canvas.getBoundingClientRect();
        const main=panel.querySelector('.site-info-main').getBoundingClientRect();
        const expectedSize=body.dataset.infoSection==='Disclaimer'?52:64;
        if(image.width!==expectedSize || image.height!==expectedSize || (body.dataset.infoSection!=='Preferences' && image.top<main.bottom) || Math.abs(image.left+image.width/2-p.left-p.width/2)>1) throw new Error('Desktop information artwork is visible and centered');
        if(!canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3 && v>0)) throw new Error('Desktop information artwork is painted');
        const bottom=panel.querySelector('.site-info-bottom');
        if(bottom && b.height<=c.height+1) {
          if(body.dataset.infoSection==='Preferences') {
            const button=bottom.querySelector('button').getBoundingClientRect();
            if(Math.abs((button.top+button.bottom-main.bottom-p.bottom)/2)>1) throw new Error('Desktop Clear preferences is centered below text: '+JSON.stringify({button:[button.top,button.bottom],text:main.bottom,panel:p.bottom,content:c.bottom,rows:getComputedStyle(body).gridTemplateRows}));
          } else if(Math.abs(bottom.getBoundingClientRect().bottom-c.bottom)>1) throw new Error('Desktop copyright stays at the content bottom');
        }
        if(b.height>c.height && b.top+content.scrollTop<c.top-1) throw new Error('Overflowing desktop information remains accessible from its start');
      }
      if(settings && !panel.querySelector('.site-info-body > .site-info-bottom > .settings-reset-button')) throw new Error('Settings reset belongs to the shared bottom action row, not the options');
      for(const button of panel.querySelectorAll('.site-info-contact-button')) {
        const r=button.getBoundingClientRect(), icon=button.querySelector('svg').getBoundingClientRect();
        if(r.width!==36 || r.height!==36 || icon.width!==20 || icon.height!==20) throw new Error('About contact buttons match Share actions: 36px buttons and 20px icons');
      }
      const clear=panel.querySelector('.preferences-clear-button');
      const homeButton=document.querySelector('.landing-menu-settings-button');
      if(clear && homeButton) {
        const c=clear.getBoundingClientRect(), home=homeButton.getBoundingClientRect();
        if(Math.abs(c.width-home.width)>1 || Math.abs(c.height-home.height)>1) throw new Error('Clear saved preferences matches Home button dimensions: '+JSON.stringify({clear:[c.width,c.height],home:[home.width,home.height]}));
      }
      const targetBottom=matchMedia('(pointer: coarse)').matches && '${selector}'==='.share-dd-dialog'
        ? Math.min(target.bottom, document.querySelector('.site-footer').getBoundingClientRect().height>0?document.querySelector('.site-footer').getBoundingClientRect().top:target.bottom)
        : target.bottom;
      const contacts=panel.querySelector('.about-contact-links');
      if(contacts && parseFloat(getComputedStyle(contacts).marginTop)<parseFloat(getComputedStyle(contacts).lineHeight)+12-1) throw new Error('About leaves an extra text line before contact buttons');
      return {covers:p.left<=target.left+1 && p.right>=target.right-1 && p.top<=target.top+1 && p.bottom>=targetBottom-1,
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
  await evaluate(`(async () => {
    const {drawBoxingGlove}=await import('/src/boxingGloveRenderer.ts');
    const {drawPaulGlove}=await import('/src/paulModel.ts');
    const {drawBossEncounter}=await import('/src/bossRenderer.ts');
    const {createBossArena}=await import('/src/boxingRules.ts');
    if(drawPaulGlove!==drawBoxingGlove) throw new Error('Paul uses the shared boxing glove model');
    for(const kind of ['jerome','janet','paul']) for(const facing of [-1,1]) for(const attacking of [false,true]) {
      const canvas=document.createElement('canvas'); canvas.width=600; canvas.height=400;
      const ctx=canvas.getContext('2d'), arena=createBossArena(kind);
      Object.assign(arena.boss,{x:300,y:300,facing,arm:1,attack:attacking?24:0,attackKind:kind==='paul'?'hook':'punch'});
      drawBossEncounter(ctx,arena);
      const pixels=ctx.getImageData(0,0,600,400).data;
      let red=0;
      for(let i=0;i<pixels.length;i+=4) if(pixels[i]>pixels[i+1]*1.5 && pixels[i]>pixels[i+2]*1.2 && pixels[i+3]>200) red++;
      if(red<20) throw new Error('Boxing gloves render in guard and attack poses for '+kind+' facing '+facing);
    }
  })()`);
  console.log('PASS shared boxing glove model for all three characters, guard/attack and both facings');
  const bellBalance = await evaluate(`(async () => {
    const {createBossArena,bossMaxHealth,bossWinPips,throwBossCase}=await import('/src/boxingRules.ts');
    return ['janet','jerome','paul'].map(kind=>{
      const arena=createBossArena(kind), initial=arena.boss.health;
      arena.player.x=arena.boss.x-30; arena.player.y=arena.boss.y;
      arena.player.facing=1; arena.weapon='bat'; arena.uses=100;
      let hits=0;
      while(arena.result==='fight' && hits<30) {
        arena.player.throwTimer=0; arena.swing=0;
        throwBossCase(arena); hits++;
      }
      if(arena.result!=='win' || arena.boss.health!==0 || initial!==bossMaxHealth(kind)) throw new Error('Boss damage reaches victory at its configured HP: '+kind);
      return {kind,hp:initial,reward:bossWinPips(kind),hits};
    });
  })()`);
  assert.deepEqual(bellBalance,[{kind:'janet',hp:100,reward:1000,hits:7},{kind:'jerome',hp:200,reward:2000,hits:13},{kind:'paul',hp:300,reward:3000,hits:19}], 'Bell difficulty and win rewards increase from Janet to Jerome to Paul');
  console.log('PASS Bell HP, lethal damage and win rewards: '+JSON.stringify(bellBalance));
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
  for (const width of [320, 390, 430]) {
    await call('Emulation.setTouchEmulationEnabled', {enabled:true});
    await call('Emulation.setDeviceMetricsOverride', {width,height:844,deviceScaleFactor:1,mobile:true});
    await settle();
    for (const theme of ['light','dark']) {
      await evaluate(`document.documentElement.dataset.theme='${theme}'`);
      const edges=await evaluate(`(() => {
        const chart=document.querySelector('.landing-menu-chart');
        const candles=[...chart.querySelectorAll('g[clip-path] > g')];
        return {portrait:chart.dataset.layout==='portrait', overflow:document.documentElement.scrollWidth>innerWidth,
          bars:[0,1].map(index=>{
            const first=candles[0].querySelectorAll('rect')[index].getBoundingClientRect();
            const last=candles.at(-1).querySelectorAll('rect')[index].getBoundingClientRect();
            return {left:first.left,right:last.right-innerWidth,width:first.width};
          })};
      })()`);
      assert.ok(edges.portrait && !edges.overflow && edges.bars.every(bar=>bar.left<=0 && bar.right>=0 && Math.abs(bar.width-3.6)<0.01), 'Portrait candles and volume cover both screen edges: '+JSON.stringify(edges));
      console.log('PASS portrait candle and volume screen edges '+width+'px '+theme);
    }
  }
  await call('Emulation.setTouchEmulationEnabled', {enabled:false});
  await call('Emulation.setDeviceMetricsOverride', {width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await settle();
  assert.equal(await evaluate("!!document.querySelector('[aria-label=\"Start Bell challenge against Pául\"]')"), false, 'Bell developer shortcut is removed from the header');
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
      assert.equal(menu.feed.y - menu.header.bottom, 0, 'No gap above Shmuck Feed');
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
        await evaluate("document.querySelector('button[aria-label=\"Shmuck Feed\"]').click(); document.querySelector('.site-info-close').click()");
        await settle();
        const hiddenFeed = await evaluate(`(() => {
          const bar = document.querySelector('.desktop-live-feed-bar');
          return { hidden: bar.hidden, height: bar.getBoundingClientRect().height,
            margin: getComputedStyle(bar).marginTop,
            reserved: parseFloat(document.querySelector('.game-app').style.getPropertyValue('--live-feed-height')) };
        })()`);
        assert.deepEqual(hiddenFeed, { hidden: true, height: 0, margin: '0px', reserved: 0 }, 'Disabled mobile feed removes entire strip and reserved space');
        assert.deepEqual(await evaluate('window.__checkCountdown()'), { pixel: [163, 230, 53, 255], tapeHeight: 0 }, 'Disabled Shmuck Feed keeps the active countdown visible at the chart top on mobile');
        const volumes = await evaluate('window.__checkVolumes()');
        assert.ok(volumes.bars.length > 0, 'Mobile gameplay draws volume bars');
        assert.ok(volumes.bars.every(bar => Math.abs(bar.bottom - volumes.baseline) < 0.01 && bar.scaleY === 1 && Math.abs(bar.width - volumes.barWidth) < 0.01), 'Mobile volume bars stay above the time axis and match candle widths without vertical zoom');
        await evaluate("document.querySelector('.landing-menu-settings-button').click()");
        await settle();
        await evaluate("document.querySelector('button[aria-label=\"Shmuck Feed\"]').click(); document.querySelector('.site-info-close').click()");
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
          leftInset: rect.left - chart.left, bottomInset: chart.top + parseFloat(document.querySelector('#landing-chart-plot rect').getAttribute('height')) - rect.bottom,
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
      assert.ok(await evaluate("(() => {const button=document.querySelector('.landing-menu-actions > button:last-child'), icon=button.querySelector('.new-game-space-key'), b=button.getBoundingClientRect(), r=icon.getBoundingClientRect(); return r.width===64 && r.left>=b.left && r.right<=b.right && r.top>=b.top && r.bottom<=b.bottom;})()"), 'Start has the same contained Space Bar hint as New Game');
      assert.ok(Math.abs(homeStyle.labelOffset) < 1 && Math.abs(homeStyle.cupOffset) < 1, 'Donate text and icon are vertically centered');
      assert.ok(homeStyle.insideChart && Math.abs(homeStyle.leftInset - homeStyle.logoLeft) < 1 && Math.abs(homeStyle.bottomInset - homeStyle.logoLeft) < 1, 'Donate left gutter and gap above time-axis line match the logo left gutter');
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
      assert.equal(chrome.feedBorder, chrome.footerColor, 'Shmuck Feed separator matches footer');
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
      const coinBefore=await evaluate("document.querySelector('.info-artwork-button').getBoundingClientRect().toJSON()");
      await evaluate("document.querySelector('.info-artwork-button').click()");
      await settle();
      await settle();
      assert.equal(await evaluate(`(() => {
        const button=document.querySelector('.info-artwork-button'), r=button.getBoundingClientRect();
        const front=button.querySelector('.info-coin-front canvas'), back=button.querySelector('.info-coin-back canvas');
        return button.dataset.side==='B' && front.toDataURL()!==back.toDataURL()
          && Math.abs(r.x-${coinBefore.x})<1 && Math.abs(r.y-${coinBefore.y})<1
          && Math.abs(r.width-${coinBefore.width})<1 && Math.abs(r.height-${coinBefore.height})<1;
      })()`), true, 'About coin flips to its B face without moving or resizing');
      await evaluate("document.querySelector('.info-artwork-button').click()");
      await settle();
      assert.equal(await evaluate("document.querySelector('.info-artwork-button').dataset.side"), 'M', 'Coin flips back on another click');
      await evaluate("document.querySelector('.stonks-copyright-button').click()");
      await waitForSelector('.stonks-dialog');
      for (let attempt = 0; attempt < 100; attempt++) {
        if (await evaluate("document.querySelector('.stonks-canvas-frame').getAttribute('aria-busy')==='false'")) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.equal(await evaluate(`(() => {
        const panel=document.querySelector('.stonks-dialog'), r=panel.getBoundingClientRect();
        const canvas=panel.querySelector('canvas');
        const paper=getComputedStyle(document.querySelector('.game-app')).getPropertyValue('--panel').trim();
        const probe=document.createElement('span'); probe.style.color=paper; document.body.append(probe);
        const expected=getComputedStyle(probe).color; probe.remove();
        return !panel.querySelector('.stonks-error, .stonks-loading')
          && panel.querySelectorAll('.stonks-traits > div').length>0
          && !/[\\u0400-\\u04ff]/.test(panel.textContent)
          && getComputedStyle(panel).backgroundColor===expected
          && r.left>=0 && r.top>=0 && r.right<=innerWidth && r.bottom<=innerHeight
          && panel.scrollWidth<=panel.clientWidth+1
          && canvas.getContext('2d').getImageData(0,0,512,512).data.some(value=>value!==0)
          && document.activeElement===panel.querySelector('.stonks-close');
      })()`), true, 'Copyright opens a themed, English Stonks generator with rendered artwork and no overflow');
      assert.equal(await evaluate("document.querySelectorAll('.stonks-actions button').length===1 && document.querySelector('.stonks-actions button').textContent.trim()==='Download' && !document.querySelector('.stonks-actions button svg') && getComputedStyle(document.querySelector('.stonks-close')).borderTopWidth==='0px'"), true, 'Stonks has a text-only Download button, a borderless close button and no Generate action');
      await evaluate("document.querySelector('.stonks-close').click()");
      await settle();
      await evaluate("document.querySelector('.stonks-copyright-button').click()");
      await waitForSelector('.stonks-dialog');
      for (let attempt = 0; attempt < 100; attempt++) {
        if (await evaluate("document.querySelector('.stonks-canvas-frame').getAttribute('aria-busy')==='false'")) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.equal(await evaluate(`(() => {
        let downloaded=false;
        const original=HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click=function(){downloaded=/^stonk-\\d+\\.png$/.test(this.download)&&this.href.startsWith('data:image/png');};
        try { document.querySelector('.stonks-actions button:last-child').click(); }
        finally { HTMLAnchorElement.prototype.click=original; }
        return downloaded;
      })()`), true, 'Reopening Copyright generates a Stonk with a locally generated PNG download');
      await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
      await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
      await settle();
      assert.equal(await evaluate("!document.querySelector('.stonks-dialog') && document.activeElement===document.querySelector('.stonks-copyright-button') && !!document.querySelector('.site-info-dialog')"), true, 'Escape closes only Stonks and restores Copyright focus');
      console.log(`PASS Copyright Stonks generator, theme, English text, PNG download and focus restoration ${width}x${height} ${theme}`);
      await evaluate("document.querySelector('.site-info-close').click()");
      await evaluate("[...document.querySelectorAll('.site-footer nav button')].find(button=>button.textContent.trim()==='Privacy').click()");
      await settle();
      await checkInfoCard('.landing-menu-actions');
      await evaluate("document.querySelector('.info-artwork-button').click()");
      await settle();
      assert.equal(await evaluate("Number(document.querySelector('.info-artwork-button').dataset.scale)"), 0.9, 'Privacy briefcase shrinks slightly on first click');
      for(let click=0;click<12;click++) await evaluate("document.querySelector('.info-artwork-button').click()");
      await settle();
      assert.equal(await evaluate("Number(document.querySelector('.info-artwork-button').dataset.scale)===0 && document.querySelector('.info-briefcase-scale').getBoundingClientRect().width===0"), true, 'Repeated clicks shrink the briefcase to zero without negative scaling');
      await evaluate("document.querySelector('.site-info-close').click()");
      await evaluate("[...document.querySelectorAll('.site-footer nav button')].find(button=>button.textContent.trim()==='Preferences').click()");
      await settle();
      await checkInfoCard('.landing-menu-actions');
      await evaluate("document.querySelector('.site-info-close').click()");
      for (const section of ['Disclaimer', 'Preferences', 'About', 'Privacy']) {
        const openSection=()=>evaluate(`[...document.querySelectorAll('.site-footer nav button')].find(button=>button.textContent.trim()==='${section}').click()`);
        await openSection(); await settle();
        const initial=await evaluate("document.querySelector('.info-artwork-button').outerHTML");
        if(section==='Disclaimer') {
          await evaluate("document.querySelector('.info-artwork-button').click()"); await settle();
          assert.equal(await evaluate("document.querySelector('.info-artwork-button').dataset.clown"), 'true', 'Disclaimer clown emerges');
          await evaluate('new Promise(resolve=>setTimeout(resolve,2700))');
          assert.equal(await evaluate("document.querySelector('.info-artwork-button').dataset.clown"), 'false', 'Clown hides after 2.5 seconds');
        } else if(section==='Preferences') {
          for(const fruit of ['orange','apple','kiwi','tomato']) {
            await evaluate("document.querySelector('.info-artwork-button').click()"); await settle();
            assert.equal(await evaluate("document.querySelector('.info-artwork-button').dataset.fruit"), fruit, 'Fruit sequence advances to '+fruit);
          }
          assert.equal(await evaluate("document.querySelector('.info-artwork-button').disabled"), true, 'Tomato is the final non-interactive fruit');
        } else { await evaluate("document.querySelector('.info-artwork-button').click()"); await settle(); }
        await evaluate("document.querySelector('.site-info-close').click()"); await settle();
        await openSection(); await settle();
        assert.equal(await evaluate("document.querySelector('.info-artwork-button').outerHTML"), initial, section+' easter egg resets on closing');
        await evaluate("document.querySelector('.site-info-close').click()"); await settle();
      }
      console.log(`PASS information easter eggs and reset on close ${width}x${height} ${theme}`);
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
  await evaluate("document.querySelector('.settings-diamond-button').click()");
  await settle();
  assert.equal(await evaluate("document.querySelector('.settings-diamond-message').textContent"), "Don't drop it!");
  assert.equal(await evaluate("document.querySelector('.settings-diamond-effect').dataset.phase"), 'holding');
  await evaluate("window.dispatchEvent(new PointerEvent('pointermove',{clientX:900,clientY:350}))");
  const heldDiamond = await evaluate("document.querySelector('.settings-diamond-bare').toDataURL()");
  await settle();
  assert.notEqual(await evaluate("document.querySelector('.settings-diamond-bare').toDataURL()"), heldDiamond, 'Held diamond spins');
  assert.ok(await evaluate("(() => {const c=document.querySelector('.settings-diamond-bare'),ctx=c.getContext('2d');return !document.querySelector('.settings-diamond-floating canvas[aria-label]') && ctx.getImageData(80,5,1,1).data[3]===0 && ctx.getImageData(80,80,1,1).data[3]>0;})()"), 'Picked diamond is painted without the shield preview');
  assert.ok(await evaluate("(() => {const r=document.querySelector('.settings-diamond-floating').getBoundingClientRect();return Math.abs(r.left+r.width/2-900)<1 && r.bottom<350;})()"), 'Diamond follows above the cursor');
  assert.equal(await evaluate("document.querySelector('.settings-diamond-effect').style.pointerEvents || getComputedStyle(document.querySelector('.settings-diamond-effect')).pointerEvents"), 'none');
  await evaluate("new Promise(resolve=>setTimeout(resolve,4400))");
  assert.equal(await evaluate("document.querySelector('.settings-diamond-effect')?.dataset.phase"), 'falling');
  assert.equal(await evaluate("document.querySelector('.settings-diamond-message').textContent"), '😤', 'Dropping the diamond replaces the warning with the emoji');
  assert.equal(await evaluate("document.querySelector('.settings-diamond-paper-hands').textContent"), 'Paper Hands');
  for (const theme of ['light','dark']) {
    await evaluate(`document.querySelector('.settings-diamond-effect').dataset.theme='${theme}'`);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.settings-diamond-paper-hands')).color"),theme==='light'?'rgb(0, 0, 0)':'rgb(255, 255, 255)','Paper Hands contrasts with the theme');
  }
  const droppedDiamond = await evaluate("document.querySelector('.settings-diamond-bare').toDataURL()");
  const fallingTop=await evaluate("document.querySelector('.settings-diamond-floating').getBoundingClientRect().top");
  await settle();
  assert.notEqual(await evaluate("document.querySelector('.settings-diamond-bare').toDataURL()"), droppedDiamond, 'Dropped diamond tumbles as it falls');
  assert.ok(await evaluate("document.querySelector('.settings-diamond-floating').getBoundingClientRect().top")>fallingTop, 'Diamond falls down the viewport');
  await evaluate("new Promise(resolve=>setTimeout(resolve,1100))");
  assert.ok(await evaluate("!document.querySelector('.settings-diamond-button') && !document.querySelector('.settings-diamond-effect') && document.querySelector('.settings-diamond-message').textContent==='😤'"), 'Dropped diamond keeps the emoji until Settings closes');
  await evaluate("document.querySelector('.site-info-close').click()");
  await settle();
  assert.equal(await evaluate("document.querySelector('.settings-diamond-effect')"), null, 'Closing Settings cleans up the diamond effect');
  await evaluate("document.querySelector('.landing-menu-settings-button').click()");
  await settle();
  assert.equal(await evaluate("!!document.querySelector('.settings-diamond-button') && !document.querySelector('.settings-diamond-message')"), true, 'Reopening Settings resets the diamond easter egg');
  await evaluate("document.querySelector('.settings-diamond-button').click()"); await settle();
  await evaluate("document.querySelector('.site-info-close').click()"); await settle();
  assert.equal(await evaluate("document.querySelector('.settings-diamond-effect')"), null, 'Closing Settings during pickup removes the floating diamond');
  await evaluate("document.querySelector('.landing-menu-settings-button').click()"); await settle();
  console.log('PASS Settings diamond pickup, cursor tracking, five-second hold, fall, emoji and reset on close');
  await evaluate("document.querySelector('button[aria-label=\"High contrast\"]').click()");
  await settle();
  assert.equal(await evaluate("document.documentElement.dataset.highContrast"), 'true');
  assert.equal(await evaluate("localStorage.getItem('cr_high_contrast')"), 'true');
  await evaluate("document.querySelector('.settings-reset-button').click()");
  await settle();
  assert.deepEqual(await evaluate("({theme:document.documentElement.dataset.theme,contrast:document.documentElement.dataset.highContrast,volume:document.querySelector('#settings-volume').value,animations:document.querySelector('.game-app').dataset.animations,feed:document.querySelector('.game-app').dataset.liveFeed})"), {theme:'dark',contrast:'false',volume:'100',animations:'true',feed:'true'}, 'Reset applies defaults immediately');
  assert.equal(await evaluate("document.querySelector('label[for=\"settings-volume\"]').textContent.trim()"), 'Sound (M)');
  assert.ok(await evaluate("document.querySelector('[aria-label=\"Night mode\"] .settings-label').textContent.includes('(N)')"), 'Settings displays theme shortcut');
  await evaluate("Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(document.querySelector('#settings-volume'), '0'); document.querySelector('#settings-volume').dispatchEvent(new Event('input', {bubbles:true})); document.querySelector('button[aria-label=\"Shmuck Feed\"]').click()");
  await settle();
  assert.equal(await evaluate("localStorage.getItem('cr_sound_enabled')"), 'false');
  await evaluate("document.querySelector('button[aria-label=\"Animations\"]').click()");
  await settle();
  assert.equal(await evaluate("document.querySelector('.game-app').dataset.animations"), 'false');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.game-overlay')).backdropFilter"), 'none');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.game-app')).transitionDuration"), '0s');
  assert.equal(await evaluate("localStorage.getItem('cr_live_feed')"), 'false');
  assert.equal(await evaluate("document.querySelector('button[aria-label=\"Shmuck Feed\"] .settings-label').textContent.trim()"), 'Shmuck Feed', 'Settings uses the renamed feed label');
  assert.deepEqual(await evaluate('window.__checkCountdown()'), { pixel: [163, 230, 53, 255], tapeHeight: 0 }, 'Disabled Shmuck Feed keeps the active countdown visible at the chart top on desktop');
  const desktopVolumes = await evaluate('window.__checkVolumes()');
  assert.ok(desktopVolumes.bars.length > 0 && desktopVolumes.bars.every(bar => Math.abs(bar.bottom - desktopVolumes.baseline) < 0.01 && bar.scaleY === 1), 'Desktop volume bars remain anchored above the time axis');
  assert.equal(await evaluate("document.querySelector('.desktop-live-feed-bar').getBoundingClientRect().height"), 0, 'Feed hidden without reserved space');
  await call('Page.reload');
  await settle();
  await settle();
  assert.equal(await evaluate("document.querySelector('.game-app').dataset.liveFeed"), 'false', 'Feed preference survives reload');
  await evaluate("document.querySelector('.landing-menu-settings-button').click()");
  await settle();
  assert.equal(await evaluate("document.querySelector('#settings-volume').value"), '0', 'Sound preference survives reload');
  assert.equal(await evaluate("document.querySelector('button[aria-label=\"Animations\"]').getAttribute('aria-checked')"), 'false', 'Animation preference survives reload');
  await evaluate("Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(document.querySelector('#settings-volume'), '65'); document.querySelector('#settings-volume').dispatchEvent(new Event('input', {bubbles:true})); document.querySelector('button[aria-label=\"Shmuck Feed\"]').click(); document.querySelector('.site-info-close').click()");
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
  await evaluate(`(() => {
    const root=document.documentElement, previous=root.dataset.theme;
    const joystick=document.querySelector('.mobile-joystick'), pressed=joystick.dataset.pressed;
    try {
      joystick.dataset.pressed='true';
      for(const theme of ['light','dark']) {
        root.dataset.theme=theme;
        if(getComputedStyle(joystick).backgroundColor!==(theme==='light'?'rgb(255, 255, 255)':'rgb(0, 0, 0)')) throw new Error('Pressed joystick uses white in day and black in night');
      }
    } finally {
      root.dataset.theme=previous;
      if(pressed===undefined) delete joystick.dataset.pressed; else joystick.dataset.pressed=pressed;
    }
  })()`);
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
  assert.equal(playing.feed, 'block', 'Mobile gameplay shows the enabled feed');
  assert.equal(playing.footer, 'none', 'Mobile gameplay hides footer');
  assert.equal(playing.liveFeed, 'true', 'Mobile gameplay preserves the enabled feed preference');
  assert.ok(Math.abs(playing.hudInset-playing.iconInset)<0.1 && Math.abs(playing.joystickLeft-playing.hudInset)<0.1, 'Pips and joystick match visible Fullscreen icon inset: '+JSON.stringify(playing));
  assert.ok(Math.abs(playing.hudTop-playing.hudInset)<0.1 && Math.abs(playing.joystickBottom-playing.hudInset)<0.1, 'Pips top and joystick bottom use the same edge inset');
  const fullscreenEdges = await evaluate(`(() => {
    const app=document.querySelector('.game-app').getBoundingClientRect();
    const svg=document.querySelector('.desktop-fullscreen-control svg'), r=svg.getBoundingClientRect(), b=svg.getBBox(), v=svg.viewBox.baseVal;
    const right=app.right-(r.left+(b.x+b.width+parseFloat(getComputedStyle(svg).strokeWidth)/2-v.x)*r.width/v.width);
    return {right, logo:document.querySelector('.header-logo-frame').getBoundingClientRect().left-app.left, fullscreen:!!document.fullscreenElement};
  })()`);
  assert.ok(fullscreenEdges.fullscreen && Math.abs(fullscreenEdges.right-fullscreenEdges.logo)<0.1 && Math.abs(fullscreenEdges.right-playing.hudInset)<0.1, 'Real fullscreen logo and gameplay HUD match the painted icon edge: '+JSON.stringify(fullscreenEdges));
  console.log('PASS mobile landscape Pips and joystick left/top/bottom match Fullscreen artwork inset');
  await settle();
  assert.equal(await evaluate("document.querySelector('.game-app').dataset.state"), 'paused', 'Pause control pauses gameplay');
  assert.ok(await evaluate("document.fullscreenElement===document.querySelector('.game-app')"), 'Pausing preserves fullscreen');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.site-footer')).display"), 'none', 'Paused fullscreen keeps footer hidden');
  await evaluate("document.querySelector('.header-pause-control').click()");
  await settle();
  assert.equal(await evaluate("document.querySelector('.game-app').dataset.state"), 'play', 'Resume control resumes gameplay');
  assert.ok(await evaluate("document.fullscreenElement===document.querySelector('.game-app')"), 'Resuming preserves fullscreen');
  await evaluate("document.querySelector('.header-pause-control').click()");
  await settle();
  await call('Runtime.evaluate', { expression: "document.querySelector('.desktop-fullscreen-control').click()", userGesture: true });
  await settle();
  assert.equal(await evaluate('!!document.fullscreenElement'), false, 'Fullscreen button explicitly exits fullscreen');
  assert.notEqual(await evaluate("getComputedStyle(document.querySelector('.site-footer')).display"), 'none', 'Pause restores footer');
  assert.equal(await evaluate("document.querySelector('.game-app').dataset.liveFeed"), 'true', 'Pause restores enabled feed');
  assert.ok(await evaluate("(() => {const button=document.querySelector('.pause-overlay .game-result-actions > button:last-child'), icon=button.querySelector('.new-game-space-key'), b=button.getBoundingClientRect(), r=icon.getBoundingClientRect(); return r.width===64 && r.left>=b.left && r.right<=b.right && r.top>=b.top && r.bottom<=b.bottom;})()"), 'Continue has the same contained Space Bar hint as New Game');
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
  for (const [width, height, touch] of [[1440, 900, false], [390, 844, true], [844, 390, true], [667, 375, true]]) {
    await call('Emulation.setTouchEmulationEnabled', { enabled: touch });
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: touch });
    await settle();
    for (const theme of ['light', 'dark']) {
      await evaluate(`document.documentElement.dataset.theme = '${theme}'`);
      const actions = await evaluate(`(() => {
        const buttons = [...document.querySelectorAll('.game-result-actions > button')];
        const rects = buttons.map(button => button.getBoundingClientRect());
        const panel=document.querySelector('.pause-overlay .game-result').getBoundingClientRect();
        const title=document.querySelector('.pause-overlay .game-result h2').getBoundingClientRect();
        return {sizes:rects.map(r => ({width:r.width,height:r.height})),
          titleTop:title.top-panel.top,
          topSpace:rects[0].top-title.bottom, bottomSpace:panel.bottom-rects.at(-1).bottom,
          shadows:buttons.map(button => getComputedStyle(button).boxShadow),
          gaps:rects.slice(1).map((r,i) => r.top-rects[i].bottom)};
      })()`);
      const landscapeTouch = touch && width > height;
      const expectedWidth = touch ? Math.min(width*(landscapeTouch?0.34:0.7),320) : desktopHomeButton.width;
      const expectedHeight = landscapeTouch ? Math.max(28,Math.min(height*0.09,48)) : desktopHomeButton.height;
      const expectedGap = landscapeTouch ? Math.max(3,Math.min(height/100,6)) : 4;
      if(touch) assert.ok(Math.abs(actions.topSpace-actions.bottomSpace)<=1.1, 'Margin Call actions are vertically centered between title and panel bottom: '+JSON.stringify(actions));
      if(touch) {
        assert.ok(Math.abs(actions.titleTop-actions.topSpace)<=1.1 && actions.topSpace<=16, 'Mobile Margin Call has equal compact gaps above title, above Home and below Continue in both orientations: '+JSON.stringify(actions));
      }
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
  for (const [width, height, touch] of [[1440, 900, false], [1920, 1080, false], [2560, 1440, false], [1024, 600, false], [844, 390, true], [667, 375, true], [320, 568, true]]) {
    await call('Emulation.setTouchEmulationEnabled', { enabled: touch });
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: touch });
    for (const theme of ['light', 'dark']) {
      await evaluate(`if (document.documentElement.dataset.theme !== '${theme}') window.dispatchEvent(new KeyboardEvent('keydown', {key:'n', bubbles:true}));`);
      await evaluate('document.activeElement?.blur()');
      await settle();
      await evaluate(`(async () => {
        const panel=document.querySelector('.share-dd-dialog'), p=panel.getBoundingClientRect();
        const overlay=panel.parentElement.getBoundingClientRect();
        const mobile=matchMedia('(pointer: coarse)').matches;
        const portrait=mobile && matchMedia('(orientation: portrait)').matches;
        if(mobile) {
          const feed=document.querySelector('.desktop-live-feed-bar').getBoundingClientRect();
          const header=document.querySelector('header').getBoundingClientRect();
          const footer=document.querySelector('.site-footer').getBoundingClientRect();
          const bottom=portrait && footer.height>0?footer.top:document.querySelector('.game-app').getBoundingClientRect().bottom;
          if(Math.abs(p.left)>1 || Math.abs(p.right-innerWidth)>1 || Math.abs(p.top-(feed.height>0?feed.bottom:header.bottom))>1 || Math.abs(p.bottom-bottom)>1) throw new Error('Mobile Share DD fills the section between feed/header and footer');
        } else if(Math.abs(p.left-overlay.left)>1 || Math.abs(p.bottom-overlay.bottom)>1) throw new Error('Desktop Share DD uses the full available area');
        if(Math.abs(p.left+p.width/2-overlay.left-overlay.width/2)>1 || Math.abs(p.top+p.height/2-overlay.top-overlay.height/2)>1) throw new Error('Share DD panel must stay centered');
        const image=document.querySelector('.share-dd-image').getBoundingClientRect();
        const actions=document.querySelector('.share-dd-actions').getBoundingClientRect();
        const full=document.querySelector('.desktop-fullscreen-control');
        const style=getComputedStyle(full);
        const f={width:parseFloat(style.width),height:parseFloat(style.height)};
        const panelStyle=getComputedStyle(panel), ink='${theme}'==='light'?'rgb(0, 0, 0)':'rgb(255, 255, 255)';
        if(panelStyle.backgroundColor!=='rgba(0, 0, 0, 0)' || panelStyle.borderTopWidth!=='0px' || panelStyle.borderRadius!=='0px') throw new Error('Share DD is transparent without a black outline');
        const close=panel.querySelector('.share-dd-close');
        if((getComputedStyle(close).display!=='none')!==portrait) throw new Error('Only mobile portrait shows Close');
        const canvas=panel.querySelector('.share-dd-canvas');
        if(Math.abs(image.bottom-p.bottom)>1 || image.left<p.left || image.right>p.right || image.top<p.top || Math.abs(image.width/image.height-parseFloat(panel.style.getPropertyValue('--share-art-ratio')))>0.01) throw new Error('Share artwork fits the section and stands at its bottom');
        const inset=document.querySelector('.stonktrooper-logo').getBoundingClientRect().left-document.querySelector('.game-app').getBoundingClientRect().left;
        if(!mobile) {
          const ratio=parseFloat(panel.style.getPropertyValue('--share-art-ratio'));
          const expectedWidth=Math.min(p.width-inset,p.height*ratio);
          if(Math.abs(image.width-expectedWidth)>1) throw new Error('Desktop Share DD scales dynamically with the available width and height, without a fixed pixel cap');
        }
        const footerInset=portrait?0:parseFloat(getComputedStyle(document.querySelector('.game-app')).getPropertyValue('--footer-inset-bottom'));
        if(Math.abs(actions.left-p.left-inset)>1 || Math.abs(p.bottom-actions.bottom-inset-footerInset)>1 || (!portrait && Math.abs(image.left-actions.left)>1)) throw new Error('Share buttons retain logo insets above the footer');
        const result=document.querySelector('.game-result-over');
        if(getComputedStyle(result).visibility==='hidden') throw new Error('Liquidated stays visible alongside Share DD');
        if(result) {
          const home=result.querySelector('.liquidated-home'), r=home.getBoundingClientRect();
          if(!home.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))) throw new Error('Liquidated buttons remain clickable behind Share DD');
          if(mobile && image.height>p.height*(portrait?0.33:0.66)) throw new Error('Landscape share character uses a reduced height');
          if(portrait) {
            const buttons=result.querySelector('.game-result-actions').getBoundingClientRect();
            if(Math.abs((buttons.left+buttons.right)/2-(p.left+p.right)/2)>1 || buttons.bottom>image.top) throw new Error('Portrait Liquidated buttons are centered above the reduced Best Score artwork');
          }
        }
        const portraitBackdrop=document.querySelector('.share-dd-portrait-backdrop');
        if(getComputedStyle(portraitBackdrop).display!=='none') throw new Error('Portrait Share DD background is restricted to mobile portrait');
        const shareButtons=[...panel.querySelectorAll('.share-dd-actions > button')];
        const shareGap=parseFloat(getComputedStyle(panel.querySelector('.share-dd-actions')).gap);
        if(!shareButtons.at(-1).matches('.share-dd-copy') || shareButtons.some((button,index)=>{const r=button.getBoundingClientRect();return Math.abs(r.left-actions.left)>1 || (index>0 && Math.abs(r.top-shareButtons[index-1].getBoundingClientRect().bottom-shareGap)>1);})) throw new Error('Share DD buttons stack vertically with Share at the bottom');
        for(const button of document.querySelectorAll('.share-dd-close, .share-dd-actions > button')) {
          const r=button.getBoundingClientRect(), s=getComputedStyle(button);
          if(button.getClientRects().length===0) continue;
          const size=mobile || button.matches('.share-dd-close')?f:{width:36,height:36};
          if(r.width!==size.width || r.height!==size.height || s.borderRadius!==style.borderRadius) throw new Error('Mobile share controls match Fullscreen dimensions');
          if(!button.matches('.share-dd-close')) {
            const icon=button.querySelector('svg').getBoundingClientRect();
            if(icon.width!==20 || icon.height!==20) throw new Error('Share action icons are 20px');
          }
          if(button.matches('.share-dd-close')) {
            if(s.backgroundColor!=='rgba(0, 0, 0, 0)' || s.color!==ink || s.borderTopColor!=='rgba(0, 0, 0, 0)') throw new Error('Share Close matches the transparent information close button');
          } else if(button.matches('.share-dd-copy')) {
            if(s.backgroundColor!=='rgb(8, 121, 92)' || s.color!=='rgb(255, 255, 255)') throw new Error('Share has a green background and white icon');
          } else if(s.backgroundColor!==style.backgroundColor || s.color!==style.color || s.borderTopColor!==style.borderTopColor) throw new Error('Social actions retain Fullscreen colors');
          if(r.left<p.left || r.right>p.right || r.top<p.top || r.bottom>p.bottom) throw new Error('Share controls must fit the window');
        }
        if(getComputedStyle(canvas).objectFit!=='contain') throw new Error('Share artwork must keep its original proportions');
        const background = new Image();
        background.src = '${theme}' === 'dark' ? '/images/score-back-inverted.png' : '/images/score-back.png';
        await background.decode();
        if(background.naturalWidth!==canvas.width || background.naturalHeight!==canvas.height) throw new Error('Share background must load at its native size in both themes');
        const ctx=canvas.getContext('2d');
        if(ctx.getImageData(0,0,1,1).data[3]!==0) throw new Error('Share image export preserves transparent corners');
        const original=document.createElement('canvas'); original.width=canvas.width; original.height=canvas.height;
        const originalCtx=original.getContext('2d'); originalCtx.drawImage(background,0,0);
        const before=originalCtx.getImageData(0,0,canvas.width,canvas.height).data;
        const after=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let lastVisible=canvas.height-1;
        while(lastVisible>0 && !Array.from({length:canvas.width},(_,x)=>after[(lastVisible*canvas.width+x)*4+3]).some(alpha=>alpha>16)) lastVisible--;
        const displayedCanvas=canvas.getBoundingClientRect();
        const feetBottom=displayedCanvas.top+(lastVisible+1)*displayedCanvas.width/canvas.width;
        if(Math.abs(feetBottom-image.bottom)>1 || Math.abs(displayedCanvas.width/displayedCanvas.height-canvas.width/canvas.height)>0.01) throw new Error('Visible shoes stand on the section bottom without distorting the native artwork');
        let changed=0;
        for(let y=0;y<canvas.height;y++) for(let x=0;x<canvas.width;x++) {
          const i=(y*canvas.width+x)*4;
          // Ignore premultiplied-alpha rounding on translucent artwork edges.
          if(Math.abs(before[i+3]-after[i+3])<=2 && (after[i+3]<250 || Math.max(Math.abs(before[i]-after[i]),Math.abs(before[i+1]-after[i+1]),Math.abs(before[i+2]-after[i+2]))<=2)) continue;
          changed++;
          if(x<canvas.width*0.49 || x>canvas.width*0.82 || y<canvas.height*0.27 || y>canvas.height*0.43) throw new Error('Score text stays inside the replacement briefcase lid: '+JSON.stringify({x,y,width:canvas.width,height:canvas.height,before:[...before.slice(i,i+4)],after:[...after.slice(i,i+4)]}));
        }
        if(changed<100) throw new Error('Share score is painted over the artwork');
      })()`);
      const { root: shareRoot } = await call('DOM.getDocument');
      const { nodeId: closeNode } = await call('DOM.querySelector', { nodeId: shareRoot.nodeId, selector: '.share-dd-close' });
      for (const state of ['hover', 'focus-visible']) {
        await call('CSS.forcePseudoState', { nodeId: closeNode, forcedPseudoClasses: [state] });
        const closeStyle=await evaluate(`(() => {const button=document.querySelector('.share-dd-close'),s=getComputedStyle(button),probe=document.createElement('span');probe.style.backgroundColor='var(--alt)';button.append(probe);const alt=getComputedStyle(probe).backgroundColor;probe.remove();return {background:s.backgroundColor,alt};})()`);
        await settle();
        const background=await evaluate("getComputedStyle(document.querySelector('.share-dd-close')).backgroundColor");
        assert.equal(background,closeStyle.alt,'Share Close hover and keyboard focus use the secondary color');
      }
      await call('CSS.forcePseudoState', { nodeId: closeNode, forcedPseudoClasses: [] });
      await settle();
      const { nodeId: shareNode } = await call('DOM.querySelector', { nodeId: shareRoot.nodeId, selector: '.share-dd-copy' });
      for (const state of ['hover', 'focus-visible']) {
        await call('CSS.forcePseudoState', { nodeId: shareNode, forcedPseudoClasses: [state] });
        await settle();
        const style = await evaluate(`(() => {const s=getComputedStyle(document.querySelector('.share-dd-copy'));return {background:s.backgroundColor,color:s.color,border:s.borderTopColor,outline:s.outlineStyle};})()`);
        assert.equal(style.background, 'rgb(8, 121, 92)', 'Share background stays green, including hover and keyboard focus');
        assert.equal(style.border, 'rgba(0, 0, 0, 0)', 'Share has no visible border');
        if (state === 'hover') assert.equal(style.color, 'rgb(255, 255, 255)', 'Share hover icon contrasts with green');
        else assert.equal(style.outline, 'solid', 'Share retains a visible keyboard focus indicator');
      }
      await call('CSS.forcePseudoState', { nodeId: shareNode, forcedPseudoClasses: [] });
      await settle();
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
          backdropFill: getComputedStyle(document.querySelector('.liquidated-backdrop')).backgroundColor,
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
      assert.ok(await evaluate(`(async () => {
        const scene=document.querySelector('.liquidated-backdrop'),r=scene.getBoundingClientRect(),
          overlay=document.querySelector('.game-over-overlay').getBoundingClientRect(),
          panel=document.querySelector('.game-result-over').getBoundingClientRect(),
          content=document.querySelector('.game-result-content').getBoundingClientRect(),
          images=[...scene.querySelectorAll('img')],
          visible=images.filter(image=>getComputedStyle(image).display!=='none');
        await Promise.all(images.map(image=>image.decode()));
        const image=visible[0], imageRect=image?.getBoundingClientRect();
        return scene.parentElement.classList.contains('game-over-overlay') &&
          Math.abs(r.width-overlay.width)<1 && Math.abs(r.height-overlay.height)<1 &&
          Math.abs(content.left+content.width/2-overlay.left-overlay.width/2)<1 &&
          Math.abs(panel.top+panel.height/2-overlay.top-overlay.height/2)<1 &&
          visible.length===1 && image.naturalWidth>0 && image.naturalHeight>0 &&
          image.src.endsWith('/images/${theme === 'light' ? 'crane.webp' : 'crane-inverted.webp'}') &&
          getComputedStyle(image).objectFit==='cover' &&
          Math.abs(imageRect.width-r.width)<1 && Math.abs(imageRect.height-r.height)<1;
      })()`), 'Liquidated loads the correct themed crane artwork across the overlay without moving the centered controls');
      const paper = theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)';
      const ink = theme === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
      assert.equal(layout.backdropFill, paper, 'Liquidated scene background follows theme');
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
          edges:[0,1].map(index=>{
            const first=candles[0].querySelectorAll('rect')[index].getBoundingClientRect();
            const last=candles.at(-1).querySelectorAll('rect')[index].getBoundingClientRect();
            return {left:first.left, right:last.right, spacing:parseFloat(candles[1].querySelectorAll('rect')[index].getAttribute('x'))-parseFloat(candles[0].querySelectorAll('rect')[index].getAttribute('x'))};
          }),
          screenWidth:innerWidth,
          overflow:document.documentElement.scrollWidth>innerWidth };
      })()`);
      assert.equal(portrait.layout, 'portrait');
      assert.ok(portrait.height>portrait.width && Math.abs(portrait.width-portrait.viewWidth)<1, 'Portrait chart uses native vertical dimensions');
      assert.equal(portrait.count, 0, 'Portrait Home chart has no models');
      assert.ok(await evaluate("(() => {const chart=document.querySelector('.landing-menu-chart').getBoundingClientRect(),button=document.querySelector('.home-coffee-link').getBoundingClientRect(),logo=document.querySelector('.stonktrooper-logo').getBoundingClientRect(),plotHeight=parseFloat(document.querySelector('#landing-chart-plot rect').getAttribute('height'));return Math.abs(button.left-chart.left-logo.left)<1 && Math.abs(chart.top+plotHeight-button.bottom-logo.left)<1;})()"), 'Portrait Donate left gutter and gap above time-axis line match the logo left gutter');
      assert.ok(await evaluate("(() => {const hero=document.querySelector('.landing-menu-actions .menu-celebration').getBoundingClientRect(), button=document.querySelector('.landing-menu-guide-button').getBoundingClientRect();return hero.width>0 && hero.bottom<=button.top+1;})()"), 'Portrait keeps the hero above How to Play');
      assert.ok(await evaluate("(() => {const button=document.querySelector('.desktop-fullscreen-control'),r=button.getBoundingClientRect();return r.width===32 && r.height===32 && button.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})()"), 'Portrait Fullscreen is visible and reachable');
      assert.equal(portrait.candleWidth, '3.6');
      assert.equal(portrait.priceLabels, 0, 'Portrait Home has no price labels');
      assert.ok(await evaluate("(() => {const chart=document.querySelector('.landing-menu-chart'),label=[...chart.querySelectorAll('text')].find(label=>label.textContent==='04:20');return !!label && Math.abs(parseFloat(label.getAttribute('x'))-chart.viewBox.baseVal.width/2)<0.1;})()"), 'Portrait time axis centers on 04:20');
      assert.ok(Math.abs(portrait.plotWidth-portrait.viewWidth)<1, 'Portrait plot extends edge to edge without a price column');
      assert.ok(portrait.edges.every(edge=>edge.left<=0 && edge.right>=portrait.screenWidth && edge.spacing>5.8 && edge.spacing<=6), 'Portrait candles and volume reach both screen edges without stretching the bars: '+JSON.stringify(portrait.edges));
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
      if (section === 'Settings') {
        for (let toggle = 0; toggle < 2; toggle++) {
          await evaluate("document.querySelector('button[aria-label=\"Shmuck Feed\"]').click()");
          await settle();
          await checkInfoCard('.landing-menu-actions');
        }
      }
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
  await evaluate("document.querySelector('.landing-menu-settings-button').click()");
  await settle();
  await evaluate("const feedToggle=document.querySelector('button[aria-label=\"Shmuck Feed\"]'); if(feedToggle.getAttribute('aria-checked')!=='true') feedToggle.click(); document.querySelector('.site-info-close').click()");
  await settle();
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
    assert.ok(await evaluate("(() => {const feed=document.querySelector('.desktop-live-feed-bar'),r=feed.getBoundingClientRect();return !feed.hidden && r.height>0 && getComputedStyle(feed).display!=='none';})()"), action+' shows the enabled Live Feed during mobile gameplay');
    assert.ok(await evaluate('innerWidth>innerHeight'), action+' uses landscape orientation');
    await evaluate('document.exitFullscreen()');
    await settle();
    assert.equal(await evaluate("document.querySelector('.game-app').dataset.state"), 'paused', 'Exiting mobile fullscreen pauses gameplay');
  }
  console.log('PASS mobile Start, Continue and New Game block portrait and start in landscape fullscreen; exit pauses');
  await call('Emulation.setDeviceMetricsOverride', { width:1440,height:900,deviceScaleFactor:1,mobile:false });
  await call('Emulation.setTouchEmulationEnabled', {enabled:false});
  await settle();
  for (const reason of ['blur','hidden']) {
    await evaluate("document.querySelector('.header-pause-control').click()");
    await settle();
    assert.equal(await evaluate("document.querySelector('.game-app').dataset.state"),'play');
    if(reason==='blur') await evaluate("window.dispatchEvent(new Event('blur'))");
    else await evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))");
    await settle();
    assert.equal(await evaluate("document.querySelector('.game-app').dataset.state"),'paused','Auto-pause on '+reason);
    await evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'))");
    await settle();
    assert.equal(await evaluate("document.querySelector('.game-app').dataset.state"),'paused','Focus does not resume automatically');
  }
  console.log('PASS automatic pause on blur/hidden tab with explicit resume');
  }
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