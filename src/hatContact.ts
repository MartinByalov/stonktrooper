// Head-local contact surfaces. These describe anatomy, never a head/hat pair.
export type HatHead = 'human' | 'ape' | 'bear' | 'bull' | 'whale' | 'frog' | 'hawk' | 'pigeon' | 'swan' | 'swanCharging' | 'jerome' | 'janet' | 'janetShell' | 'paul';
export type ContactPoint = { x: number; y: number };
export type HatContact = {
  rear: ContactPoint;
  middle: ContactPoint;
  front: ContactPoint;
  height: number;
  facing: 1 | -1;
};

function surface(x: number, y: number, halfWidth: number, dip: number, height: number, facing: 1 | -1 = 1): HatContact {
  return { rear: { x: x-halfWidth, y: y+dip }, middle: { x, y }, front: { x: x+halfWidth, y: y+dip }, height, facing };
}

export const HEAD_HAT_CONTACTS: Readonly<Record<HatHead, HatContact>> = {
  human: surface(0,-8,6.5,2,1),
  // drawApeHead uses an ellipse centered at (0,0), radii (9,10).
  // A rigid opening cuts a chord through the upper skull, rather than resting
  // tangent to its apex. At y=-6.5 the ellipse gives the opening half-width.
  // This seats the sides into the fur while keeping the eyes (top y=-5) clear.
  ape: surface(0,-6.5,9*Math.sqrt(1-(6.5/10)**2),0,1),
  bear: surface(0,-8.5,9,3,1,-1),
  bull: surface(0,-8.5,9,3,1,-1),
  // Chord through the current blunt forehead; the eye is at (-22,-30).
  whale: surface(-30,-57,13,0,1.25,-1),
  frog: surface(-23,-45,8,2.5,.9,-1),
  hawk: surface(-15,-12,6.5,2,.85,-1),
  pigeon: surface(-13,-18,6.5,2,.85,-1),
  swan: surface(-33,-41.5,6,1.8,.8,-1),
  swanCharging: surface(-46,-2.5,6,1.8,.8,-1),
  jerome: surface(0,-19,13,4,1.5),
  janet: surface(0,-9,11,3,1.2),
  janetShell: surface(-5,-60,16,3,1.2),
  paul: surface(0,-13,10,3,1.25),
};

// The rigid naval band sits around the ape's forehead, not across the full
// widest part of its round skull. Shared by companions and the monkey hero.
const APE_CAPTAIN_CONTACT = surface(0,-7,6,2.5,1);
// The crown ring encloses the full human head, not the narrower scalp chord
// used by brimmed hats. Its sides sit at the temples, above the visible eye.
const HUMAN_CROWN_CONTACT = surface(0,-7,8.5,1,1);
export function headHatContact(head: HatHead, captain = false, skin = 'hats-classic'): HatContact {
  if (!captain && head === 'human' && skin === 'hats-crown') return HUMAN_CROWN_CONTACT;
  return captain && head === 'ape' ? APE_CAPTAIN_CONTACT : HEAD_HAT_CONTACTS[head];
}

// Visible eyes in the same head-local coordinates as each contact surface.
// Janet's spinning shell has no exposed face or eyes.
export const HEAD_HAT_EYES: Readonly<Record<HatHead, readonly ContactPoint[]>> = {
  human:[{x:4.8,y:-3}], ape:[{x:4,y:-3}],
  bear:[{x:-6.5,y:-1.5}], bull:[{x:-6.5,y:-1.5}],
  whale:[{x:-24,y:-30}], frog:[{x:-25,y:-38}],
  hawk:[{x:-18,y:-8}], pigeon:[{x:-16,y:-14}],
  swan:[{x:-34,y:-39}], swanCharging:[{x:-48,y:1}],
  jerome:[{x:11,y:-7}], janet:[{x:8,y:-4}], janetShell:[],
  paul:[{x:5.7,y:-4.1}],
};

export function paperHatEyes(head: HatHead, front = false): readonly ContactPoint[] {
  if(front && (head==='human'||head==='ape'))return [{x:-3.4,y:-3},{x:3.4,y:-3}];
  // A worn bag still has two openings in profile, unlike the exposed face's
  // single visible eye. Keep the second opening behind it, inside the bag.
  const contact = HEAD_HAT_CONTACTS[head];
  const bounds = PAPER_HEAD_BOUNDS[head];
  const eye = HEAD_HAT_EYES[head][0] ?? { x: contact.middle.x, y: (bounds.top + bounds.bottom) / 2 };
  return [eye, { x: eye.x - contact.facing * 6 * contact.height, y: eye.y }];
}

// Full head envelopes, not scalp openings. Bags must enclose ears and muzzle
// as well as the skull; bounds remain in the wearer's own local coordinates.
export const PAPER_HEAD_BOUNDS: Readonly<Record<HatHead, {left:number;right:number;top:number;bottom:number}>> = {
  human:{left:-8.5,right:10,top:-15,bottom:8},
  ape:{left:-12,right:13,top:-16,bottom:11},
  bear:{left:-20,right:14,top:-21,bottom:12},
  bull:{left:-20,right:15,top:-24,bottom:12},
  whale:{left:-51,right:-8,top:-62,bottom:-18},
  frog:{left:-43,right:-5,top:-60,bottom:-22},
  hawk:{left:-29,right:-4,top:-24,bottom:1},
  pigeon:{left:-27,right:0,top:-31,bottom:-1},
  swan:{left:-44,right:-22,top:-54,bottom:-25},
  swanCharging:{left:-59,right:-32,top:-16,bottom:15},
  jerome:{left:-18,right:23,top:-35,bottom:14},
  janet:{left:-17,right:20,top:-25,bottom:15},
  janetShell:{left:-29,right:19,top:-81,bottom:-30},
  paul:{left:-14,right:16,top:-28,bottom:12},
};

type Matrix = readonly [number, number, number, number, number, number];
const identity: Matrix = [1,0,0,1,0,0];
const multiply = (a: Matrix, b: Matrix): Matrix => [
  a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],
  a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
  a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5],
];
const point = (m: Matrix, x: number, y: number): ContactPoint => ({ x: m[0]*x+m[2]*y+m[4], y: m[1]*x+m[3]*y+m[5] });
const translate = (x: number, y: number): Matrix => [1,0,0,1,x,y];
const scale = (x: number, y: number): Matrix => [x,0,0,y,0,0];
const rotate = (a: number): Matrix => [Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0];

// The opening belongs to the artwork. Its three points include the artwork's
// own transforms, not corrections for individual wearers. Peaks are NOT part
// of the opening: they must still project beyond the forehead.
export function hatArtworkContact(skin: string, captain = false, front = false): HatContact {
  let m: Matrix = identity;
  const apply = (next: Matrix) => { m=multiply(m,next); };
  let rear: ContactPoint = {x:-10,y:-7}, middle: ContactPoint = {x:0,y:-7}, forward: ContactPoint = {x:10,y:-7};
  const kind=skin.slice(5);
  const novel=['cap','crown','christmas','cowboy','paper','tinfoil','propeller','cone','top'].includes(kind);
  if(captain) {
    apply(translate(0,-7));apply(scale(.84,.84));apply(translate(0,7));
    // Actual underside of the desktop cap's band: the profile rises towards
    // the visor. Its quadratic midpoint is not the obsolete horizontal band.
    rear=front?{x:-10,y:-7}:{x:-9,y:-5};
    middle=front?{x:0,y:-7}:{x:.75,y:-6.25};
    forward=front?{x:10,y:-7}:{x:11,y:-10};
  } else if(novel) {
    if(kind==='tinfoil'||kind==='propeller')apply(translate(0,2));
    if(kind==='cap')apply(translate(front?0:-1,1.5));
    apply(translate(0,-7));apply(scale(kind==='paper'?.8:front?.8:.65,kind==='paper'?1.1:.78));apply(translate(0,7));
    const width=kind==='crown'?13:kind==='christmas'?12:kind==='cone'?14:11;
    const y=kind==='cone'?-5:kind==='christmas'?-6:-8;
    rear={x:-width,y};middle={x:0,y:kind==='cap'?-6.5:y};forward={x:width,y};
    if(kind==='crown') {
      if(!front)apply(scale(.78,1));apply(translate(-.5,-7));apply(rotate(front?-.04:-.03));apply(translate(0,7));
      apply([1,0,.18,1,1.44,0]);
      middle.y=front?-6:-7.4;
    }
    if(kind==='top'){apply(translate(0,-8));apply(rotate(front?-.04:-.07));apply(translate(0,8));}
    // The reversed peak changes the design, not the direction of the wearer.
    if(kind==='cap'&&!front)apply(scale(-1,1));
  } else if(front) {
    apply(translate(0,-7));apply(scale(.86,.86));apply(translate(0,7));
  } else {
    apply(translate(0,-7));apply(rotate(-.12));apply(scale(.86,.86));apply(translate(0,7));
  }
  const points=[rear,middle,forward].map(p=>point(m,p.x,p.y)).sort((a,b)=>a.x-b.x);
  return {rear:points[0],middle:points[1],front:points[2],height:1,facing:1};
}

// Interpolate the actual three-point contact, including asymmetric bands.
export function contactY(contact: HatContact, x: number): number {
  const points=[contact.rear,contact.middle,contact.front];
  return points.reduce((y,p,i)=>y+p.y*points.reduce((weight,q,j)=>i===j?weight:weight*(x-q.x)/(p.x-q.x),1),0);
}

export function fitHatPoint(p: ContactPoint, artwork: HatContact, head: HatContact, lift = 0, conform = true): ContactPoint {
  const width=(head.front.x-head.rear.x)/(artwork.front.x-artwork.rear.x);
  const sourceSlope=(artwork.front.y-artwork.rear.y)/(artwork.front.x-artwork.rear.x);
  const targetSlope=(head.front.y-head.rear.y)/(head.front.x-head.rear.x)*head.facing;
  const angle=Math.atan(targetSlope)-Math.atan(sourceSlope);
  const size=width*Math.cos(Math.atan(sourceSlope))/Math.cos(Math.atan(targetSlope));
  const sourceX=Math.max(artwork.rear.x,Math.min(artwork.front.x,p.x));
  const sourceY=contactY(artwork,sourceX);
  const rigid=(x:number,y:number)=>({
    x:head.middle.x+head.facing*size*((x-artwork.middle.x)*Math.cos(angle)-(y-artwork.middle.y)*Math.sin(angle)),
    y:head.middle.y+size*((x-artwork.middle.x)*Math.sin(angle)+(y-artwork.middle.y)*Math.cos(angle)),
  });
  const base=rigid(p.x,p.y);
  const onBand=rigid(sourceX,sourceY);
  const t=(sourceX-artwork.rear.x)/(artwork.front.x-artwork.rear.x);
  const contactX=head.facing===1?head.rear.x+t*(head.front.x-head.rear.x):head.front.x-t*(head.front.x-head.rear.x);
  // Only the seating edge conforms. Crown, emblem and peak keep a single
  // similarity transform (uniform scale/rotation), never independent X/Y stretch.
  const distance=Math.abs(p.y-sourceY);
  const outsideDistance=Math.abs(p.x-sourceX);
  const weight=!conform||distance>=2||outsideDistance>=2?0:(1-distance/2)**2*(1-outsideDistance/2)**2;
  return {x:base.x+(contactX-onBand.x)*weight,y:base.y+(contactY(head,contactX)-onBand.y)*weight-lift};
}

// A vector adapter, not a raster stretch: flatten curves in artwork space and
// map them onto the head surface. The caller's pose/mirror transform stays on
// the real context, so the exact same fit follows running, riding and charging.
export function hatContactContext(ctx: CanvasRenderingContext2D, artwork: HatContact, head: HatContact, lift = 0, conform = true): CanvasRenderingContext2D {
  let matrix=identity, cursor: ContactPoint={x:0,y:0};
  const stack: Matrix[]=[];
  const map=(x:number,y:number)=>fitHatPoint(point(matrix,x,y),artwork,head,lift,conform);
  const line=(x:number,y:number,move=false)=>{const p=map(x,y);if(move)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);cursor={x,y};};
  const curve=(points: ContactPoint[])=>{
    const start=cursor;
    for(let i=1;i<=24;i++){
      const t=i/24,u=1-t;
      if(points.length===2){const [c,end]=points;line(u*u*start.x+2*u*t*c.x+t*t*end.x,u*u*start.y+2*u*t*c.y+t*t*end.y);}
      else {const [a,b,end]=points;line(u*u*u*start.x+3*u*u*t*a.x+3*u*t*t*b.x+t*t*t*end.x,u*u*u*start.y+3*u*u*t*a.y+3*u*t*t*b.y+t*t*t*end.y);}
    }
  };
  const ellipse=(x:number,y:number,rx:number,ry:number,rotation:number,start:number,end:number,ccw=false)=>{
    let sweep=end-start;
    if(!ccw){if(sweep>=Math.PI*2)sweep=Math.PI*2;else while(sweep<0)sweep+=Math.PI*2;}
    else {if(sweep<=-Math.PI*2)sweep=-Math.PI*2;else while(sweep>0)sweep-=Math.PI*2;}
    const segments=Math.max(8,Math.ceil(Math.abs(sweep)*12));
    for(let i=0;i<=segments;i++){
      const a=start+sweep*i/segments,dx=Math.cos(a)*rx,dy=Math.sin(a)*ry;
      line(x+dx*Math.cos(rotation)-dy*Math.sin(rotation),y+dx*Math.sin(rotation)+dy*Math.cos(rotation));
    }
  };
  const rect=(x:number,y:number,w:number,h:number)=>{line(x,y,true);line(x+w,y);line(x+w,y+h);line(x,y+h);ctx.closePath();};
  const methods: Record<string, (...args: any[]) => any> = {
    save(){stack.push(matrix);ctx.save();},
    restore(){matrix=stack.pop()??identity;ctx.restore();},
    translate(x:number,y:number){matrix=multiply(matrix,translate(x,y));},
    scale(x:number,y:number){matrix=multiply(matrix,scale(x,y));},
    rotate(a:number){matrix=multiply(matrix,rotate(a));},
    moveTo(x:number,y:number){line(x,y,true);},lineTo:line,
    quadraticCurveTo(x:number,y:number,ex:number,ey:number){curve([{x,y},{x:ex,y:ey}]);},
    bezierCurveTo(x:number,y:number,bx:number,by:number,ex:number,ey:number){curve([{x,y},{x:bx,y:by},{x:ex,y:ey}]);},
    ellipse,arc(x:number,y:number,r:number,start:number,end:number,ccw=false){ellipse(x,y,r,r,0,start,end,ccw);},
    rect,
    roundRect(x:number,y:number,w:number,h:number,radius:number){
      const r=Math.min(radius,w/2,h/2);
      line(x+r,y,true);line(x+w-r,y);ellipse(x+w-r,y+r,r,r,0,-Math.PI/2,0);
      line(x+w,y+h-r);ellipse(x+w-r,y+h-r,r,r,0,0,Math.PI/2);
      line(x+r,y+h);ellipse(x+r,y+h-r,r,r,0,Math.PI/2,Math.PI);
      line(x,y+r);ellipse(x+r,y+r,r,r,0,Math.PI,Math.PI*1.5);ctx.closePath();
    },
    fillRect(x:number,y:number,w:number,h:number){ctx.beginPath();rect(x,y,w,h);ctx.fill();},
    strokeRect(x:number,y:number,w:number,h:number){ctx.beginPath();rect(x,y,w,h);ctx.stroke();},
    createLinearGradient(x:number,y:number,ex:number,ey:number){const a=map(x,y),b=map(ex,ey);return ctx.createLinearGradient(a.x,a.y,b.x,b.y);},
  };
  return new Proxy(ctx,{
    get(target,key){if(typeof key==='string'&&key in methods)return methods[key];const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;},
    set(target,key,value){
      if(key==='lineWidth')value*=Math.sqrt(Math.abs(matrix[0]*matrix[3]-matrix[1]*matrix[2]))*head.height;
      return Reflect.set(target,key,value,target);
    },
  });
}