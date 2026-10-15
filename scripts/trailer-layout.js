// Capture-page-only compositing. Does not modify the game.
import { drawSpinningFedora } from '../src/fedoraRenderer';
const shots = [];
window.saveTrailerShot = canvas => {
  const copy = document.createElement('canvas');
  copy.width = canvas.width; copy.height = canvas.height;
  copy.getContext('2d').drawImage(canvas, 0, 0);
  shots.push(copy);
};
window.drawTrailerWindows = (ctx, source, n, count) => {
  if (shots.length < 3) return;
  const progress = Math.min(1, n / 14, (count - n) / 12);
  const inset = 14 + (1 - progress) * 100;
  ctx.fillStyle = '#080d17'; ctx.fillRect(0, 0, 1280, 720);
  const selected = [shots.at(-1), shots[Math.max(0, shots.length - 4)], shots[Math.max(0, shots.length - 7)], source];
  selected.forEach((image, i) => {
    const x = (i % 2) * 640 + inset, y = Math.floor(i / 2) * 360 + inset;
    ctx.drawImage(image, x, y, 640 - inset * 2, 360 - inset * 2);
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1;
    ctx.strokeRect(x, y, 640 - inset * 2, 360 - inset * 2);
  });
};
window.drawTrailerEnding = (ctx, n) => {
  const bg=ctx.createRadialGradient(640,360,30,640,360,720);
  bg.addColorStop(0,'#152d42');bg.addColorStop(1,'#070d17');
  ctx.fillStyle=bg;ctx.fillRect(0,0,1280,720);
  const enter=Math.min(1,n/25),orbit=Math.max(0,Math.min(1,(n-25)/65));
  const angle=-Math.PI/2+orbit*Math.PI*2;
  const x=n<25?-120+760*(1-(1-enter)**3):640+295*Math.cos(angle);
  const y=n<25?160:360+245*Math.sin(angle);
  ctx.save();
  ctx.strokeStyle='#38bdf8';ctx.lineWidth=3;ctx.shadowColor='#38bdf8';ctx.shadowBlur=18;
  ctx.beginPath();ctx.ellipse(640,360,295,245,0,-Math.PI/2,-Math.PI/2+orbit*Math.PI*2);ctx.stroke();
  ctx.save();ctx.translate(x,y);ctx.rotate(n<90?n*0.13:0);ctx.scale(3.2,3.2);drawSpinningFedora(ctx,n*0.1,true);ctx.restore();
  ctx.shadowBlur=0;ctx.globalAlpha=Math.max(0,Math.min(1,(n-50)/25));
  ctx.textAlign='center';ctx.fillStyle='#f8fafc';ctx.font='italic bold 82px sans-serif';ctx.fillText('Play',640,325);
  ctx.font='26px sans-serif';ctx.fillText('at',640,374);
  ctx.fillStyle='#38bdf8';ctx.font='bold 27px sans-serif';ctx.fillText('https://www.stonktrooper.lol/',640,428);
  ctx.restore();
};