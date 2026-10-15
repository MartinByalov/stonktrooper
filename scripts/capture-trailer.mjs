// Isolated, frame-stepped capture; never records the user's desktop or microphone.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
const root = resolve(import.meta.dirname, '..');
const out = join(root, 'trailer-output');
await mkdir(out, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), 'stonks-capture-'));
let browser, server, socket;
try {
  server = await createServer({ root, plugins: [{ name: 'isolated-trailer-director', enforce: 'pre', transform(code, id) {
    if (!id.replaceAll('\\', '/').endsWith('/src/CandleGame.tsx')) return;
    return code.replace('  const lvOf =', '  window.__trailerGame = gameRef;\n  const lvOf =')
      .replace("grid: '#2a2e3970'", "grid: '#475569a0'");
  } }], server: { host: '127.0.0.1', port: 5529, strictPort: true }, logLevel: 'error' });
  await server.listen();
  browser = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch { await new Promise(r => setTimeout(r, 100)); }
  }
  if (!port) throw Error('Capture browser did not start');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((r, reject) => { socket.onopen = r; socket.onerror = reject; });
  let id = 0; const pending = new Map();
  socket.onmessage = e => { const m = JSON.parse(e.data); if (!m.id) return; const p = pending.get(m.id); if (p) { clearTimeout(p.timer); pending.delete(m.id); m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result); } };
  const call = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject, timer: setTimeout(() => reject(Error(`Timeout: ${method}`)), 180000) }); socket.send(JSON.stringify({ id: n, method, params })); });
  const evaluate = async expression => { const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
  await call('Page.enable');
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `window.framesQueue=new Map();window.frameId=0;window.captureTime=0;window.requestAnimationFrame=fn=>{const id=++window.frameId;window.framesQueue.set(id,fn);return id};window.cancelAnimationFrame=id=>window.framesQueue.delete(id);window.tick=()=>{window.captureTime+=1000/60;const q=[...window.framesQueue.values()];window.framesQueue.clear();q.forEach(fn=>fn(window.captureTime))};` });
  await call('Page.navigate', { url: 'http://127.0.0.1:5529' });
  for (let i = 0; i < 100; i++) { if (await evaluate(`!!document.querySelector('.game-stage canvas')`)) break; await new Promise(r => setTimeout(r, 100)); }
  await evaluate(`import('/scripts/trailer-audio.js').then(()=>true)`);
  await evaluate(`import('/scripts/trailer-layout.js').then(()=>true)`);
  await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='START').click();true`);
  await new Promise(r => setTimeout(r, 200));
  console.log('Starting frame-stepped gameplay test');
  const test = await evaluate(`(()=>{for(let i=0;i<30;i++)tick();const c=document.querySelector('.game-stage canvas');return {state:document.querySelector('.game-app').dataset.state,queue:framesQueue.size,image:c.toDataURL('image/png')}})()`);
  await writeFile(join(out, 'test.png'), Buffer.from(test.image.split(',')[1], 'base64'));
  console.log(JSON.stringify({ state: test.state, queue: test.queue }));
  await writeFile(join(out, 'test-report.json'), JSON.stringify({ state: test.state, queue: test.queue }));
  const frames = join(out, 'frames'); await mkdir(frames, { recursive: true });
  await evaluate(`window.captureCanvas=document.createElement('canvas');captureCanvas.width=1280;captureCanvas.height=720;window.captureCtx=captureCanvas.getContext('2d');window.previousShot=document.createElement('canvas');previousShot.width=1280;previousShot.height=720;window.captureLogo=new Image();captureLogo.src='/images/logo-inverted.png';true`);
  await evaluate(`captureLogo.decode().then(()=>true)`);
  let frame = 0;
  const report = [];
  const endingOnly = process.argv.includes('--ending-only');
  const resume = process.argv.includes('--resume') || endingOnly;
  const capture = async (name, subtitle, count, card = false, style = 'dissolve', pace = 2) => {
    if (resume && !(endingOnly && card === 'outro')) { report.push({name,startFrame:frame,frames:count,transition:style});frame+=count;return; }
    await evaluate(`previousShot.getContext('2d').drawImage(captureCanvas,0,0);true`);
    const hashes = new Set();
    const startFrame = frame;
    for (let start = 0; start < count; start += 10) {
      const images = await evaluate(`(()=>{const result=[];for(let f=0;f<${Math.min(10, count-start)};f++){
        const n=${start}+f;
        window.trailerFrame=${startFrame}+n;
        if(n%24===0){window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true}));}
        if(n%24===6){window.dispatchEvent(new KeyboardEvent('keyup',{code:'Space',bubbles:true}));}
        if(n%16===0){const c=document.querySelector('.game-stage canvas');if(c)c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:800,clientY:350,button:0}));}
        for(let k=0;k<${pace};k++)tick();const ctx=captureCtx;ctx.fillStyle='#131722';ctx.fillRect(0,0,1280,720);
        const source=document.querySelector('.game-stage canvas');
        if(source){
          // Preserve the complete canvas: ticker, price axis and time axis.
          ctx.drawImage(source,0,0,source.width,source.height,0,80,1280,560);
          ${style === 'windows' ? `drawTrailerWindows(ctx,source,n,${count});` : ''}
        }
        if(n<12 && ${startFrame}>0){const q=n/12;ctx.save();
          ${style === 'whip' ? "ctx.globalAlpha=1-q;ctx.filter='blur(5px)';ctx.drawImage(previousShot,-q*1280,0);" : style === 'impact' ? "ctx.fillStyle='rgba(240,248,255,'+((1-q)*0.25)+')';ctx.fillRect(0,42,1280,636);" : "ctx.globalAlpha=1-q;ctx.drawImage(previousShot,0,0);"}
          ctx.restore();}
        const vignette=ctx.createRadialGradient(640,350,210,640,350,760);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'rgba(0,0,0,0.35)');ctx.fillStyle=vignette;ctx.fillRect(0,42,1280,636);
        ctx.fillStyle='#080c12';ctx.fillRect(0,0,1280,42);ctx.fillRect(0,678,1280,42);
        ctx.textAlign='center';
        ${card === 'intro' ? `ctx.globalAlpha=Math.min(1,n/14);ctx.shadowColor='#38bdf8';ctx.shadowBlur=16;ctx.drawImage(captureLogo,320,265,640,640*captureLogo.height/captureLogo.width);ctx.shadowBlur=0;ctx.globalAlpha=1;` : ''}
        ${card === 'outro' ? `drawTrailerEnding(ctx,n);` : ''}
        result.push(captureCanvas.toDataURL('image/jpeg',0.96).split(',')[1]);}return result})()`);
      for (const image of images) { const data=Buffer.from(image,'base64');hashes.add(data.subarray(data.length-500).toString('base64'));await writeFile(join(frames, `${String(frame++).padStart(5,'0')}.jpg`),data); }
    }
    report.push({ name, startFrame, frames: count, transition: style, distinctTails: hashes.size });console.log('Captured '+name);
    await evaluate(`saveTrailerShot(captureCanvas);true`);
  };
  const activate = async title => {
    if(resume)return;
    await evaluate(`document.querySelector('button[title=${JSON.stringify(title)}]').click();true`);
    await new Promise(r=>setTimeout(r,120));
  };
  const stage = async ({ animals = [], birds = [], pickup, gap = false } = {}) => {
    if(resume)return;
    // Reset between directed takes. Only the isolated capture page sees this state.
    await activate('Pigeon / Money Printer mode');
    await evaluate(`(async()=>{
      const {trackHeightAt}=await import('/src/track.ts');
      const {animalHeight}=await import('/src/animalRenderer.ts');
      const g=window.__trailerGame.current;
      if(g.printerSaved)g.C=g.printerSaved;
      g.printerSaved=null;g.printerTimer=0;g.printerRotation=0;g.hawkTimer=0;
      g.invertedView=false;g.falling=false;g.zeroCrash=false;g.activeNews=null;
      g.animals=[];g.swans=[];g.pickups=[];g.cases=[];g.spits=[];g.pigeonDrops=[];g.popups=[];
      g.apes=[];g.apeTimer=0;g.fedoraTimer=0;g.flyingFedora=null;
      g.p.rocketTimer=0;g.p.carry=0;g.p.vy=0;g.p.air=false;
      const x=g.p.x;g.p.y=trackHeightAt(g.C,x,9,g.p.y);g.cy=g.p.y-500;
      for(const [i,entry] of ${JSON.stringify(animals)}.entries()){
        const ax=x+270+i*245,feet=trackHeightAt(g.C,ax,9,g.p.y);
        const a={...entry,x:ax,feet,phase:0,dead:false};a.y=feet-animalHeight(a)/2;g.animals.push(a);
      }
      for(const [i,kind] of ${JSON.stringify(birds)}.entries()){
        const bx=x+420+i*240,y=g.p.y-145-i*50;
        g.swans.push({kind,x:bx,y,baseY:y,phase:0,dead:false,flightLane:0.6});
      }
      ${pickup ? `g.pickups.push({type:${JSON.stringify(pickup)},x:x+12,y:g.p.y-25,taken:false});` : ''}
      ${gap ? `const start=Math.floor(x/9)+35;for(let i=start;i<start+5;i++)if(g.C[i])g.C[i]={...g.C[i],hole:true};for(let i=start-20;i<start;i++)if(g.C[i])g.C[i].sp=true;` : ''}
      for(let i=0;i<2;i++)tick();return true;
    })()`);
  };
  await stage();
  await capture('Logo / chart reveal', '', 75, 'intro', 'dissolve', 1);
  await stage({ gap:true });
  await capture('Candles / double jump / gaps', '', 90, false, 'dissolve', 2);
  await stage({animals:[{type:'bull'},{type:'bear'}],pickup:'diamond'});
  await capture('Bull bat / Bear chainsaw / briefcase', '', 90, false, 'impact', 2);
  await stage({animals:[{type:'bull',mount:'bear'},{type:'bear',mount:'bull'}],pickup:'fedora'});
  await capture('Riders / Fedora boomerang', '', 90, false, 'whip', 2);
  await stage({animals:[{type:'bull',mount:'whale'},{type:'bear',mount:'whale'}],pickup:'diamond'});
  await capture('Whale riders', '', 75, false, 'impact', 1);
  await stage({animals:[{type:'whale'}],pickup:'banknote'});
  await capture('Whale / rocket / coins', '', 90, false, 'whip', 2);
  await stage({animals:[{type:'bear'}],pickup:'banana'});
  await capture('Ape companions', '', 75, false, 'dissolve', 2);
  await capture('Weapons / companions / riders montage', '', 60, false, 'windows', 2);
  await stage({birds:['swan','hawk','pigeon'],pickup:'diamond'});
  await capture('Black Swan / Hawk / Pigeon', '', 90, false, 'impact', 1);
  await stage({birds:['swan'],pickup:'bag'});
  await capture('Bag holder', '', 45, false, 'whip', 1);
  await activate('Pigeon / Money Printer mode');
  await capture('Pigeon twisting charts', '', 90, false, 'dissolve', 2);
  await activate('Toggle inverted chart view');
  await capture('Inverted / White Swan', '', 75, false, 'whip', 2);
  await activate('Pigeon / Money Printer mode');
  await capture('Crossing strands', '', 60, false, 'impact', 3);
  await activate('Hawk mode');
  await capture('Hawk / dumpster', '', 75, false, 'whip', 2);
  await capture('Birds / inverted / Hawk montage', '', 60, false, 'windows', 2);
  await activate('Kangaroo mode');
  await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowRight',bubbles:true}));true`);
  await capture('Kangaroo duel', '', 90, false, 'impact', 2);
  await evaluate(`window.dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowRight',bubbles:true}));true`);
  await capture('Kangaroo attacks', '', 60, false, 'impact', 3);
  await capture('All aspects montage', '', 60, false, 'windows', 2);
  await capture('Call to action', '', 165, 'outro', 'dissolve', 1);
  const rate=44100, seconds=frame/30;
  const events=resume?[]:await evaluate('getTrailerEvents()');
  await writeFile(join(out,'cinematic-edit.json'),JSON.stringify({seconds,report,events}));
  if (process.argv.includes('--frames-only')) { console.log('Frames ready for offline mix'); process.exitCode=0; }
  else {
  const audio=await evaluate(`renderTrailerAudio(${seconds}, ${JSON.stringify(report)}, ${JSON.stringify(events)})`);
  const pcm=Buffer.from(audio.pcm,'base64');
  const wav=Buffer.alloc(44);wav.write('RIFF');wav.writeUInt32LE(36+pcm.length,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(pcm.length,40);
  await writeFile(join(out,'soundtrack.wav'),Buffer.concat([wav,pcm]));
  const video=join(out,'stonktrooper-trailer-cinematic.mp4');
  const encode=spawnSync('ffmpeg',['-y','-framerate','30','-i',join(frames,'%05d.jpg'),'-i',join(out,'soundtrack.wav'),'-vf','scale=1920:1080:flags=lanczos','-af',`loudnorm=I=-16:TP=-1.5:LRA=9,afade=t=out:st=${seconds-1.8}:d=1.8`,'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart','-shortest',video],{encoding:'utf8'});
  if(encode.status!==0)throw Error(encode.stderr);
  await writeFile(join(out,'capture-report-cinematic.json'),JSON.stringify({frames:frame,report,audio:{events:audio.events,tracks:audio.tracks,source:'Game synth effects and compositions, arranged offline and embedded'},directed:true},null,2));
  await rm(frames,{recursive:true,force:true});
  console.log('Created '+video);
  }
} finally {
  socket?.close(); if (browser) spawnSync('taskkill', ['/PID', String(browser.pid), '/T', '/F'], { stdio: 'ignore' });
  await server?.close(); await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}