// Browser game module for dumpsterRenderer.
import { drawHumanHead, drawApeHead, drawPickupAsset } from './assetRenderer';
import { drawPigeonStain } from './pigeonStain';
import { hawkBagThrowPose } from './hawkBagThrow';
import { drawClownMakeup } from './clownRenderer';
import { drawPet } from './petRenderer';
import { petPose } from './petPose';

// Feet at origin; passengers are drawn before the near wall to hide their bodies.
export function drawDumpster(ctx: CanvasRenderingContext2D, monkeys: number, phase: number, fedoraHats = 0, darkMode = false, diamondShield = false, bags = 0, frame = 0, hatSoiled = false, bagThrowTimer = 0, bagThrowDirection = 1, standardHat = false, pet?: string, hatSkin = 'hats-classic'): void {
  ctx.save();
  const petSeats = pet ? 1 : 0;
  const rear = -8 - (monkeys + petSeats) * 22;
  if (diamondShield) {
    // Enclose the whole cart and its passengers, rather than just the pilot.
    const centerX = (rear + 26) / 2;
    const radiusX = (26 - rear) / 2 + 10;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.09)';
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.75)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(centerX, -32, radiusX, 46, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.8)';
    ctx.beginPath(); ctx.ellipse(centerX, -32, radiusX - 4, 42, 0, Math.PI * 1.08, Math.PI * 1.4); ctx.stroke();
  }
  for (let i = 0; i <= monkeys; i++) {
    ctx.save();
    // Sink the jaw into the rim and cut the neck at its top edge; keep this contact fixed.
    const seatX = 8 - (i + (i > 0 ? petSeats : 0)) * 22;
    ctx.beginPath();ctx.rect(seatX - 40, -10000, 80, 9964);ctx.clip();
    ctx.translate(seatX, -42);
    if (i === 0) drawHumanHead(ctx, false); else { ctx.scale(0.7, 0.7); drawApeHead(ctx, false); }
    drawClownMakeup(ctx);
    if (i === 0) {
      // The clown is always hatless: Hawk mode throws bags only.
      if (hatSoiled) {
        drawPigeonStain(ctx, 1, -8, false);
      }
    }
    ctx.restore();
  }
  if (bagThrowTimer > 0) {
    const pose = hawkBagThrowPose(bagThrowTimer, bagThrowDirection, 0);
    ctx.save();
    ctx.lineCap = 'round';
    // Both arms emerge from the cart; the near wall still hides the shoulders.
    for (const near of [false, true]) {
      const handX = near ? pose.nearHandX : pose.farHandX;
      ctx.strokeStyle = near ? '#334155' : '#18212f';
      ctx.lineWidth = near ? 5 : 4;
      ctx.beginPath(); ctx.moveTo(near ? 12 : 4, -33);
      ctx.lineTo(pose.elbowX + (near ? 4 : -4), pose.elbowY);
      ctx.lineTo(handX, pose.handY); ctx.stroke();
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath(); ctx.arc(handX, pose.handY, 3, 0, Math.PI * 2); ctx.fill();
    }
    if (pose.holding) {
      drawPickupAsset(ctx, { type: 'bag', x: 0, y: 0, taken: false }, pose.bagX, pose.bagY);
    }
    ctx.restore();
  }
  if (diamondShield) {
    // The diamond sits inside the cart; the near wall hides its lower half.
    ctx.save(); ctx.translate(19, -34); ctx.scale(0.65, 0.65);
    drawPickupAsset(ctx, { type: 'diamond', x: 0, y: 0, taken: false }, 0, 0, frame);
    ctx.restore();
  }
  if (pet) {
    const pose = petPose('dumpster', phase);
    ctx.save(); ctx.translate(pose.x, pose.y + 3); ctx.scale(pose.scale, pose.scale);
    drawPet(ctx, pet, darkMode, phase, false, false, true); ctx.restore();
  }
  ctx.fillStyle = '#315f4a'; ctx.strokeStyle = '#173b2b'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(rear, -34, 34 + (monkeys + petSeats) * 22, 27, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#56836b'; ctx.fillRect(rear - 3, -36, 40 + (monkeys + petSeats) * 22, 5);
  ctx.strokeStyle = '#234535';
  for (let x = rear + 8; x < 23; x += 12) { ctx.beginPath(); ctx.moveTo(x, -27); ctx.lineTo(x, -12); ctx.stroke(); }
  for (const x of [rear + 7, 18]) {
    ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(x, -4, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(x, -4, 2, 0, Math.PI * 2); ctx.fill();
  }
  // Hooks sit on the near rim; bags hang outside the wall towards the viewer.
  for (let bag = 0; bag < bags; bag++) {
    const x = rear + 12 + (bag % 4) * (Math.max(0, 19 - rear) / 3);
    const y = -13 + Math.floor(bag / 4) * 11;
    ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, -32); ctx.lineTo(x, y - 10); ctx.stroke();
    ctx.save(); ctx.translate(x, y); ctx.scale(0.48, 0.48);
    drawPickupAsset(ctx, { type: 'bag', x: 0, y: 0, taken: false }, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}