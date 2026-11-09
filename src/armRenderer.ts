// Browser game module for armRenderer.
type ArmPoint = { x: number; y: number };

// A single tapered contour, not overlapping thick sticks. The shoulder cap
// follows the upper-arm direction; the wrist narrows into the palm.
export function traceJointedArm(ctx: CanvasRenderingContext2D, shoulder: ArmPoint, elbow: ArmPoint, wrist: ArmPoint, upperWidth: number, forearmWidth: number, roundShoulder = true): void {
  const normal=(a:ArmPoint,b:ArmPoint)=>{
    const length=Math.hypot(b.x-a.x,b.y-a.y)||1;
    return {x:-(b.y-a.y)/length,y:(b.x-a.x)/length};
  };
  const a=normal(shoulder,elbow),b=normal(elbow,wrist);
  const jointLength=Math.hypot(a.x+b.x,a.y+b.y)||1;
  const n={x:(a.x+b.x)/jointLength,y:(a.y+b.y)/jointLength};
  const sr=upperWidth/2,er=(upperWidth+forearmWidth)/4,wr=forearmWidth*.37;
  ctx.beginPath();ctx.moveTo(shoulder.x+a.x*sr,shoulder.y+a.y*sr);
  ctx.quadraticCurveTo(elbow.x+a.x*er,elbow.y+a.y*er,elbow.x+n.x*er,elbow.y+n.y*er);
  ctx.quadraticCurveTo(elbow.x+b.x*er,elbow.y+b.y*er,wrist.x+b.x*wr,wrist.y+b.y*wr);
  ctx.lineTo(wrist.x-b.x*wr,wrist.y-b.y*wr);
  ctx.quadraticCurveTo(elbow.x-b.x*er,elbow.y-b.y*er,elbow.x-n.x*er,elbow.y-n.y*er);
  ctx.quadraticCurveTo(elbow.x-a.x*er,elbow.y-a.y*er,shoulder.x-a.x*sr,shoulder.y-a.y*sr);
  if(roundShoulder)ctx.quadraticCurveTo(shoulder.x-a.y*sr*.9,shoulder.y+a.x*sr*.9,shoulder.x+a.x*sr,shoulder.y+a.y*sr);
  ctx.closePath();
}

export function drawJointedArm(ctx: CanvasRenderingContext2D, shoulder: ArmPoint, elbow: ArmPoint, wrist: ArmPoint, color: string | CanvasGradient, upperWidth: number, forearmWidth: number, roundShoulder = true): void {
  ctx.save();
  ctx.fillStyle = color;
  traceJointedArm(ctx,shoulder,elbow,wrist,upperWidth,forearmWidth,roundShoulder);ctx.fill();
  ctx.restore();
}