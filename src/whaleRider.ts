// Hip position on the rear of a right-facing whale (ahead of its tail stock).
// Rider and whale share the same swimming transform to keep the seat aligned.
export const WHALE_RIDER_SEAT = { x: -22, y: 6 };
export const WHALE_RIDER_SCALE = 0.88;

// Original left-facing whale swim: body bend, bob and squash/stretch.
// Tail animation still uses the same phase in the animal renderer.
export function applyWhaleSwim(ctx: CanvasRenderingContext2D, phase: number): void {
  ctx.translate(0, -Math.max(0, Math.sin(phase)) * 11);
  ctx.rotate(Math.sin(phase) * 0.11);
  ctx.translate(0, -30);
  ctx.scale(1 + Math.cos(phase * 2) * 0.06, 1 - Math.cos(phase * 2) * 0.08);
  ctx.translate(0, 30);
}

export function applyWhaleRiderSwim(ctx: CanvasRenderingContext2D, phase: number): void {
  ctx.translate(0, 40); ctx.scale(-1, 1);
  applyWhaleSwim(ctx, phase);
  ctx.scale(-1, 1); ctx.translate(0, -40);
}

// Keep the hip attached to the animated back, but do not stretch the rider
// with the whale. riderScale compensates for the miniature whale's scale,
// so rider size stays stable throughout the swimming animation.
export function applyWhaleRiderSeat(ctx: CanvasRenderingContext2D, phase: number, riderScale = 1): void {
  ctx.translate(WHALE_RIDER_SEAT.x, WHALE_RIDER_SEAT.y);
  ctx.scale(riderScale / (1 + Math.cos(phase * 2) * 0.06), riderScale / (1 - Math.cos(phase * 2) * 0.08));
}

// Right-facing equivalent of the Bear/Bull whale-rider knees. Far legs are
// drawn before the whale, near legs afterwards, so riders straddle its back.
export function drawWhaleRiderLeg(ctx: CanvasRenderingContext2D, near: boolean, color: string, shoe: string, width = 5): void {
  const kneeX = near ? 16 : 12;
  const kneeY = near ? 4 : 1;
  const footX = near ? 13 : 10;
  const footY = near ? 19 : 14;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(near ? 3 : -3, 0);
  ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, footY - 3); ctx.stroke();
  ctx.fillStyle = shoe;
  ctx.beginPath(); ctx.ellipse(footX + 2, footY - 2, 5.5, 2.5, -.08, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Left arm is a narrow, mostly occluded silhouette. The right arm is drawn
// last, in front of the torso and lap luggage, with its palm on the back.
export function drawWhaleRiderArm(ctx: CanvasRenderingContext2D, near: boolean, sleeve: string, skin: string, width = 4, frog = false): void {
  ctx.strokeStyle = sleeve; ctx.lineWidth = near ? width : width * 0.65; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(near ? 2 : -2, -25);
  ctx.lineTo(frog?(near?6:4):(near ? 11 : 8), frog?(near?-8:-10):(near ? -18 : -20));
  ctx.lineTo(frog?(near?19:16):(near ? 22 : 18), frog?(near?0:-2):(near ? -11 : -13)); ctx.stroke();
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.ellipse(frog?(near?19:16):(near ? 23 : 19), frog?(near?0:-2):(near ? -10 : -12), near ? 3 : 2, 1.8, 0.2, 0, Math.PI * 2); ctx.fill();
}

// Each companion rides a separate smaller visual whale behind the player.
export function whaleCompanionPose(index: number) {
  return { x: -104 - index * 78, y: 14, scale: 0.65 };
}