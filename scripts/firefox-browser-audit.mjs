// Desktop Gecko with a touch-pointer profile, NOT a physical Android performance test.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

const socket = new WebSocket(process.env.FIREFOX_BIDI_URL || 'ws://127.0.0.1:9223/session');
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, {once:true}); socket.addEventListener('error', reject, {once:true}); });
let id=0;
const pending=new Map();
socket.addEventListener('message', event=>{
  const result=JSON.parse(event.data), entry=pending.get(result.id);
  if (!entry) return;
  pending.delete(result.id); clearTimeout(entry.timer);
  result.type==='error'?entry.reject(new Error(JSON.stringify(result))):entry.resolve(result.result);
});
const send=(method,params={})=>new Promise((resolve,reject)=>{
  const current=++id;
  const timer=setTimeout(()=>{pending.delete(current);reject(new Error(`Timeout: ${method}`));},30000);
  pending.set(current,{resolve,reject,timer});socket.send(JSON.stringify({id:current,method,params}));
});
try {
  console.log(JSON.stringify(await send('session.new',{capabilities:{}})));
  const {context}=await send('browsingContext.create',{type:'tab'});
  const evaluate=async expression=>{
    const result=await send('script.evaluate',{expression,target:{context},awaitPromise:true});
    if (result.type==='exception') throw new Error(JSON.stringify(result));
    return JSON.parse(result.result.value);
  };
  const origin=process.env.AUDIT_ORIGIN || 'http://127.0.0.1:5512';
  for (const [width,height] of [[390,724],[390,640],[844,390]]) {
    await send('browsingContext.setViewport',{context,viewport:{width,height},devicePixelRatio:2});
    await send('browsingContext.navigate',{context,url:`${origin}/?debug=mobile`,wait:'complete'});
    await new Promise(resolve=>setTimeout(resolve,700));
    const layout=await evaluate(`JSON.stringify((()=>{
      const bounds=selector=>{const e=document.querySelector(selector),r=e?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,height:r.height,width:r.width,paddingBottom:getComputedStyle(e).paddingBottom}:null};
      return {width:innerWidth,height:innerHeight,visualHeight:visualViewport?.height,touch:matchMedia('(pointer: coarse)').matches,app:bounds('.game-app'),shell:bounds('.game-app > div'),arena:bounds('.game-arena'),footer:bounds('.site-footer'),hero:bounds('.mobile-portrait-hero'),guide:bounds('.mobile-portrait-guide'),documentHeight:document.scrollingElement.scrollHeight};
    })())`);
    console.log(JSON.stringify({layout}));
    const shot=await send('browsingContext.captureScreenshot',{context});
    writeFileSync(new URL(`../state/firefox-${width}-${height}.png`,import.meta.url),Buffer.from(shot.data,'base64'));
    if (process.argv.includes('--assert')) {
      assert(layout.touch,'Firefox profile must use a coarse primary pointer');
      assert(Math.abs(layout.app.bottom-height)<2,'app does not fill viewport');
      assert(Math.abs(layout.footer.bottom-layout.app.bottom)<2,'footer does not end at app bottom');
      assert(layout.documentHeight<=height+1,'document overflows');
      const diagnostics=await evaluate(`JSON.stringify((()=>{document.querySelector('.mobile-diagnostics button').click();return true})())`);
      assert(diagnostics);
      const report=await evaluate(`JSON.stringify(JSON.parse(document.querySelector('.mobile-diagnostics textarea').value))`);
      assert.equal(report.innerHeight,height);
      assert(report.rafFrameTimesMs.menu.samples>0,'diagnostics did not sample menu frames');
      assert.equal(report.canvas.width,Math.round(report.canvas.display.width*1.5));
      assert.equal(report.canvas.height,Math.round(report.canvas.display.height*1.5));
      await evaluate(`JSON.stringify((()=>{Array.from(document.querySelectorAll('.mobile-diagnostics button')).find(b=>b.textContent==='Hide report').click();return true})())`);
    }
    if (width>height) {
      await evaluate(`JSON.stringify((()=>{document.querySelector('.game-app').requestFullscreen=async()=>{};screen.orientation.lock=async()=>{};Array.from(document.querySelectorAll('.desktop-initial-guide button')).find(b=>b.textContent.trim()==='Start').click();return true})())`);
      const frames=await evaluate(`new Promise(resolve=>{
        const samples=[];let previous=0;const start=performance.now();
        function tick(now){if(previous)samples.push(now-previous);previous=now;if(now-start<4000){requestAnimationFrame(tick);return;}
          samples.sort((a,b)=>a-b);const c=document.querySelector('.game-stage>canvas');
          resolve(JSON.stringify({samples:samples.length,p50:samples[Math.floor(samples.length*.5)],p95:samples[Math.floor(samples.length*.95)],p99:samples[Math.floor(samples.length*.99)],backingWidth:c.width,backingHeight:c.height,finalState:document.querySelector('.game-app').dataset.state,note:'May include game-over frames; desktop scheduling only, not sustained Android gameplay FPS'}));}
        requestAnimationFrame(tick);
      })`);
      console.log(JSON.stringify({desktopGeckoFrameTimes:frames}));
    }
  }
  await send('browsingContext.close',{context});
  await send('session.end');
} finally { socket.close(); }