import type { BossArena } from './boxingRules';
import { paulHookPose, paulTailPose } from './paulRules';
import { drawJointedArm } from './armRenderer';
import { paulSurface, drawPaulMuscle, drawPaulGlove, drawPaulHead } from './paulModel';

export function drawPaul(ctx: CanvasRenderingContext2D, b: BossArena['boss']): void {
  ctx.save(); ctx.translate(b.x, b.y); ctx.scale(b.facing, 1);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const chasing = b.attackKind === 'chase' && b.attack > 0;
  const tailAttack = b.attackKind === 'tail' && b.attack > 0;
  const tail = paulTailPose(b);
  const gait = b.moving ? Math.sin(b.walkPhase) : 0;
  const twist = tailAttack ? Math.sin((60 - b.attack) / 60 * Math.PI * 2) : 0;
  const shoulderShift = twist * 4;

  const drawTail = () => {
    const rootX = chasing ? -26 : -13, rootY = -28;
    const dx = tail.x - rootX, dy = tail.y - rootY;
    const length = Math.hypot(dx, dy) || 1, nx = -dy / length, ny = dx / length;
    ctx.fillStyle = paulSurface(ctx, (rootX + tail.x) / 2, (rootY + tail.y) / 2, length * 0.7);
    ctx.beginPath(); ctx.moveTo(rootX + nx * 6, rootY + ny * 6);
    ctx.bezierCurveTo(rootX + dx * 0.3 + nx * 11, rootY + dy * 0.3 + ny * 11,
      tail.x - dx * 0.15 + nx * 8, tail.y - dy * 0.15 + ny * 8, tail.x, tail.y);
    ctx.bezierCurveTo(tail.x - dx * 0.15 - nx * 9, tail.y - dy * 0.15 - ny * 9,
      rootX + dx * 0.3 - nx * 10, rootY + dy * 0.3 - ny * 10, rootX - nx * 6, rootY - ny * 6);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#a5b4bf'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(tail.x - dx * 0.15, tail.y - dy * 0.15 - 1); ctx.lineTo(tail.x, tail.y); ctx.stroke();
  };
  const limb = (near: boolean, root: { x: number; y: number }, joint: { x: number; y: number }, end: { x: number; y: number }, upper: number, lower: number) => {
    drawJointedArm(ctx, root, joint, end, paulSurface(ctx, root.x, root.y, 34, near), upper, lower);
    // A rounded upper muscle overlays the jointed core, not a flat outlined sausage.
    const dx = joint.x - root.x, dy = joint.y - root.y;
    drawPaulMuscle(ctx, root.x + dx * 0.4, root.y + dy * 0.4,
      upper * 0.56, Math.hypot(dx, dy) * 0.52, Math.atan2(dy, dx) - Math.PI / 2, near);
    ctx.strokeStyle = near ? '#a6b5c2' : '#647689'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(root.x - 2, root.y + 2); ctx.lineTo(joint.x - 2, joint.y - 2); ctx.stroke();
  };
  const paw = (x: number, y: number, near: boolean) => {
    ctx.fillStyle = paulSurface(ctx, x, y - 2, 12, near);
    ctx.beginPath(); ctx.moveTo(x - 5, y - 5); ctx.quadraticCurveTo(x + 2, y - 8, x + 10, y - 2);
    ctx.lineTo(x + 11, y + 1); ctx.lineTo(x - 5, y + 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2b394b'; ctx.lineWidth = 0.7;
    for (const toe of [4, 7]) { ctx.beginPath(); ctx.moveTo(x + toe, y - 2); ctx.lineTo(x + toe + 1, y); ctx.stroke(); }
  };

  if (chasing) {
    drawTail();
    const legs = (near: boolean) => {
      const phase = b.walkPhase + (near ? 0 : Math.PI);
      for (const front of [false, true]) {
        const stride = b.moving ? Math.sin(phase + (front ? 0 : Math.PI * 0.65)) : 0;
        const lift = b.moving ? Math.max(0, Math.cos(phase + (front ? 0 : Math.PI * 0.65))) * 6 : 0;
        const root = { x: front ? 18 : -25, y: -29 };
        const end = { x: root.x + stride * 12, y: -4 - lift };
        const joint = { x: root.x + (front ? -5 : 9) - stride * 4, y: -16 };
        limb(near, root, joint, end, near ? 11 : 8, near ? 7 : 6);
        if (front) drawPaulGlove(ctx, end.x, end.y - 5, near);
        else paw(end.x, end.y, near);
      }
    };
    legs(false);
    ctx.fillStyle = paulSurface(ctx, -3, -33, 43);
    ctx.beginPath(); ctx.moveTo(-34, -35); ctx.bezierCurveTo(-24, -49, 14, -49, 28, -36);
    ctx.quadraticCurveTo(24, -18, 7, -17); ctx.quadraticCurveTo(-6, -24, -26, -16);
    ctx.quadraticCurveTo(-39, -20, -34, -35); ctx.fill();
    drawPaulMuscle(ctx, -23, -29, 13, 15, -0.4);
    drawPaulMuscle(ctx, 19, -31, 14, 19, -0.35);
    ctx.fillStyle = '#9fadb8'; ctx.beginPath(); ctx.moveTo(17, -44); ctx.lineTo(32, -45);
    ctx.lineTo(29, -24); ctx.lineTo(20, -19); ctx.closePath(); ctx.fill();
    drawPaulHead(ctx, 30, -46);
    legs(true);
  } else {
    const leg = (near: boolean) => {
      const stride = b.grounded ? gait * (near ? 7 : -7) : -5;
      const root = { x: near ? 3 : -6, y: -25 };
      const knee = { x: root.x + 6 + stride * 0.5, y: -16 };
      const hock = { x: root.x - 3 + stride, y: -8 };
      limb(near, root, knee, hock, near ? 13 : 10, near ? 8 : 6);
      ctx.strokeStyle = near ? '#73879a' : '#3d5066'; ctx.lineWidth = near ? 6 : 5;
      ctx.beginPath(); ctx.moveTo(hock.x, hock.y); ctx.lineTo(hock.x + 3, -3); ctx.stroke();
      paw(hock.x + 3, -2, near);
    };
    const arm = (near: boolean) => {
      const active = b.attackKind === 'hook' && b.attack > 0 && b.arm === (near ? 1 : 0);
      const hand = active ? paulHookPose(b) : { x: near ? 23 : 27, y: near ? -44 : -53 };
      const shoulder = { x: near ? 1 + shoulderShift : 12 - shoulderShift, y: near ? -53 : -55 };
      const elbow = { x: active ? hand.x * 0.5 - 5 : near ? 9 : 22, y: active ? hand.y + 15 : -34 };
      limb(near, shoulder, elbow, hand, near ? 14 : 10, near ? 10 : 7);
      drawPaulMuscle(ctx, shoulder.x, shoulder.y, near ? 11 : 8, near ? 13 : 10, -0.35, near);
      drawPaulGlove(ctx, hand.x, hand.y, near);
    };
    drawTail(); leg(false); arm(false);
    // Oblique rib cage: broad upper back, projecting chest, narrow waist and pelvis.
    ctx.save(); ctx.scale(1 - Math.abs(twist) * 0.18, 1);
    ctx.fillStyle = paulSurface(ctx, -1, -49, 34);
    ctx.beginPath(); ctx.moveTo(-19, -57); ctx.bezierCurveTo(-14, -68, 5, -68, 16, -57);
    ctx.bezierCurveTo(28, -53, 25, -40, 14, -36); ctx.lineTo(9, -22);
    ctx.quadraticCurveTo(-1, -16, -11, -24); ctx.lineTo(-15, -40);
    ctx.quadraticCurveTo(-23, -48, -19, -57); ctx.closePath(); ctx.fill();
    // Trapezius and neck connect the head into the shoulders, without a floating head.
    drawPaulMuscle(ctx, -6, -58, 11, 9, -0.4);
    ctx.fillStyle = paulSurface(ctx, 8, -65, 19);
    ctx.beginPath(); ctx.moveTo(-5, -57); ctx.lineTo(-2, -78); ctx.lineTo(14, -76);
    ctx.lineTo(19, -56); ctx.quadraticCurveTo(8, -48, -5, -57); ctx.fill();
    // The pale throat is a curved fur plane, not a flat triangular bib.
    ctx.fillStyle = '#acbac4'; ctx.beginPath(); ctx.moveTo(9, -71); ctx.quadraticCurveTo(18, -66, 18, -55);
    ctx.quadraticCurveTo(15, -43, 8, -39); ctx.lineTo(10, -50); ctx.lineTo(5, -55); ctx.closePath(); ctx.fill();
    drawPaulMuscle(ctx, 10, -49, 9, 12, 0.38);
    drawPaulMuscle(ctx, -7, -43, 9, 14, -0.25);
    drawPaulMuscle(ctx, 5, -31, 6, 8, 0.1);
    ctx.strokeStyle = '#41556b'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(11, -42); ctx.quadraticCurveTo(7, -38, 9, -29);
    ctx.moveTo(1, -33); ctx.quadraticCurveTo(5, -35, 8, -33); ctx.stroke();
    drawPaulHead(ctx, 8 + shoulderShift * 0.5, -76);
    ctx.restore();
    leg(true); arm(true);
    if (tailAttack && tail.sweep > 0) {
      // Keep the active tip at precisely the same position as paulTailPose/hit detection.
      drawTail();
      if (tail.sweep > 0.3) {
        ctx.strokeStyle = '#b7a5d6'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(tail.x - 23, tail.y - 11);
        ctx.quadraticCurveTo(tail.x + 8, tail.y - 7, tail.x + 5, tail.y + 7); ctx.stroke();
      }
    }
  }
  ctx.restore();
}