// Browser game module for bossRenderer.
import type { BossArena } from './boxingRules';
import { drawJointedArm } from './armRenderer';
import { bossGlovePose } from './boxingRules';
import { drawBossWeapon } from './bossWeaponRenderer';
import { briefcaseColors, drawSwanAsset, drawPickupAsset } from './assetRenderer';
import { drawAnimalCharacter } from './animalRenderer';
import { drawJanet } from './janetRenderer';
import { drawPaul } from './paulRenderer';

export function drawBossEncounter(ctx: CanvasRenderingContext2D, a: BossArena, darkMode = false): void {
      ctx.save(); ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#facc15';
      for (const popup of a.popups) ctx.fillText(popup.text, popup.x, popup.y);
      ctx.restore();
      for (const bird of a.birds) {
        ctx.save(); ctx.translate(bird.x, bird.y);
        if (bird.cargo) {
          ctx.save(); ctx.translate(0, 84);
          drawAnimalCharacter(ctx, { type: bird.cargo, x: 0, y: 0, feet: 0, phase: 0, dead: false }, true); ctx.restore();
          ctx.strokeStyle = '#d4a64a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
          for (const side of [-1, 1]) {
            const grip = bird.cargo === 'whale' ? 29 : 38;
            ctx.beginPath(); ctx.moveTo(side * 5, 7); ctx.quadraticCurveTo(side * 12, 18, side * 8, grip);
            ctx.quadraticCurveTo(side * 8 - 5, grip - 2, side * 8 - 4, grip + 4);
            ctx.moveTo(side * 8, grip); ctx.quadraticCurveTo(side * 8 + 5, grip - 2, side * 8 + 4, grip + 4); ctx.stroke();
          }
        }
        drawSwanAsset(ctx, bird.kind === 'hawk' ? { ...bird, lootRolled: true } : bird); ctx.restore();
      }
      for (const animal of a.animals) {
        ctx.save(); ctx.translate(animal.x, animal.feet); drawAnimalCharacter(ctx, animal); ctx.restore();
      }
      for (const drop of a.drops) {
        if (drop.kind === 'life') {
          ctx.save(); ctx.translate(drop.x, drop.y);
          ctx.fillStyle = '#ef4444'; ctx.strokeStyle = darkMode ? '#fecaca' : '#7f1d1d'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(0, 9); ctx.bezierCurveTo(-19, -2, -10, -17, 0, -8);
          ctx.bezierCurveTo(10, -17, 19, -2, 0, 9); ctx.fill(); ctx.stroke(); ctx.restore();
        }
        else if (drop.kind === 'bag' || drop.kind === 'tender') drawPickupAsset(ctx, { type: drop.kind, x: drop.x, y: drop.y, taken: false }, drop.x, drop.y, a.frame);
        else { ctx.save(); ctx.translate(drop.x, drop.y); ctx.scale(0.65, 0.65); drawBossWeapon(ctx, drop.kind); ctx.restore(); }
      }
      for (const drop of a.pigeonDrops) {
        ctx.save(); ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(drop.x, drop.y, 4, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      const b = a.boss;
      if (b.kind === 'janet') drawJanet(ctx, b, a.frame);
      else if (b.kind === 'paul') drawPaul(ctx, b);
      else {
      const scale = 0.53; // Bull/Bear-sized body, with the taller kangaroo ears above it.
      ctx.save(); ctx.translate(b.x, b.y); ctx.scale(b.facing * scale, scale);
      const tailLift = b.grounded ? Math.sin(a.frame * 0.08) * 2 : Math.max(-8, Math.min(14, -b.vy * 2));
      ctx.fillStyle = '#946039'; ctx.beginPath(); ctx.moveTo(-11, -29);
      ctx.bezierCurveTo(-28, -17, -56, -5 + tailLift, -86, -2 + tailLift);
      ctx.bezierCurveTo(-58, 1 + tailLift, -28, -7, -4, -18); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#b77b47'; ctx.lineWidth = 13; ctx.lineCap = 'round';
      for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 10, -30); ctx.lineTo(side * 22, b.grounded ? -14 : -27); ctx.lineTo(side * 20 + Math.sin(a.frame * 0.16 + side) * 5, b.grounded ? -3 : -15); ctx.stroke(); }
      const fur = ctx.createLinearGradient(-20, -90, 20, -20);
      fur.addColorStop(0, '#dca56d'); fur.addColorStop(0.55, '#ba7c49'); fur.addColorStop(1, '#815332');
      ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(0, -53, 29, 35, -0.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#edbf8a'; ctx.beginPath(); ctx.ellipse(6, -48, 13, 24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b77b47';
      for (const x of [-10, 5]) { ctx.beginPath(); ctx.ellipse(x, -113, 5, 21, 0.15, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#e0a999';
      for (const x of [-10, 5]) { ctx.beginPath(); ctx.ellipse(x + 1, -115, 2, 15, 0.15, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = fur;
      ctx.beginPath(); ctx.ellipse(4, -93, 17, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#edbf8a'; ctx.beginPath(); ctx.ellipse(20, -87, 18, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#231b19'; ctx.beginPath(); ctx.arc(15, -100, 2.6, 0, Math.PI * 2); ctx.ellipse(35, -88, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(16, -101, 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6b422c'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(9, -105); ctx.lineTo(19, -104); ctx.moveTo(20, -80); ctx.quadraticCurveTo(30, -76, 35, -82); ctx.stroke();
      // Long hind feet and a defined pouch distinguish a kangaroo from an upright bear.
      ctx.fillStyle = '#8d5d37';
      for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * 20 + 8, b.grounded ? -2 : -14, 15, 4, b.grounded ? 0 : -0.2, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = '#b78353'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-6, -39); ctx.quadraticCurveTo(7, -31, 17, -39); ctx.stroke();
      for (const arm of [0, 1]) {
        const active = arm === b.arm && b.attack > 0;
        const pose = active ? bossGlovePose(b) : { x: arm ? 24 : 16, y: arm ? -49 : -57 };
        const handX = pose.x / scale;
        const handY = pose.y / scale;
        const shoulderX = arm ? 12 : -10;
        const shoulderY = -74;
        const dx = handX - shoulderX, dy = handY - shoulderY;
        const distance = Math.hypot(dx, dy) || 1;
        const bend = active && b.uppercut ? 20 : Math.max(7, 22 - distance * 0.045);
        // Bend perpendicular to the actual punch angle, not at a fixed height.
        const elbowX = shoulderX + dx * 0.48 - dy / distance * bend;
        const elbowY = shoulderY + dy * 0.48 + dx / distance * bend;
        const armColor = fur;
        // Start within the chest so the rounded upper arm blends into the torso.
        drawJointedArm(ctx, { x: shoulderX, y: shoulderY }, { x: elbowX, y: elbowY }, { x: handX, y: handY }, armColor, 12, 8);
        ctx.fillStyle = '#ef3340'; ctx.strokeStyle = '#991b1b'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(handX - 8, handY - 10, 21, 21, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fillRect(handX - 7, handY + 7, 9, 4);
      }
      ctx.restore();
      }
      const colors = briefcaseColors(darkMode);
      for (const c of a.cases) {
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(a.frame * 0.3);
        ctx.fillStyle = colors.body; ctx.fillRect(-10, -7, 20, 14);
        ctx.strokeStyle = colors.outline; ctx.lineWidth = 1.2; ctx.strokeRect(-10, -7, 20, 14);
        ctx.strokeStyle = colors.handle; ctx.lineWidth = 2; ctx.strokeRect(-4, -10, 8, 3);
        ctx.fillStyle = colors.clasp; ctx.fillRect(-2, -2, 4, 4); ctx.restore();
      }

}
