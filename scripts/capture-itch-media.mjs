// Capture the actual UI in an isolated browser; no production hooks or staged entities.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';

const root = resolve(import.meta.dirname, '..');
const output = join(root, 'build/itch-media');
const profile = await mkdtemp(join(tmpdir(), 'stonktrooper-itch-media-'));
const pending = new Map();
let server, browser, socket, nextId = 0;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  await mkdir(output, { recursive: true });
  server = await createServer({ root, server: { host: '127.0.0.1', port: 5541, strictPort: true }, logLevel: 'error' });
  await server.listen();
  browser = spawn(process.env.EDGE_PATH ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', 'about:blank',
  ], { stdio: 'ignore' });
  let launchError;
  browser.on('error', error => { launchError = error; });
  let port;
  for (let i = 0; i < 100; i++) {
    if (launchError) throw launchError;
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await sleep(100); }
  }
  assert.ok(port, 'Capture browser started');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => {
    const message = JSON.parse(event.data), request = pending.get(message.id);
    if (!request) return;
    clearTimeout(request.timer); pending.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject, timer: setTimeout(() => reject(new Error(`Timeout: ${method}`)), 20000) });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const capture = async name => {
    const { data } = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const path = join(output, name);
    await writeFile(path, Buffer.from(data, 'base64'));
    console.log(`Saved ${path}`);
  };
  for (const theme of ['light', 'dark']) {
    await call('Page.navigate', { url: 'http://127.0.0.1:5541/' });
    await sleep(700);
    for (let i = 0; i < 100; i++) {
      if (await evaluate(`!!document.querySelector('.landing-menu-panel')`)) break;
      await sleep(100);
    }
    await evaluate(`localStorage.setItem('cr_theme', '${theme}')`);
    await call('Page.reload');
    await sleep(700);
    for (let i = 0; i < 100; i++) {
      if (await evaluate(`!!document.querySelector('.landing-menu-panel') && document.documentElement.dataset.theme === '${theme}'`)) break;
      await sleep(100);
    }
    await evaluate('document.fonts.ready.then(() => true)');
    await sleep(800);
    if (theme === 'light') await capture('01-home-light.png');
    assert.ok(await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Start'); if (!b || b.disabled) return false; b.click(); return true; })()`), 'Start button enabled');
    await sleep(450);
    assert.equal(await evaluate(`document.querySelector('.game-app').dataset.state`), 'play');
    await capture(theme === 'light' ? '02-gameplay-light.png' : '04-gameplay-dark.png');
    if (theme === 'light') {
      await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
      await call('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
      await sleep(230);
      await call('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
      await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
      assert.equal(await evaluate(`document.querySelector('.game-app').dataset.state`), 'play');
      await capture('03-gameplay-jump-light.png');
    }
  }
} finally {
  socket?.close();
  for (const request of pending.values()) clearTimeout(request.timer);
  if (browser?.pid) spawnSync('taskkill', ['/PID', String(browser.pid), '/T', '/F'], { stdio: 'ignore' });
  await server?.close();
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}