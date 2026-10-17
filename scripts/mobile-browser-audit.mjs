// Run against a local Vite/preview server and a Chromium remote-debugging port.
// This is browser emulation, not a substitute for an Android/iOS device run.
import assert from 'node:assert/strict';
const origin = process.env.AUDIT_ORIGIN || 'http://127.0.0.1:5511';
const port = process.env.AUDIT_DEBUG_PORT || '9331';
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let id = 0;
const pending = new Map();
socket.addEventListener('message', event => {
  const response = JSON.parse(event.data), entry = pending.get(response.id);
  if (!entry) return;
  pending.delete(response.id);
  clearTimeout(entry.timer);
  response.error ? entry.reject(new Error(JSON.stringify(response.error))) : entry.resolve(response.result);
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
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const hitTest = selector => evaluate(`(() => {
  const e = document.querySelector(${JSON.stringify(selector)});
  if (!e) return null;
  const r = e.getBoundingClientRect(), hit = document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
  return {width:r.width,height:r.height,x:r.x,y:r.y,bottom:r.bottom,
    accessible:!!hit && (hit === e || e.contains(hit))};
})()`);
try {
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  for (const [width, height, touch, notch = false] of [[360,560,true],[390,664,true],[768,1024,true],[844,390,true],[844,390,true,true],[896,400,true,true],[896,400,true,'left'],[896,400,true,'right'],[1280,800,false]]) {
    await send('Emulation.setTouchEmulationEnabled', { enabled: touch, maxTouchPoints: 5 });
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: touch ? 3 : 1, mobile: touch });
    await send('Emulation.setSafeAreaInsetsOverride', { insets: notch ? {top:0,left:notch === 'right' ? 0 : 44,right:notch === 'left' ? 0 : 44,bottom:21} : {top:0,left:0,right:0,bottom:touch && width < height ? 48 : 0} });
    await send('Page.navigate', { url: origin });
    for (let i = 0; i < 100; i++) {
      await wait(100);
      if (await evaluate("!!document.querySelector('.site-footer')")) break;
    }
    await wait(300);
    assert.equal(await evaluate("matchMedia('(pointer: coarse)').matches"), touch);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.site-footer')).borderTopWidth"), touch && width < height ? '1px' : '0px', 'unexpected footer separator');
    if (touch && width < height && width < 768) {
      const landing = await evaluate(`(() => {
        const footer = document.querySelector('.site-footer');
        const start = [...document.querySelectorAll('.mobile-portrait-guide button')].find(e => e.textContent.trim() === 'Start');
        return {padding:parseFloat(getComputedStyle(footer).paddingBottom),
          gap:footer.getBoundingClientRect().top-start.getBoundingClientRect().bottom};
      })()`);
      assert.equal(landing.padding, 4, 'portrait footer repeats the Android navigation inset');
      assert(Math.abs(landing.gap-8) < 1, 'portrait Start-to-footer gap differs from device-validated 8px');
      console.log(JSON.stringify({width,height,portraitLanding:landing}));
    }
    for (const section of ['About', 'Privacy', 'Disclaimer', 'Preferences']) {
      await evaluate(`Array.from(document.querySelectorAll('.site-footer nav button')).find(b => b.textContent === '${section}').click()`);
      await wait(150);
      assert((await hitTest('.site-info-close'))?.accessible, `${width}: ${section} close inaccessible`);
      for (const theme of ['dark', 'light']) {
        const colors = await evaluate(`(() => {
          document.documentElement.dataset.theme='${theme}';
          const controls=Array.from(document.querySelectorAll('.site-info-close, .site-info-contact-button, .preferences-clear-button'));
          controls.forEach(button=>button.style.transition='none');
          document.activeElement?.blur();
          const capture=button=>{const s=getComputedStyle(button);return [s.color,s.borderColor,s.backgroundColor].join('|')};
          const idle=controls.map(capture);
          const focus=controls.map(button=>{button.focus();return capture(button)});
          document.activeElement?.blur();
          return {idle,focus};
        })()`);
        const ink=theme==='light'?'rgb(0, 0, 0)':'rgb(255, 255, 255)';
        const fill=theme==='light'?'rgb(234, 240, 245)':'rgb(24, 35, 52)';
        const hover=theme==='light'?'rgb(255, 255, 255)':'rgb(0, 0, 0)';
        assert(colors.idle.every(color=>color===[ink,ink,fill].join('|')), `${section} idle colors: ${JSON.stringify(colors)}`);
        assert(colors.focus.every(color=>color===[ink,ink,hover].join('|')), `${section} focus colors: ${JSON.stringify(colors)}`);
        for (const selector of ['.site-info-close', ...(section==='About'?['.site-info-contact-button']:[]), ...(section==='Preferences'?['.preferences-clear-button']:[])]) {
          const point=await hitTest(selector);
          await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x+point.width/2,y:point.y+point.height/2});
          assert.equal(await evaluate(`getComputedStyle(document.querySelector('${selector}')).backgroundColor`), hover, `${section} hover fill`);
          await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});
        }
      }
      await evaluate("document.documentElement.dataset.theme='dark'");
      const scroll = await evaluate(`(() => {
        const e = document.querySelector('.site-info-content');
        e.scrollTop = 0;
        const start = e.firstElementChild.getBoundingClientRect().top >= e.getBoundingClientRect().top - 1;
        e.scrollTop = e.scrollHeight;
        return {start, end:e.scrollTop + e.clientHeight >= e.scrollHeight-1, scrollTop:e.scrollTop, clientHeight:e.clientHeight, scrollHeight:e.scrollHeight, top:e.getBoundingClientRect().top, childTop:e.firstElementChild.getBoundingClientRect().top};
      })()`);
      assert(scroll.start && scroll.end, `${width}: ${section}: clipped scroll content ${JSON.stringify(scroll)}`);
      if (touch) {
        const layout = await evaluate(`(() => {
          const content = getComputedStyle(document.querySelector('.site-info-content'));
          const header = document.querySelector('.site-info-header').getBoundingClientRect();
          const title = document.querySelector('.site-info-title').getBoundingClientRect();
          const close = document.querySelector('.site-info-close').getBoundingClientRect();
          return {left:parseFloat(content.paddingLeft),right:parseFloat(content.paddingRight),
            height:header.height,titleTop:title.top,closeBottom:close.bottom};
        })()`);
        if (width < height) {
          assert.equal(layout.left, 24);
          assert.equal(layout.right, 24);
          assert.equal(layout.height, 88);
          assert(layout.titleTop >= layout.closeBottom, `${section} title overlaps close row`);
        } else assert.equal(layout.height, 32, 'landscape title placement changed');
      }
      await evaluate("document.querySelector('.site-info-close').click()");
    }
    const canvas = await evaluate(`(() => {
      const e = document.querySelector('.game-stage > canvas'), r = e.getBoundingClientRect();
      return {width:e.width,height:e.height,cssWidth:r.width,cssHeight:r.height,documentHeight:document.scrollingElement.scrollHeight};
    })()`);
    if (touch) assert(canvas.documentHeight <= height + 1);
    console.log(JSON.stringify({width,height,touch,notch,panels:'passed',canvas}));
    if (touch && width < height) {
      await evaluate("document.querySelector('.mobile-portrait-how-to-play').click()");
      await wait(150);
      assert((await hitTest('.mobile-how-to-close'))?.accessible, 'How to Play close inaccessible');
      const guide = await evaluate(`(() => {
        const e = document.querySelector('.mobile-how-to-panel > .mechanics-guide');
        const before = document.querySelector('.mobile-how-to-close').getBoundingClientRect().top;
        e.scrollTop = e.scrollHeight;
        return {end:e.scrollTop + e.clientHeight >= e.scrollHeight - 1,
          headerFixed:Math.abs(before-document.querySelector('.mobile-how-to-close').getBoundingClientRect().top)<1};
      })()`);
      assert(guide.end && guide.headerFixed, 'How to Play scroll moves its close control');
      await evaluate("document.querySelector('.mobile-how-to-close').click()");
    }
    if (width > height || !touch) {
      // Avoid fullscreen/orientation transitions here so viewport dimensions stay deterministic.
      await evaluate(`document.querySelector('.game-app').requestFullscreen = async () => {};
        screen.orientation.lock = async () => {};
        document.querySelector('.desktop-initial-guide .how-to-mode-selector').dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowRight',bubbles:true}))`);
      await wait(100);
      await evaluate(`(() => {
        const original = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function(text, x, y, ...args) {
          if (text === 'PIPS: ') {
            const metrics = this.measureText(text), transform = this.getTransform();
            const canvas = this.canvas.getBoundingClientRect();
            window.scoreGlyph = {
              left: canvas.left + ((x-metrics.actualBoundingBoxLeft)*transform.a+transform.e)*canvas.width/this.canvas.width,
              top: canvas.top + ((y-metrics.actualBoundingBoxAscent)*transform.d+transform.f)*canvas.height/this.canvas.height
            };
          }
          return original.call(this, text, x, y, ...args);
        };
      })()`);
      await evaluate(`Array.from(document.querySelectorAll('.desktop-initial-guide button')).find(b => b.textContent.trim() === 'Start').click()`);
      await wait(100);
      assert.equal(await evaluate("document.querySelector('.game-app').dataset.state"), 'play');
      // Canvas coordinates include the existing one-pixel arena border.
      const alignment = await evaluate(`(() => {
        const logo = document.querySelector('.header-logo-frame').getBoundingClientRect();
        const header = document.querySelector('header').getBoundingClientRect();
        const canvas = document.querySelector('.game-stage canvas').getBoundingClientRect();
        const sound = document.querySelector('.header-sound-control');
        return { logoLeft:logo.left-header.left, logoTop:logo.top-header.top,
          scoreLeft:window.scoreGlyph.left-canvas.left,
          scoreTop:window.scoreGlyph.top-canvas.top,
          pauseBeforeSound:sound.previousElementSibling.classList.contains('header-pause-control') };
      })()`);
      assert(alignment.pauseBeforeSound, 'pause is not immediately before sound');
      assert(Math.abs(alignment.scoreLeft-alignment.logoLeft-2)<1, JSON.stringify(alignment));
      assert(Math.abs(alignment.scoreTop-alignment.scoreLeft)<=1.1, JSON.stringify(alignment));
      if (!notch || notch === 'right') assert(Math.abs(alignment.logoLeft-alignment.logoTop)<1, JSON.stringify(alignment));
      console.log(JSON.stringify({width,height,notch,alignment}));
      const pause = await hitTest('.header-pause-control');
      assert(pause?.accessible, 'pause inaccessible');
      for (const theme of ['dark', 'light']) {
        await evaluate(`document.documentElement.dataset.theme='${theme}'; document.activeElement?.blur(); document.querySelector('.header-pause-control').style.transition='none'`);
        await send('Input.dispatchMouseEvent', {type:'mouseMoved',x:0,y:0});
        assert.equal(await evaluate("getComputedStyle(document.querySelector('.header-pause-control')).backgroundColor"), theme==='light'?'rgb(234, 240, 245)':'rgb(24, 35, 52)', 'pause idle should match header controls');
        await send('Input.dispatchMouseEvent', {type:'mouseMoved',x:pause.x+pause.width/2,y:pause.y+pause.height/2});
        assert.equal(await evaluate("getComputedStyle(document.querySelector('.header-pause-control')).backgroundColor"), theme==='light'?'rgb(255, 255, 255)':'rgb(0, 0, 0)', 'pause hover fill incorrect');
      }
      await send('Input.dispatchMouseEvent', {type:'mouseMoved',x:0,y:0});
      await evaluate("document.documentElement.dataset.theme='dark'");
      if (touch) {
        const joystick = await hitTest('.mobile-joystick');
        assert(joystick?.accessible, 'joystick inaccessible');
        const corner = await evaluate(`(() => {
          const control = document.querySelector('.mobile-joystick').getBoundingClientRect();
          const stage = document.querySelector('.game-stage').getBoundingClientRect();
          return {left:control.left-stage.left,bottom:stage.bottom-control.bottom};
        })()`);
        assert(Math.abs(corner.bottom-alignment.scoreLeft) < 1, 'joystick bottom gap differs from PIPS');
        assert(Math.abs(corner.left-alignment.scoreLeft) < 1, 'joystick left gap differs from PIPS');
        const gaps = await evaluate(`(() => {
          const header = document.querySelector('header').getBoundingClientRect();
          if (Math.abs(header.height - 48) > 1) throw new Error('Side notch enlarged the header: ' + header.height);
          const fullscreen = document.querySelector('.desktop-fullscreen-control').getBoundingClientRect();
          const pause = document.querySelector('.header-pause-control').getBoundingClientRect();
          const arena = document.querySelector('.game-arena');
          const bounds = arena.getBoundingClientRect();
          const axis = parseFloat(getComputedStyle(arena).getPropertyValue('--chart-axis-right'));
          return [header.right-fullscreen.right, fullscreen.top-header.top, header.bottom-fullscreen.bottom,
            pause.top-fullscreen.top, pause.height-fullscreen.height];
        })()`);
        const expectedGaps = [notch && notch !== 'left' ? 44 : 8, 8, 8, 0, 0];
        gaps.forEach((gap, index) => assert(Math.abs(gap-expectedGaps[index]) < 1, `mobile control gutters differ: ${JSON.stringify(gaps)} vs ${JSON.stringify(expectedGaps)}`));
        console.log(JSON.stringify({width,height,notch,joystickCorner:corner}));
        const x = joystick.x + joystick.width/2, y = joystick.y + joystick.height/2;
        await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{x,y}] });
        assert.equal(await evaluate("getComputedStyle(document.querySelector('.mobile-joystick')).backgroundColor"), 'rgb(24, 35, 52)', 'pressed joystick is not filled');
        await evaluate("document.documentElement.dataset.theme='light'");
        assert.equal(await evaluate("getComputedStyle(document.querySelector('.mobile-joystick')).backgroundColor"), 'rgb(233, 239, 244)', 'Day pressed joystick fill incorrect');
        await evaluate("document.documentElement.dataset.theme='dark'");
        await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        assert.equal(await evaluate("document.querySelector('.mobile-joystick').hasAttribute('data-pressed')"), false);
        await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{x,y}] });
        await send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        assert.equal(await evaluate("document.querySelector('.mobile-joystick').hasAttribute('data-pressed')"), false, 'cancel leaves joystick filled');
        await evaluate("document.querySelector('.mobile-joystick').focus()");
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
        assert.equal(await evaluate("document.querySelector('.mobile-joystick').dataset.pressed"), 'true');
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
        assert.equal(await evaluate("document.querySelector('.mobile-joystick').hasAttribute('data-pressed')"), false);
      } else {
        assert.equal((await hitTest('.mobile-joystick'))?.width, 0);
      }
      await evaluate("document.querySelector('.header-pause-control').click()");
      assert.equal(await evaluate("document.querySelector('.game-app').dataset.state"), 'paused');
      console.log(JSON.stringify({width,height,controls:'passed'}));
      if (touch) {
        const titlePadding = await evaluate(`getComputedStyle(document.querySelector('.pause-overlay h2')).paddingTop`);
        assert(parseFloat(titlePadding) >= 18, 'Margin Call title needs roomier vertical spacing');
        await evaluate("document.querySelector('.pause-overlay .how-to-play-action').click()");
        await wait(150);
        assert((await hitTest('.mobile-how-to-close'))?.accessible, 'landscape guide close inaccessible');
        const closeAxis = await evaluate(`(() => {
          const close = document.querySelector('.mobile-how-to-close').getBoundingClientRect();
          const fullscreen = document.querySelector('.desktop-fullscreen-control').getBoundingClientRect();
          return {close:close.left+close.width/2,fullscreen:fullscreen.left+fullscreen.width/2};
        })()`);
        assert(Math.abs(closeAxis.close-closeAxis.fullscreen) < 1, 'guide close does not align vertically with Fullscreen');
        const guide = await evaluate(`(() => {
          const bounds = document.querySelector('.mobile-how-to-dialog').getBoundingClientRect();
          const panel = document.querySelector('.mobile-how-to-panel').getBoundingClientRect();
          const footer = document.querySelector('.site-footer').getBoundingClientRect();
          const app = document.querySelector('.game-app').getBoundingClientRect();
          return {top:bounds.top,bottom:bounds.bottom,panelBottom:panel.bottom,
            expectedTop:parseFloat(getComputedStyle(document.querySelector('.game-app')).getPropertyValue('--live-feed-bottom')),
            expectedBottom:footer.height > 0 ? footer.top : app.bottom};
        })()`);
        assert(Math.abs(guide.top-guide.expectedTop) < 1, 'guide does not start at feed boundary');
        assert(Math.abs(guide.bottom-guide.expectedBottom) < 1, 'guide does not fill shell height');
        assert(Math.abs(guide.panelBottom-guide.bottom) < 1, 'guide panel does not fill overlay');
        const spacing = await evaluate(`(() => {
          const panel = document.querySelector('.mobile-how-to-panel').getBoundingClientRect();
          const cards = [...document.querySelectorAll('.mobile-how-to-panel .mechanics-guide > div')].map(e => e.getBoundingClientRect());
          return {left:Math.min(...cards.map(r=>r.left))-panel.left,
            right:panel.right-Math.max(...cards.map(r=>r.right))};
        })()`);
        assert(Math.abs(spacing.left-spacing.right) < 1, 'landscape description side gaps differ');
        console.log(JSON.stringify({width,height,notch,guide}));
        await evaluate("document.querySelector('.mobile-how-to-close').click()");
      }
      if (notch && process.argv.includes('--fullscreen')) {
        await evaluate("document.querySelector('.game-app').requestFullscreen = Element.prototype.requestFullscreen; document.querySelector('.game-app').requestFullscreen()");
        await wait(250);
        assert.equal(await evaluate('!!document.fullscreenElement'), true);
        await evaluate("Array.from(document.querySelectorAll('.site-footer nav button')).find(b => b.textContent === 'Privacy').click()");
        await wait(150);
        assert((await hitTest('.site-info-close'))?.accessible, 'fullscreen close inaccessible');
        await evaluate("document.querySelector('.site-info-close').click(); document.exitFullscreen()");
        await wait(250);
        console.log(JSON.stringify({width,height,fullscreen:'passed'}));
      }
    }
    await send('Page.navigate', { url: `${origin}/?score=12345` });
    for (let i = 0; i < 100; i++) {
      await wait(100);
      if (await evaluate("!!document.querySelector('.share-dd-canvas')")) break;
    }
    await wait(250);
    const share = await evaluate(`(() => {
      const image = document.querySelector('.share-dd-canvas').getBoundingClientRect();
      const dialog = document.querySelector('.share-dd-dialog').getBoundingClientRect();
      const actions = document.querySelector('.share-dd-actions').getBoundingClientRect();
      const close = document.querySelector('.share-dd-close').getBoundingClientRect();
      const buttons = Array.from(document.querySelectorAll('.share-dd-actions > button'));
      const style = getComputedStyle(document.querySelector('.share-dd-dialog'));
      return {imageWidth:image.width,imageHeight:image.height,dialogHeight:dialog.height,actionsBottom:actions.bottom,dialogBottom:dialog.bottom,
        sameBounds:Math.abs(image.top-dialog.top)<1 && Math.abs(image.left-dialog.left)<1 && Math.abs(image.bottom-dialog.bottom)<1,
        closeTop:close.top-image.top,closeRight:image.right-close.right,
        actionsLeft:actions.left-image.left,actionsBottomGap:image.bottom-actions.bottom,
        vertical:buttons.every((b,i)=>!i || b.getBoundingClientRect().top >= buttons[i-1].getBoundingClientRect().bottom),
        shareLast:buttons[buttons.length-1].classList.contains('share-dd-copy'),text:document.querySelector('.share-dd-dialog').innerText,
        border:style.borderTopWidth,padding:style.padding,background:style.backgroundColor};
    })()`);
    console.log(JSON.stringify({width,height,notch,share}));
    assert((await hitTest('.share-dd-close'))?.accessible, 'Share DD close inaccessible');
    assert(share.sameBounds && share.vertical && share.shareLast, 'share card structure incorrect');
    assert.equal(share.text, '');
    assert.equal(share.border, '0px');
    assert.equal(share.padding, '0px');
    for (const gap of [share.closeTop,share.closeRight]) assert(Math.abs(gap-8)<1, 'share close not at image corner');
    assert(Math.abs(share.actionsLeft-(share.imageWidth*0.044+8))<1, 'share actions not inside inner left boundary');
    assert(Math.abs(share.actionsBottomGap-(share.imageHeight*0.073+16))<1, 'share actions not lifted above rounded inner bottom boundary');
    for (const selector of ['.share-dd-actions > button:first-child', '.share-dd-actions > button:last-child']) assert((await hitTest(selector))?.accessible, 'share action inaccessible');
    for (const theme of ['dark', 'light']) {
      const styles = await evaluate(`(() => {
        document.documentElement.dataset.theme = '${theme}';
        const controls = [document.querySelector('.share-dd-close'), ...document.querySelectorAll('.header-controls > button, .share-dd-social-button')].filter(e=>e.getBoundingClientRect().width>0);
        controls.forEach(e => e.style.transition = 'none');
        const capture = e => {const s=getComputedStyle(e);return [s.color,s.borderColor,s.backgroundColor].join('|')};
        document.activeElement?.blur();
        const idle=controls.map(capture);
        const focus=controls.map(e=>{e.focus();return capture(e)});
        return {idle,focus};
      })()`);
      assert(styles.idle.every(s=>s===styles.idle[0]), 'square control idle styles differ: '+JSON.stringify(styles));
      assert(styles.focus.every(s=>s===styles.focus[0]), 'square control focus styles differ: '+JSON.stringify(styles));
      const ink = theme === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
      const fill = theme === 'light' ? 'rgb(234, 240, 245)' : 'rgb(24, 35, 52)';
      const hover = theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)';
      assert.equal(styles.idle[0], [ink,ink,fill].join('|'));
      assert.equal(styles.focus[0], [ink,ink,hover].join('|'));
      const copyColors = await evaluate(`(() => {
        const button=document.querySelector('.share-dd-copy');
        button.style.transition='none';
        document.activeElement?.blur();
        const capture=()=>[getComputedStyle(button).color,getComputedStyle(button).backgroundColor].join('|');
        const idle=capture();button.focus();return {idle,focus:capture()};
      })()`);
      assert.equal(copyColors.idle, 'rgb(255, 255, 255)|rgb(8, 121, 92)');
      assert.equal(copyColors.focus, copyColors.idle);
      if (theme === 'light') assert.equal(await evaluate("getComputedStyle(document.querySelector('.share-dd-copy')).borderColor"), 'rgb(0, 0, 0)', 'Day Share border must be black');
      await evaluate('document.activeElement?.blur()');
      const copyPoint = await hitTest('.share-dd-copy');
      await send('Input.dispatchMouseEvent', {type:'mouseMoved',x:copyPoint.x+copyPoint.width/2,y:copyPoint.y+copyPoint.height/2});
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.share-dd-copy')).backgroundColor"), 'rgb(8, 121, 92)', 'Share hover should stay green');
      await send('Input.dispatchMouseEvent', {type:'mouseMoved',x:0,y:0});
      const closePoint = await hitTest('.share-dd-close');
      await send('Input.dispatchMouseEvent', {type:'mouseMoved', x:closePoint.x+closePoint.width/2, y:closePoint.y+closePoint.height/2});
      const hovered = await evaluate(`(() => {
        const button=document.querySelector('.share-dd-close');
        const style=getComputedStyle(button);
        return {hovered:button.matches(':hover'),colors:[style.color,style.borderColor,style.backgroundColor].join('|')};
      })()`);
      assert(hovered.hovered, 'close button did not receive mouse hover');
      assert.equal(hovered.colors, [ink,ink,hover].join('|'));
      await send('Input.dispatchMouseEvent', {type:'mouseMoved', x:0, y:0});
    }
    if (touch && width > height) {
      assert(share.imageHeight >= share.dialogHeight * 0.4, 'landscape share preview wastes available height');
      assert(share.actionsBottom <= share.dialogBottom + 1, 'share actions outside dialog');
    }
    assert(Math.abs(share.imageWidth / share.imageHeight - 4/3) < 0.01, 'share image distorted');
  }
  await send('Page.navigate', { url: `${origin}/?debug=mobile` });
  for (let attempt = 0; attempt < 100; attempt++) {
    await wait(100);
    if (await evaluate("!!document.querySelector('.mobile-diagnostics button')")) break;
  }
  await wait(500);
  const diagnostics = await evaluate(`(() => {
    document.querySelector('.mobile-diagnostics button').click();
    return true;
  })()`);
  await wait(100);
  const report = await evaluate("JSON.parse(document.querySelector('.mobile-diagnostics textarea').value)");
  assert(diagnostics && report.footerNav && report.fullscreenControl && report.stylesheets.length);
  assert(report.canvasDrawCpuMs.menu.samples > 0, 'opt-in CPU draw timing missing');
  console.log(JSON.stringify({ diagnostics: 'passed', drawCpu: report.canvasDrawCpuMs.menu }));
} finally { socket.close(); }