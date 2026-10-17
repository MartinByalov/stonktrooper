import assert from 'node:assert/strict';
const tabs = await (await fetch('http://127.0.0.1:9331/json')).json();
const socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let id = 0;
const pending = new Map();
socket.addEventListener('message', event => {
  const response = JSON.parse(event.data);
  if (!pending.has(response.id)) return;
  const { resolve, reject, timer } = pending.get(response.id);
  pending.delete(response.id);
  clearTimeout(timer);
  response.error ? reject(response.error) : resolve(response.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const current = ++id;
  const timer = setTimeout(() => { pending.delete(current); reject(new Error(`Timeout: ${method}`)); }, 15000);
  pending.set(current, { resolve, reject, timer });
  socket.send(JSON.stringify({ id: current, method, params }));
});
const evaluate = async expression => {
  const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
};
try {
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  for (const [width, height] of [[390,664], [360,560], [768,1024], [844,390]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url: 'http://127.0.0.1:5511/?score=12345' });
    await new Promise(resolve => setTimeout(resolve, 1400));
    const data = await evaluate(`(() => {
      const rect = selector => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const r = element.getBoundingClientRect(), style = getComputedStyle(element);
        return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,width:r.width,display:style.display,visibility:style.visibility,position:style.position,transform:style.transform};
      };
      const close = document.querySelector('.share-dd-close');
      const bounds = close?.getBoundingClientRect();
      const hit = bounds && document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
      return {width:innerWidth,height:innerHeight,coarse:matchMedia('(pointer: coarse)').matches,overlay:rect('.share-dd-overlay'),dialog:rect('.share-dd-dialog'),content:rect('.share-dd-content'),canvas:rect('.share-dd-canvas'),close:rect('.share-dd-close'),footer:rect('.site-footer'),hit:hit?.outerHTML?.slice(0,160),closeAccessible:!!hit && !!close && (hit === close || close.contains(hit)),documentHeight:document.scrollingElement.scrollHeight};
    })()`);
    console.log(JSON.stringify(data));
    if (process.argv.includes('--assert')) {
      assert(data.coarse);
      assert(data.overlay.height > 0);
      assert(data.canvas.height > 0);
      assert(data.content.height > 100, 'Share DD content collapsed');
      assert(data.closeAccessible, 'Share DD close button is hidden behind another element');
      assert(data.overlay.bottom <= data.footer.top + 1);
      assert(data.documentHeight <= height + 1);
      await evaluate("document.querySelector('.share-dd-close').click()");
      assert.equal(await evaluate("!!document.querySelector('.share-dd-overlay')"), false);
      await evaluate("document.querySelector('.share-dd-open').click()");
      assert.equal(await evaluate("!!document.querySelector('.share-dd-overlay')"), true);
    }
    if (process.argv.includes('--fullscreen')) {
      await evaluate("document.querySelector('.game-app').requestFullscreen()");
      await new Promise(resolve => setTimeout(resolve, 400));
      const fullscreen = await evaluate(`(() => {
        const content = document.querySelector('.share-dd-content').getBoundingClientRect();
        const close = document.querySelector('.share-dd-close');
        const bounds = close.getBoundingClientRect();
        const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
        return {fullscreen:!!document.fullscreenElement,contentHeight:content.height,closeAccessible:hit === close || close.contains(hit)};
      })()`);
      console.log(JSON.stringify({ width, height, ...fullscreen }));
      assert(fullscreen.fullscreen);
      assert(fullscreen.contentHeight > 100);
      assert(fullscreen.closeAccessible);
      await evaluate('document.exitFullscreen()');
    }
  }
} finally { socket.close(); }