import { printerBanknotePose } from './petPose';

// Visual-only cash ejection shared by the pet and the How to Play preview.
export function drawPrinterBanknote(ctx: CanvasRenderingContext2D, phase: number, dark = false): void {
  const bill = printerBanknotePose(phase);
  ctx.save(); ctx.translate(bill.x, bill.y); ctx.rotate(bill.rotation); ctx.globalAlpha *= bill.opacity;
  ctx.fillStyle = dark ? '#bbf7d0' : '#86cf96'; ctx.strokeStyle = '#21643b'; ctx.lineWidth = .7;
  ctx.fillRect(-7, -3.5, 14, 7); ctx.strokeRect(-7, -3.5, 14, 7);
  ctx.strokeRect(-5.5, -2.2, 11, 4.4);
  ctx.beginPath(); ctx.ellipse(0, 0, 2, 2.6, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#21643b'; ctx.fillRect(-4.5, -.5, 1, 1); ctx.fillRect(3.5, -.5, 1, 1);
  ctx.restore();
}