import { skinColors } from './modelColors';
import { briefcaseArmPose, runnerLegPose, farArmPose } from './characterPose';
import { drawJointedArm, traceJointedArm } from './armRenderer';
import { traceProfileTorso, traceProfilePelvis } from './profileAnatomy';
import { profileTiePose } from './garmentPose';

// Shared by product artwork and every character pose, including the collar.
const suitShirts: Record<string, readonly [string, string]> = {
  'suits-classic': ['#ffffff', '#ffffff'],
  'suits-ocean': ['#cffafe', '#a5f3fc'],
  'suits-orchid': ['#fce7f3', '#fbcfe8'],
  'suits-gold': ['#ffedd5', '#fed7aa'],
  'suits-squeeze': ['#dbeafe', '#a5b4fc'],
  'suits-too-big': ['#e0e7ff', '#c4b5fd'],
  'suits-money': ['#f3e8ff', '#ff1493'],
};

export function suitShirtColor(id: string, dark: boolean): string {
  return suitShirts[id]?.[dark ? 1 : 0] ?? skinColors(id, dark)[0];
}

// The current path is the fabric boundary. Clip the repeating print so it never
// spills onto skin, shirt, tie, or the space between trouser legs.
function drawMoneyPrint(ctx: CanvasRenderingContext2D, dark: boolean, left: number, top: number, right: number, bottom: number, size: number): void {
  ctx.save(); ctx.clip();
  ctx.fillStyle = dark ? '#14532d' : '#bbf7d0';
  ctx.font = `bold ${size}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const spacing = size * 1.7;
  let row = 0;
  for (let y = top; y <= bottom; y += spacing, row++) {
    for (let x = left + (row % 2) * spacing / 2; x <= right; x += spacing) ctx.fillText('$', x, y);
  }
  ctx.restore();
}

// Shared sleeve artwork follows the actual elbow/hand pose, including throws.
export function drawSuitSleeve(ctx: CanvasRenderingContext2D, id: string, dark: boolean, points: readonly (readonly [number, number])[], width: number): void {
  if(id==='suits-tracksuit'&&points.length===3) {
    const [shoulder,elbow,wrist]=points.map(([x,y])=>({x,y}));
    drawJointedSuitArm(ctx,id,dark,shoulder,elbow,wrist,width,width);
    return;
  }
  ctx.save(); ctx.strokeStyle = skinColors(id, dark)[0]; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  points.forEach(([x,y], i) => { if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.stroke();
  if (id === 'suits-money') {
    // Build a filled union of the round stroke segments for clipping the print.
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const [x,y] = points[i], radius = width / 2;
      ctx.moveTo(x + radius,y); ctx.arc(x,y,radius,0,Math.PI*2);
      if (i === 0) continue;
      const [px,py] = points[i-1], length = Math.hypot(x-px,y-py);
      if (!length) continue;
      const nx = -(y-py) / length * radius, ny = (x-px) / length * radius;
      ctx.moveTo(px+nx,py+ny); ctx.lineTo(px-nx,py-ny);
      ctx.lineTo(x-nx,y-ny); ctx.lineTo(x+nx,y+ny); ctx.closePath();
    }
    const xs = points.map(p=>p[0]), ys = points.map(p=>p[1]);
    drawMoneyPrint(ctx,dark,Math.min(...xs)-width/2,Math.min(...ys)-width/2,Math.max(...xs)+width/2,Math.max(...ys)+width/2,1.6);
  }
  ctx.restore();
}

type ArmPoint = { x: number; y: number };

export function traceSuitShoulderPad(ctx: CanvasRenderingContext2D, width: number): void {
  // Rounded dome and rolled edges blend into the sleeve without box corners.
  ctx.beginPath();ctx.moveTo(-width*.42,2);
  ctx.bezierCurveTo(-width*.67,2,-width*.67,-.8,-width*.5,-1.8);
  ctx.bezierCurveTo(-width*.3,-3.25,width*.3,-3.25,width*.5,-1.8);
  ctx.bezierCurveTo(width*.67,-.8,width*.67,2,width*.42,2);
  ctx.quadraticCurveTo(0,2.5,-width*.42,2);ctx.closePath();
}

// Keep the same rounded elbow and narrower forearm used by the main game arm renderer.
export function drawJointedSuitArm(ctx: CanvasRenderingContext2D, id: string, dark: boolean, shoulder: ArmPoint, elbow: ArmPoint, wrist: ArmPoint, upperWidth: number, forearmWidth: number): void {
  drawJointedSuitArmFabric(ctx,id,dark,shoulder,elbow,wrist,upperWidth,forearmWidth);
}

function drawJointedSuitArmFabric(ctx: CanvasRenderingContext2D, id: string, dark: boolean, shoulder: ArmPoint, elbow: ArmPoint, wrist: ArmPoint, upperWidth: number, forearmWidth: number): void {
  const [body, trim] = skinColors(id, dark);
  if (id === 'suits-too-big') {
    upperWidth += 2;
    forearmWidth += 1.5;
  }
  drawJointedArm(ctx, shoulder, elbow, wrist, body, upperWidth, forearmWidth);
  if(id==='suits-too-big') {
    // The pad belongs to the sleeve/shoulder, so it remains visible above the
    // moving arm instead of being buried beneath a normal cylindrical sleeve.
    ctx.save();ctx.translate(shoulder.x,shoulder.y);
    ctx.rotate(Math.atan2(elbow.y-shoulder.y,elbow.x-shoulder.x)-Math.PI/2);
    ctx.fillStyle=body;traceSuitShoulderPad(ctx,upperWidth);ctx.fill();ctx.clip();
    ctx.fillStyle=dark?'#3b82f6':'#2456bf';ctx.beginPath();
    ctx.moveTo(-upperWidth*.5,-1.8);
    ctx.bezierCurveTo(-upperWidth*.3,-3.25,upperWidth*.3,-3.25,upperWidth*.5,-1.8);
    ctx.quadraticCurveTo(upperWidth*.54,-.8,upperWidth*.34,-.65);
    ctx.quadraticCurveTo(0,-1.8,-upperWidth*.34,-.65);
    ctx.quadraticCurveTo(-upperWidth*.54,-.8,-upperWidth*.5,-1.8);ctx.closePath();ctx.fill();
    ctx.restore();
  }
  if (!['suits-money','suits-tracksuit','suits-prison','suits-pajamas'].includes(id)) return;

  ctx.save();
  const control = { x: (shoulder.x + elbow.x) / 2, y: (shoulder.y + elbow.y) / 2 };
  const curvePoints = [shoulder];
  for (let i = 1; i <= 8; i++) {
    const t = i / 8, inverse = 1 - t;
    curvePoints.push({
      x: inverse * inverse * shoulder.x + 2 * inverse * t * control.x + t * t * elbow.x,
      y: inverse * inverse * shoulder.y + 2 * inverse * t * control.y + t * t * elbow.y,
    });
  }
  // Decorations use the exact filled contour, not a wider capsule approximation.
  traceJointedArm(ctx,shoulder,elbow,wrist,upperWidth,forearmWidth);
  const xs = [...curvePoints.map(p => p.x), wrist.x], ys = [...curvePoints.map(p => p.y), wrist.y];
  if (id === 'suits-money') {
    drawMoneyPrint(ctx, dark, Math.min(...xs) - upperWidth / 2, Math.min(...ys) - upperWidth / 2, Math.max(...xs) + upperWidth / 2, Math.max(...ys) + upperWidth / 2, 1.6);
  } else {
    // Details follow the same moving joints and remain inside the sleeve fabric.
    ctx.clip(); ctx.strokeStyle=trim; ctx.fillStyle=trim;
    ctx.lineCap='round'; ctx.lineJoin='round'; ctx.lineWidth=.65;
    if (id === 'suits-tracksuit') {
      // Three straight, parallel shoulder-to-cuff stripes, clipped to the fabric.
      const dx=wrist.x-shoulder.x,dy=wrist.y-shoulder.y,length=Math.hypot(dx,dy);
      if(length) {
        ctx.strokeStyle='#ffffff';ctx.lineWidth=.55;
        for(const offset of [-1,0,1]) {
          const nx=-dy/length*offset,ny=dx/length*offset;
          const inset=Math.min(2,length*.15);
          ctx.beginPath();ctx.moveTo(shoulder.x+nx+dx/length*inset,shoulder.y+ny+dy/length*inset);
          ctx.lineTo(wrist.x+nx-dx/length*inset,wrist.y+ny-dy/length*inset);ctx.stroke();
        }
        ctx.strokeStyle=trim;
      }
    }
    if (id === 'suits-pajamas') {
      for (const [from,to] of [[shoulder,elbow],[elbow,wrist]]) {
        for (const t of [.3,.75]) {
          ctx.beginPath(); ctx.arc(from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t,.55,0,Math.PI*2); ctx.fill();
        }
      }
    }
    // A fabric cuff stays perpendicular to the forearm, even during a throw.
    const dx=wrist.x-elbow.x, dy=wrist.y-elbow.y, length=Math.hypot(dx,dy);
    if (length) {
      const x=wrist.x-dx/length*.6, y=wrist.y-dy/length*.6;
      ctx.lineWidth=.8; ctx.beginPath();
      ctx.moveTo(x-dy/length*forearmWidth/2,y+dx/length*forearmWidth/2);
      ctx.lineTo(x+dy/length*forearmWidth/2,y-dx/length*forearmWidth/2); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawPrisonLabel(ctx: CanvasRenderingContext2D, background: string, x: number, y: number, width: number, height: number, fontSize: number): void {
  ctx.save();
  ctx.fillStyle = background; ctx.fillRect(x, y, width, height);
  ctx.fillStyle = '#292524'; ctx.font = `${fontSize}px monospace`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const text = '404', metrics = ctx.measureText(text);
  // Center the visible glyph bounds, rather than the font's advance/em box.
  const textX = x + width / 2 + (metrics.actualBoundingBoxLeft - metrics.actualBoundingBoxRight) / 2;
  const textY = y + height / 2 + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
  ctx.fillText(text, textX, textY);
  ctx.restore();
}

// Hat coordinates match drawCharacterHat: the head sits directly below y=-7.
export function drawNovelHat(ctx: CanvasRenderingContext2D, id: string, dark: boolean, front: boolean, phase = 0, showPropeller = true, showPaperEyes = true): boolean {
  const kind = id.slice(5);
  if (!['cap', 'crown', 'christmas', 'cowboy', 'paper', 'tinfoil', 'propeller', 'cone', 'top'].includes(kind)) return false;
  const [body, trim] = skinColors(id, dark);
  ctx.save(); ctx.fillStyle = body; ctx.strokeStyle = dark ? '#64748b' : '#493c32'; ctx.lineWidth = .7;
  // Seat these bands into the scalp, not above it; keep the eyes uncovered.
  if (kind === 'tinfoil' || kind === 'propeller') ctx.translate(0,2);
  if (kind === 'cap') ctx.translate(front ? 0 : -1,1.5);
  // Fit the same forehead contact point as the fedora. Profile peaks face right;
  // the near/right shoulder is visible, so never mirror an equipped hat.
  ctx.translate(0, -7); ctx.scale(kind==='paper'?.8:front ? .8 : .65, kind==='paper'?1.1:.78); ctx.translate(0, 7);
  const shape = (draw: () => void) => { ctx.beginPath(); draw(); ctx.closePath(); ctx.fill(); ctx.stroke(); };
  if (kind === 'cone') {
    shape(() => { ctx.moveTo(-14,-8); ctx.lineTo(-2,-39); ctx.quadraticCurveTo(0,-42,2,-39); ctx.lineTo(14,-8); });
    ctx.fillStyle=trim;
    for (const [top,bottom] of [[-31,-27],[-20,-15]]) {
      const halfWidth = (y: number) => 2 + (y + 39) * 12 / 31;
      shape(() => { ctx.moveTo(-halfWidth(top),top); ctx.lineTo(halfWidth(top),top); ctx.lineTo(halfWidth(bottom),bottom); ctx.lineTo(-halfWidth(bottom),bottom); });
    }
    ctx.fillStyle=body; ctx.beginPath(); ctx.roundRect(-18,-10,36,5,1); ctx.fill(); ctx.stroke();
  } else if (kind === 'top') {
    // A subtle rearward lean, pivoted on the brim rather than the crown.
    ctx.translate(0,-8); ctx.rotate(front ? -.04 : -.07); ctx.translate(0,8);
    ctx.fillStyle=body; shape(() => { ctx.ellipse(0,-8,20,4,0,0,Math.PI*2); });
    shape(() => { ctx.moveTo(-11,-9); ctx.lineTo(-13,-34); ctx.quadraticCurveTo(0,-38,13,-34); ctx.lineTo(11,-9); ctx.quadraticCurveTo(0,-6,-11,-9); });
    ctx.fillStyle=trim; ctx.fillRect(-11,-16,22,5);
    ctx.strokeStyle=dark?'#f8fafc':'#64748b'; ctx.beginPath(); ctx.moveTo(-8,-31); ctx.lineTo(-7,-19); ctx.stroke();
  } else if (kind === 'paper') {
    shape(() => { ctx.moveTo(-11, 9); ctx.lineTo(-12, -25); ctx.lineTo(12, -25); ctx.lineTo(13, 9); ctx.lineTo(7, 7); ctx.lineTo(2, 9); ctx.lineTo(-4, 7); });
    ctx.strokeStyle = dark ? trim : '#98734c'; ctx.beginPath(); ctx.moveTo(-8, -22); ctx.lineTo(9, -22); ctx.moveTo(-8, -20); ctx.lineTo(-7, 5); ctx.stroke();
    ctx.fillStyle = dark ? '#30271f' : '#221c17';
    if (showPaperEyes) for (const x of front ? [-5, 5] : [3, 9]) { ctx.beginPath(); ctx.ellipse(x, -3, 2, 2.8, 0, 0, Math.PI * 2); ctx.fill(); }
  } else if (kind === 'crown') {
    // The profile skull is narrower than a fedora brim. Fit the crown's ring
    // around its temples rather than letting the band overhang either side.
    if (!front) ctx.scale(.78,1);
    ctx.translate(-.5, -7); ctx.rotate(front ? -.04 : -.03); ctx.translate(0, 7);
    // Lean the crown and horns left around the seating edge. Unlike a rigid
    // rotation, this design lean survives the shared head-contact alignment.
    ctx.transform(1,0,.18,1,1.44,0);
    // Ivory bull horns sweep out and up behind the gold crown.
    const metalEdge=dark?'#64748b':'#87520d';
    const metalShine=dark?'#f0f9ff':'#fff2a3';
    // In profile the band follows the scalp, not a deep frontal hanging arc.
    const bandCurve=front?-4:-6.8;
    const bandTop=front?-10:-12;
    ctx.fillStyle=dark?'#f0f9ff':'#e7d9b7'; ctx.strokeStyle=dark?'#94a3b8':'#947448';
    for(const side of [-1,1]) shape(() => { ctx.moveTo(side*10,-17); ctx.bezierCurveTo(side*22,-14,side*31,-23,side*28,-36); ctx.quadraticCurveTo(side*25,-25,side*13,-25); ctx.closePath(); });
    const gold = ctx.createLinearGradient(-16, -22, 16, -8);
    gold.addColorStop(0, dark ? '#64748b' : '#8c570e'); gold.addColorStop(.3, body);
    gold.addColorStop(.5, metalShine); gold.addColorStop(.7, body); gold.addColorStop(1, dark?'#64748b':'#a16207');
    ctx.fillStyle = dark ? '#312e81' : '#6f1939';
    shape(() => { ctx.ellipse(0, -10, 13, 3.5, 0, 0, Math.PI * 2); });
    ctx.fillStyle = gold; ctx.strokeStyle = metalEdge; ctx.lineWidth = .8;
    shape(() => { ctx.moveTo(-13, -8); ctx.lineTo(-16, -25); ctx.lineTo(-9, -20); ctx.lineTo(-7, -29); ctx.lineTo(-3, -22); ctx.lineTo(0, -33); ctx.lineTo(4, -22); ctx.lineTo(9, -29); ctx.lineTo(10, -20); ctx.lineTo(16, -25); ctx.lineTo(13, -8); ctx.quadraticCurveTo(0, bandCurve, -13, -8); });
    ctx.fillStyle = gold;
    shape(() => { ctx.moveTo(-13, -14); ctx.quadraticCurveTo(0, bandTop, 13, -14); ctx.lineTo(13, -8); ctx.quadraticCurveTo(0, bandCurve, -13, -8); });
    ctx.strokeStyle = metalShine; ctx.lineWidth = .65;
    for (const y of [-13, -8]) { ctx.beginPath(); ctx.moveTo(-12,y); ctx.quadraticCurveTo(0,y+(front?3:1),12,y); ctx.stroke(); }
    for (const [x,y] of [[-16,-25],[-7,-29],[0,-33],[9,-29],[16,-25]]) {
      ctx.fillStyle = metalShine; ctx.beginPath(); ctx.arc(x,y,1.3,0,Math.PI*2); ctx.fill(); ctx.stroke();
    }
    for (const [index, x] of [-8, 0, 8].entries()) {
      const y = x === 0 ? -16 : -17, size = x === 0 ? 3.3 : 2.4;
      ctx.fillStyle = metalShine; ctx.strokeStyle = metalEdge; ctx.lineWidth = .6;
      ctx.beginPath(); ctx.ellipse(x,y,size+1,size+1.3,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = index === 1 ? trim : dark ? '#67e8f9' : '#087f8c';
      ctx.beginPath(); ctx.moveTo(x,y-size); ctx.lineTo(x+size,y); ctx.lineTo(x,y+size); ctx.lineTo(x-size,y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffffa0'; ctx.beginPath(); ctx.moveTo(x,y-size); ctx.lineTo(x,y); ctx.lineTo(x-size,y); ctx.closePath(); ctx.fill();
      // Offset glints make each gemstone sparkle independently, not flash together.
      const shine = .5 + .5 * Math.sin(phase * 3.2 + index * 2.1);
      ctx.save(); ctx.globalAlpha *= .25 + shine * .75;
      ctx.strokeStyle = '#fffef0'; ctx.lineWidth = .6;
      const reach = .8 + shine * 2.1, gx = x + size * .35, gy = y - size * .45;
      ctx.beginPath(); ctx.moveTo(gx-reach,gy); ctx.lineTo(gx+reach,gy); ctx.moveTo(gx,gy-reach); ctx.lineTo(gx,gy+reach); ctx.stroke(); ctx.restore();
    }
    ctx.fillStyle = metalShine;
    for (const x of [-10,-5,0,5,10]) { ctx.beginPath(); ctx.arc(x,-9+ (1-Math.abs(x)/10),.55,0,Math.PI*2); ctx.fill(); }
  } else if (kind === 'christmas') {
    shape(() => { ctx.moveTo(-12, -10); ctx.bezierCurveTo(-9, -35, 14, -38, 19, -20); ctx.quadraticCurveTo(12, -28, 9, -10); });
    ctx.fillStyle = trim; ctx.beginPath(); ctx.roundRect(-14, -13, 27, 7, 3); ctx.fill();
    ctx.beginPath(); ctx.arc(19, -20, 4, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'cowboy') {
    // Crown and curled brim share one silhouette, without an outlined join.
    shape(() => {
      ctx.moveTo(-24,-13); ctx.quadraticCurveTo(-18,-8,-12,-10);
      ctx.lineTo(-10,-26); ctx.quadraticCurveTo(-5,-30,0,-25);
      ctx.quadraticCurveTo(7,-30,11,-25); ctx.lineTo(13,-10);
      ctx.quadraticCurveTo(20,-9,25,-14); ctx.quadraticCurveTo(22,2,0,-6);
      ctx.quadraticCurveTo(-20,2,-24,-13);
    });
    ctx.fillStyle = trim; ctx.fillRect(-11, -15, 23, 3);
  } else if (kind === 'tinfoil') {
    shape(() => { ctx.moveTo(-14, -8); ctx.lineTo(-8, -20); ctx.lineTo(3, -34); ctx.lineTo(6, -20); ctx.lineTo(14, -8); });
    ctx.strokeStyle = trim; ctx.beginPath(); ctx.moveTo(3, -32); ctx.lineTo(-2, -13); ctx.lineTo(9, -9); ctx.moveTo(-8, -19); ctx.lineTo(6, -20); ctx.stroke();
  } else if (kind === 'cap') {
    // Turn only the cap around: the wearer's face and other hats still face right.
    if (!front) ctx.scale(-1,1);
    ctx.strokeStyle=trim; ctx.lineWidth=.55;
    // A curved lower edge wraps the skull; the peak grows from its front edge.
    shape(() => {
      ctx.moveTo(-11,-8); ctx.bezierCurveTo(-13,-27,12,-28,13,-10);
      if (!front) { ctx.quadraticCurveTo(23,-9,25,-6); ctx.quadraticCurveTo(16,-3,5,-7); }
      ctx.quadraticCurveTo(2,-5,-11,-8);
    });
    if (!front) {
      // A darker, solid peak reads as a backwards baseball cap, not a fedora.
      ctx.fillStyle=trim;
      shape(() => {
        ctx.moveTo(12,-10); ctx.quadraticCurveTo(23,-9,25,-6);
        ctx.quadraticCurveTo(16,-3,5,-7); ctx.quadraticCurveTo(10,-7,12,-10);
      });
    }
    if (front) {
      // From the front the rear peak is hidden; show the adjustment strap.
      ctx.strokeStyle = trim; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-5,-8); ctx.quadraticCurveTo(0,-6,5,-8); ctx.stroke();
    }
    // Tonal stitching follows a curved panel; no stark white stripe.
    ctx.strokeStyle=dark?'#60a5fa':'#3b82f6'; ctx.lineWidth=.55;
    ctx.beginPath(); ctx.moveTo(0,-23); ctx.quadraticCurveTo(4,-18,4,-9); ctx.stroke();
    ctx.fillStyle=trim; ctx.beginPath(); ctx.ellipse(0,-23,.9,.55,0,0,Math.PI*2); ctx.fill();
    if (!front) {
      ctx.fillStyle=trim; ctx.beginPath(); ctx.roundRect(-10,-10,5,1.6,.65); ctx.fill();
      ctx.fillStyle=dark?'#dbeafe':'#93c5fd'; ctx.fillRect(-8.5,-9.8,1.1,1.2);
    }
  } else {
    const capOutline = () => {
      ctx.moveTo(-12,-9); ctx.bezierCurveTo(-14,-28,13,-29,14,-10);
      ctx.quadraticCurveTo(front ? 20 : 26,-7,front ? 16 : 24,-5);
      ctx.lineTo(front ? 12 : 8,-6); ctx.quadraticCurveTo(-4,-5,-12,-9);
    };
    ctx.beginPath(); capOutline(); ctx.closePath(); ctx.fill();
    // Recolor the peak inside the silhouette; stroke only its outer boundary.
    ctx.save(); ctx.clip(); ctx.fillStyle = dark ? '#be123c' : '#b91c1c';
    // Cover the entire lower lip in the Exchange's side view too, not just
    // the projecting right half. The clip preserves the outer silhouette.
    ctx.beginPath(); ctx.moveTo(-12,-9);
    ctx.lineTo(14,-10);
    ctx.quadraticCurveTo(front ? 20 : 26,-7,front ? 16 : 24,-5);
    ctx.lineTo(front ? 12 : 8,-6);
    ctx.quadraticCurveTo(-4,-5,-12,-9);
    ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.beginPath(); capOutline(); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = trim; ctx.beginPath(); ctx.moveTo(0, -24); ctx.quadraticCurveTo(4, -18, 4, -10); ctx.stroke();
    if (kind === 'propeller' && showPropeller) {
      ctx.strokeStyle = dark ? '#cbd5e1' : '#374151'; ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, -30); ctx.stroke();
      ctx.save(); ctx.translate(0, -31); ctx.scale(1, .28); ctx.rotate(phase * 8);
      ctx.fillStyle = dark ? '#f9a8d4' : '#ef4444'; ctx.beginPath(); ctx.ellipse(-6, 0, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = dark ? '#67e8f9' : '#16a34a'; ctx.beginPath(); ctx.ellipse(6, 0, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore(); ctx.fillStyle = trim; ctx.beginPath(); ctx.arc(0, -31, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore(); return true;
}

export const bagGripX = (id: string): number =>
  id === 'suitcase-tote' || id === 'suitcase-pizza' ? 9 :
    id === 'suitcase-duffel' || id === 'suitcase-backpack' ? 8.5 : 7.5;

// Contact point on the actual handle (or finger holes), in bag coordinates.
export const bagGripY = (id: string): number =>
  id === 'suitcase-pizza' ? -1.5 :
    id === 'suitcase-bowling' ? -1 : id === 'suitcase-dynamite' ? 1 : -3;

// Canonical handheld scale. Classic geometry is the original game's 19x13 case.
export function drawEquippedBag(ctx: CanvasRenderingContext2D, id: string, dark = false): void {
  const [body, trim] = skinColors(id, dark);
  ctx.save(); ctx.fillStyle = body; ctx.strokeStyle = dark ? '#cbd5e1' : '#1e293b'; ctx.lineWidth = .8;
  if (id === 'suitcase-dynamite') {
    // Smooth bundled sticks and a broad label, not a pixel-art crate.
    ctx.fillStyle=dark?'#881337':'#7f1d1d';
    ctx.beginPath();ctx.roundRect(-3,1,22,20,2.5);ctx.fill();
    for(const x of [-2,4,10]) {
      ctx.fillStyle=body;ctx.beginPath();ctx.roundRect(x,0,6.5,21,2.4);ctx.fill();
      ctx.strokeStyle=dark?'#ffe4e6':'#ef7770';ctx.lineWidth=.45;
      ctx.beginPath();ctx.moveTo(x+1.5,3);ctx.lineTo(x+1.5,18);ctx.stroke();
    }
    ctx.fillStyle=dark?'#f0f9ff':'#fffaf0';
    ctx.beginPath();ctx.roundRect(-2.5,6,20,10.5,1);ctx.fill();
    // Continuous vector glyphs: bold T / diagonal N / T, no font dependency.
    ctx.fillStyle='#18181b';
    for(const x of [-.7,11.1]) {
      ctx.beginPath();ctx.moveTo(x,8);ctx.lineTo(x+4.8,8);ctx.lineTo(x+4.8,9.4);
      ctx.lineTo(x+3.1,9.4);ctx.lineTo(x+3.1,14.6);ctx.lineTo(x+1.7,14.6);
      ctx.lineTo(x+1.7,9.4);ctx.lineTo(x,9.4);ctx.closePath();ctx.fill();
    }
    ctx.beginPath();ctx.moveTo(5.2,14.6);ctx.lineTo(5.2,8);ctx.lineTo(6.6,8);
    ctx.lineTo(9,12);ctx.lineTo(9,8);ctx.lineTo(10.4,8);ctx.lineTo(10.4,14.6);
    ctx.lineTo(9,14.6);ctx.lineTo(6.6,10.6);ctx.lineTo(6.6,14.6);ctx.closePath();ctx.fill();
    ctx.strokeStyle=trim;ctx.lineWidth=1.3;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(7.5,1);ctx.bezierCurveTo(5,-3,13,-2,11,-7);ctx.stroke();
    ctx.restore(); return;
  }
  if (id === 'suitcase-bowling') {
    // No luggage handle: the near hand grips the finger holes at the top.
    ctx.beginPath(); ctx.arc(7.5, 8, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = trim; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(7.5, 8, 8, .4, 2.5); ctx.stroke();
    ctx.fillStyle = dark ? '#241033' : '#171020';
    for (const [x, y] of [[5,-1],[10,-1],[7.5,3]]) { ctx.beginPath(); ctx.arc(x,y,1.6,0,Math.PI*2); ctx.fill(); }
    ctx.fillStyle = trim; ctx.beginPath(); ctx.ellipse(1, 4, 2, 4, .5, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); return;
  }
  const rounded = (x: number, y: number, w: number, h: number, r: number) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); ctx.stroke(); };
  ctx.strokeStyle = body; ctx.lineWidth = 1.8;
  const handleX = bagGripX(id) - 3.5;
  // Center each single handle on its own body; the carrying pose shares this grip.
  if (id !== 'suitcase-tote') {
    const handleY = id === 'suitcase-pizza' ? -1.5 : -3;
    ctx.beginPath(); ctx.roundRect(handleX, handleY, 7, 7, 2); ctx.stroke();
  }
  ctx.strokeStyle = dark ? '#cbd5e1' : '#1e293b'; ctx.lineWidth = .8;
  if (id === 'suitcase-boombox') {
    rounded(-7,1,29,17,2);
    ctx.fillStyle = trim; ctx.fillRect(-4,3,23,2);
    for (const x of [-.5,15.5]) {
      ctx.fillStyle = '#101827'; ctx.beginPath(); ctx.arc(x,11,5,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = trim; ctx.lineWidth = .7; ctx.beginPath(); ctx.arc(x,11,3.5,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle = trim; ctx.beginPath(); ctx.arc(x,11,1.2,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#101827'; ctx.fillRect(5,8,5,5);
    ctx.strokeStyle = trim; ctx.strokeRect(5,8,5,5);
    ctx.fillStyle = trim; ctx.fillRect(6,9,3,1); ctx.fillRect(6,14,1,1); ctx.fillRect(8,14,1,1);
  } else if (id === 'suitcase-duffel') {
    rounded(-6, 1, 29, 13, 6);
    ctx.strokeStyle = trim; ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(2, 13); ctx.moveTo(15, 2); ctx.lineTo(15, 13); ctx.moveTo(4, 3); ctx.lineTo(13, 3); ctx.stroke();
  } else if (id === 'suitcase-backpack') {
    rounded(0, -2, 17, 23, 5); ctx.fillStyle = trim; rounded(2, 9, 13, 9, 3);
    ctx.strokeStyle = body; ctx.beginPath(); ctx.moveTo(3, 12); ctx.lineTo(14, 12); ctx.stroke();
  } else if (id === 'suitcase-tote') {
    ctx.beginPath(); ctx.moveTo(-3, 1); ctx.lineTo(21, 1); ctx.lineTo(18, 20); ctx.lineTo(0, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = trim; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(bagGripX(id), 1, 5, 4, 0, Math.PI, Math.PI * 2); ctx.stroke();
    // Vector sad face is centered on the tote (9,10.5), independent of fonts.
    ctx.fillStyle = trim;
    for (const x of [6,12]) { ctx.beginPath(); ctx.arc(x,8,1,0,Math.PI*2); ctx.fill(); }
    ctx.strokeStyle = trim; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(5,14); ctx.quadraticCurveTo(9,10,13,14); ctx.stroke();
  } else if (id === 'suitcase-pizza') {
    rounded(-6, 4, 30, 9, 1); ctx.fillStyle = trim; ctx.fillRect(-5, 5, 28, 2);
    ctx.fillStyle = trim; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('TENDIES', 9, 10, 27);
  } else {
    ctx.fillRect(-2, 0, 19, 13); ctx.strokeRect(-2, 0, 19, 13);
    const claspWidth = 3.5;
    const claspX = id === 'suitcase-classic' || id === 'suitcase-orchid' ? -2 + (19 - claspWidth) / 2 : 6;
    ctx.fillStyle = trim; ctx.fillRect(claspX, 4, claspWidth, 2.5);
    if (id === 'suitcase-orchid') { ctx.strokeStyle = trim; ctx.lineWidth = .6; ctx.strokeRect(0, 2, 15, 9); }
  }
  ctx.restore();
}

function drawSuitBelt(ctx: CanvasRenderingContext2D, id: string, dark: boolean, x: number, y: number, width: number, height: number): void {
  if (id === 'suits-classic') dark = false;
  ctx.save();
  ctx.fillStyle = dark ? (id === 'suits-gold' ? '#d6b48b' : '#94a3b8') : (id === 'suits-gold' ? '#422006' : '#171b24');
  ctx.fillRect(x,y,width,height);
  ctx.fillStyle = ['suits-gold','suits-ocean'].includes(id) ? '#d4a849' : (dark ? '#cbd5e1' : '#94a3b8');
  const buckleWidth=height*1.2,buckleX=x+(width-buckleWidth)/2;
  ctx.fillRect(buckleX,y-.1,buckleWidth,height+.2);
  ctx.fillStyle='#292524'; ctx.fillRect(buckleX+.25,y+.2,Math.max(.2,buckleWidth-.5),Math.max(.2,height-.4));
  ctx.restore();
}

// Flat front-facing garment display: no head, skin, hands, shoes or mannequin.
export function drawSuitPreview(ctx: CanvasRenderingContext2D, id: string, dark: boolean): void {
  if (id === 'suits-classic') dark = false;
  const [body, trim] = skinColors(id, dark);
  ctx.save(); ctx.fillStyle = body; ctx.strokeStyle = dark ? '#94a3b8' : '#334155'; ctx.lineWidth = .6;
  if (id === 'suits-swim') {
    ctx.fillStyle = trim;
    ctx.beginPath(); ctx.moveTo(-15, -4); ctx.lineTo(15, -4); ctx.lineTo(17, 17); ctx.lineTo(3, 17); ctx.lineTo(0, 7); ctx.lineTo(-3, 17); ctx.lineTo(-17, 17); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(-15, -4, 30, 3);
  } else {
    const casual = ['suits-tracksuit', 'suits-prison', 'suits-pajamas'].includes(id);
    const oversized = id === 'suits-too-big';
    ctx.beginPath(); ctx.moveTo(-12, 5); ctx.lineTo(12, 5); ctx.lineTo(13, 32); ctx.lineTo(3, 32); ctx.lineTo(0, 13); ctx.lineTo(-3, 32); ctx.lineTo(-13, 32); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (id === 'suits-money') drawMoneyPrint(ctx,dark,-14,5,14,33,2.5);
    if (oversized) {
      // Reference silhouette: raised angular shoulders, narrow waist, flared trousers.
      ctx.beginPath(); ctx.moveTo(-11,5); ctx.lineTo(11,5); ctx.lineTo(17,32);
      ctx.lineTo(4,33); ctx.lineTo(0,13); ctx.lineTo(-4,33); ctx.lineTo(-17,32);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7,-30); ctx.lineTo(-26,-35); ctx.lineTo(-29,-32);
      ctx.lineTo(-27,-22); ctx.lineTo(-35,-2); ctx.lineTo(-27,3);
      ctx.lineTo(-15,-17); ctx.lineTo(-10,-9); ctx.lineTo(-12,2);
      ctx.lineTo(-8,7); ctx.lineTo(0,4); ctx.lineTo(8,7); ctx.lineTo(12,2);
      ctx.lineTo(10,-9); ctx.lineTo(15,-17); ctx.lineTo(27,3);
      ctx.lineTo(35,-2); ctx.lineTo(27,-22); ctx.lineTo(29,-32);
      ctx.lineTo(26,-35); ctx.lineTo(7,-30);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = dark ? '#93c5fd' : '#102f80';
      for (const side of [-1,1]) {
        ctx.beginPath(); ctx.moveTo(side*7,-30); ctx.lineTo(side*13,-29);
        ctx.lineTo(side*9,-23); ctx.lineTo(side*12,-21); ctx.lineTo(0,1);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = body;
      ctx.strokeStyle = dark ? '#94a3b8' : '#334155'; ctx.lineWidth = .6;
    } else {
      ctx.beginPath(); ctx.moveTo(-7, -30); ctx.lineTo(-16, -26); ctx.lineTo(-24, -2); ctx.lineTo(-17, 1); ctx.lineTo(-11, -16); ctx.lineTo(-12, 4); ctx.lineTo(12, 4); ctx.lineTo(11, -16); ctx.lineTo(17, 1); ctx.lineTo(24, -2); ctx.lineTo(16, -26); ctx.lineTo(7, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (id === 'suits-money') drawMoneyPrint(ctx,dark,-24,-30,24,4,2.5);
    }
    if (!casual) {
      // The unbuttoned jacket exposes the shirt all the way to the waist.
      // Keep the two lapels apart instead of closing them over a short tie.
      ctx.fillStyle = suitShirtColor(id,dark);
      ctx.beginPath(); ctx.moveTo(-6,-29); ctx.lineTo(6,-29);
      ctx.lineTo(4,-17); ctx.lineTo(5,4); ctx.lineTo(-5,4);
      ctx.lineTo(-4,-17); ctx.closePath(); ctx.fill();
      const lapelColor = oversized ? (dark ? '#93c5fd' : '#102f80') : body;
      ctx.fillStyle = lapelColor;
      for (const side of [-1,1]) {
        ctx.beginPath(); ctx.moveTo(side*7,-29); ctx.lineTo(side*10,-23);
        ctx.lineTo(side*7,-20); ctx.lineTo(side*9,-17);
        ctx.lineTo(side*5,3); ctx.lineTo(side*4,-17);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        if (id === 'suits-money') drawMoneyPrint(ctx,dark,-10,-29,10,3,2.5);
      }
      // A separate knot and long blade keep the tie visible down to the belt.
      ctx.fillStyle = trim;
      ctx.beginPath(); ctx.moveTo(-2,-27); ctx.lineTo(2,-27);
      ctx.lineTo(1.4,-23); ctx.lineTo(-1.4,-23); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-1.4,-23); ctx.lineTo(1.4,-23);
      ctx.lineTo(2.8,-3); ctx.lineTo(0,1); ctx.lineTo(-2.8,-3);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = suitShirtColor(id,dark);
      for (const side of [-1,1]) {
        ctx.beginPath(); ctx.moveTo(side*6,-29); ctx.lineTo(0,-28);
        ctx.lineTo(side*2.8,-24); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // Below the jacket hem, across the trouser waist: visible as a real belt.
      drawSuitBelt(ctx,id,dark,-12,4.5,24,2);
    } else {
      ctx.strokeStyle = trim; ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(0, 3); ctx.stroke();
      if (id === 'suits-tracksuit') {
        // Three white shoulder bands and three outer stripes on each trouser leg.
        ctx.fillStyle = trim;
        for (const side of [-1,1]) {
          ctx.fillRect(side < 0 ? -13 : 3,30,10,2);
          ctx.beginPath(); ctx.moveTo(side*23,-3);ctx.lineTo(side*17,0);ctx.stroke();
        }
        ctx.strokeStyle='#ffffff';ctx.lineWidth=.65;
        for(const side of [-1,1])for(let stripe=0;stripe<3;stripe++) {
          // Match the sleeve's outer edge: (16,-26) -> (24,-2).
          const shoulderX=12.8+stripe*1.2;
          ctx.beginPath();ctx.moveTo(side*(shoulderX+1),-22);
          ctx.lineTo(side*(shoulderX+7),-4);ctx.stroke();
          const x=side*(9+stripe*1.15);
          ctx.beginPath();ctx.moveTo(x+side*.1,11);ctx.lineTo(x+side*.6,26);ctx.stroke();
        }
      } else if (id === 'suits-prison') {
        drawPrisonLabel(ctx, trim, 3, -21, 7, 5, 3);
      } else {
        ctx.fillStyle = trim; for (const [x, y] of [[-7,-20],[6,-9],[-7,0],[-7,16],[7,24]]) { ctx.beginPath(); ctx.arc(x,y,1.2,0,Math.PI*2); ctx.fill(); }
      }
    }
  }
  ctx.restore();
}

// Broad root tucks behind the heel; curved feathers sweep backwards.
function drawLightningWing(ctx: CanvasRenderingContext2D, color: string, ink: string): void {
  // Fixed heel pivot; the lower panel extends past it into a long chart-like tip.
  ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(5,3);
  // Mirrored reference: tall swept tip and rounded feather steps.
  ctx.bezierCurveTo(-4,2,-17,1,-22,-6);
  ctx.quadraticCurveTo(-29,-7,-30,-14);
  ctx.quadraticCurveTo(-37,-16,-37,-23);
  ctx.quadraticCurveTo(-44,-27,-44,-34);
  ctx.quadraticCurveTo(-50,-40,-51,-49);
  ctx.bezierCurveTo(-34,-39,-22,-37,-10,-34);
  ctx.bezierCurveTo(5,-31,-5,-20,-6,-13);
  // No inward C-shaped hook: descend continuously into a sharp forward point.
  ctx.bezierCurveTo(-5,-2,8,3,24,8);
  ctx.bezierCurveTo(13,8,8,6,5,3);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle=ink;ctx.lineWidth=1.1;ctx.lineCap='round';ctx.lineJoin='round';
  // Outline the entire wing, including its lower heel attachment.
  ctx.stroke();
  for(const [x,y,endX,endY] of [[-48,-40,-12,-29],[-43,-31,-14,-22],[-36,-23,-15,-15],[-29,-15,-16,-9]]) {
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+10,y+7,endX,endY);ctx.stroke();
  }
  ctx.fillStyle=ink;ctx.beginPath();ctx.arc(-12,-30,.9,0,Math.PI*2);ctx.fill();
}

function drawHeelPlate(ctx: CanvasRenderingContext2D, tipX: number, tipY: number, soleCurveY: number, soleControlX = tipX*.5, rearX = 22, rearY = 6): void {
  // Stationary heel guard covers the moving lower root, not the feathers.
  ctx.save();ctx.fillStyle='#fde047';ctx.strokeStyle='#7e22ce';
  ctx.lineWidth=1.1;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(-8,-12);
  ctx.bezierCurveTo(-6,-5,8,-2,22,0);
  // Only the upper edge descends to taper the panel. The lower edge stays
  // anchored to the sole profile instead of lifting towards the upper edge.
  // Matching tangent vectors (14,2) remove the kink between the two curves.
  ctx.bezierCurveTo(36,2,tipX*.8,tipY-1,tipX,tipY);
  ctx.quadraticCurveTo(soleControlX,soleCurveY,rearX,rearY);
  if(rearX===22)ctx.bezierCurveTo(8,6,-2,8,-10,3);
  ctx.quadraticCurveTo(-12,-5,-8,-12);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}

function drawHeelWings(ctx: CanvasRenderingContext2D, color: string, ink: string, phase: number, front: boolean): void {
  // Keep the entire stroke swept backwards, away from the foot opening.
  // Render opposite sides separately so the shoe hides the far attachment.
  const flap=Math.sin(phase*7);
  if (!front) {
  ctx.save();ctx.translate(2,0);ctx.scale(.78,1);
  ctx.translate(5,3);ctx.rotate(-.12-flap*.05);ctx.scale(1,1+flap*.1);ctx.translate(-5,-3);
  drawLightningWing(ctx,color,ink);ctx.restore();
  } else {
  ctx.save();ctx.translate(5,3);ctx.rotate(-.16+flap*.07);ctx.scale(1,1-flap*.08);ctx.translate(-5,-3);
  drawLightningWing(ctx,color,ink);ctx.restore();
  }
}

function drawDiamondPanel(ctx: CanvasRenderingContext2D): void {
  // Caller leaves the complete upper silhouette as the current clipping path.
  ctx.save();ctx.clip();
  // Large edge-to-edge diamonds: staggered rows alternate colors, not columns.
  // Horizontal neighbors meet at tips; diagonal neighbors share a full edge.
  for(let row=-6;row<=5;row++)for(let col=0;col<9;col++) {
    const x=-48+col*12+(Math.abs(row)%2)*6,y=2+row*5;
    ctx.fillStyle=row%2===0?'#ffffff':'#38bdf8';
    ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x+6,y);ctx.lineTo(x,y+5);ctx.lineTo(x-6,y);ctx.closePath();ctx.fill();
  }
  ctx.restore();
}

function drawLossTallies(ctx: CanvasRenderingContext2D, color: string): void {
  ctx.strokeStyle=color;ctx.lineWidth=1.4;ctx.lineCap='round';
  for(let i=0;i<4;i++) {
    ctx.beginPath();ctx.moveTo(-12+i*5,-1);ctx.lineTo(-12+i*5,7);ctx.stroke();
  }
  ctx.beginPath();ctx.moveTo(-15,7);ctx.lineTo(6,-2);ctx.stroke();
}

// Detailed product artwork is independent of the tiny on-character shoe glyph.
export function drawShoePreview(ctx: CanvasRenderingContext2D, id: string, dark: boolean, phase = 0): void {
  const [body, trim] = skinColors(id, dark);
  const boot = id === 'shoes-boots', high = ['shoes-high-tops', 'shoes-air-margins'].includes(id), slide = ['shoes-slides','shoes-chanclas'].includes(id);
  const formal = ['shoes-classic', 'shoes-loafers'].includes(id);
  const collar = boot ? -29 : high ? -24 : -11;
  const sole = formal ? '#292524' : dark ? '#dbeafe' : '#fff7ed';
  ctx.save();
  // A staggered pair on a common diagonal: full silhouettes, no overlapping toes.
  // Taller collars are lowered slightly so every model stays optically centered.
  ctx.translate(0, boot || high ? 4 : -3);
  if (id === 'shoes-clown') ctx.translate(-5,6);
  for (const [index, placement] of [[-5, -17, -.22], [3, 18, .10]].entries()) {
    const [x, y, angle] = placement;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(index === 0 ? .91 : 1, index === 0 ? .91 : 1);
    ctx.fillStyle = body; ctx.strokeStyle = dark ? '#94a3b8' : '#334155'; ctx.lineWidth = .8;
    if (id === 'shoes-loafers') {
      // Low-cut penny loafer: open throat, stitched apron and a slotted leather saddle.
      ctx.beginPath(); ctx.moveTo(-32,9); ctx.lineTo(-31,-5);
      ctx.quadraticCurveTo(-24,-10,-16,-4); ctx.lineTo(-8,-1);
      ctx.quadraticCurveTo(6,-9,23,-3); ctx.quadraticCurveTo(37,0,35,10);
      ctx.quadraticCurveTo(4,16,-32,12); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#292524'; ctx.beginPath(); ctx.ellipse(-21,-3,9,3,.15,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=body; ctx.beginPath(); ctx.moveTo(-11,0);
      ctx.quadraticCurveTo(14,-9,28,1); ctx.quadraticCurveTo(34,9,17,10);
      ctx.lineTo(-6,8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=trim; ctx.lineWidth=.8; ctx.stroke();
      ctx.fillStyle=trim; ctx.beginPath(); ctx.moveTo(-10,-1); ctx.lineTo(0,-3);
      ctx.lineTo(5,8); ctx.lineTo(-5,9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=body; ctx.lineWidth=2; ctx.beginPath();ctx.moveTo(-5,2);ctx.lineTo(-1,2);ctx.stroke();
      ctx.fillStyle=sole; ctx.beginPath();ctx.moveTo(-33,10);ctx.quadraticCurveTo(0,16,36,10);
      ctx.lineTo(35,14);ctx.quadraticCurveTo(0,20,-33,14);ctx.closePath();ctx.fill();
      ctx.fillRect(-32,14,14,4); ctx.restore(); continue;
    }
    if (slide) {
      // Oblique top view: narrow rounded heel, inset arch and a broad toe bed.
      // Repeat the anatomical outline lower down to give the sole real thickness.
      const footbed = (dy: number) => {
        ctx.beginPath();ctx.moveTo(-31,dy-3);
        ctx.bezierCurveTo(-32,dy-13,-19,dy-14,-9,dy-9);
        ctx.quadraticCurveTo(-1,dy-7,8,dy-12);
        ctx.bezierCurveTo(24,dy-19,38,dy-12,36,dy-2);
        ctx.bezierCurveTo(35,dy+10,21,dy+14,5,dy+11);
        ctx.lineTo(-20,dy+9);ctx.quadraticCurveTo(-32,dy+8,-31,dy-3);ctx.closePath();
      };
      ctx.fillStyle=body;footbed(id==='shoes-slides'?6:4);ctx.fill();ctx.stroke();
      ctx.fillStyle=trim;footbed(0);ctx.fill();ctx.stroke();
      // Only the heel cup is recessed; no concentric oval around the whole shoe.
      ctx.strokeStyle=body;ctx.lineWidth=.65;
      ctx.beginPath();ctx.moveTo(-23,-6);ctx.bezierCurveTo(-31,-3,-27,6,-18,5);ctx.stroke();
      if(id==='shoes-chanclas') {
        // Two separate thong branches meet ABOVE the sole at the toe post.
        ctx.strokeStyle=body;ctx.lineWidth=3.2;ctx.lineCap='round';ctx.lineJoin='round';
        ctx.beginPath();ctx.moveTo(-5,-8);ctx.quadraticCurveTo(5,-10,21,-5);
        ctx.quadraticCurveTo(8,1,-4,10);ctx.stroke();
        ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(21,-5);ctx.lineTo(21,1);ctx.stroke();
      } else {
        // Low transverse band: heel and toes remain visibly open in the top view.
        ctx.strokeStyle=dark?'#42651b':'#064e3b';ctx.lineWidth=.8;
        // Recessed toe well remains visible ahead of the open front edge.
        ctx.strokeStyle=body;ctx.lineWidth=.65;
        ctx.beginPath();ctx.moveTo(21,-8);
        ctx.bezierCurveTo(32,-11,34,-4,30,3);
        ctx.quadraticCurveTo(25,8,20,7);ctx.stroke();
        const foam=ctx.createLinearGradient(0,-14,9,12);
        foam.addColorStop(0,trim);foam.addColorStop(.3,body);foam.addColorStop(1,body);
        ctx.fillStyle=foam;ctx.beginPath();ctx.moveTo(-7,-8);
        ctx.quadraticCurveTo(2,-15,14,-13);
        ctx.lineTo(20,5);
        ctx.quadraticCurveTo(13,11,1,10);
        ctx.closePath();ctx.fill();ctx.stroke();
        // Rounded lower lip gives the strap thickness without closing the toes.
        ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(14,-13);
        ctx.lineTo(20,5);ctx.lineTo(20,7);ctx.lineTo(15,-10);
        ctx.closePath();ctx.fill();ctx.stroke();
        ctx.strokeStyle=trim;ctx.lineWidth=.8;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(-4,-7);ctx.quadraticCurveTo(3,-12,11,-11);ctx.stroke();
      }
      ctx.restore(); continue;
    }
    if (id === 'shoes-clown') {
      // Bubble-toe clown boot: a domed, swollen forefoot, not a stretched sneaker.
      ctx.beginPath(); ctx.moveTo(-32,10); ctx.lineTo(-32,-20);
      ctx.quadraticCurveTo(-24,-26,-14,-20); ctx.lineTo(-10,-5);
      ctx.bezierCurveTo(0,-7,5,-23,23,-23);
      ctx.bezierCurveTo(43,-23,47,-8,43,5);
      ctx.quadraticCurveTo(41,15,22,16); ctx.quadraticCurveTo(-5,17,-32,13);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = trim;
      ctx.beginPath(); ctx.moveTo(8,-18); ctx.bezierCurveTo(20,-30,44,-22,44,-5);
      ctx.quadraticCurveTo(47,12,28,15); ctx.lineTo(8,14);
      ctx.bezierCurveTo(18,6,17,-5,8,-18); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = sole;
      ctx.beginPath(); ctx.moveTo(-33,10); ctx.quadraticCurveTo(9,17,44,7);
      ctx.lineTo(43,13); ctx.quadraticCurveTo(10,23,-33,16);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = trim;
      ctx.beginPath(); ctx.moveTo(-32,-19); ctx.quadraticCurveTo(-24,-25,-14,-19);
      ctx.lineTo(-13,-15); ctx.quadraticCurveTo(-24,-20,-32,-15);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#101827'; ctx.beginPath(); ctx.ellipse(-23,-20,7,2.5,0,0,Math.PI*2); ctx.fill();
      // Oversized criss-cross laces sit behind the inflated toe cap.
      ctx.strokeStyle = sole; ctx.lineWidth = 1.8;
      for (let row=0;row<3;row++) {
        const lx=-20+row*3, ly=-14+row*5;
        ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx+9,ly+3);
        ctx.moveTo(lx+7,ly-1); ctx.lineTo(lx+2,ly+4); ctx.stroke();
      }
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(22,-17); ctx.bezierCurveTo(29,-18,36,-14,37,-8); ctx.stroke();
      ctx.restore(); continue;
    }
    {
      if(id==='shoes-moon') {
        ctx.save();ctx.translate(-29,7);ctx.scale(.65,.65);drawHeelWings(ctx,trim,body,phase,false);ctx.restore();
      }
      ctx.beginPath(); ctx.moveTo(-33, 8); ctx.lineTo(-32, collar);
      ctx.quadraticCurveTo(-25, collar - 5, -15, collar + 1);
      ctx.lineTo(-10, -5); ctx.quadraticCurveTo(1, -1, 14, 0);
      ctx.bezierCurveTo(27, 0, 35, 3, 36, 9); ctx.lineTo(34, 13); ctx.quadraticCurveTo(0, 17, -33, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
      if(id==='shoes-sneakers')drawDiamondPanel(ctx);
      if(id==='shoes-moon') {
        ctx.lineCap='round';
        ctx.strokeStyle='#7e22ce';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(-28,collar);ctx.quadraticCurveTo(-29,-1,-28,10);ctx.stroke();
        ctx.save();ctx.translate(-29,7);ctx.scale(.65,.65);drawHeelWings(ctx,trim,body,phase,true);ctx.restore();
        // Falling chart curve: broad at the heel, tapering to a low forward tip.
        ctx.fillStyle='#fde047';ctx.beginPath();ctx.moveTo(-30,collar);
        ctx.bezierCurveTo(-29,-1,-23,6,-9,9);
        ctx.bezierCurveTo(-22,8,-31,3,-32,collar);ctx.closePath();ctx.fill();
        ctx.strokeStyle=body;ctx.lineWidth=.8;ctx.lineJoin='round';ctx.stroke();
      }
      // Do not inherit the thin connector outline for the full sole perimeter.
      if(id==='shoes-moon') {ctx.strokeStyle='#7e22ce';ctx.lineWidth=1.5;ctx.lineJoin='round';}
      ctx.fillStyle = sole; ctx.beginPath(); ctx.moveTo(-34,10); ctx.quadraticCurveTo(1,14,36,9); ctx.lineTo(35,15); ctx.quadraticCurveTo(0,20,-34,16); ctx.closePath(); ctx.fill(); ctx.stroke();
      if(!['shoes-sneakers','shoes-moon'].includes(id)) {
      ctx.fillStyle = trim; ctx.beginPath(); ctx.moveTo(-31,collar+2);
      ctx.lineTo(id==='shoes-paper-paws'?-28:-25,collar+3);
      ctx.lineTo(id==='shoes-paper-paws'?-28:-23,9); ctx.lineTo(-32,9); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#101827'; ctx.beginPath(); ctx.ellipse(-23,collar+1,7,2.8,.1,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = trim; ctx.lineWidth = .75;
      if (boot) {
        // The reinforced toe cap meets the sole and wraps the entire toe volume.
        ctx.fillStyle=trim;ctx.beginPath();ctx.moveTo(13,0);
        ctx.bezierCurveTo(27,0,35,3,36,9);ctx.lineTo(34,12);
        ctx.quadraticCurveTo(23,14,14,12);ctx.quadraticCurveTo(20,6,13,0);
        ctx.closePath();ctx.fill();ctx.stroke();
      }
      // Keep the welt seam, without a floating diagonal across the toe box.
      ctx.beginPath();
      if(id!=='shoes-moon') {ctx.moveTo(-30,8); ctx.quadraticCurveTo(0,12,32,8); ctx.stroke();}
      if(id==='shoes-moon') {
        // Heel guard follows the rear edge only; its tip joins the separate welt stripe.
        // Exact reversed t=0..0.72 segment of the sole's Q(-34,10; 1,14; 36,9).
        ctx.save();ctx.translate(-29,7);ctx.scale(.65,.65);
        drawHeelPlate(ctx,(16.4+29)/.65,(11.0944-7)/.65,(12.88-7)/.65,(-8.8+29)/.65,(-34+29)/.65,(10-7)/.65);ctx.restore();
        ctx.strokeStyle='#fde047';ctx.lineWidth=.9;ctx.lineCap='round';
        // One uninterrupted path from the collar through the guard to the toe.
        ctx.beginPath();ctx.moveTo(-30,collar);
        ctx.bezierCurveTo(-29,-1,-23,6,-13,9);
        ctx.quadraticCurveTo(12,12,36,9);ctx.stroke();
      }
    }
    ctx.strokeStyle = trim; ctx.lineWidth = 1.4;
    if(!['shoes-four-losses','shoes-moon','shoes-classic','shoes-sneakers'].includes(id)) {
      const rows = boot || high ? 5 : 3;
      for (let i = 0; i < rows; i++) {
        const lx = -17 + i * 2.7, ly = collar + 6 + i * (boot || high ? 4 : 2.5);
        ctx.fillStyle = sole;
        for (const dx of [0,7]) { ctx.beginPath(); ctx.arc(lx+dx,ly,.8,0,Math.PI*2); ctx.fill(); }
        ctx.strokeStyle = formal ? trim : sole; ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx+7,ly+1); ctx.stroke();
      }
    }
    ctx.fillStyle = trim; ctx.strokeStyle = trim; ctx.lineWidth = 1.3;
    if(id==='shoes-moon') {
      // The heel is already part of the wing path; no rectangular mounting patch.
    } else if (id === 'shoes-air-margins') {
      // A rising candlestick badge and visible cushion, not a sports-brand logo.
      ctx.beginPath(); ctx.roundRect(10,12,22,3,1.5); ctx.fill();
      for (let i=0;i<3;i++) { ctx.fillRect(12+i*5,5-i*1.2,3,4); ctx.beginPath(); ctx.moveTo(13.5+i*5,3-i*1.2); ctx.lineTo(13.5+i*5,10-i*1.2); ctx.stroke(); }
    } else if (id === 'shoes-just-dip') {
      ctx.beginPath(); ctx.moveTo(-17,1); ctx.lineTo(-8,7); ctx.lineTo(-1,2); ctx.lineTo(6,6); ctx.stroke();
    } else if (id === 'shoes-four-losses') {
      drawLossTallies(ctx,trim);
    } else if (id === 'shoes-paper-paws') {
      ctx.beginPath(); ctx.ellipse(-20,4,3.4,2.2,-.1,0,Math.PI*2); ctx.fill();
      for (const [px,py] of [[-24,0],[-20,-2],[-16,0]]) { ctx.beginPath(); ctx.arc(px,py,1.2,0,Math.PI*2); ctx.fill(); }
    } else if (id === 'shoes-sneakers') {
      // All-over diamond fabric is already clipped to the complete upper.
    } else if (id === 'shoes-high-tops') {
      ctx.beginPath(); ctx.arc(-23,collar+10,3,0,Math.PI*2); ctx.stroke();
    }
    if (boot) for (let i=0;i<8;i++) { ctx.fillStyle=body; ctx.fillRect(-30+i*8,16,4,2); }
    if (formal) { ctx.fillStyle=body; ctx.fillRect(-32,15,14,3); }
    ctx.restore();
  }
  ctx.restore();
}

export function drawShoe(ctx: CanvasRenderingContext2D, id: string, dark: boolean, x: number, y: number, width = 9, phase = 0): void {
  const [body, trim] = skinColors(id, dark);
  ctx.save(); ctx.fillStyle = body;
  if (id === 'shoes-clown') {
    // Keep the heel/ground anchor; the extra volume projects ahead of the foot.
    ctx.translate(x,y); ctx.scale(width/9,.875);
    ctx.beginPath(); ctx.moveTo(0,3); ctx.lineTo(0,-1);
    ctx.quadraticCurveTo(2,-2,4,0); ctx.lineTo(5,0);
    ctx.bezierCurveTo(7,-5,14,-5,15,0);
    ctx.quadraticCurveTo(17,4,11,4); ctx.lineTo(1,4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = trim; ctx.beginPath(); ctx.ellipse(10.5,0,4.7,3.4,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = dark ? '#dbeafe' : '#fff7ed'; ctx.fillRect(0,3,14,1);
    ctx.fillRect(2,-.5,3,.7); ctx.fillRect(3,1,3,.7);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(11,-1.7,1.5,.6,.3,0,Math.PI*2); ctx.fill();
    ctx.restore(); return;
  }
  ctx.translate(x,y); ctx.scale(width/9,1);
  const slide = ['shoes-slides','shoes-chanclas'].includes(id);
  const boot = id === 'shoes-boots';
  const high = ['shoes-high-tops','shoes-air-margins','shoes-moon'].includes(id);
  const formal = ['shoes-classic','shoes-loafers'].includes(id);
  const collar = boot ? -4 : high ? -2.5 : 0;
  if (slide) {
    // Bare heel/instep and exposed toes sit above a thin, full-length footbed.
    ctx.fillStyle=trim;ctx.beginPath();ctx.roundRect(-.3,2.6,9.6,.9,.4);ctx.fill();
    ctx.fillStyle='#fed7aa';ctx.beginPath();ctx.moveTo(.3,2.6);ctx.lineTo(.5,-.4);
    ctx.quadraticCurveTo(2,-1,3,.5);ctx.lineTo(4.5,1.3);
    ctx.quadraticCurveTo(7,.9,8.8,2);ctx.lineTo(8.8,2.6);ctx.closePath();ctx.fill();
    if (id === 'shoes-chanclas') {
      ctx.strokeStyle=body;ctx.lineWidth=.65;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(3.2,2.5);ctx.lineTo(7,1.2);ctx.lineTo(5.4,2.5);ctx.stroke();
      ctx.beginPath();ctx.moveTo(7,1.2);ctx.lineTo(7.2,2.6);ctx.stroke();
    } else {
      ctx.fillStyle=body;ctx.beginPath();ctx.roundRect(-.3,2.8,9.6,1.1,.5);ctx.fill();
      ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(3.1,2.6);
      ctx.bezierCurveTo(2.5,.2,3,-1,4.3,-1);
      ctx.bezierCurveTo(6,-1.2,7,.1,7.2,2.6);ctx.closePath();ctx.fill();
      ctx.strokeStyle=trim;ctx.lineWidth=.25;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(3.6,.2);ctx.quadraticCurveTo(4.8,-.7,6,.3);ctx.stroke();
    }
    ctx.restore();return;
  } else {
    if(id==='shoes-moon') {
      ctx.save();ctx.translate(.6,2.5);ctx.scale(.1,.1);drawHeelWings(ctx,trim,body,phase,false);ctx.restore();
    }
    ctx.beginPath(); ctx.moveTo(0,3); ctx.lineTo(.3,collar);
    ctx.quadraticCurveTo(2,collar-1,4,collar+.3); ctx.lineTo(4.6,.5);
    ctx.bezierCurveTo(7,-.2,9.7,.7,9.8,2.4);
    ctx.quadraticCurveTo(9.5,3.5,7,3.5); ctx.lineTo(0,3.5); ctx.closePath(); ctx.fill();
    if(id==='shoes-moon') {
      ctx.lineCap='round';
      ctx.strokeStyle='#7e22ce';ctx.lineWidth=.3;
      ctx.beginPath();ctx.moveTo(.9,collar);ctx.quadraticCurveTo(.8,0,.9,2.9);ctx.stroke();
      ctx.save();ctx.translate(.6,2.5);ctx.scale(.1,.1);drawHeelWings(ctx,trim,body,phase,true);ctx.restore();
      ctx.save();ctx.translate(.6,2.5);ctx.scale(.1,.1);drawHeelPlate(ctx,(7.336-.6)/.1,(2.728-2.5)/.1,(3-2.5)/.1);ctx.restore();
      ctx.fillStyle='#fde047';ctx.beginPath();ctx.moveTo(.6,collar);
      ctx.bezierCurveTo(.8,0,1.8,2,3.5,2.8);
      ctx.bezierCurveTo(1.8,2.7,.2,1,.25,collar);ctx.closePath();ctx.fill();
      ctx.strokeStyle=body;ctx.lineWidth=.16;ctx.lineJoin='round';ctx.stroke();
      ctx.strokeStyle='#fde047';ctx.lineWidth=.14;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(.6,collar);
      ctx.bezierCurveTo(.8,0,1.8,2,3.1,2.8);
      ctx.quadraticCurveTo(7,3.1,9.8,2.4);ctx.stroke();
    }
    if(id==='shoes-sneakers') {
      ctx.save();ctx.translate(4,1);ctx.scale(.12,.12);drawDiamondPanel(ctx);ctx.restore();
    } else if(id!=='shoes-moon') {ctx.fillStyle=trim; ctx.fillRect(.3,collar+.7,id==='shoes-paper-paws'?.55:1.2,2.8-collar);}
    ctx.strokeStyle=trim; ctx.lineWidth=.65;
    if (formal) {
      if (id === 'shoes-loafers') {
        ctx.beginPath();ctx.moveTo(3.5,1);ctx.quadraticCurveTo(7,-.5,8.5,1.5);
        ctx.quadraticCurveTo(9,2.8,4,2.7);ctx.stroke();
        ctx.fillStyle=trim;ctx.fillRect(3.5,.5,1.5,2.2);
        ctx.fillStyle=body;ctx.fillRect(3.8,1.2,.9,.4);
      }
    } else {
      for (let i=0;i<(['shoes-four-losses','shoes-moon','shoes-sneakers'].includes(id)?0:boot||high?3:2);i++) {
        ctx.beginPath(); ctx.moveTo(2.6,collar+1+i); ctx.lineTo(4.4,collar+1.5+i); ctx.stroke();
      }
      ctx.fillStyle=trim;
      if (id === 'shoes-four-losses') {
        ctx.save();ctx.translate(6,1.3);ctx.scale(.14,.14);drawLossTallies(ctx,trim);ctx.restore();
      }
      else if (id === 'shoes-paper-paws') {
        ctx.beginPath();ctx.ellipse(2.1,2.1,.65,.45,0,0,Math.PI*2);ctx.fill();
        for(const [px,py] of [[1.5,1.4],[2.1,1.2],[2.7,1.4]]) {ctx.beginPath();ctx.arc(px,py,.22,0,Math.PI*2);ctx.fill();}
      }
      else if (id === 'shoes-moon') {
        // Continuous wing root forms the rear upper, with no separate patch.
      } else if (boot) {
        ctx.beginPath();ctx.moveTo(6.4,.3);ctx.bezierCurveTo(8,.2,9.7,.7,9.8,2.4);
        ctx.lineTo(9,3);ctx.lineTo(6.5,3);ctx.quadraticCurveTo(7.5,1.8,6.4,.3);ctx.closePath();ctx.fill();
      } else if (id === 'shoes-just-dip') {
        ctx.beginPath(); ctx.moveTo(5,.5); ctx.lineTo(6,2.5); ctx.lineTo(7.5,1); ctx.lineTo(8,2); ctx.stroke();
      } else if (id === 'shoes-air-margins') {
        ctx.fillRect(6.6,1.7,.6,.9);ctx.fillRect(7.5,1.2,.6,1.4);ctx.fillRect(8.4,.9,.6,1.7);
      } else if(id==='shoes-sneakers') {
        // No heel stripe or separate decorative panel over the patterned upper.
      } else { ctx.beginPath(); ctx.moveTo(5,1); ctx.lineTo(6.8,2); ctx.lineTo(8,1); ctx.stroke(); }
    }
  }
  ctx.fillStyle = formal ? trim : (dark ? '#dbeafe' : '#fff7ed');
  ctx.beginPath(); ctx.roundRect(0,3,slide?9:9.8,.5,.2); ctx.fill();
  if(id==='shoes-moon') {ctx.strokeStyle='#7e22ce';ctx.lineWidth=.2;ctx.lineJoin='round';ctx.stroke();}
  ctx.restore();
}

// Back pass: the anatomical left arm stays behind the torso in the right-profile view.
export function drawFarRunnerArm(ctx: CanvasRenderingContext2D, id: string, dark: boolean, stride: number): void {
  const p=farArmPose(stride);
  ctx.save();
  // One anatomical anchor and width, regardless of the material on the arm.
  drawJointedSuitArm(ctx,id,dark,
    { x: p.shoulderX, y: p.shoulderY },
    { x: p.elbowX, y: p.elbowY },
    { x: p.handX, y: p.handY },
    3, 2.8);
  // Palm belongs to the same rear layer as the sleeve; no foreground override.
  ctx.fillStyle='#eab28e'; ctx.beginPath();
  ctx.ellipse(p.handX,p.handY,1.5,2,p.angle,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

// Foreground pass: the anatomical right arm remains one continuous shape from
// its shoulder at the profile's near/back edge, through the swinging elbow,
// to the hand gripping the case.
export function drawNearBriefcaseArm(ctx: CanvasRenderingContext2D, suitId: string, bagId: string, dark: boolean, stride: number, airborne = false, velocity = 0, showBag = true): void {
  const arm = briefcaseArmPose(airborne, velocity, stride);
  ctx.save();ctx.globalCompositeOperation='source-over';
  drawJointedSuitArm(ctx,suitId,dark,{x:arm.shoulderX,y:arm.shoulderY},{x:arm.elbowX,y:arm.elbowY},{x:arm.handX,y:arm.handY},4.5,3.5);
  ctx.save();ctx.translate(arm.handX,arm.handY);ctx.rotate(arm.angle);
  if(showBag) {
    ctx.save();ctx.translate(-bagGripX(bagId),1-bagGripY(bagId));
    drawEquippedBag(ctx,bagId,dark);ctx.restore();
  }
  // Palm joins the wrist; curled fingers overlap the handle's contact point.
  ctx.fillStyle='#fed7aa';ctx.beginPath();
  ctx.ellipse(0,.65,1.8,2.25,0,0,Math.PI*2);ctx.fill();
  if(showBag) {
    ctx.strokeStyle='#d99c73';ctx.lineWidth=.35;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-.7,1.1);ctx.quadraticCurveTo(.2,1.6,1.1,1.1);ctx.stroke();
  }
  ctx.restore();ctx.restore();
}
export function drawSuitDetails(ctx: CanvasRenderingContext2D, id: string, dark: boolean, phase = 0): void {
  if (id === 'suits-classic') dark = false;
  const [body, trim] = skinColors(id, dark);
  ctx.save(); ctx.fillStyle = body;
  const casual = ['suits-tracksuit','suits-prison','suits-pajamas','suits-swim'].includes(id);
  const padded = id === 'suits-too-big';
  // One continuous profile torso silhouette; the arm passes provide shoulder depth.
  // Formal jackets stop at shoulder height; the raised shirt collar fills
  // the space up to the neck. Casual necklines keep their own fabric contour.
  // Bare torso ends at the waistband; it must not repaint skin over the
  // already-rendered moving shorts below the waist.
  ctx.save();
  if (id === 'suits-swim') { ctx.beginPath(); ctx.rect(-100,-100,200,81); ctx.clip(); }
  const bareTorso=id==='suits-swim';
  const softTop=casual&&!bareTorso;
  if (padded) {
    ctx.beginPath();ctx.moveTo(.2,-34);
    // Broad shoulder in depth, with a tapered side panel below the armhole.
    ctx.quadraticCurveTo(-2,-34,-3,-32.5);ctx.lineTo(-3,-28);
    ctx.quadraticCurveTo(-2,-23,-2.3,-17);
    ctx.lineTo(6.2,-17);ctx.quadraticCurveTo(6.3,-22,7,-27);
    ctx.quadraticCurveTo(7.6,-31,3.6,-33.4);
    ctx.quadraticCurveTo(2,-32.8,.2,-34);ctx.closePath();
  } else traceProfileTorso(ctx,false,softTop);
  ctx.fill();
  ctx.restore();
  // Keep casual prints inside the fitted torso without clipping the swim
  // waistband or the oversized jacket's deliberately wider shoulder pads.
  ctx.save();
  if (['suits-tracksuit','suits-prison','suits-pajamas'].includes(id)) ctx.clip();
  if (id === 'suits-money') drawMoneyPrint(ctx,dark,-4,-35,8,-16,1.6);
  if (!casual) {
    // The shirt opening is framed by the moving jacket front below.
    ctx.fillStyle=suitShirtColor(id,dark); ctx.beginPath(); ctx.moveTo(4.4,-34); ctx.lineTo(6,-33.5);
    ctx.lineTo(6,-25); ctx.lineTo(4.9,-26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle=dark?'#94a3b8':'#64748b'; ctx.lineWidth=.55;
    // Only the near lapel is visible in profile, along the front of the chest.
    ctx.beginPath(); ctx.moveTo(3.8,-34); ctx.lineTo(5,-31); ctx.lineTo(4,-29);
    ctx.lineTo(5,-25); ctx.stroke();
    ctx.fillStyle=trim; ctx.beginPath(); ctx.arc(5,-21,.45,0,Math.PI*2); ctx.fill();
  }
  if (id === 'suits-swim') {
    // One continuous waistband/seat joins both moving shorts legs. Draw over
    // the lower torso so bare skin cannot cut across the top of the trunks.
    ctx.fillStyle = trim;
    traceProfilePelvis(ctx,-19);ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#fff'; ctx.fillRect(-1.5,-19,7.1, .7);
    ctx.restore();
  } else if (['suits-tracksuit', 'suits-prison', 'suits-pajamas'].includes(id)) {
    ctx.strokeStyle = trim; ctx.lineWidth = .8;
    // Opening belongs on the chest edge, not down the middle of the sleeve.
    if(id==='suits-pajamas') {
      ctx.beginPath();ctx.moveTo(4.5,-32.5);ctx.lineTo(4.8,-18.5);ctx.stroke();
    }
    // Tracksuit keeps a single tonal zip, without parallel torso stripes.
    // Chest patch is finished after the neckline pass, which covers this area.
    if (id === 'suits-pajamas') { ctx.fillStyle = trim; for (const [x,y] of [[-2,-29],[4,-22],[-1,-19]]) { ctx.beginPath(); ctx.arc(x,y,.8,0,Math.PI*2);ctx.fill(); } }
  }
  ctx.restore();
  if (id !== 'suits-swim') {
    // Join both hip roots beneath the jacket; never leave two round trouser
    // strokes protruding independently from the torso at the waist.
    ctx.fillStyle=body;traceProfilePelvis(ctx);ctx.fill();
    if (id === 'suits-money') drawMoneyPrint(ctx,dark,-4.5,-19,5,-14,1.6);
    if (!casual) drawSuitBelt(ctx,id,dark,-1.5,-18,7.1,.9);
    if(softTop) {
      // The shirt ends at one flat edge above the pelvis. A fine seam makes
      // top/trousers readable even when both use the same fabric color.
      // No extra filled band: that made the lower shirt look cinched/puffy.
      ctx.save();ctx.strokeStyle=trim;ctx.globalAlpha=.35;ctx.lineWidth=.22;
      ctx.lineCap='butt';ctx.beginPath();ctx.moveTo(-1.7,-17);
      ctx.lineTo(5.6,-17);ctx.stroke();ctx.restore();
    }
  }
  ctx.restore();
}

// Shared side-profile chest/hem silhouette for jackets and casual tops.
function drawProfileGarmentFront(ctx: CanvasRenderingContext2D, body: string, phase: number, airborne: boolean, velocity: number, animate = true): number {
  const flutter=animate?Math.sin(phase*1.5-.5)*(airborne ? .85 : .45):0;
  const trail=animate&&airborne?Math.max(-1.2,Math.min(.6,velocity*.08)):0;
  const frontX=6.6+flutter+trail;
  ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(5.2,-33.3);
  ctx.quadraticCurveTo(5.9,-30,frontX,-26);
  ctx.lineTo(frontX+.35,-19);ctx.quadraticCurveTo(frontX,-18.1,4.7,-17.8);
  ctx.quadraticCurveTo(5.2,-23,4.6,-27);
  ctx.lineTo(4.9,-30.2);ctx.closePath();ctx.fill();
  return frontX;
}

// The head includes a long neck: render the shirt collar after it, not beneath it.
export function drawSuitCollar(ctx: CanvasRenderingContext2D, id: string, dark: boolean, phase = 0, airborne = false, velocity = 0, airflow = 0): void {
  if (id === 'suits-classic') dark = false;
  const [body,trim] = skinColors(id,dark);
  // Bare skin uses the shared head/neck and torso, never a second neck patch.
  if (id === 'suits-swim') return;
  if (['suits-tracksuit','suits-prison','suits-pajamas'].includes(id)) {
    ctx.save(); ctx.globalCompositeOperation='source-over';
    ctx.fillStyle=body;traceProfileTorso(ctx,true);ctx.fill();
    ctx.fillStyle=body; ctx.strokeStyle=dark?'#64748b':'#493c32'; ctx.lineWidth=.4;
    if (id === 'suits-tracksuit') {
      // Flat neckline at the neck base, not a standing sports collar.
      ctx.beginPath();ctx.moveTo(.2,-34);
      ctx.quadraticCurveTo(2,-32.8,3.6,-33.4);ctx.stroke();
      ctx.save();traceProfileTorso(ctx,false,true);ctx.clip();
      ctx.strokeStyle=dark?'#a7f3d0':'#c58da2'; ctx.lineWidth=.35;
      ctx.beginPath();ctx.moveTo(3.6,-33.4);
      ctx.quadraticCurveTo(5.7,-29,5.65,-24);ctx.lineTo(5.35,-17.15);ctx.stroke();
      ctx.fillStyle=dark?'#a7f3d0':'#c58da2';ctx.beginPath();ctx.roundRect(4.1,-31.9,.55,1.1,.15);ctx.fill();
      ctx.restore();
    } else if (id === 'suits-prison') {
      // A crew-neck prison shirt, not a white business-shirt collar.
      ctx.beginPath();ctx.moveTo(.2,-34);
      ctx.quadraticCurveTo(2,-32.8,3.6,-33.4);ctx.stroke();
      // Project the badge onto the narrow front-facing chest plane. Clip it
      // to the cloth, not to an imaginary full-width frontal torso.
      ctx.save();traceProfileTorso(ctx,false,true);ctx.clip();
      ctx.translate(3.8,-28.5);ctx.transform(.48,-.06,0,1,0,0);
      drawPrisonLabel(ctx,'#fff3cd',-2,-1.3,5,2.6,1.8);ctx.restore();
    } else {
      // A shallow V, without a high folded collar or shoulder flap.
      ctx.strokeStyle=trim;ctx.beginPath();ctx.moveTo(.2,-34);
      ctx.quadraticCurveTo(2,-32.8,3.6,-33.4);ctx.stroke();
    }
    ctx.restore(); return;
  }
  // Merge the sleeve root and jacket into one shoulder before finishing the
  // shirt. This also covers the neck's skin and lapel strokes at the arm root.
  ctx.save(); ctx.fillStyle=body;
  traceProfileTorso(ctx,true);ctx.fill();
  if (id === 'suits-money') drawMoneyPrint(ctx,dark,-2,-35,5.2,-28,1.6);
  ctx.restore();
  // A separate open front hangs behind the tie, not in front of it. Keep the
  // shoulder fixed and let only the lower fabric edge flutter with the stride.
  ctx.save(); ctx.fillStyle=body;
  const frontX=drawProfileGarmentFront(ctx,body,phase,airborne,velocity);
  if (id === 'suits-money') drawMoneyPrint(ctx,dark,4.5,-34,frontX+1,-17,1.6);
  ctx.strokeStyle=dark?'#94a3b8':'#64748b'; ctx.lineWidth=.35;
  ctx.beginPath(); ctx.moveTo(5.2,-33.3); ctx.lineTo(5.7,-30.8);
  ctx.lineTo(4.9,-29.5); ctx.quadraticCurveTo(5.3,-24,frontX+.2,-20); ctx.stroke();
  ctx.restore();
  // Draw after the neck and shoulder so the long near-side tie remains visible.
  ctx.save(); ctx.fillStyle=trim;
  const tie=profileTiePose(phase,airborne,velocity,airflow);
  const normal={x:Math.cos(tie.lowerAngle),y:-Math.sin(tie.lowerAngle)};
  const blade={x:tie.tip.x-Math.sin(tie.lowerAngle)*1.8,y:tie.tip.y-Math.cos(tie.lowerAngle)*1.8};
  // Narrow neck, widening blade and a single pointed tip: never a rectangle.
  ctx.beginPath(); ctx.moveTo(5.25,-31.4); ctx.lineTo(5.95,-31.4);
  ctx.quadraticCurveTo(tie.middle.x+.35,tie.middle.y,blade.x+normal.x*.65,blade.y+normal.y*.65);
  ctx.lineTo(tie.tip.x,tie.tip.y);ctx.lineTo(blade.x-normal.x*.65,blade.y-normal.y*.65);
  ctx.quadraticCurveTo(tie.middle.x-.35,tie.middle.y,5.25,-31.4);ctx.closePath();ctx.fill();
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation='source-over';
  ctx.fillStyle=suitShirtColor(id,dark); ctx.strokeStyle=dark?'#94a3b8':'#64748b'; ctx.lineWidth=.35;
  // A low curved neckband follows the neck opening. No horizontal white
  // shelf above the shoulder and no doubled, disconnected collar points.
  ctx.lineWidth=.2;
  ctx.beginPath(); ctx.moveTo(.2,-34.7);
  ctx.quadraticCurveTo(1.8,-34.1,3.5,-34.3);
  ctx.lineTo(4,-33.4);
  ctx.quadraticCurveTo(2.1,-33.1,.2,-34);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // The tie's neck strap runs under the folded collar and overlaps the knot.
  // Keep it fixed to the shirt; only the blade below the knot may flutter.
  ctx.fillStyle=trim;ctx.beginPath();ctx.moveTo(3.5,-34.3);
  ctx.lineTo(5.8,-33.4);ctx.lineTo(6.2,-32.7);
  ctx.lineTo(5.1,-32.4);ctx.lineTo(3.7,-33.2);ctx.closePath();ctx.fill();
  ctx.fillStyle=suitShirtColor(id,dark); ctx.beginPath(); ctx.moveTo(3.5,-34.3);
  // One folded near point descends toward the tie, rather than projecting out.
  ctx.lineTo(5.4,-32.8);ctx.lineTo(4.7,-31.9);ctx.lineTo(3.7,-33.2);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Far collar point is occluded in this profile; do not mirror a second flap.
  // The knot is in front of the collar points and joins the blade below it.
  ctx.fillStyle=trim; ctx.beginPath(); ctx.moveTo(5.1,-33);
  ctx.lineTo(6.2,-32.7); ctx.lineTo(6,-31.6); ctx.lineTo(5.6,-30.9);
  ctx.lineTo(5,-31.8); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Riding modes share the same garment construction, repositioned at the neck.
export function drawRidingSuit(ctx: CanvasRenderingContext2D, id: string, dark: boolean, phase: number, mode: 'rocket' | 'whale', drawCollar = true): void {
  ctx.save();
  // Neckline meets the head at (2,-22), whose neck base is near (-.1,-14.4).
  if (mode === 'rocket') { ctx.translate(-1.5,13.5); ctx.scale(.85,.85); }
  else ctx.translate(-2.5,5);
  // Standing clothes end at the pelvis; seated clothes must reach the hip at
  // y=0, as in the original rider, without lifting the neckline or head.
  ctx.save();
  if(mode==='whale'){ctx.translate(0,-34);ctx.scale(1,1.55);ctx.translate(0,34);}
  drawSuitDetails(ctx,id,dark,phase);ctx.restore();
  // Mounted riders finish the collar after the head; do not paint its tie twice.
  if(drawCollar)drawSuitCollar(ctx,id,dark,phase,mode==='whale',-5,mode==='whale'?12:0);
  ctx.restore();
}

// Use exactly the same moving fabric boundary for drawing and skin occlusion.
function swimShortsPath(ctx: CanvasRenderingContext2D, stride: number, front: boolean, airborne: boolean): void {
  const p=runnerLegPose(front,stride,airborne);
  const dx=p.kneeX-p.hipX,dy=p.kneeY-p.hipY,length=Math.hypot(dx,dy);
  const tx=dx/length,ty=dy/length,nx=ty,ny=-tx;
  const hx=p.hipX+dx*.5,hy=p.hipY+dy*.5;
  const width=front?2.8:2.7,hemWidth=front?2.5:2.4,left=Math.max(-1.5,p.hipX-width);
  ctx.moveTo(left,p.hipY-1); ctx.lineTo(p.hipX+width,p.hipY-1);
  ctx.lineTo(hx+nx*hemWidth+tx*.6,hy+ny*hemWidth+ty*.6);
  ctx.quadraticCurveTo(hx+tx,hy+ty,hx-nx*hemWidth+tx*.6,hy-ny*hemWidth+ty*.6);
  // Root stays tucked under the fixed pelvis; only the thigh/hem rotates.
  ctx.quadraticCurveTo(left-.6,hy-.8,left,p.hipY-1); ctx.closePath();
}

// Draw each trouser leg and its details together, then attach the shoe at its ankle.
export function drawRunnerLeg(ctx: CanvasRenderingContext2D, suitId: string, shoeId: string, dark: boolean, stride: number, front: boolean, airborne = false, phase = 0): void {
  const pose = runnerLegPose(front,stride,airborne);
  const [body,trim] = skinColors(suitId,dark);
  const swim = suitId === 'suits-swim';
  ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round';
  const leg = () => {
    ctx.beginPath(); ctx.moveTo(pose.hipX,pose.hipY);
    ctx.lineTo(pose.kneeX,pose.kneeY); ctx.lineTo(pose.ankleX,pose.ankleY); ctx.stroke();
  };
  if (swim) {
    // Start exposed skin at the shorts hem, never at the hip. The hem follows
    // the same thigh joints during every stride and airborne pose.
    const hemX = pose.hipX + (pose.kneeX-pose.hipX)*.5;
    const hemY = pose.hipY + (pose.kneeY-pose.hipY)*.5;
    const thighLength = Math.hypot(pose.kneeX-pose.hipX,pose.kneeY-pose.hipY);
    const tx = (pose.kneeX-pose.hipX)/thighLength;
    const ty = (pose.kneeY-pose.hipY)/thighLength;
    const nx = ty, ny = -tx;
    // Clip away the round skin cap above the moving shorts opening. Otherwise
    // it can poke through the side of the fabric when the thigh swings back.
    ctx.save(); ctx.beginPath();
    ctx.moveTo(hemX+nx*40,hemY+ny*40);
    ctx.lineTo(hemX-nx*40,hemY-ny*40);
    ctx.lineTo(hemX-nx*40+tx*80,hemY-ny*40+ty*80);
    ctx.lineTo(hemX+nx*40+tx*80,hemY+ny*40+ty*80);
    ctx.closePath(); ctx.clip();
    // The foreground bare leg must not paint over the OTHER shorts leg.
    // Subtract its fabric before drawing skin, regardless of the stride.
    ctx.beginPath(); ctx.rect(-100,-100,200,200);
    swimShortsPath(ctx,stride,!front,airborne); ctx.clip('evenodd');
    ctx.strokeStyle=body; ctx.lineWidth=front?4.4:4.2;
    ctx.beginPath(); ctx.moveTo(hemX,hemY);
    ctx.lineTo(pose.kneeX,pose.kneeY); ctx.lineTo(pose.ankleX,pose.ankleY); ctx.stroke();
    ctx.restore();
    ctx.fillStyle=trim; ctx.beginPath();
    swimShortsPath(ctx,stride,front,airborne); ctx.fill();
    if (front) {
      // Finish BOTH fabric legs above both skin passes, including antialiased
      // crossing edges. This keeps the shorts intact through the full stride.
      ctx.beginPath(); swimShortsPath(ctx,stride,false,airborne); ctx.fill();
      ctx.beginPath(); swimShortsPath(ctx,stride,true,airborne); ctx.fill();
    }
  } else {
    // Tapered fabric, rather than a round-ended stick: the thigh and shin
    // follow their joints while the hem stays narrow enough to meet the shoe.
    const oversized = suitId === 'suits-too-big';
    const hipWidth = oversized ? 3 : (front ? 2.2 : 2);
    const kneeWidth = oversized ? 3.2 : (front ? 1.9 : 1.7);
    const ankleWidth = oversized ? 3.6 : (front ? 1.5 : 1.4);
    const shinLength=Math.hypot(pose.ankleX-pose.kneeX,pose.ankleY-pose.kneeY);
    const cuffX=(pose.ankleY-pose.kneeY)/shinLength*ankleWidth;
    const cuffY=-(pose.ankleX-pose.kneeX)/shinLength*ankleWidth;
    // Both legs attach inside the same profile pelvis, not at two widely
    // separated frontal hips. Only the fabric below the waist swings outward.
    // Taper the waist root under the garment; a wide horizontal hip cap
    // otherwise pokes out as a triangular tab above the moving thigh.
    const hipLeft = Math.max(oversized ? -3.5 : -1.5,pose.hipX-hipWidth);
    ctx.fillStyle=body; ctx.beginPath();
    ctx.moveTo(hipLeft,pose.hipY-1);
    ctx.lineTo(pose.hipX+hipWidth,pose.hipY-1);
    ctx.quadraticCurveTo(pose.kneeX+kneeWidth,pose.kneeY-2,pose.kneeX+kneeWidth,pose.kneeY);
    ctx.lineTo(pose.ankleX+cuffX,pose.ankleY+cuffY+.5);
    ctx.lineTo(pose.ankleX-cuffX,pose.ankleY-cuffY+.5);
    ctx.lineTo(pose.kneeX-kneeWidth,pose.kneeY);
    ctx.quadraticCurveTo(pose.kneeX-kneeWidth,pose.kneeY-2,hipLeft-.1,-15.5);
    ctx.quadraticCurveTo(hipLeft-.1,-17,hipLeft,pose.hipY-1);
    ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip();
    if (suitId === 'suits-money') drawMoneyPrint(ctx,dark,Math.min(pose.hipX,pose.kneeX,pose.ankleX)-hipWidth,-19,Math.max(pose.hipX,pose.kneeX,pose.ankleX)+hipWidth,pose.ankleY+1,1.6);
    if (suitId === 'suits-tracksuit') {
      ctx.strokeStyle='#ffffff';ctx.lineWidth=.4;
      for(const offset of [-1,0,1]) {
        ctx.beginPath();ctx.moveTo(pose.hipX+offset,pose.hipY+2);
        ctx.quadraticCurveTo(pose.kneeX+offset,pose.kneeY-2,pose.kneeX+offset,pose.kneeY);
        const shinLength=Math.hypot(pose.ankleX-pose.kneeX,pose.ankleY-pose.kneeY)||1;
        ctx.lineTo(pose.ankleX+offset-(pose.ankleX-pose.kneeX)/shinLength*2,pose.ankleY-(pose.ankleY-pose.kneeY)/shinLength*2);ctx.stroke();
      }
      ctx.strokeStyle=trim; ctx.lineWidth=.8;
      ctx.beginPath();ctx.moveTo(pose.ankleX-cuffX,pose.ankleY-cuffY-.4);
      ctx.lineTo(pose.ankleX+cuffX,pose.ankleY+cuffY-.4);ctx.stroke();
    } else if (suitId === 'suits-pajamas') {
      ctx.fillStyle=trim;
      for (const [x,y] of [[pose.hipX+.5,pose.hipY+2],[pose.kneeX+.6,pose.kneeY],[pose.ankleX-.4,pose.ankleY-2]]) {
        ctx.beginPath(); ctx.arc(x,y,.6,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();
  }
  // Rotate about the ankle inside the rear collar, not a point above the shoe.
  // Scale the heel offset with the far foot so both collars stay on their joints.
  const shoeWidth=front?9:8;
  ctx.translate(pose.ankleX,pose.ankleY); ctx.rotate(pose.shoeAngle);
  drawShoe(ctx,shoeId,dark,-2*shoeWidth/9,0,shoeWidth,phase);
  ctx.restore();
}
