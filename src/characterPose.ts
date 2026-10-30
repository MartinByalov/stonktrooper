// Browser game module for characterPose.
import { PROFILE_ANATOMY, profileArmPose } from './profileAnatomy.ts';
// Shared joint positions for the trouser fabric, seams and attached footwear.
export const runnerLegPose = (front: boolean, stride: number, airborne = false) => {
  const swing = stride * (front ? 1 : -1);
  const lift = airborne ? 0 : Math.max(0, -swing) * 2.5;
  const hipX=front?1.6:.4,hipY=-18;
  let ankleX=(front?2:0)+swing*7;
  let ankleY=(airborne ? (front ? -7 : -5) : -2)-lift;
  const thigh=8,shin=8;
  let dx=ankleX-hipX,dy=ankleY-hipY;
  const distance=Math.hypot(dx,dy),reach=Math.min(thigh+shin-.001,distance);
  if(distance>reach){dx*=reach/distance;dy*=reach/distance;ankleX=hipX+dx;ankleY=hipY+dy;}
  const along=(thigh*thigh-shin*shin+reach*reach)/(2*reach);
  const bend=Math.sqrt(Math.max(0,thigh*thigh-along*along));
  return {
    hipX,hipY,
    kneeX:hipX+dx/reach*along+dy/reach*bend,
    kneeY:hipY+dy/reach*along-dx/reach*bend,
    ankleX,ankleY,
    // The recovering foot points down behind the body; the advancing foot
    // dorsiflexes slightly before landing. Keep stance near flat.
    shoeAngle: airborne ? (front ? -.18 : .12) : Math.max(0, -swing) * .32 - Math.max(0, swing) * .08,
  };
};

// The reference right-profile pose attaches the near/right arm beside the
// collar, at the shoulder depth of the torso rather than its forward edge.
export const NEAR_PROFILE_SHOULDER = PROFILE_ANATOMY.nearShoulder;

// Special actions use the same limb lengths as running, including their palms.
export function actionArmPose(front: boolean, target: {x:number;y:number}, bend = 1) {
  const shoulder=front?PROFILE_ANATOMY.nearShoulder:PROFILE_ANATOMY.farShoulder;
  const upper=PROFILE_ANATOMY.upperArm,lower=PROFILE_ANATOMY.forearm;
  let dx=target.x-shoulder.x,dy=target.y-shoulder.y;
  const distance=Math.hypot(dx,dy);
  if(distance<1e-8){dx=0;dy=1;}
  const reach=Math.max(Math.abs(upper-lower)+.001,Math.min(upper+lower-.001,distance));
  const direction=Math.hypot(dx,dy);dx/=direction;dy/=direction;
  const along=(upper*upper-lower*lower+reach*reach)/(2*reach);
  const offset=Math.sqrt(Math.max(0,upper*upper-along*along))*bend;
  return {shoulder,elbow:{x:shoulder.x+dx*along-dy*offset,y:shoulder.y+dy*along+dx*offset},
    hand:{x:shoulder.x+dx*reach,y:shoulder.y+dy*reach}};
}

export function runnerCarryPose(kind: 'diamond'|'bag', phase: number) {
  if(kind==='diamond') {
    // Raised palms sit over the crown, within the runner's natural arm reach.
    const palmY=-46;
    const asset={x:3,y:palmY-.65*14.4,scale:.65};
    return {asset,near:actionArmPose(true,{x:asset.x,y:palmY}),far:actionArmPose(false,{x:asset.x-1.5,y:palmY},-1)};
  }
  const asset={x:10,y:-19+Math.sin(phase*2)*.8,scale:.75};
  return {asset,near:actionArmPose(true,{x:asset.x+4,y:asset.y-4.5}),far:actionArmPose(false,{x:asset.x-4,y:asset.y-4.5},-1)};
}

export function runnerBagThrowPose(timer: number, direction = 1) {
  const elapsed=16-Math.max(0,Math.min(16,timer));
  const swing=Math.min(1,elapsed/8),recovery=Math.max(0,(elapsed-8)/8);
  const near=actionArmPose(true,{x:4+direction*(3+9*swing),y:-39+recovery*17});
  return {near,asset:{x:near.hand.x,y:near.hand.y+4.5,scale:.75},holding:timer>8};
}

export const briefcaseArmPose = (airborne: boolean, velocity: number, stride: number) => {
  return profileArmPose(true,stride,airborne,velocity);
};

export const farArmPose = (stride: number) => {
  return profileArmPose(false,stride);
};
