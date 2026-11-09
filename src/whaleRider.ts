// Hip position on the rear of a right-facing whale (ahead of its tail stock).
// Rider and whale share the same swimming transform to keep the seat aligned.
export const WHALE_RIDER_SEAT = { x: -22, y: 6 };
export const WHALE_RIDER_SCALE = 0.88;

// Contact in rider-local space, derived from the pony artwork's tread at
// (556,724), seat (552,438), ground 851 and seat height 28.
export const PENNY_RIDER_FOOT = {
  x: (556 - 552) * (28 / 413) / WHALE_RIDER_SCALE,
  y: ((724 - 851) * (28 / 413) + 24) / WHALE_RIDER_SCALE,
};

export function drawMountedSeat(ctx: CanvasRenderingContext2D, color: string): void {
  // Narrow continuation of the jacket into the thigh, not an extra buttock oval.
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-2.9, -9);
  ctx.bezierCurveTo(-2.8,-5,-2.5,-2,-1.3,-.8);
  ctx.quadraticCurveTo(.3,.3,4,.3);
  ctx.lineTo(5,-3); ctx.quadraticCurveTo(1,-6,1,-9); ctx.closePath(); ctx.fill();
}

export function drawPennyStirrupForeground(ctx: CanvasRenderingContext2D, dark: boolean): void {
  ctx.save(); ctx.strokeStyle = dark ? '#e9d9b2' : '#8a7656'; ctx.lineWidth = .9;
  ctx.beginPath(); ctx.moveTo(PENNY_RIDER_FOOT.x - 1.4, PENNY_RIDER_FOOT.y - 3.5);
  ctx.lineTo(PENNY_RIDER_FOOT.x - 1.7, PENNY_RIDER_FOOT.y);
  ctx.lineTo(PENNY_RIDER_FOOT.x + 1.7, PENNY_RIDER_FOOT.y); ctx.stroke(); ctx.restore();
}

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
export function drawWhaleRiderLeg(ctx: CanvasRenderingContext2D, near: boolean, color: string, shoe: string, width = 5, pony = false): void {
  // On the pony the thigh runs forward along the saddle like on every mount, then the
  // shin drops into the stirrup, so the hips stay one clean line.
  const kneeX = pony ? (near ? 8 : 6) : near ? 16 : 12;
  const kneeY = pony ? (near ? 3 : 1) : near ? 4 : 1;
  const footX = pony ? PENNY_RIDER_FOOT.x - 2 : near ? 13 : 10;
  const footY = pony ? PENNY_RIDER_FOOT.y : near ? 19 : 14;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(near ? 3 : 1.5, 0);
  ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, footY - 3); ctx.stroke();
  ctx.fillStyle = shoe;
  ctx.beginPath(); ctx.ellipse(footX + 2, footY - 2, pony ? 4 : 5.5, 2.5, -.08, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Left arm is a narrow, mostly occluded silhouette. The right arm is drawn
// last, in front of the torso and lap luggage, with its palm on the back.
export function drawWhaleRiderArm(ctx: CanvasRenderingContext2D, near: boolean, sleeve: string, skin: string, width = 4, frog = false, pony = false, onBack = false, equippedHand?: (x: number, y: number, angle: number) => void): void {
  ctx.strokeStyle = sleeve; ctx.lineWidth = near ? width : width * 0.65; ctx.lineCap = 'round';
  if (onBack) {
    // Sitting on a bull's or bear's back: hands rest on its withers, ahead of the hips.
    const hand = { x: near ? 17 : 15, y: near ? 1 : 0 };
    ctx.beginPath(); ctx.moveTo(near ? 2 : -2, -25); ctx.lineTo(near ? 8 : 6, -12); ctx.lineTo(hand.x, hand.y); ctx.stroke();
    if (equippedHand) equippedHand(hand.x,hand.y,Math.atan2(hand.y+12,hand.x-(near?8:6)));
    else { ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(hand.x + 1, hand.y, near ? 3 : 2, 1.8, .2, 0, Math.PI * 2); ctx.fill(); }
    return;
  }
  if (pony) {
    // Upright rider: elbows bent, both hands on the reins just ahead of the pommel.
    const hand = { x: near ? 15 : 13, y: near ? -9 : -10 };
    ctx.beginPath(); ctx.moveTo(near ? 2 : -2, -25); ctx.lineTo(near ? 6 : 4, -14); ctx.lineTo(hand.x, hand.y); ctx.stroke();
    if (equippedHand) equippedHand(hand.x,hand.y,Math.atan2(hand.y+14,hand.x-(near?6:4)));
    else { ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(hand.x + 1, hand.y, near ? 2.6 : 2, 2, 0, 0, Math.PI * 2); ctx.fill(); }
    return;
  }
  ctx.beginPath(); ctx.moveTo(near ? 2 : -2, -25);
  ctx.lineTo(frog?(near?6:4):(near ? 11 : 8), frog?(near?-8:-10):(near ? -18 : -20));
  ctx.lineTo(frog?(near?19:16):(near ? 22 : 18), frog?(near?0:-2):(near ? -11 : -13)); ctx.stroke();
  if (equippedHand) {
    const x=frog?(near?19:16):(near?22:18),y=frog?(near?0:-2):(near?-11:-13);
    equippedHand(x,y,Math.atan2(y-(frog?(near?-8:-10):(near?-18:-20)),x-(frog?(near?6:4):(near?11:8))));
    return;
  }
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.ellipse(frog?(near?19:16):(near ? 23 : 19), frog?(near?0:-2):(near ? -10 : -12), near ? 3 : 2, 1.8, 0.2, 0, Math.PI * 2); ctx.fill();
}

// Each companion rides a separate smaller visual whale behind the player.
export function whaleCompanionPose(index: number) {
  return { x: -104 - index * 78, y: 14, scale: 0.65 };
}