import type { BossArena } from './boxingRules';
import { drawBlinkingEye } from './eyeAnimation';
import { janetAttackPose, JANET_SCALE } from './janetRules';
import { drawJointedArm } from './armRenderer';
import { drawBoxingGlove } from './boxingGloveRenderer';
import { drawBossHats } from './bossHatRenderer';

export function drawJanet(ctx: CanvasRenderingContext2D, b: BossArena['boss'], frame: number, dark = false, hatSkin = 'hats-classic'): void {
  ctx.save(); ctx.translate(b.x, b.y); ctx.scale(b.facing * JANET_SCALE, JANET_SCALE);
  const shell = () => {
    const gradient = ctx.createLinearGradient(-30, -60, 24, -5);
    gradient.addColorStop(0, '#587c42'); gradient.addColorStop(0.55, '#365633'); gradient.addColorStop(1, '#203e2b');
    ctx.fillStyle = gradient; ctx.strokeStyle = '#172f23'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(-5, -31, 30, 32, -0.12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#9aa667'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-16, -41); ctx.lineTo(-3, -49); ctx.lineTo(10, -40);
    ctx.lineTo(9, -24); ctx.lineTo(-5, -16); ctx.lineTo(-18, -25); ctx.closePath();
    ctx.moveTo(-16, -41); ctx.lineTo(-27, -48); ctx.moveTo(-3, -49); ctx.lineTo(-2, -61);
    ctx.moveTo(10, -40); ctx.lineTo(22, -45); ctx.moveTo(9, -24); ctx.lineTo(20, -13);
    ctx.moveTo(-5, -16); ctx.lineTo(-7, -1); ctx.moveTo(-18, -25); ctx.lineTo(-32, -19); ctx.stroke();
  };
  if (b.attackKind === 'spin' && b.attack > 0) {
    ctx.save(); ctx.translate(0, -28); ctx.rotate(b.spinAngle); ctx.translate(0, 31); shell();
    drawBossHats(ctx, b.fedoraHats, hatSkin, dark, 'janetShell', 0, 0);
    ctx.restore();
    ctx.strokeStyle = '#b5cf8e'; ctx.lineWidth = 2;
    for (const radius of [35, 40]) {
      ctx.beginPath(); ctx.ellipse(-5, -31, radius, radius * 0.7, frame * 0.12, 0.2, 2.6); ctx.stroke();
    }
    ctx.restore(); return;
  }
  const attackPose = janetAttackPose(b);
  const pose = { x: attackPose.x / JANET_SCALE, y: attackPose.y / JANET_SCALE };
  const leg = (near: boolean) => {
    const stride = b.grounded ? (b.moving ? Math.sin(b.walkPhase + (near ? 0 : Math.PI)) * 7 : 0) : -4;
    const hip = near ? 7 : 0;
    ctx.strokeStyle = near ? '#799b50' : '#526c3a'; ctx.lineWidth = near ? 12 : 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hip, -19); ctx.lineTo(hip + 3 + stride * 0.4, -10);
    ctx.lineTo(hip + stride, -5); ctx.stroke();
    ctx.fillStyle = near ? '#9ab269' : '#6c874b';
    ctx.beginPath(); ctx.ellipse(hip + stride + 5, -3, near ? 10 : 8, 4, 0, 0, Math.PI * 2); ctx.fill();
  };
  const arm = (near: boolean) => {
    const active = b.attackKind === 'punch' && b.attack > 0 && b.arm === (near ? 1 : 0);
    const hand = active ? pose : { x: near ? 22 : 25, y: near ? -39 : -47 };
    const shoulder = { x: near ? 9 : 15, y: -47 };
    const elbow = { x: near ? 13 : 20, y: -35 };
    drawJointedArm(ctx, shoulder, elbow, hand, near ? '#799b50' : '#526c3a', near ? 12 : 9, near ? 9 : 7);
    ctx.fillStyle = near ? '#99b66a' : '#6c874b'; ctx.beginPath(); ctx.ellipse(shoulder.x, -44, near ? 9 : 6, 7, -0.4, 0, Math.PI * 2); ctx.fill();
    drawBoxingGlove(ctx, hand.x, hand.y, near, 0.85);
  };
  leg(false); arm(false);
  shell();
  ctx.fillStyle = '#d2bd76'; ctx.strokeStyle = '#887a44'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(14, -32, 12, 26, -0.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  for (const y of [-44, -32, -20]) {
    ctx.beginPath(); ctx.moveTo(1, y); ctx.quadraticCurveTo(12, y + 4, 24, y); ctx.stroke();
  }
  const neckAttack = b.attackKind === 'neck' && b.attack > 0;
  const headX = neckAttack ? pose.x : 13;
  const headY = neckAttack ? pose.y : -65;
  ctx.strokeStyle = '#799b50'; ctx.lineWidth = 13;
  ctx.beginPath(); ctx.moveTo(5, -51); ctx.quadraticCurveTo((headX + 5) / 2, headY + 9, headX, headY + 3); ctx.stroke();
  ctx.fillStyle = '#a1b96b'; ctx.strokeStyle = '#405b31'; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.ellipse(headX, headY, 15, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  drawBossHats(ctx, b.fedoraHats, hatSkin, dark, 'janet', headX, headY);
  ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.ellipse(headX + 6, headY - 4, 4, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  drawBlinkingEye(ctx,headX+8,headY-4,()=>{ctx.fillStyle = '#15241b'; ctx.beginPath(); ctx.arc(headX + 8, headY - 4, 1.7, 0, Math.PI * 2); ctx.fill();},15);
  ctx.strokeStyle = '#405b31'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(headX + 2, headY - 9); ctx.lineTo(headX + 10, headY - 8);
  ctx.moveTo(headX + 5, headY + 5); ctx.quadraticCurveTo(headX + 12, headY + 7, headX + 14, headY + 2); ctx.stroke();
  leg(true); arm(true);
  ctx.restore();
}