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
  assert.deepEqual(buttonColors, {light:'rgb(3, 105, 161)',dark:'rgb(56, 189, 248)'});
  await settle();
  assert.ok(await evaluate(`Array.from(document.querySelectorAll('img')).every(i=>i.complete&&i.naturalWidth>0)`), 'All day/night hero assets load');
  assert.ok(await evaluate(`document.querySelector('img[src$="desktop-home-page-inverted.webp"]').naturalWidth===1254`), 'Night desktop artwork loads');
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