// Left-facing quadruped: independent stance/swing and fixed-length joint chains.
export function quadrupedLegPose(phase: number, near: boolean, front: boolean, airborne = false, kind: 'bear' | 'bull' = 'bull', tuck = airborne ? 1 : 0) {
  const cycle=((phase/Math.PI+(near?0:.5)+(front?0:.25))%1+1)%1;
  const stance=.62;
  const t=Math.max(0,(cycle-stance)/(1-stance));
  const swing=cycle>=stance;
  const travel=swing?7-14*(t*t*(3-2*t)):-7+14*cycle/stance;
  const hip={x:(front?-19:22)+(near?0:3),y:-26};
  const foot={x:hip.x+(airborne?(front?5:-6)*tuck:travel),y:-2-(airborne?9*tuck:swing?6*Math.sin(Math.PI*t)**2:0)};
  const dx=foot.x-hip.x,dy=foot.y-hip.y,d=Math.hypot(dx,dy);
  const upper=kind==='bear'?14:13,lower=kind==='bear'?13:14;
  const along=(upper*upper-lower*lower+d*d)/(2*d);
  // Foreleg elbows fold back; hind knees fold forward (left-facing model).
  const bend=Math.sqrt(Math.max(0,upper*upper-along*along))*(front?-1:1);
  const joint={x:hip.x+dx*along/d-dy*bend/d,y:hip.y+dy*along/d+dx*bend/d};
  return {hip,joint,foot,planted:!airborne&&!swing};
}

export function frogBodyPose(airborne: boolean, velocity: number) {
  // Right-facing assembly: rise nose-up, descend nose-down. Ease back to
  // neutral as vertical speed approaches zero; never rotate limbs separately.
  const angle=airborne?Math.tanh(velocity/8)*.22:0;
  return {angle};
}

export function whaleFlipperPose(phase: number, jumping: boolean) {
  const flap=jumping?Math.sin(phase*4)*.65:Math.sin(phase*1.6)*.18;
  return {near:flap,far:-flap*.8};
}

// Lap luggage stays attached to the rider. Only the pet lifts slightly as the
// mount rises, then settles back to its exact resting point on landing.
export function ridingPetLift(airborne: boolean, rise: number): number {
  return airborne && rise > 0 ? -5 * (1 - Math.exp(-rise / 18)) : 0;
}

export function mountPreviewPose(seconds: number) {
  const cycle=((seconds%6)+6)%6;
  const flight=cycle>=3.6&&cycle<5.6;
  const t=(cycle-3.6)/2;
  return {
    phase:seconds*2,
    airborne:flight,
    y:flight?-28*4*t*(1-t):0,
    velocity:flight?-(1-2*t)*8:0,
    // Continuous anticipation and recovery at both ends of the flight.
    pitch:flight?-.22*Math.sin(2*Math.PI*t):0,
  };
}

// Left-facing frog: the hock folds forward under the thigh on the ground,
// extends behind at takeoff, then gathers beneath the belly for landing.
export function frogLegPose(phase: number, near: boolean, airborne = false, velocity = 0) {
  const cycle=((phase/Math.PI+(near?0:.5))%1+1)%1;
  const swing=cycle>=.65,t=swing?(cycle-.65)/.35:cycle/.65;
  const step=swing?1-2*t*t*(3-2*t):-1+2*t;
  const extension=airborne?Math.max(0,Math.min(1,-velocity/8)):0;
  const lift=airborne?3:swing?4*Math.sin(Math.PI*t)**2:0;
  return {
    frontElbow:{x:-10+step*2,y:-12-lift*.4},
    frontFoot:{x:-22-step*4+extension*9,y:-3-(airborne?lift:!swing?4*Math.sin(Math.PI*t)**2:0)-extension*6},
    knee:{x:34+step+extension*3,y:-14+extension*4-lift*.3},
    hock:{x:15+step*2+extension*28,y:-5-lift*.6+extension*3},
    rearFoot:{x:8+step*4+extension*38,y:-3-lift+extension*4},
  };
}