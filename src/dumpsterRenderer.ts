// Browser game module for dumpsterRenderer.
import { drawHumanHead, drawApeHead, drawCharacterHat, drawPickupAsset } from './assetRenderer';

// Feet at origin; passengers are drawn before the near wall to hide their bodies.
export function drawDumpster(ctx: CanvasRenderingContext2D, monkeys: number, phase: number, fedoraHats = 0, darkMode = false, diamondShield = false, bags = 0, frame = 0): void {
  ctx.save();
  const rear = -8 - monkeys * 22;
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
    ctx.save(); ctx.translate(8 - i * 22, -45 + Math.sin(phase + i) * 0.7);
    if (i === 0) drawHumanHead(ctx, false); else { ctx.scale(0.7, 0.7); drawApeHead(ctx, false); }
    ctx.fillStyle = '#fff7ed'; ctx.beginPath(); ctx.ellipse(2, 2, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(8, 0, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#be123c'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, 4); ctx.quadraticCurveTo(3, 7, 6, 4); ctx.stroke();
    ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.arc(-6, -2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(4, -3, 1, 0, Math.PI * 2); ctx.fill();
    if (i === 0) {
      // Smaller fedoras stack from the clown's head upward, not on the monkey passengers.
      for (let hat = 0; hat < fedoraHats; hat++) {
        ctx.save(); ctx.translate(-2, -5 - hat * 10); ctx.scale(0.65, 0.65);
        drawCharacterHat(ctx, false, false, darkMode);
        ctx.restore();
      }
    }
    ctx.restore();
  }
  if (diamondShield) {
    // The diamond sits inside the cart; the near wall hides its lower half.
    ctx.save(); ctx.translate(19, -34); ctx.scale(0.65, 0.65);
    drawPickupAsset(ctx, { type: 'diamond', x: 0, y: 0, taken: false }, 0, 0, frame);
    ctx.restore();
  }
  ctx.fillStyle = '#315f4a'; ctx.strokeStyle = '#173b2b'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(rear, -34, 34 + monkeys * 22, 27, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#56836b'; ctx.fillRect(rear - 3, -36, 40 + monkeys * 22, 5);
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