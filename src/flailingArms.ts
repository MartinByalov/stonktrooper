// Panicked falling pose: both arms wave overhead in opposite phase, open hands with
// fingers spread. Shared by the falling hero/companions and dying bulls and bears.
export interface FlailingArmStyle {
  shoulderX: number;
  shoulderY: number;
  reach: number;
  sleeve: string;
  sleeveWidth: number;
  hand: string;
  handSize: number;
}

export function drawFlailingArm(ctx: CanvasRenderingContext2D, side: -1 | 1, frame: number, style: FlailingArmStyle): void {
  const { shoulderX, shoulderY, reach, sleeve, sleeveWidth, hand, handSize } = style;
  const wave = Math.sin(frame * 0.38 + (side > 0 ? Math.PI : 0));
  const elbowX = side * (shoulderX + reach * (0.5 + wave * 0.08));
  const elbowY = shoulderY - reach * (0.2 + wave * 0.15);
  const handX = side * (shoulderX + reach * (0.78 + wave * 0.12));
  const handY = shoulderY - reach * (0.75 + wave * 0.3);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = sleeve; ctx.lineWidth = sleeveWidth;
  ctx.beginPath(); ctx.moveTo(side * shoulderX, shoulderY); ctx.lineTo(elbowX, elbowY); ctx.lineTo(handX, handY); ctx.stroke();
  // Open palm with spread fingers, tilted with the wave.
  const tilt = side * (0.35 + wave * 0.25);
  ctx.translate(handX, handY); ctx.rotate(tilt);
  ctx.fillStyle = hand;
  ctx.beginPath(); ctx.ellipse(0, 0, handSize * 0.55, handSize * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hand; ctx.lineWidth = handSize * 0.28;
  for (const angle of [-0.75, -0.25, 0.25, 0.75]) {
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(angle) * handSize * 1.05, -Math.cos(angle) * handSize * 1.05); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-side * handSize * 0.85, handSize * 0.1); ctx.stroke();
  ctx.restore();
}
