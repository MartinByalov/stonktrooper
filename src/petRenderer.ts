import { defaults, SKINS } from './progression';
import { drawBlinkingEye } from './eyeAnimation';
import { drawPickupAsset, drawHumanHead } from './assetRenderer';
import { steakFlopPose, hamsterPawPose, rabbitHopPose, swanFootPose, steakSlitherPoint, swanFlapPose, rabbitFootPose, boxFlapAngle, boxFlapPoints, brickStandPose, ostrichNeckPose } from './petPose';
import { drawPrinterBanknote } from './printerBanknoteRenderer';
import { drawNearBriefcaseArm, drawSuitDetails, drawSuitCollar, drawRunnerLeg, drawFarRunnerArm } from './cosmeticModels';
import { drawProfileBackLayers } from './profileLayers';

export const PET_IDS = SKINS.filter(skin => skin.category === 'pets').map(skin => skin.id);

// Feet at (0, 0), facing right. The same finished drawing is used in the shop and game.
export function drawPet(ctx: CanvasRenderingContext2D, id: string, dark = false, phase = 0, returning = false, walking = false, equipped = false, airborne = false): void {
  if (id.startsWith('friend:')) {
    ctx.save(); ctx.scale(.55, .55);
    const stride = walking ? Math.sin(phase) : 0;
    ctx.lineCap = 'round';
    drawProfileBackLayers(() => drawFarRunnerArm(ctx, defaults.suits, dark, stride), () => {
      drawRunnerLeg(ctx, defaults.suits, defaults.shoes, dark, stride, false, airborne, phase);
      drawRunnerLeg(ctx, defaults.suits, defaults.shoes, dark, stride, true, airborne, phase);
    });
    drawSuitDetails(ctx, defaults.suits, dark, phase);
    ctx.save(); ctx.translate(3, -42); ctx.scale(.8, .8); drawHumanHead(ctx, true, dark, defaults.hats, phase / 9); ctx.restore();
    drawSuitCollar(ctx, defaults.suits, dark, phase);
    drawNearBriefcaseArm(ctx, defaults.suits, defaults.suitcase, dark, stride);
    ctx.restore(); return;
  }
  const skin = SKINS.find(item => item.category === 'pets' && item.id === id)
    ?? SKINS.find(item => item.id === defaults.pets)!;
  const [body, detail] = skin[dark ? 'dark' : 'light'];
  const kind = skin.id.slice(5);
  const step = Math.sin(phase * 5), lift = Math.abs(Math.cos(phase * 5));
  ctx.save();
  ctx.scale(1.12, 1.12);
  if (kind === 'rabbit') ctx.scale(.68,.68);
  if (kind === 'potato') ctx.scale(.9,.9);
  // Goose's taller source silhouette should read at roughly Snailord's size.
  if (kind === 'duck') ctx.scale(.44,.44);
  if (['rock','ostrich'].includes(kind)) ctx.scale(.8,.8);
  if (['shiba','dead-cat','printer','bag'].includes(kind)) ctx.scale(.8,.8);
  if (['ostrich','bag'].includes(kind)) ctx.scale(.9,.9);
  if (['hamster','steak','snail'].includes(kind)) ctx.scale(.8,.8);
  if (['yacht','steak','snail','box','potato','brick'].includes(kind)) ctx.scale(.8,.8);
  // Product artwork keeps its readable size; equipped companions shrink about their feet.
  if (equipped && ['duck','rabbit','shiba','dead-cat','ostrich','bag','printer','potato','brick','stick','snail','box','steak','rock'].includes(kind)) ctx.scale(.78,.78);
  if (kind === 'steak' && walking) {
    const flop = steakFlopPose(phase);
    // Keep the bottom edge planted; the top recedes upwards into ground-plane depth.
    ctx.transform(flop.scaleX,0,0,flop.scaleY+flop.depthY,0,0);
  }
  if (kind === 'black-swan') ctx.scale(.46, .46);
  if (equipped && kind === 'stick') {
    // Preserve the diagonal shop icon; plant its lower end upright beside the hero.
    if (walking) ctx.rotate(-.16);
    ctx.rotate(-1.25); ctx.translate(24, 2);
  }
  ctx.lineWidth = 1; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = '#292524'; ctx.fillStyle = body;
  const organic = !['box', 'brick', 'printer', 'rock', 'yacht'].includes(kind);
  const shaded = (color: string, top: number, bottom: number) => {
    const gradient = ctx.createLinearGradient(-15, top, 15, Math.max(top + 1, bottom));
    gradient.addColorStop(0, color);
    gradient.addColorStop(.55, color);
    gradient.addColorStop(1, kind === 'rabbit' || kind === 'duck' || (kind === 'black-swan' && dark) ? '#dce3eb' : '#292524');
    return gradient;
  };
  const curve = (points: number[][], color: string, width = 1) => {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i + 2 < points.length; i += 3) {
      ctx.bezierCurveTo(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], points[i + 2][0], points[i + 2][1]);
    }
    ctx.stroke(); ctx.restore();
  };
  const ellipse = (x: number, y: number, rx: number, ry: number, color: string) => {
    ctx.fillStyle = rx > 4 ? shaded(color, y - ry, y + ry * 2) : color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  };
  const path = (points: number[][], color: string, close = true) => {
    ctx.fillStyle = close ? shaded(color, Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[1])) + 14) : color;
    ctx.beginPath();
    if (organic && close && points.length > 3) {
      const last = points[points.length - 1];
      ctx.moveTo((last[0] + points[0][0]) / 2, (last[1] + points[0][1]) / 2);
      points.forEach(([x, y], i) => {
        const next = points[(i + 1) % points.length];
        ctx.quadraticCurveTo(x, y, (x + next[0]) / 2, (y + next[1]) / 2);
      });
    } else points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    if (close) { ctx.closePath(); ctx.fill(); } ctx.stroke();
  };
  const eye = (x: number, y: number, dead = false) => {
    ctx.strokeStyle = '#171717'; ctx.fillStyle = '#171717';
    if (dead) { path([[x - 2, y - 2], [x + 2, y + 2]], '#171717', false); path([[x + 2, y - 2], [x - 2, y + 2]], '#171717', false); }
    else drawBlinkingEye(ctx,x,y,()=>{
      ctx.beginPath(); ctx.ellipse(x, y, 1.7, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + .5, y - .7, .65, 0, Math.PI * 2); ctx.fill();
    },10 + PET_IDS.indexOf(skin.id));
  };
  const shape = (color: string, draw: () => void) => {
    ctx.fillStyle = shaded(color, -38, 14); ctx.strokeStyle = '#292524'; ctx.lineWidth = 1;
    ctx.beginPath(); draw(); ctx.closePath(); ctx.fill(); ctx.stroke();
  };
  if (returning) for (const side of [-1, 1]) {
    curve([[side * 8, -3], [side * 8 + step * side * 4, -1], [side * 8 + step * side * 4, 2], [side * 8 + step * side * 4 + 3, 2]], '#292524', 1.5);
  }
  if (kind === 'hamster') {
    // Compact low haunches and full cheeks, not an upright mouse; far paws first, near pair in front.
    const paw = (near: boolean, ghost = 0) => {
      const p = hamsterPawPose(phase-ghost,near,walking);
      ctx.save(); ctx.globalAlpha *= ghost ? .18 : 1;
      // The near paw emerges below the cheek without a thick chin-to-foot seam.
      if(!near)curve([[-6,-7],[p.x-2,-5],[p.x-1,p.y],[p.x,p.y]],body,2.4);
      ellipse(p.x,p.y,2.3,1.2,'#e9a6a0'); ctx.restore();
    };
    paw(false);
    // Small round tail peeks out behind the haunch, not across the belly.
    ellipse(-16.5,-8,2.2,2.2,'#e9a6a0');
    ellipse(-5,-10,11,9,body); ellipse(-3,-7.5,7.5,6,detail);
    // Three-quarter face: both eyes and cheek pouches remain visible.
    ellipse(0,-22,3,3.2,body); ellipse(10,-22,3,3.2,body);
    ellipse(0,-22,1.4,1.7,'#e9a6a0'); ellipse(10,-22,1.4,1.7,'#e9a6a0');
    ellipse(6,-15,9,8,body);
    // One soft cheek-to-chin patch, without overlapping dark oval seams.
    ctx.fillStyle=detail;ctx.beginPath();ctx.moveTo(-1.5,-14.5);
    ctx.bezierCurveTo(-1.5,-17,3,-17,7,-15.7);
    ctx.bezierCurveTo(11,-17,15,-16,15,-13.5);
    ctx.bezierCurveTo(15,-10,11,-7.5,7,-7.5);
    ctx.bezierCurveTo(3,-7.5,-1.5,-10,-1.5,-14.5);
    ctx.closePath();ctx.fill();
    eye(2,-19); eye(10,-19); ellipse(7,-15,1.5,1.1,'#c87983');
    // Fine whiskers frame the single rounded muzzle.
    for (const side of [-1,1]) for (const offset of [-1,1]) {
      curve([[7+side*4,-14],[7+side*6,-14+offset*.5],[7+side*8,-14+offset],[7+side*10,-14+offset*1.5]],'#785943',.4);
    }
    curve([[7,-14],[7,-13.7],[7,-13.3],[7,-13]],'#783f2b',.5);
    curve([[5.5,-12.8],[6.2,-12],[7.8,-12],[8.5,-12.8]],'#783f2b',.55);
    if (walking) { paw(true,.018); paw(true,.036); }
    paw(true);
  } else if(kind === 'black-swan') {
    const feather = dark ? '#a8b5c5' : '#626273';
    // Two short wingbeats then a long folded rest; simulation phase pauses it with gameplay.
    const {flap,y}=swanFlapPose(phase);
    if(walking)ctx.translate(0,y);
    for (const near of [false,true]) {
      const foot=swanFootPose(phase,near,walking);
      ellipse(foot.x,foot.y,4,1,detail);
    }
    // Body, S-neck and head share one fill and outer stroke: no neck-root seam.
    shape(body, () => {
      ctx.moveTo(-16,-6); ctx.lineTo(-22,-15); ctx.quadraticCurveTo(-11,-11,-9,-15);
      ctx.bezierCurveTo(-3,-19,5,-14,9,-18);
      ctx.bezierCurveTo(11,-20,8,-25,9,-29);
      ctx.bezierCurveTo(8,-36,12,-39,17,-37);
      ctx.bezierCurveTo(23,-36,22,-30,18,-29);
      ctx.bezierCurveTo(14,-29,18,-24,19,-20);
      ctx.bezierCurveTo(23,-9,15,-3,5,-3);
      ctx.quadraticCurveTo(-6,1,-16,-6);
    });
    // Solid saturated facial colors stay readable at the small companion scale.
    ctx.save();ctx.strokeStyle='#8f3025';ctx.lineWidth=.55;
    ctx.fillStyle='#ff6535';ctx.beginPath();ctx.moveTo(19,-34.5);
    ctx.quadraticCurveTo(23,-34,27,-32);ctx.lineTo(25,-30.2);
    ctx.lineTo(20,-29.8);ctx.closePath();ctx.fill();ctx.stroke();
    curve([[21,-31.4],[23,-31.2],[25,-31.3],[26,-31.8]],'#ffcf58',.65);
    ctx.strokeStyle='#71351d';ctx.lineWidth=.45;
    drawBlinkingEye(ctx,16.8,-34,()=>{
      ellipse(16.8,-34,2.1,2.2,'#ffc43d');
      ellipse(17.2,-34,.65,1.1,'#18212b');
    },12);
    ellipse(17.4,-34.7,.4,.45,'#ffffff');ctx.restore();
    ctx.save(); ctx.translate(1,-12); ctx.rotate(flap * 1.7);
    ctx.scale(1,1+flap*1.5); ctx.translate(-1,12);
    shape(body, () => { ctx.moveTo(-13,-10); ctx.quadraticCurveTo(-4,-22,5,-14); ctx.quadraticCurveTo(3,-5,-13,-10); });
    for (let i=0;i<3;i++) curve([[-11+i*4,-10],[-7+i*3,-12],[-5+i*3,-13],[-3+i*3,-15]],feather,.8);
    ctx.restore();
  } else if(kind === 'rabbit') {
    // Pear-shaped white magician with a round face and ears outside the hat.
    ellipse(-11,-9,4.5,4.5,body);
    shape(body, () => { ctx.moveTo(-9,-3); ctx.bezierCurveTo(-14,-10,-8,-23,-2,-25); ctx.bezierCurveTo(7,-27,13,-10,9,-3); ctx.quadraticCurveTo(0,1,-9,-3); });
    ellipse(1,-12,5,8,'#ffffff');
    const hop = walking || airborne ? rabbitHopPose(phase,airborne) : rabbitHopPose(0);
    for(const near of [false,true]) {
      const foot=rabbitFootPose(phase,near,walking,airborne);
      ellipse(foot.x,foot.y,4.2,2,body);
    }
    // Long rounded ears grow from behind the cheeks, outside the hat crown, with roots hidden.
    ctx.save();ctx.translate(-5,-31);ctx.rotate(hop.earAngle);ctx.translate(5,31);
    shape(body, () => { ctx.moveTo(-6,-30); ctx.bezierCurveTo(-12,-36,-16,-55,-11,-56); ctx.bezierCurveTo(-6,-57,-5,-38,-3,-31); });
    curve([[-7,-35],[-10,-42],[-12,-52],[-11,-53]],detail,2);
    ctx.restore();
    ctx.save();ctx.translate(10,-31);ctx.rotate(hop.earAngle*.8);ctx.translate(-10,31);
    shape(body, () => { ctx.moveTo(8,-31); ctx.bezierCurveTo(9,-39,10,-57,15,-56); ctx.bezierCurveTo(20,-55,16,-36,12,-30); });
    curve([[12,-35],[14,-42],[16,-52],[15,-53]],detail,2);
    ctx.restore();
    // Three-quarter face keeps both eyes clear beneath the brim.
    shape(body, () => {
      ctx.moveTo(-8,-28);ctx.bezierCurveTo(-9,-37,5,-40,11,-33);
      ctx.quadraticCurveTo(15,-27,12,-23);
      ctx.quadraticCurveTo(6,-19,0,-22);ctx.bezierCurveTo(-5,-20,-8,-23,-8,-28);
    });
    drawBlinkingEye(ctx,3,-30,()=>{
    ctx.fillStyle='#171717';ctx.beginPath();ctx.ellipse(8,-30,1.3,1.8,-.08,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(8.4,-30.6,.45,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#171717';ctx.beginPath();ctx.ellipse(-2,-30,1.3,1.8,.08,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(-1.6,-30.6,.45,0,Math.PI*2);ctx.fill();
    },13);
    ellipse(3,-25.5,1.4,1,detail);
    curve([[3,-25],[3,-22],[0,-22],[-1,-23]],'#786d79',.65);
    curve([[3,-25],[3,-22],[6,-22],[7,-23]],'#786d79',.65);
    for(const side of [-1,1]) {
      const pawY=hop.pawY;
      const pawX=side<0?-2:4;
      ctx.save();ctx.translate(pawX,pawY);ctx.rotate(hop.pawAngle);ctx.translate(-pawX,-pawY);
      ellipse(pawX,pawY,2.5,4,body);
      curve([[pawX-1,pawY+2],[pawX-1,pawY+3],[pawX+1,pawY+3],[pawX+1,pawY+2]],'#c8b6bf',.5);
      ctx.restore();
    }
    // Tilt back by five degrees about the brim, keeping contact with the scalp.
    ctx.save();ctx.translate(2,-36);ctx.rotate(-.09);ctx.translate(-2,36);
    ctx.fillStyle = '#202330'; ctx.strokeStyle = '#111827';
    ctx.beginPath(); ctx.rect(-5,-48,14,12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = detail; ctx.fillRect(-5,-41,14,3);
    ctx.fillStyle = '#202330';
    ctx.beginPath(); ctx.ellipse(2,-36,11,2.5,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#424858';
    ctx.beginPath(); ctx.ellipse(2,-48,7,1.8,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.restore();
  } else if(kind === 'yacht') {
    // Roll about the waterline, not a runner's hop; phase pauses with gameplay.
    if (walking) {
      ctx.translate(0,-1.4+Math.sin(phase*1.1)*.55);
      ctx.rotate(Math.sin(phase*1.1)*.12);
    }
    // Original folded-paper boat: a single silhouette, no separately outlined pieces.
    const outline = () => {
      ctx.beginPath();ctx.moveTo(-25,-12);ctx.lineTo(-18,-12);ctx.lineTo(0,-32);
      ctx.lineTo(18,-12);ctx.lineTo(25,-12);ctx.lineTo(14,0);
      ctx.lineTo(-13,0);ctx.closePath();
    };
    outline();ctx.fillStyle=body;ctx.fill();
    // Color folds share exact vertices and overlap inside the unified outer contour.
    ctx.save();ctx.clip();
    ctx.fillStyle=detail;ctx.beginPath();ctx.moveTo(0,-32);ctx.lineTo(0,-5);
    ctx.lineTo(18,-12);ctx.closePath();ctx.fill();
    ctx.fillStyle=shaded(body,-12,12);ctx.beginPath();ctx.moveTo(-25,-12);
    ctx.lineTo(0,-5);ctx.lineTo(25,-12);ctx.lineTo(14,0);ctx.lineTo(-13,0);
    ctx.closePath();ctx.fill();
    ctx.strokeStyle=detail;ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(-25,-12);ctx.lineTo(0,-5);ctx.lineTo(25,-12);ctx.stroke();
    ctx.restore();ctx.strokeStyle='#292524';outline();ctx.stroke();
  } else if (kind === 'rock') {
    path([[-18, -2], [-20, -11], [-10, -23], [6, -26], [19, -15], [17, -2]], body);
    path([[-18, -11], [-6, -17], [6, -26], [2, -10], [17, -2]], detail, false);
    eye(6, -13); eye(13, -12);
    curve([[-10, -6], [-6, -8], [-3, -6], [0, -7]], detail);
  } else if (kind === 'steak') {
    const point = (x: number, y: number): [number, number] => {
      const p=steakSlitherPoint(x,y,phase,walking);return [p.x,p.y];
    };
    const marbling = (points: number[][], color: string, width: number) => curve(points.map(([x,y])=>point(x,y)),color,width);
    const steak = () => {
      ctx.moveTo(...point(-18,-4)); ctx.bezierCurveTo(...point(-31,-15),...point(-18,-32),...point(-5,-30));
      ctx.bezierCurveTo(...point(9,-29),...point(2,-17),...point(18,-17)); ctx.bezierCurveTo(...point(33,-14),...point(23,1),...point(13,-1));
      ctx.bezierCurveTo(...point(0,-5),...point(-7,3),...point(-18,-4));
    };
    shape(detail, steak);
    ctx.save(); ctx.translate(0, -2); ctx.scale(.84, .77); shape(body, steak); ctx.restore();
    const bone=point(-8,-17);
    ellipse(bone[0],bone[1],5,6,'#fff7ed'); ellipse(bone[0],bone[1],2,2.6,'#d4b9a3');
    marbling([[-17, -10], [-12, -6], [-1, -12], [5, -9], [10, -6], [17, -12], [20, -8]], '#fecdd3', 1.3);
    marbling([[-14, -23], [-5, -29], [-2, -22], [0, -19]], '#ffe4e6', 1.2);
  } else if (kind === 'snail') {
    // Foot, head, eye stalks and bulbs are a single soft silhouette.
    shape(detail, () => {
      ctx.moveTo(-24,-3); ctx.bezierCurveTo(-10,-9,9,-5,14,-10);
      ctx.bezierCurveTo(13,-19,10,-25,10,-29);
      ctx.bezierCurveTo(4,-31,6,-41,12,-41); ctx.bezierCurveTo(19,-41,19,-31,14,-29);
      ctx.bezierCurveTo(14,-23,17,-17,18,-11);
      ctx.quadraticCurveTo(20,-10,21,-13);
      ctx.bezierCurveTo(22,-23,23,-27,23,-31);
      ctx.bezierCurveTo(17,-33,19,-43,25,-43); ctx.bezierCurveTo(32,-43,32,-33,27,-31);
      ctx.bezierCurveTo(27,-24,25,-16,26,-9);
      ctx.bezierCurveTo(31,-6,29,0,18,0); ctx.bezierCurveTo(2,2,-19,1,-24,-3);
    });
    ellipse(-6, -17, 14, 16, body);
    curve([[-7, -17], [-15, -25], [3, -28], [2, -17], [1, -7], [-14, -7], [-15, -19], [-16, -31], [6, -34], [7, -16]], '#a73564', 1.6);
    // Small crown rests on the shell's left shoulder, tilted to the left.
    ctx.save(); ctx.translate(-10,-31); ctx.rotate(-.4); ctx.scale(.65,.65);
    ctx.fillStyle='#e9b83f'; ctx.strokeStyle='#87520d';
    ctx.beginPath(); ctx.moveTo(-14,5); ctx.lineTo(-15,-10); ctx.lineTo(-7,-5);
    ctx.lineTo(0,-15); ctx.lineTo(7,-5); ctx.lineTo(15,-10); ctx.lineTo(14,5);
    ctx.quadraticCurveTo(0,10,-14,5); ctx.closePath(); ctx.fill(); ctx.stroke();
    curve([[-13,3],[-5,7],[5,7],[13,3]],'#fff1a1',1.3);
    ellipse(0,-5,1.5,2,'#ef6461');
    ctx.restore();
    ellipse(14, -35, 2.5, 3.5, '#e56b46'); ellipse(27, -37, 2.5, 3.5, '#e56b46');
    eye(15, -35); eye(28, -37);
    curve([[17, -5], [20, -3], [23, -4], [25, -6]], '#256d70');
  } else if (kind === 'box') {
    const flap=boxFlapAngle(phase,walking,airborne);
    // Fixed top face adds depth; the left flap hinges along its left edge.
    path(boxFlapPoints(false,0),detail);
    path([[-18, -3], [-18, -27], [17, -27], [17, -3]], body);
    path(boxFlapPoints(true,flap),detail);
    eye(7, -15); eye(13, -15);
    ctx.fillStyle = '#ffffff50'; ctx.fillRect(-16, -24, 1, 18);
  } else if (kind === 'potato') {
    shape(body, () => { ctx.moveTo(-23, -9); ctx.bezierCurveTo(-27, -20, -17, -28, -7, -24); ctx.bezierCurveTo(0, -27, 8, -24, 11, -19); ctx.bezierCurveTo(24, -17, 25, -4, 13, -2); ctx.bezierCurveTo(3, 1, -20, 1, -23, -9); });
    eye(5, -18); eye(11, -18); path([[5, -12], [10, -11]], body, false);
    curve([[-12, -18], [-12, -25], [-4, -28], [1, -27]], '#fef3c780', 1.5);
    curve([[-10, -12], [-12, -15], [-8, -16], [-7, -14]], detail);
  } else if (kind === 'stick') {
    curve([[-24, -2], [-10, -8], [6, -12], [24, -18]], '#422713', 3.6);
    curve([[-24, -3], [-10, -9], [6, -13], [24, -19]], body, 2);
    curve([[3, -12], [3, -16], [6, -19], [9, -21]], body, 1.5);
    ctx.save();ctx.translate(7,-20);ctx.rotate(walking?Math.sin(phase*3)*.22:0);ctx.translate(-7,20);
    shape('#69a84b', () => { ctx.moveTo(7, -20); ctx.quadraticCurveTo(3, -31, 17, -31); ctx.quadraticCurveTo(18, -21, 7, -20); });
    curve([[8, -22], [10, -25], [13, -27], [15, -29]], '#c4e59b', .7);
    ctx.restore();
  } else if (kind === 'brick') {
    const brick=brickStandPose(phase,walking);
    if (!walking) {
      path(brick.outline,body);
      path(brick.seam,detail,false);path(brick.edge,detail,false);
      for(const [x,y] of brick.eyes)eye(x,y);
    } else {
      for(const face of brick.faces) {
        path(face.points,body);
        path([face.points[0],face.points[1]],detail,false);
      }
      path(brick.end,body);
      const face=brick.faces.reduce((a,b)=>a.depth<b.depth?a:b);
      for(const [x,y] of face.eyes)eye(x,y);
    }
  } else if (kind === 'duck') {
    // Right-facing cream goose: rounded belly, upright neck and orange webbed feet.
    ctx.strokeStyle=dark?'#a9a699':'#d4d0c4';ctx.lineWidth=.6;
    for (const side of [-1, 1]) {
      const stride=walking?step*side:0;
      const x=side*4+stride*2.5,y=-1-Math.max(0,stride)*2;
      ctx.fillStyle='#c86039';ctx.beginPath();ctx.moveTo(side*4,-13);
      ctx.lineTo(x+1,y-3);ctx.quadraticCurveTo(x+2,y,x-1,y);
      ctx.lineTo(x+10,y);ctx.quadraticCurveTo(x+13,y-1,x+7,y-2);
      ctx.lineTo(x+2,y-3);ctx.lineTo(-2+side*4,-13);ctx.closePath();ctx.fill();ctx.stroke();
    }
    ctx.fillStyle='#e5e2d7';ctx.beginPath();ctx.moveTo(-32,-33);
    ctx.bezierCurveTo(-26,-24,-21,-34,-10,-36);
    ctx.bezierCurveTo(2,-39,10,-28,14,-40);
    ctx.bezierCurveTo(17,-48,8,-57,15,-65);
    ctx.bezierCurveTo(21,-73,32,-69,31,-61);
    ctx.bezierCurveTo(29,-55,23,-57,24,-47);
    ctx.bezierCurveTo(25,-34,29,-27,21,-17);
    ctx.bezierCurveTo(10,-3,-11,-8,-21,-18);
    ctx.quadraticCurveTo(-32,-25,-32,-33);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#f1eee5';ctx.beginPath();ctx.moveTo(-25,-29);
    ctx.bezierCurveTo(-16,-34,-9,-38,1,-34);
    ctx.bezierCurveTo(10,-29,17,-42,16,-52);
    ctx.bezierCurveTo(14,-61,18,-68,24,-68);
    ctx.bezierCurveTo(18,-55,24,-41,18,-31);
    ctx.bezierCurveTo(10,-18,-14,-14,-25,-29);ctx.fill();
    ctx.fillStyle='#c56038';ctx.beginPath();ctx.moveTo(29,-65);
    ctx.bezierCurveTo(33,-64,33,-61,41,-61);
    ctx.quadraticCurveTo(44,-57,28,-58);ctx.quadraticCurveTo(31,-61,29,-65);ctx.fill();
    curve([[31,-60],[34,-59],[38,-59],[41,-60]],'#964328',.65);
    drawBlinkingEye(ctx,26,-65,()=>{ellipse(26,-65,1.2,1.6,'#332b26');ellipse(26.3,-65.6,.4,.5,'#ffffff');},14);
    const {flap}=swanFlapPose(phase);
    ctx.save();ctx.translate(-8,-26);
    ctx.rotate(-flap*1.35+(walking?step*.035:0));
    ctx.scale(1,1+flap*.8);ctx.translate(8,26);
    ctx.fillStyle='#eeece3';ctx.beginPath();ctx.moveTo(-23,-29);
    ctx.bezierCurveTo(-12,-40,1,-32,9,-29);ctx.bezierCurveTo(6,-18,-10,-17,-23,-29);ctx.fill();
    curve([[-22,-28],[-18,-26],[-22,-25],[-17,-24],[-12,-22],[-16,-22],[-11,-21]],'#dedbd0',1.7);
    ctx.restore();
  } else if (kind === 'printer') {
    if (walking) {
      drawPrinterBanknote(ctx, phase, dark);
    }
    // Exactly the pickup artwork used by the game; keep its tray above the feet.
    drawPickupAsset(ctx, { type: 'printer', x: 0, y: 0, taken: false }, 0, -17, phase, dark);
  } else if (kind === 'shiba') {
    // Sitting Doge: broad cheeks, cream bib and the characteristic sideways glance.
    curve([[-15, -8], [-31, -12], [-29, -26], [-18, -23], [-12, -21], [-17, -15], [-21, -17]], body, 5);
    ellipse(-2, -15, 14, 15, body); ellipse(3, -12, 9, 12, detail);
    ellipse(-10 + step * 4, -2 - Math.max(0, step) * 3, 6, 2, detail); ellipse(11 - step * 4, -2 - Math.max(0, -step) * 3, 6, 2, detail);
    shape(body, () => { ctx.moveTo(-13, -27); ctx.quadraticCurveTo(-18, -40, -11, -49); ctx.lineTo(-1, -42); ctx.quadraticCurveTo(5, -44, 10, -41); ctx.lineTo(21, -47); ctx.quadraticCurveTo(26, -35, 21, -29); ctx.bezierCurveTo(23, -14, -8, -11, -13, -27); });
    path([[-12, -42], [-10, -46], [-5, -40]], '#9b5a35');
    path([[13, -40], [19, -44], [20, -37]], '#9b5a35');
    ellipse(5, -25, 13, 7, detail);
    for (const [x,y,pupilX] of [[-3,-33,-1],[14,-32,16]]) {
      drawBlinkingEye(ctx,x,y,()=>{
        ellipse(x,y,3.5,2.4,'#fff4df');
        ctx.fillStyle='#171717';ctx.beginPath();ctx.ellipse(pupilX,y,1.7,2,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(pupilX+.5,y-.7,.65,0,Math.PI*2);ctx.fill();
      },10+PET_IDS.indexOf(skin.id));
    }
    curve([[-7, -38], [-3, -40], [0, -38], [2, -38]], '#694326');
    curve([[11, -37], [15, -39], [19, -36], [20, -35]], '#694326');
    ellipse(9, -27, 3, 2, '#24201b');
    curve([[9, -25], [7, -21], [1, -21], [-1, -23]], '#694326');
  } else if (kind === 'dead-cat') {
    // A separate slim seated cat, not the dog's body with different ears.
    curve([[-11, -4], [-30, -1], [-31, -19], [-22, -22], [-15, -24], [-17, -16], [-22, -15]], body, 3);
    ellipse(-1, -14, 9, 14, body); ellipse(2, -12, 5, 10, detail);
    ellipse(-5 + step * 3, -2 - Math.max(0, step) * 3, 4, 2, detail); ellipse(7 - step * 3, -2 - Math.max(0, -step) * 3, 4, 2, detail);
    shape(body, () => { ctx.moveTo(-10, -29); ctx.lineTo(-12, -43); ctx.lineTo(-2, -37); ctx.quadraticCurveTo(3, -39, 7, -36); ctx.lineTo(16, -42); ctx.lineTo(15, -28); ctx.bezierCurveTo(14, -18, -8, -18, -10, -29); });
    path([[-9, -38], [-8, -32], [-4, -35]], '#efb6bb'); path([[10, -34], [13, -38], [13, -31]], '#efb6bb');
    eye(-2, -29, true); eye(11, -29, true);
    ellipse(4, -24, 2, 1.2, '#e5a4ae');
    curve([[4, -23], [2, -20], [0, -21], [-1, -22]], '#334155');
    curve([[4, -23], [6, -20], [8, -21], [9, -22]], '#334155');
    for (const side of [-1, 1]) for (const y of [-25, -22]) curve([[4 + side * 5, y], [4 + side * 10, y - 2], [4 + side * 14, y - 1], [4 + side * 17, y - 3]], '#94a3b8', .6);
    ctx.save(); ctx.strokeStyle = '#e4ad19'; ctx.lineWidth = 2.4; ctx.shadowColor = '#facc15'; ctx.shadowBlur = 3;
    ctx.beginPath(); ctx.ellipse(2, -50, 12, 3.1, -.12, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#fff1a1'; ctx.lineWidth = .7; ctx.stroke(); ctx.restore();
  } else if (kind === 'ostrich') {
    // Long separated shins remain visible below the feathered belly at every stride.
    for (const side of [-1, 1]) {
      const hip = side < 0 ? -13 : 1;
      const foot = hip + step * side * 4;
      const footY = 1 - Math.max(0, step * side) * 3;
      curve([[hip, -16], [hip + 2, -11], [foot - 2, -7], [foot, footY]], side < 0 ? '#ce829f' : detail, 2.2);
      curve([[foot - 2, footY], [foot, footY + 1], [foot + 4, footY], [foot + 6, footY]], detail, 1.6);
    }
    const neck=ostrichNeckPose(phase,walking);
    const headX=17+neck.x,headY=-42+neck.y;
    curve([[7,-25],[18-neck.tuck*6,-29+neck.tuck*8],[headX-10,headY+9],[headX-2,headY+1]],'#bd7996',6);
    curve([[8,-26],[17-neck.tuck*6,-30+neck.tuck*8],[headX-9,headY+8],[headX-2,headY]],detail,3);
    ctx.save();ctx.translate(headX,headY);ctx.rotate(neck.rotation);ctx.translate(-17,42);
    // Goofy small bald head, twin bulging eyes and a short flat beak.
    ellipse(17, -42, 7, 7, detail);
    ellipse(14, -45, 3.6, 4.5, '#fff'); ellipse(21, -44, 3.8, 4.8, '#fff');
    eye(15, -44); eye(22, -43);
    shape('#dba14a', () => { ctx.moveTo(21, -39); ctx.lineTo(32, -38); ctx.quadraticCurveTo(30, -34, 22, -36); });
    curve([[23, -37], [26, -37], [29, -37], [31, -38]], '#855522', .7);
    curve([[11, -48], [9, -53], [13, -52], [14, -49]], body);
    curve([[16, -49], [17, -54], [21, -51], [20, -49]], body);
    ctx.restore();
    // Foreground feathers hide the head as it retracts into the torso.
    ellipse(-7, -18, 20, 16, body); ellipse(-12, -18, 11, 10, '#78716c');
    for (let i = 0; i < 3; i++) curve([[-21 + i * 5, -21], [-22 + i * 5, -15], [-17 + i * 5, -9], [-14 + i * 5, -15]], body);
  } else {
    // Gathered cloth mouth and tied cord, rather than a crown-shaped opening.
    shape(body, () => { ctx.moveTo(-7, -28); ctx.bezierCurveTo(-29, -9, -23, 0, -2, 0); ctx.bezierCurveTo(23, 2, 28, -9, 7, -28); });
    shape(detail, () => { ctx.moveTo(-7, -29); ctx.quadraticCurveTo(-10, -34, -9, -38); ctx.quadraticCurveTo(-3, -35, 0, -38); ctx.quadraticCurveTo(5, -35, 10, -38); ctx.quadraticCurveTo(10, -32, 6, -29); });
    curve([[-8, -29], [-3, -31], [4, -29], [8, -30]], '#b79753', 2.5);
    curve([[5, -29], [17, -32], [15, -24], [6, -28], [11, -23], [13, -22], [15, -23]], '#dcc384', 1.2);
    curve([[-6, -25], [-14, -14], [-16, -7], [-10, -4]], '#a4cf8b', 1.2);
    curve([[7, -24], [14, -15], [16, -9], [10, -5]], '#28633d');
    ctx.fillStyle = '#d6eab3'; ctx.font = 'bold 18px serif'; ctx.fillText('$', -10, -8);
    eye(9, -18); eye(15, -17);
  }
  ctx.restore();
}
