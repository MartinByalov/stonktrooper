// Browser game module for armRenderer.
type ArmPoint = { x: number; y: number };

// Overlapping rounded segments avoid sharp elbow corners and disconnected wrists.
export function drawJointedArm(ctx: CanvasRenderingContext2D, shoulder: ArmPoint, elbow: ArmPoint, wrist: ArmPoint, color: string | CanvasGradient, upperWidth: number, forearmWidth: number): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = upperWidth;
  ctx.beginPath(); ctx.moveTo(shoulder.x, shoulder.y);
  ctx.quadraticCurveTo((shoulder.x + elbow.x) / 2, (shoulder.y + elbow.y) / 2, elbow.x, elbow.y); ctx.stroke();
  ctx.beginPath(); ctx.arc(elbow.x, elbow.y, upperWidth / 2, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = forearmWidth;
  ctx.beginPath(); ctx.moveTo(elbow.x, elbow.y); ctx.lineTo(wrist.x, wrist.y); ctx.stroke();
  ctx.beginPath(); ctx.arc(wrist.x, wrist.y, forearmWidth / 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}