// Browser game module for bossHeroRenderer.
import { drawHumanHead, drawPickupAsset } from './assetRenderer';
import { drawEquippedBag, bagGripX, bagGripY } from './cosmeticModels';
import { drawBossWeapon } from './bossWeaponRenderer';
import { briefcaseArmPose } from './characterPose';
import { drawJointedArm } from './armRenderer';
import { drawClownHead } from './clownRenderer';
import { traceProfileTorso } from './profileAnatomy';
import { profileTiePose } from './garmentPose';

// Local right profile, feet at origin. The scene mirrors this entire model to face left.
export function drawBossHero(ctx: CanvasRenderingContext2D, stride: number, airborne: boolean, velocity: number, throwTimer: number, caseFlying = false, weapon: 'bat' | 'chainsaw' | null = null, swing = 0, bagTimer = 0, darkMode = false, clownHead = false, soiledHead = false, suitcaseSkin = 'suitcase-classic', phase = 0): void {
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
  // Use the runner's shoulder, rib cage and waist instead of a frontal barrel.
  ctx.fillStyle = '#fed7aa';
  ctx.save();ctx.translate(-2,-5);ctx.scale(1.45,1);
  traceProfileTorso(ctx);ctx.fill();ctx.restore();
  ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(-5, -23); ctx.quadraticCurveTo(1, -20, 7, -23);
  ctx.lineTo(6, -14); ctx.lineTo(1, -15); ctx.lineTo(-1, -17); ctx.lineTo(-5, -15); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-4, -21); ctx.quadraticCurveTo(1, -19, 6, -21); ctx.moveTo(4, -20); ctx.lineTo(2, -15); ctx.stroke();
  ctx.strokeStyle = '#fed7aa'; ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.moveTo(3, -17); ctx.quadraticCurveTo(3 + frontFoot * 0.5, -9, frontFoot + 2, feetY); ctx.lineTo(frontFoot + 7, feetY); ctx.stroke();
  ctx.save(); ctx.translate(2, -47); ctx.scale(0.8, 0.8);
  if (clownHead) drawClownHead(ctx); else drawHumanHead(ctx, false);
  if (soiledHead) {
    ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.ellipse(0, -11, 7, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillRect(3, -11, 2, 7);
  }
  ctx.restore();
  // Finish after the head's neck pass: fixed neck strap/knot, flexible blade.
  ctx.save();ctx.translate(0,-7);ctx.fillStyle='#dc3650';
  const tie=profileTiePose(phase,airborne,velocity);
  const normal={x:Math.cos(tie.lowerAngle),y:-Math.sin(tie.lowerAngle)};
  const edge={x:tie.tip.x-Math.sin(tie.lowerAngle)*1.8,y:tie.tip.y-Math.cos(tie.lowerAngle)*1.8};
  ctx.beginPath();ctx.moveTo(5.25,-31.4);ctx.lineTo(5.95,-31.4);
  ctx.quadraticCurveTo(tie.middle.x+.35,tie.middle.y,edge.x+normal.x*.7,edge.y+normal.y*.7);
  ctx.lineTo(tie.tip.x,tie.tip.y);ctx.lineTo(edge.x-normal.x*.7,edge.y-normal.y*.7);
  ctx.quadraticCurveTo(tie.middle.x-.35,tie.middle.y,5.25,-31.4);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(.2,-34.7);ctx.quadraticCurveTo(2,-33.8,3.5,-34.3);
  ctx.lineTo(6.2,-32.7);ctx.lineTo(5.1,-32.4);ctx.lineTo(3.4,-33.2);
  ctx.quadraticCurveTo(1.5,-33,.2,-34);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(5.1,-33);ctx.lineTo(6.2,-32.7);
  ctx.lineTo(6,-31.6);ctx.lineTo(5.6,-30.9);ctx.lineTo(5,-31.8);ctx.closePath();ctx.fill();ctx.restore();
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
    ctx.save();ctx.translate(handX,handY);ctx.rotate(pose.angle);
    ctx.translate(-bagGripX(suitcaseSkin),-bagGripY(suitcaseSkin));
    drawEquippedBag(ctx,suitcaseSkin,darkMode);ctx.restore();
  }
  ctx.restore();
}