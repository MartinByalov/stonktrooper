import { ROCKET_PET_CANOPY } from './rocketCanopy';

export const PREVIEW_MODES = ['normal', 'dumpster', 'whale', 'bull', 'bear', 'rocket', 'printer', 'monkeys', 'hat', 'jerome', 'paul', 'janet'] as const;
export type PreviewMode = typeof PREVIEW_MODES[number];
export interface ModePreviewRequest { mode: PreviewMode | 'bell'; serial: number }

export const hasPetLegs = (id: string) => ['pets-duck', 'pets-shiba', 'pets-dead-cat', 'pets-ostrich', 'pets-hamster', 'pets-rabbit'].includes(id);

// Time belongs to the companion, never to the runner's stride or jump state.
export function petAnimationPhase(seconds: number, id: string): number {
  const seed = [...id].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return seconds * (1.7 + seed % 11 * .07) + seed % 17 * .23;
}

export function hamsterPawPose(phase: number, near: boolean, walking: boolean) {
  const angle = walking ? phase * 38 + (near ? 0 : Math.PI) : Math.PI / 2;
  return { x: (near ? 4 : -6) + (walking ? Math.cos(angle) * 4.2 : 0),
    y: -3.2 + (walking ? Math.sin(angle) * 2.2 : 2.2), angle };
}

// Both hind feet push off, tuck and land together without a pause between hops.
export function rabbitHopPose(phase: number, airborne = false) {
  const flight = Math.sin(phase * .65) ** 2;
  const tuck = airborne ? .65 + .35 * flight : flight;
  return { y: -3 * flight * flight, footX: -1.5 * tuck, footY: -2 - 1.4 * tuck,
    pawY: -13 - 1.6 * tuck, pawAngle: -.16 * tuck,
    earAngle: Math.sin(phase * 1.3) * .09 - tuck * .08 };
}

export function swanFootPose(phase: number, near: boolean, walking: boolean) {
  const stride = walking ? Math.sin(phase * 5 + (near ? 0 : Math.PI)) : 0;
  return { x: (near ? 5 : -6) + stride * 2.4, y: -1 - Math.max(0,stride) * 1.8 };
}

export function swanFlapPose(phase: number) {
  const cycle=((phase%12)+12)%12;
  const flap=cycle<2?Math.sin(cycle*Math.PI)**2*Math.sin(cycle*Math.PI/2):0;
  return {flap,y:flap>0?-3*flap:0};
}

export function rabbitFootPose(phase: number, near: boolean, walking: boolean, airborne: boolean) {
  const hop=rabbitHopPose(phase,airborne);
  const jumping=airborne || (walking && hop.y < -.35);
  const stride=walking&&!jumping?Math.sin(phase*5)*(near?1:-1):0;
  return {x:(near?4:-2)+(jumping?hop.footX:stride*1.4),
    y:jumping?hop.footY:-2-Math.max(0,stride)*.8};
}

export function boxFlapAngle(phase: number, moving: boolean, airborne: boolean) {
  const lift=moving?Math.abs(Math.sin(phase*.9)):0;
  return airborne||lift>.12?Math.sin(phase*1.8)*.45*(airborne?1:lift):0;
}

// The upper polygon is a fixed top face; only its left-edge flap moves.
export function boxFlapPoints(near: boolean, angle: number): number[][] {
  if (near) {
    const dx=-12*Math.cos(.35+angle),dy=-12*Math.sin(.35+angle);
    return [[-18,-27],[-14,-37],[-14+dx,-37+dy],[-18+dx,-27+dy]];
  }
  return [[-18,-27],[17,-27],[13,-37],[-14,-37]];
}

export interface PetFollower { x: number; feet: number; vy: number }

export function ostrichNeckPose(phase: number, moving: boolean) {
  const cycle=((phase%12)+12)%12;
  const smooth=(t:number)=>t*t*(3-2*t);
  const tuck=!moving||cycle<7||cycle>=11?0:cycle<8?smooth(cycle-7):cycle<10?1:1-smooth(cycle-10);
  return {tuck,x:-tuck*13,y:tuck*23,rotation:-tuck*.3};
}

// Equal long faces rotate continuously about the long axis; shop artwork is separate.
export function brickStandPose(phase: number, moving: boolean) {
  const angle=moving?phase*.85:0,c=Math.cos(angle),s=Math.sin(angle);
  const cross=[[-9,-9],[9,-9],[9,9],[-9,9]].map(([z,h])=>[z*c-h*s,h*c+z*s]);
  const base=Math.max(...cross.map(([z,h])=>-h-z*.35));
  // Rear edge recedes left/up; the eye-facing long side rolls downwards.
  const point=(x:number,p:number[]):number[]=>[-17+x-p[0]*.65,-p[1]-p[0]*.35-base-x*7/34];
  const faces=cross.map((a,i)=>{
    const b=cross[(i+1)%4],nz=(a[0]+b[0])/18,nh=(a[1]+b[1])/18;
    const upper=point(0,a)[1]<point(0,b)[1]?a:b,lower=upper===a?b:a;
    const eyePoint=(x:number)=>point(x,[upper[0]*.72+lower[0]*.28,upper[1]*.72+lower[1]*.28]);
    return {index:i,visible:nh*.35-nz>1e-8,points:[point(0,a),point(34,a),point(34,b),point(0,b)],
      eyes:[eyePoint(24),eyePoint(30)],depth:(a[0]+b[0])*.5};
  }).filter(face=>face.visible).sort((a,b)=>b.depth-a.depth);
  return {angle,faces,end:cross.map(p=>point(0,p)),
    outline:[[-22,-3],[-22,-18],[12,-25],[23,-17],[23,-3],[-10,4]],
    seam:[[-22,-18],[-10,-10],[23,-17]],edge:[[-10,-10],[-10,4]],eyes:[[10,-10],[18,-12]]};
}
// A travelling lateral bend, anchored at the ground edge, not a rigid roll.
export function steakSlitherPoint(x: number, y: number, phase: number, walking: boolean) {
  const bend = walking ? Math.sin(phase * 3 - y * .22) * 3 * Math.min(1, Math.max(0, -y / 24)) : 0;
  return { x: x + bend, y };
}

export function stepPetFollower(state: PetFollower, targetX: number, floor: number): void {
  state.x += Math.max(-1.1, Math.min(1.1, (targetX-state.x)*.12));
  // Gait supplies any intentional hop; the terrain anchor itself must not lag, sink or float.
  state.feet=floor;
  state.vy=0;
}

// Cosmetic backward flop: ease down, lie still briefly, then stand up again.
export function steakFlopPose(phase: number) {
  const cycle = ((phase % 24) + 24) % 24;
  const progress = cycle < 16 ? 0 : cycle < 18 ? (cycle - 16) / 2 : cycle < 20 ? 1 : cycle < 22 ? (22 - cycle) / 2 : 0;
  const amount = progress * progress * (3 - 2 * progress);
  // Pitch away from the camera about the ground edge, not a sideways screen roll.
  const pitch = Math.PI / 2 * amount;
  return { amount, rotation: 0, scaleY: Math.cos(pitch) * .82 + .18,
    depthY: Math.sin(pitch) * .3, scaleX: 1 - .08 * amount };
}

// Simulation-frame driven: a small hop, a half turn, then rest; gap victims keep gravity.
export function petDeathPose(frame: number, gap: boolean) {
  const t = Math.max(0, frame);
  return { x: -26 - Math.min(t, 24) * .35,
    y: gap ? -2.8 * t + .12 * t * t : Math.min(0, -2.8 * t + .12 * t * t),
    rotation: t === 0 ? 0 : -Math.PI * Math.min(1, t / 22), scale: .75 };
}

// One visual bill per 40 simulation frames; no pickup or currency is spawned.
export function printerBanknotePose(phase: number) {
  const age = ((phase % 7.2) + 7.2) % 7.2 / 7.2;
  return { x: -16 - age * 44, y: -19 - Math.sin(age * Math.PI) * 11 + age * 9,
    rotation: -.2 - age * 1.5, opacity: Math.min(1, (1 - age) * 4) };
}

// Local offsets avoid drift when the chart rebases. Phase only advances in simulation.
export function petPose(mode: PreviewMode, phase: number, airborne = false, id = 'pets-rock', followRunner = false) {
  switch (mode) {
    // Passenger seats start at x=8 and are spaced 22 units apart.
    case 'dumpster': return { x: -14, y: -34, scale: .75 };
    case 'whale': return { x: -24, y: -7, scale: .75 };
    case 'rocket': return { x: ROCKET_PET_CANOPY.x, y: -15, scale: .3 };
    default: {
      if (id.startsWith('friend:')) return { x: -26, y: 0, scale: .75 };
      if (id === 'pets-rabbit') {
        const hop = rabbitHopPose(phase);
        return { x: -26, y: hop.y, scale: .75 };
      }
      if (id === 'pets-snail') {
        const cycle = ((phase / 8) % 1 + 1) % 1;
        const lag = cycle < .78 ? cycle / .78 : (1 - cycle) / .22;
        return { x: -26 - lag * 34, y: 0, scale: .75 };
      }
      // Each companion has its own locomotion, rather than a shared seven-pixel hop.
      const gait: Record<string, [number, number]> = {
        'pets-rock': [2, 7], 'pets-brick': [1.55, 3], 'pets-box': [1.8, 4.5],
        'pets-steak': [2.7, 5], 'pets-potato': [1.3, 2.5], 'pets-stick': [2.2, 1.5],
        'pets-duck': [3, .8], 'pets-shiba': [4, 1.3], 'pets-dead-cat': [1.7, 2],
        'pets-ostrich': [5, 1.8], 'pets-printer': [1, 3], 'pets-bag': [2.4, 5],
        'pets-hamster': [8, 1.4], 'pets-black-swan': [2.4, .8], 'pets-rabbit': [2.6, 6], 'pets-yacht': [1.1, .7],
      };
      const [speed, height] = gait[id] ?? [2, 1];
      const hopping = ['pets-rock', 'pets-brick', 'pets-box', 'pets-steak', 'pets-potato', 'pets-stick', 'pets-rabbit', 'pets-bag', 'pets-printer'].includes(id);
      const hop = -Math.abs(Math.sin(phase * speed * (hopping ? .5 : 1))) * height;
      const flop = id === 'pets-steak' ? steakFlopPose(phase).amount : 0;
      const drift = followRunner ? Math.sin(phase*.63+speed)*2.5 : 0;
      return { x: -26+drift, y: !followRunner && airborne ? -3 : height === 0 || flop === 1 ? 0 : hop * (1 - flop), scale: .75 };
    }
  }
}

export interface PetAttack { id: string; stage: 'flying' | 'returning'; x: number; y: number; vx: number; vy: number; age: number }
export const PET_ATTACK_CHANCE = 1 / 60000;
export function petAttackBossHit(attack: PetAttack, boss: {health:number}): boolean {
  if(attack.stage!=='flying'||boss.health<=0)return false;
  boss.health=Math.max(0,boss.health-8);attack.stage='returning';return true;
}
export function startPetAttack(id: string, target: { x: number; y: number }, random = Math.random): PetAttack | null {
  if (!['pets-rock', 'pets-steak', 'pets-potato', 'pets-brick', 'pets-bag'].includes(id) || random() >= PET_ATTACK_CHANCE) return null;
  const frames = 22;
  return { id, stage: 'flying', x: -26, y: -10, vx: (target.x + 26) / frames, vy: (target.y + 10) / frames - .18 * (frames - 1), age: 0 };
}
export function stepPetAttack(attack: PetAttack, heroDx: number, heroDy: number, returnFloor?: (x:number)=>number): boolean {
  attack.age++;
  attack.x -= heroDx; attack.y -= heroDy;
  if (attack.stage === 'flying') {
    attack.x += attack.vx; attack.y += attack.vy; attack.vy += .36;
    if (attack.age > 44) attack.stage = 'returning';
  } else {
    attack.x += Math.max(-4, Math.min(Math.abs(heroDx)+4, -26 - attack.x));
    const floor=returnFloor?.(attack.x)??0;
    if(Number.isFinite(floor)) {
      attack.vy=Math.min(10,Math.max(0,attack.vy)+.6);
      attack.y=attack.y>=floor?floor:Math.min(floor,attack.y+attack.vy);
      if (Math.abs(attack.x + 26) < 1 && Math.abs(attack.y-floor) < 1) return true;
    }
  }
  return attack.age > 600;
}