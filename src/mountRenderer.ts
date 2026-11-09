import { skinColors } from './progression';
import { drawBlinkingEye } from './eyeAnimation';
import { drawAnimalCharacter, drawAnimalMount } from './animalRenderer';
import type { WhaleMount } from './whaleMount';
import { frogLegPose } from './mountPose';
import { drawHeadHat, drawHatArtwork } from './assetRenderer';

// Penny Stock is layered vector art: wheels, body, tail, mane and head, each animated.
const pennyUrls = import.meta.glob('./assets/penny-stock/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
// Bump whenever the layer art in src/assets/penny-stock changes.
const PENNY_ART_VERSION = 24;
const pennyImages = new Map<string, HTMLImageElement>();
const pennyImage = (part: string, dark: boolean): HTMLImageElement | null => {
  if (typeof Image === 'undefined') return null;
  const key = `${part}${dark ? '-night' : ''}`;
  let image = pennyImages.get(key);
  if (!image) {
    const url = pennyUrls[`./assets/penny-stock/${key}.svg`];
    if (!url) return null;
    // Versioned URL so browsers never show an older drawing; inlined data: URLs must not be altered.
    image = new Image();
    image.src = url.startsWith('data:') ? url : `${url}${url.includes('?') ? '&' : '?'}art=${PENNY_ART_VERSION}`;
    pennyImages.set(key, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : null;
};
// Art units: wheels touch at y=851, seat at (552,438); riders are drawn lower by the difference.
const PENNY_GROUND = 851, PENNY_SEAT = { x: 552, y: 438 };
export const PENNY_SEAT_HEIGHT = 28;
const PENNY_SCALE = PENNY_SEAT_HEIGHT / (PENNY_GROUND - PENNY_SEAT.y);
// How much lower a rider sits than the shared seat (drawing only); bull and bear riders sit higher.
export const mountRiderDrop = (skin: string, kind: string = 'whale'): number =>
  skin === 'mounts-penny' ? 34 - PENNY_SEAT_HEIGHT : skin === 'mounts-classic' && kind !== 'whale' ? -11 : 0;
function drawPennyStock(ctx: CanvasRenderingContext2D, dark: boolean, phase: number, airborne: boolean, velocity: number): void {
  // The source mount faces left and callers mirror it; the art itself faces right.
  ctx.save(); ctx.translate(22, 0); ctx.scale(-PENNY_SCALE, PENNY_SCALE); ctx.translate(-PENNY_SEAT.x, -PENNY_GROUND);
  // The 1024px art is drawn much smaller; use the browser's best downscaling.
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const swing = airborne ? Math.max(-.22, Math.min(.22, velocity * .03)) : Math.sin(phase) * .035;
  const layer = (part: string, pivot?: [number, number], angle = 0, dx = 0) => {
    const image = pennyImage(part, dark);
    if (!image) return;
    ctx.save(); ctx.translate(dx, 0);
    if (pivot) { ctx.translate(pivot[0], pivot[1]); ctx.rotate(angle); ctx.translate(-pivot[0], -pivot[1]); }
    ctx.drawImage(image, 0, 0, 1024, 1024); ctx.restore();
  };
  // Wheels turn with the ride; the head nods then rears up, and the tail lifts on a jump.
  const wheelTurn = phase * 2.4;
  const headTilt = airborne ? -.2 : Math.sin(phase * 2) * .045;
  // A small lift, so the tail keeps covering the rump even in the air.
  const tailLift = airborne ? .22 : Math.sin(phase) * .03;
  layer('wheel', [393, 824], wheelTurn);
  layer('wheel', [393, 824], wheelTurn, 254);
  layer('body');
  layer('tail', [344, 476], tailLift);
  // The mane lies over the back of the head up to the poll, moving with the head.
  layer('head', [736, 300], headTilt);
  layer('mane', [736, 300], headTilt + swing * .5);
  layer('ears', [736, 300], headTilt);
  ctx.restore();
}

// Feet at y=0, facing left like the whale, shared seat (22,-34); skins change artwork only.
export function drawMount(ctx: CanvasRenderingContext2D, skin: string, kind: NonNullable<WhaleMount['kind']>, dark: boolean, phase = 0, airborne = false, velocity = 0, captain = false): void {
  if (skin === 'mounts-penny') { drawPennyStock(ctx, dark, phase, airborne, velocity); return; }
  if (skin !== 'mounts-wednesday' && kind === 'whale') {
    drawAnimalCharacter(ctx, { type: 'whale', x: 0, y: 0, feet: 0, phase, dead: false, jumpAmount:airborne?1:0 }, false, false, dark, false, false, true);
    if (captain) {
      ctx.save();ctx.rotate(-Math.min(1,(airborne?1:0)/40)*.12);ctx.scale(1+Math.min(1,(airborne?1:0)/40)*.04,1-Math.min(1,(airborne?1:0)/40)*.06);
      // Desktop rider-space (30,-10), rotation .12, scale .85 in the whale's mirrored space.
      ctx.translate(-30,-50);ctx.rotate(-.12);ctx.scale(-.85,.85);
      drawHatArtwork(ctx,true,false,dark);ctx.restore();
    }
    return;
  }
  if (skin !== 'mounts-wednesday') {
    // The shared seat falls on a bull's or bear's rump; set the animal back under the rider.
    ctx.save(); ctx.translate(12, 0);
    drawAnimalMount(ctx, { type: kind === 'bear' ? 'bull' : 'bear', mount: kind, x: 0, y: 0, feet: 0, phase, dead: false, jumpAmount: airborne ? 25 : 0 }, dark, false, 'hats-classic', captain);
    ctx.restore(); return;
  }
  const frog = skin === 'mounts-wednesday';
  const [green, belly] = skinColors('mounts-wednesday', dark);
  ctx.save(); ctx.lineWidth = 1.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = dark ? '#d9e8ba' : '#263823';
  const oval = (x: number, y: number, rx: number, ry: number, color: string) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  };
  if (frog) {
    // Anatomical right profile: the caller mirrors this left-facing source; never draw a second eye.
    const outline = dark ? '#29442b' : '#263823';
    const shade = dark ? '#548840' : '#356431';
    const far=frogLegPose(phase,false,airborne,velocity);
    const near=frogLegPose(phase,true,airborne,velocity);
    // Connected, splayed digits with rounded pads, not a jagged polygon slipper.
    const foot = (x: number, y: number, near: boolean) => {
      ctx.fillStyle = near ? green : shade;
      // The palm overlaps the full rounded ankle, without an outlined seam.
      ctx.beginPath(); ctx.moveTo(x+2.5,y-2);
      ctx.quadraticCurveTo(x-2,y-3,x-5,y-1.5);
      ctx.quadraticCurveTo(x-7,y+1,x-4,y+2);
      ctx.quadraticCurveTo(x,y+3,x+2.5,y+2);
      ctx.quadraticCurveTo(x+3.2,y,x+2.5,y-2); ctx.fill();
      // The far foot is foreshortened; near toes fan toward the viewer in depth.
      const digits = near ? [[-10,-1],[-8,1],[-5,2.5]] : [[-7,-2],[-6,-.5],[-4,1]];
      ctx.beginPath();ctx.moveTo(x+1,y-1);
      for(const [dx,dy] of digits)ctx.lineTo(x+dx*.65,y+dy*.65);
      ctx.lineTo(x+1,y+1);ctx.closePath();ctx.fill();
      for (const [dx,dy] of digits) {
        ctx.strokeStyle = near ? green : shade; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(x-1,y); ctx.quadraticCurveTo(x-3,y+dy*.3,x+dx,y+dy);
        ctx.stroke();
        ctx.fillStyle = near ? belly : shade;
        ctx.beginPath(); ctx.ellipse(x+dx,y+dy,1.6,1.1,-.15,0,Math.PI*2); ctx.fill();
      }
    };
    const limbs=(pose: ReturnType<typeof frogLegPose>, color: string) => {
      ctx.strokeStyle=color;ctx.lineWidth=5;
      ctx.beginPath();ctx.moveTo(-13,-23);
      ctx.lineTo(pose.frontElbow.x,pose.frontElbow.y);
      ctx.lineTo(pose.frontFoot.x,pose.frontFoot.y);ctx.stroke();
      ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(pose.knee.x,pose.knee.y);
      ctx.lineTo(pose.hock.x,pose.hock.y);
      ctx.lineTo(pose.rearFoot.x,pose.rearFoot.y);ctx.stroke();
    };
    limbs(far,shade);
    foot(far.frontFoot.x,far.frontFoot.y,false);foot(far.rearFoot.x,far.rearFoot.y,false);
    ctx.strokeStyle = outline; ctx.lineWidth = 1.2;
    oval(9,-23,31,16,green);
    oval(-3,-18,24,9,belly);
    // Long, low muzzle extends ahead of the cheek rather than facing us.
    ctx.fillStyle = green;
    ctx.beginPath(); ctx.moveTo(-4,-35); ctx.quadraticCurveTo(-16,-42,-28,-37);
    ctx.quadraticCurveTo(-36,-35,-44,-28); ctx.quadraticCurveTo(-48,-24,-41,-21);
    ctx.quadraticCurveTo(-23,-14,-7,-23); ctx.lineTo(2,-29); ctx.closePath(); ctx.fill(); ctx.stroke();
    oval(-23,-38,10,10,green);
    drawBlinkingEye(ctx,-25,-38,()=>{
      oval(-25,-38,7,6,'#fff8d8');
      oval(-28,-38,2,3.8,'#17251b');
    },9);
    // Heavy half-lid and a single nostril define the side-on expression.
    ctx.fillStyle=green; ctx.fillRect(-32,-44,14,5);
    ctx.strokeStyle=outline; ctx.lineWidth=1.8;
    ctx.beginPath(); ctx.moveTo(-32,-40); ctx.quadraticCurveTo(-24,-42,-18,-38); ctx.stroke();
    oval(-40,-28,1,0.7,outline);
    ctx.strokeStyle='#a96855'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(-44,-24); ctx.quadraticCurveTo(-29,-18,-15,-25); ctx.stroke();
    ctx.strokeStyle=outline; ctx.lineWidth=1.1;
    ctx.beginPath(); ctx.moveTo(-44,-25); ctx.quadraticCurveTo(-29,-22,-15,-26); ctx.stroke();
    // Broad folded thigh overlaps the shin; toes stay tucked below the belly.
    ctx.strokeStyle=outline;ctx.lineWidth=1.2;
    ctx.fillStyle=green;ctx.beginPath();ctx.moveTo(12,-23);
    ctx.bezierCurveTo(22,-33,43,-24,near.knee.x+3,near.knee.y);
    ctx.quadraticCurveTo(near.knee.x+1,-3,12,-7);
    ctx.quadraticCurveTo(2,-12,12,-23);ctx.closePath();ctx.fill();ctx.stroke();
    limbs(near,green);
    ctx.strokeStyle=outline;ctx.lineWidth=.9;ctx.beginPath();
    ctx.moveTo(near.knee.x,near.knee.y);ctx.quadraticCurveTo(near.knee.x+2,near.hock.y,near.hock.x,near.hock.y);ctx.stroke();
    foot(near.frontFoot.x,near.frontFoot.y,true);foot(near.rearFoot.x,near.rearFoot.y,true);
    if(captain)drawHeadHat(ctx,'frog',true,dark);
    ctx.restore(); return;
  }
  ctx.restore();
}
