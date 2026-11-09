// Model-space anatomy shared by bare skin and fitted clothing. Feet remain at
// y=0 so gameplay collision, terrain placement and equipped assets do not move.
export const PROFILE_ANATOMY = {
  nearShoulder: { x: .8, y: -30.8 },
  farShoulder: { x: 1.5, y: -30.8 },
  upperArm: 8.2,
  forearm: 7.4,
} as const;

export function profileArmPose(front: boolean, stride: number, airborne = false, velocity = 0) {
  const shoulder=front?PROFILE_ANATOMY.nearShoulder:PROFILE_ANATOMY.farShoulder;
  const swing=Math.max(-1,Math.min(1,stride));
  const lift=Math.min(1,Math.max(0,-velocity)/12);
  const upperAngle=airborne ? -.7-lift*.25 : (front?-.55:.55)*swing;
  const lowerAngle=upperAngle+(airborne ? 1.35 : front ? .15 : .04);
  const elbowX=shoulder.x+Math.sin(upperAngle)*PROFILE_ANATOMY.upperArm;
  const elbowY=shoulder.y+Math.cos(upperAngle)*PROFILE_ANATOMY.upperArm;
  return {
    shoulderX:shoulder.x,shoulderY:shoulder.y,elbowX,elbowY,
    handX:elbowX+Math.sin(lowerAngle)*PROFILE_ANATOMY.forearm,
    handY:elbowY+Math.cos(lowerAngle)*PROFILE_ANATOMY.forearm,
    angle:-lowerAngle,
  };
}

// The same continuous shoulder, rib cage and waist boundary is used before
// and after the head pass. No cosmetic-specific anatomy or shoulder masks.
export function traceProfileTorso(ctx: CanvasRenderingContext2D, upperOnly = false, straightHem = false): void {
  ctx.beginPath();ctx.moveTo(.2,-34);
  ctx.quadraticCurveTo(.3,-33.5,-1,-31.8);
  ctx.quadraticCurveTo(-2,-30,-1.9,-27);
  if(upperOnly)ctx.lineTo(6,-27);
  else if(straightHem) {
    // Fabric falls from the ribs over the waist; it does not follow the
    // lumbar hollow and flare back out into a rounded waistband.
    ctx.quadraticCurveTo(-1.7,-23,-1.7,-17);
    ctx.lineTo(5.6,-17);
    ctx.quadraticCurveTo(5.7,-22,6,-27);
  } else {
    ctx.quadraticCurveTo(-.8,-23,-1.5,-18);
    ctx.quadraticCurveTo(1.5,-17.4,5.6,-18);
    ctx.quadraticCurveTo(4.9,-22,6,-27);
  }
  ctx.quadraticCurveTo(6.4,-30,3.6,-33.4);
  ctx.quadraticCurveTo(2,-32.8,.2,-34);ctx.closePath();
}

export function traceProfilePelvis(ctx: CanvasRenderingContext2D, waistY = -18.5): void {
  // Iliac crest -> lower abdomen -> crotch -> gluteal fold -> lumbar waist.
  // The seat has depth BELOW the waist, not a horizontal ledge behind it.
  // Both thigh roots overlap this volume; their swing cannot reshape the seat.
  ctx.beginPath();ctx.moveTo(-1.5,waistY);ctx.lineTo(5.6,waistY);
  ctx.quadraticCurveTo(5.5,-16.5,4.1,-14.8);
  ctx.quadraticCurveTo(2.7,-13.5,.3,-14.1);
  ctx.quadraticCurveTo(-1.5,-14.3,-1.6,-16.1);
  ctx.quadraticCurveTo(-1.6,-17.2,-1.5,waistY);ctx.closePath();
}