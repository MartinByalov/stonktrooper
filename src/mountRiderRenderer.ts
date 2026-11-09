import { drawHumanHead } from './assetRenderer';
import { drawEquippedBag, drawRidingSuit, drawSuitCollar, drawShoe, drawJointedSuitArm, drawHeroHand } from './cosmeticModels';
import { skinColors } from './progression';
import { drawWhaleRiderArm, drawWhaleRiderLeg, drawMountedSeat, drawPennyStirrupForeground, PENNY_RIDER_FOOT, WHALE_RIDER_SCALE } from './whaleRider';
import { drawPet } from './petRenderer';
import { petAnimationPhase } from './petPose';
import { mountPreviewPose, ridingPetLift } from './mountPose';

interface MountedPreview {
  suit: string;
  shoes: string;
  bag: string;
  hat: string;
  pet?: string;
  dark: boolean;
  phase: number;
  seconds: number;
  airborne: boolean;
  velocity: number;
  animate: boolean;
  mount?: string;
  kind?: 'whale' | 'bull' | 'bear';
}

// Same hip, bent limbs and hands-on-back pose as the gameplay whale rider.
export function drawMountedPreview(ctx: CanvasRenderingContext2D, outfit: MountedPreview, drawMount: () => void): void {
  const {suit,shoes,bag,hat,pet,dark,phase,seconds,airborne,velocity,animate}=outfit;
  const [body]=skinColors(suit,dark);
  const frog=outfit.mount==='mounts-wednesday', pony=outfit.mount==='mounts-penny';
  const gauntlets=bag.split(':')[0]==='suitcase-diamond-hands';
  // Scale the whole rider and mount assembly, not the mount alone; the original uses a .88 rider.
  const raised=outfit.mount==='mounts-classic'&&outfit.kind&&outfit.kind!=='whale';
  const seat=() => {ctx.translate((frog?-10:-22)*.65,(frog?-38:pony?-24:raised?-45:-34)*.65);ctx.scale(WHALE_RIDER_SCALE*.65,WHALE_RIDER_SCALE*.65);};
  const arm=(near: boolean) => {
    if(!frog){drawWhaleRiderArm(ctx,near,body,near?'#fed7aa':'#dca581',4,false,pony,!!raised,gauntlets?(x,y,angle)=>drawHeroHand(ctx,x,y,angle,near,bag,dark):undefined);return;}
    // Bent elbow below the shoulder, then a forearm resting on the frog's withers.
    const shoulder={x:near?1:-2,y:-25};
    const elbow={x:near?6:4,y:near?-8:-10};
    const wrist={x:near?19:16,y:near?0:-2};
    drawJointedSuitArm(ctx,suit,dark,shoulder,elbow,wrist,near?4:3,near?3.2:2.5);
    if(gauntlets){drawHeroHand(ctx,wrist.x,wrist.y,Math.atan2(wrist.y-elbow.y,wrist.x-elbow.x),near,bag,dark);return;}
    ctx.fillStyle=near?'#fed7aa':'#dca581';ctx.beginPath();
    ctx.ellipse(wrist.x,wrist.y,2.2,1.6,.1,0,Math.PI*2);ctx.fill();
  };
  const leg=(near: boolean) => {
    // Reuse the gameplay leg's perspective, but retain the equipped footwear.
    drawWhaleRiderLeg(ctx,near,body,'transparent',5,pony);
    drawShoe(ctx,shoes,dark,pony?PENNY_RIDER_FOOT.x-5:near?10:7,pony?PENNY_RIDER_FOOT.y-3:near?15:10,pony?8:near?9:8,seconds);
  };
  ctx.save();seat();leg(false);ctx.restore();
  drawMount();
  ctx.save();seat();
  arm(false);
  drawRidingSuit(ctx,suit,dark,phase,'whale',false);
  drawMountedSeat(ctx,body);
  leg(true);
  if (pony) drawPennyStirrupForeground(ctx,dark);
  ctx.save();ctx.translate(0,-38);ctx.scale(.8,.8);
  drawHumanHead(ctx,true,dark,hat,seconds);ctx.restore();
  ctx.save();ctx.translate(-2.5,5);
  drawSuitCollar(ctx,suit,dark,phase,airborne,velocity,12);ctx.restore();
  // Original case is centered at (9,-7); equipped art uses a top-left origin.
  if(!gauntlets){
    ctx.save();ctx.translate(1,-12.25);ctx.scale(.85,.75);
    drawEquippedBag(ctx,bag,dark);ctx.restore();
  }
  if(pet) {
    const lift=ridingPetLift(airborne,-mountPreviewPose(seconds).y);
    ctx.save();ctx.translate(9,-13+lift);ctx.scale(.4,.4);
    drawPet(ctx,pet,dark,petAnimationPhase(seconds,pet),false,false,false,airborne);ctx.restore();
  }
  arm(true);
  ctx.restore();
}