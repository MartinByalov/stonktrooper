// Sculpted canvas surfaces: key light from upper left, cool shadows underneath.
// All geometry is local right profile; the encounter mirrors the complete model.
export function paulSurface(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, near = true): CanvasGradient {
  const light = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.45, 1, x, y, radius);
  light.addColorStop(0, near ? '#b6c2cd' : '#738497');
  light.addColorStop(0.45, near ? '#7a8c9f' : '#4f6074');
  light.addColorStop(1, near ? '#344355' : '#253344');
  return light;
}

export function drawPaulMuscle(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, angle: number, near = true): void {
  ctx.fillStyle = paulSurface(ctx, x, y, Math.max(rx, ry) * 1.2, near);
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2); ctx.fill();
}

export function drawPaulGlove(ctx: CanvasRenderingContext2D, x: number, y: number, near: boolean): void {
  ctx.save(); ctx.translate(x, y);
  const leather = ctx.createRadialGradient(-3, -4, 1, 1, 0, 12);
  leather.addColorStop(0, near ? '#fa7180' : '#c54c61');
  leather.addColorStop(0.45, near ? '#c92e49' : '#95273e'); leather.addColorStop(1, '#581b2c');
  ctx.fillStyle = leather; ctx.strokeStyle = '#511d2d'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-7, 4); ctx.bezierCurveTo(-10, -8, -5, -11, 4, -9);
  ctx.bezierCurveTo(12, -8, 12, 2, 7, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#a92842'; ctx.beginPath(); ctx.ellipse(-5, 2, 3.8, 5, -0.35, 0, Math.PI * 2); ctx.fill();
  const cuff = ctx.createLinearGradient(-6, 5, 7, 9);
  cuff.addColorStop(0, '#e5e9ed'); cuff.addColorStop(1, '#8995a5');
  ctx.fillStyle = cuff; ctx.beginPath(); ctx.roundRect(-6, 5, 13, 5, 1.5); ctx.fill();
  ctx.strokeStyle = '#f6a5ad'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-4, -6); ctx.quadraticCurveTo(1, -9, 6, -5); ctx.stroke();
  ctx.restore();
}

export function drawPaulHead(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save(); ctx.translate(x, y);
  // Far ear sits lower and behind the skull instead of a symmetrical cartoon pair.
  ctx.fillStyle = '#344355'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, -23);
  ctx.quadraticCurveTo(10, -18, 10, -7); ctx.closePath(); ctx.fill();
  ctx.fillStyle = paulSurface(ctx, -1, 0, 21);
  ctx.beginPath(); ctx.moveTo(-12, -8); ctx.quadraticCurveTo(-7, -18, 3, -12);
  ctx.lineTo(10, -6); ctx.lineTo(21, -1); ctx.lineTo(22, 4);
  ctx.quadraticCurveTo(17, 10, 6, 10); ctx.lineTo(-4, 14);
  ctx.lineTo(-2, 9); ctx.lineTo(-13, 12); ctx.lineTo(-10, 6);
  ctx.lineTo(-17, 6); ctx.quadraticCurveTo(-15, 0, -12, -8); ctx.closePath(); ctx.fill();
  // Broad cheek plane, dark jaw underside and tapered bridge keep the muzzle canine.
  ctx.fillStyle = '#c0c9ce'; ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(9, -3);
  ctx.lineTo(20, 0); ctx.lineTo(21, 4); ctx.lineTo(11, 6);
  ctx.quadraticCurveTo(5, 11, -2, 9); ctx.lineTo(-7, 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#657586'; ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(10, 7);
  ctx.lineTo(20, 5); ctx.quadraticCurveTo(12, 12, 3, 12); ctx.closePath(); ctx.fill();
  const ear = ctx.createLinearGradient(-11, -23, -2, -5);
  ear.addColorStop(0, '#a5b4c1'); ear.addColorStop(1, '#45566b'); ctx.fillStyle = ear;
  ctx.beginPath(); ctx.moveTo(-12, -4); ctx.quadraticCurveTo(-15, -15, -11, -25);
  ctx.quadraticCurveTo(-4, -21, 0, -9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#5d5661'; ctx.beginPath(); ctx.moveTo(-10, -20); ctx.lineTo(-8, -8); ctx.lineTo(-3, -10); ctx.closePath(); ctx.fill();
  // Recessed, narrow eye under a brow ridge; no oversized eyeball or exposed fang.
  ctx.fillStyle = '#263343'; ctx.beginPath(); ctx.moveTo(1, -7); ctx.lineTo(10, -5);
  ctx.lineTo(6, -2); ctx.lineTo(1, -3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d8ad60'; ctx.beginPath(); ctx.ellipse(5.7, -4.1, 2.3, 1.2, 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111b28'; ctx.fillRect(6, -5, 0.9, 2.1);
  ctx.strokeStyle = '#a4b3c0'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-1, -8); ctx.quadraticCurveTo(5, -8, 10, -5); ctx.stroke();
  const nose = ctx.createLinearGradient(17, -3, 22, 4);
  nose.addColorStop(0, '#3e4b59'); nose.addColorStop(1, '#111a26'); ctx.fillStyle = nose;
  ctx.beginPath(); ctx.moveTo(18, -2); ctx.lineTo(23, -1); ctx.lineTo(22, 3); ctx.lineTo(18, 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#344355'; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(5, 5); ctx.quadraticCurveTo(12, 7, 20, 4); ctx.stroke();
  ctx.strokeStyle = '#7d8f9f'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-11, 1); ctx.lineTo(-5, 4); ctx.moveTo(-10, 6); ctx.lineTo(-5, 7); ctx.stroke();
  ctx.restore();
}