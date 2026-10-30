import type { BossArena } from './boxingRules';
import { paulHookPose, paulTailPose } from './paulRules';
import { drawJointedArm } from './armRenderer';
import { paulSurface, drawPaulMuscle, drawPaulGlove, drawPaulHead, paulHookMotion } from './paulModel';
import { drawBossHats } from './bossHatRenderer';

export function drawPaul(ctx: CanvasRenderingContext2D, b: BossArena['boss'], dark = false, hatSkin = 'hats-classic'): void {
  ctx.save(); ctx.translate(b.x, b.y); ctx.scale(b.facing, 1);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const chasing = b.attackKind === 'chase' && b.attack > 0 || b.behavior === 'approach';
  const tailAttack = b.attackKind === 'tail' && b.attack > 0;
  const tail = paulTailPose(b);
  const gait = b.moving ? Math.sin(b.walkPhase) : 0;
  const twist = tailAttack ? Math.sin((60 - b.attack) / 60 * Math.PI * 2) : 0;
  const shoulderShift = twist * 4;
  const hook = paulHookMotion(b.attackKind === 'hook' ? b.attack : 0);
  // Rotate around the waist, so the shoulders and rib cage load together.
  const upperPoint = (x: number, y: number) => ({
    x: Math.cos(hook.lean) * x - Math.sin(hook.lean) * (y + 25),
    y: -25 + Math.sin(hook.lean) * x + Math.cos(hook.lean) * (y + 25),
  });

  const drawTail = () => {
    // Bury the broad tail base inside the pelvis, and follow the same waist
    // rotation/compression as the torso instead of anchoring at its silhouette.
    const root = chasing ? { x: -24, y: -29 }
      : upperPoint(-7 * (1 - Math.abs(twist) * 0.18), -27);
    const rootX = root.x, rootY = root.y;
    const dx = tail.x - rootX, dy = tail.y - rootY;
    const length = Math.hypot(dx, dy) || 1, nx = -dy / length, ny = dx / length;
    // Shade across the thickness, not along the length: a rounded, furry tail
    // with a heavy base and tapered tip rather than a constant-width ribbon.
    const midX = rootX + dx * 0.42, midY = rootY + dy * 0.42;
    const fur = ctx.createLinearGradient(midX + nx * 15, midY + ny * 15, midX - nx * 15, midY - ny * 15);
    fur.addColorStop(0, '#b1bec9'); fur.addColorStop(0.3, '#8d9faf');
    fur.addColorStop(0.65, '#576e83'); fur.addColorStop(1, '#293b50');
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.moveTo(rootX + nx * 11, rootY + ny * 11);
    ctx.bezierCurveTo(rootX + dx * 0.2 + nx * 17, rootY + dy * 0.2 + ny * 17,
      rootX + dx * 0.62 + nx * 13, rootY + dy * 0.62 + ny * 13,
      rootX + dx * 0.76 + nx * 6, rootY + dy * 0.76 + ny * 6);
    ctx.lineTo(rootX + dx * 0.72 + nx * 9, rootY + dy * 0.72 + ny * 9);
    ctx.quadraticCurveTo(rootX + dx * 0.91 + nx * 5, rootY + dy * 0.91 + ny * 5, tail.x, tail.y);
    ctx.quadraticCurveTo(rootX + dx * 0.83 - nx * 7, rootY + dy * 0.83 - ny * 7,
      rootX + dx * 0.69 - nx * 10, rootY + dy * 0.69 - ny * 10);
    ctx.lineTo(rootX + dx * 0.75 - nx * 5, rootY + dy * 0.75 - ny * 5);
    ctx.bezierCurveTo(rootX + dx * 0.51 - nx * 15, rootY + dy * 0.51 - ny * 15,
      rootX + dx * 0.2 - nx * 16, rootY + dy * 0.2 - ny * 16, rootX - nx * 11, rootY - ny * 11);
    ctx.closePath(); ctx.fill();
  };
  const limb = (near: boolean, root: { x: number; y: number }, joint: { x: number; y: number }, end: { x: number; y: number }, upper: number, lower: number) => {
    drawJointedArm(ctx, root, joint, end, paulSurface(ctx, root.x, root.y, 34, near), upper, lower);
    // A rounded upper muscle overlays the jointed core, not a flat outlined sausage.
    const dx = joint.x - root.x, dy = joint.y - root.y;
    drawPaulMuscle(ctx, root.x + dx * 0.4, root.y + dy * 0.4,
      upper * 0.56, Math.hypot(dx, dy) * 0.52, Math.atan2(dy, dx) - Math.PI / 2, near);
    // Blend the forearm into a smaller elbow instead of drawing a hard seam
    // across the bend. The rounded core keeps wrists and ankles connected.
    const forearmX = end.x - joint.x, forearmY = end.y - joint.y;
    drawPaulMuscle(ctx, joint.x + forearmX * 0.43, joint.y + forearmY * 0.43,
      lower * 0.52, Math.hypot(forearmX, forearmY) * 0.52,
      Math.atan2(forearmY, forearmX) - Math.PI / 2, near);
    drawPaulMuscle(ctx, joint.x, joint.y, lower * 0.52, lower * 0.58, 0, near);
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
    drawBossHats(ctx, b.fedoraHats, hatSkin, dark, 'paul', 30, -46);
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
      // Active glove stays on the shared collision path; only the shoulder
      // and elbow supply the wind-up, with the other hand held in guard.
      const hand = active ? paulHookPose(b) : upperPoint(near ? 23 : 27, near ? -44 : -53);
      const shoulder = upperPoint(near ? 1 + shoulderShift : 12 - shoulderShift, near ? -53 : -55);
      const elbow = active ? {
        x: hand.x * 0.5 - 5 - hook.load * 14 + hook.drive * 7,
        y: hand.y + 15 - hook.load * 7 - hook.drive * 4,
      } : upperPoint(near ? 9 : 22, -34);
      limb(near, shoulder, elbow, hand, near ? 14 : 10, near ? 10 : 7);
      drawPaulMuscle(ctx, shoulder.x, shoulder.y, near ? 11 : 8, near ? 13 : 10, -0.35, near);
      drawPaulGlove(ctx, hand.x, hand.y, near);
    };
    drawTail(); leg(false); arm(false);
    // Oblique rib cage: broad upper back, projecting chest, narrow waist and pelvis.
    ctx.save();
    ctx.translate(0, -25); ctx.rotate(hook.lean); ctx.translate(0, 25);
    ctx.scale(1 - Math.abs(twist) * 0.18, 1);
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
    ctx.restore();
    // Head follows the waist but keeps its skull volume while the chest turns.
    // Project the muzzle/ears independently instead of flattening the profile.
    const head = upperPoint((8 + shoulderShift * 0.5) * (1 - Math.abs(twist) * 0.18), -76);
    ctx.save(); ctx.translate(head.x, head.y); ctx.rotate(hook.lean);
    drawPaulHead(ctx, 0, 0, twist * 0.85 - hook.load * 0.42 + hook.drive * 0.28);
    drawBossHats(ctx, b.fedoraHats, hatSkin, dark, 'paul', 0, 0);
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