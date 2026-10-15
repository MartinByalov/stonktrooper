// Browser game module for bossHeroRenderer.
import { briefcaseColors, drawHumanHead, drawPickupAsset } from './assetRenderer';
import { drawBossWeapon } from './bossWeaponRenderer';
import { briefcaseArmPose } from './characterPose';
import { drawJointedArm } from './armRenderer';

// Local right profile, feet at origin. The scene mirrors this entire model to face left.
export function drawBossHero(ctx: CanvasRenderingContext2D, stride: number, airborne: boolean, velocity: number, throwTimer: number, caseFlying = false, weapon: 'bat' | 'chainsaw' | null = null, swing = 0, bagTimer = 0, darkMode = false): void {
  ctx.save();
  if (airborne) {
    ctx.translate(0, -22);
    ctx.rotate(Math.max(-0.16, Math.min(0.13, velocity * 0.013)));
    ctx.translate(0, 22);
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const backFoot = airborne ? -stride * 4 - 3 : -stride * 8;
  const frontFoot = airborne ? stride * 4 + 2 : stride * 8;
  const feetY = airborne ? -6 : -1;
  // Far left limbs are occluded by the torso and near right limbs.
  ctx.strokeStyle = '#fed7aa'; ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.moveTo(-2, -18); ctx.quadraticCurveTo(-2 + backFoot * 0.45, -10, backFoot, feetY); ctx.lineTo(backFoot + 4, feetY); ctx.stroke();
  drawJointedArm(ctx, { x: -2, y: -36 }, { x: stride * 3, y: -24 }, { x: stride * 6, y: -18 }, '#fed7aa', 4.6, 3.5);
  // Narrow chest, rounded back and visible shoulder rather than a frontal oval.
  ctx.fillStyle = '#fed7aa';
  ctx.beginPath(); ctx.moveTo(-4, -39); ctx.quadraticCurveTo(-8, -31, -5, -22);
  ctx.quadraticCurveTo(1, -18, 7, -22); ctx.quadraticCurveTo(10, -31, 6, -39); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fed7aa'; ctx.fillRect(0, -45, 5, 7);
  ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(-5, -23); ctx.quadraticCurveTo(1, -20, 7, -23);
  ctx.lineTo(6, -14); ctx.lineTo(1, -15); ctx.lineTo(-1, -17); ctx.lineTo(-5, -15); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-4, -21); ctx.quadraticCurveTo(1, -19, 6, -21); ctx.moveTo(4, -20); ctx.lineTo(2, -15); ctx.stroke();
  // Tie hangs along the front (right edge) of the chest.
  ctx.fillStyle = '#dc3650'; ctx.beginPath(); ctx.moveTo(5, -40); ctx.lineTo(7, -40);
  ctx.lineTo(7 - stride, -28); ctx.lineTo(5 - stride, -28); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#fed7aa'; ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.moveTo(3, -17); ctx.quadraticCurveTo(3 + frontFoot * 0.5, -9, frontFoot + 2, feetY); ctx.lineTo(frontFoot + 7, feetY); ctx.stroke();
  ctx.save(); ctx.translate(2, -47); ctx.scale(0.8, 0.8); drawHumanHead(ctx, false); ctx.restore();
  const pose = briefcaseArmPose(airborne, velocity, stride);
  const throwing = throwTimer > 0;
  const reach = Math.min(1, throwTimer / 8);
  // Preserve the normal-run gesture, with compact bare-arm proportions.
  const shoulderX = 3, shoulderY = -36;
  const compact = 0.78;
  const swingPhase = swing > 0 ? (18 - swing) / 18 * Math.PI : 0;
  const depth = Math.cos(swingPhase);
  const handX = weapon && swing > 0 ? 8 + Math.sin(swingPhase) * 16 : shoulderX + ((throwing ? 3 + 21 * reach : pose.handX) - shoulderX) * compact;
  const handY = weapon && swing > 0 ? -25 + depth * 3 : shoulderY + ((throwing ? -12 - 10 * reach : pose.handY) - shoulderY) * compact;
  const elbowX = shoulderX + ((throwing ? 3 + 11 * reach : pose.elbowX) - shoulderX) * compact;
  const elbowY = shoulderY + ((throwing ? -21 - 5 * reach : pose.elbowY) - shoulderY) * compact;
  if (bagTimer <= 0) {
    drawJointedArm(ctx, { x: shoulderX, y: shoulderY }, { x: elbowX, y: elbowY }, { x: handX, y: handY }, '#fed7aa', 4.6, 3.5);
    ctx.fillStyle = '#efb58f'; ctx.beginPath(); ctx.arc(handX, handY, 2.3, 0, Math.PI * 2); ctx.fill();
  }
  if (bagTimer > 0) {
    drawJointedArm(ctx, { x: -2, y: -36 }, { x: 9, y: -25 }, { x: 15, y: -22 }, '#fed7aa', 4.6, 3.5);
    drawJointedArm(ctx, { x: 3, y: -36 }, { x: 13, y: -27 }, { x: 17, y: -22 }, '#fed7aa', 4.6, 3.5);
    drawPickupAsset(ctx, { type: 'bag', x: 0, y: 0, taken: false }, 18, -13);
  } else if (weapon) {
    ctx.save(); ctx.translate(handX, handY);
    // Project a sweep around the body: foreshortening and depth-dependent size.
    ctx.rotate(swing > 0 ? Math.sin(swingPhase) * 1.35 : weapon === 'bat' ? Math.PI / 2 - 0.2 : -0.2);
    if (swing > 0) ctx.scale(0.35 + Math.abs(depth) * 0.65, 1 + Math.sin(swingPhase) * 0.18);
    drawBossWeapon(ctx, weapon); ctx.restore();
  } else if (!throwing && !caseFlying) {
    ctx.save(); ctx.translate(handX - 8, handY + 3); ctx.rotate(pose.angle);
    const colors = briefcaseColors(darkMode);
    ctx.fillStyle = colors.body; ctx.fillRect(-2, 0, 19, 13);
    ctx.strokeStyle = colors.outline; ctx.lineWidth = 1; ctx.strokeRect(-2, 0, 19, 13);
    ctx.strokeStyle = colors.handle; ctx.lineWidth = 2; ctx.strokeRect(5, -3, 7, 3);
    ctx.fillStyle = colors.clasp; ctx.fillRect(6, 4, 3.5, 2.5); ctx.restore();
  }
  ctx.restore();
}