// Browser game module for assetRenderer.
import type { Pickup, Swan } from './types';
import { drawChickenTender } from './tenderRenderer';
import { drawSpinningFedora } from './fedoraRenderer';
import { drawWhaleRiderArm, drawWhaleRiderLeg } from './whaleRider';

export const APE_SCALE = 0.6;

export const briefcaseColors = (darkMode = false) => ({
  body: darkMode ? '#ffffff' : '#05070a',
  outline: darkMode ? '#cbd5e1' : '#1e293b',
  handle: darkMode ? '#ffffff' : '#0f172a',
  clasp: darkMode ? '#000000' : '#ffffff',
});

// Shared guide-sized briefcase, centered on the body rather than its handle.
export function drawBriefcase(ctx: CanvasRenderingContext2D, darkMode = false): void {
  ctx.save();
  const colors = briefcaseColors(darkMode);
  ctx.strokeStyle = colors.handle; ctx.lineWidth = 5;
  ctx.strokeRect(-12, -26, 24, 14);
  ctx.fillStyle = colors.body; ctx.fillRect(-35, -15, 70, 45);
  ctx.strokeStyle = colors.outline; ctx.lineWidth = 1;
  ctx.strokeRect(-35, -15, 70, 45);
  ctx.fillStyle = colors.clasp; ctx.fillRect(-4, 2, 8, 10);
  ctx.restore();
}

export const drawCharacterHat = (ctx: CanvasRenderingContext2D, captain: boolean, frontFacing = false, darkMode = false): void => {
  ctx.save();
  if (captain) {
    // Reduce the cap around its contact point on the head, not around the face.
    ctx.translate(0, -7); ctx.scale(0.84, 0.84); ctx.translate(0, 7);
    if (!frontFacing) {
      // Right side visible: the front panel and peak are at the right edge.
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath(); ctx.moveTo(-11, -9); ctx.quadraticCurveTo(-15, -11, -11, -15);
      ctx.quadraticCurveTo(-1, -23, 14, -27); ctx.quadraticCurveTo(10, -20, 11, -13);
      ctx.quadraticCurveTo(0, -8, -11, -9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#64717e'; ctx.lineWidth = 0.7; ctx.stroke();
      ctx.fillStyle = '#dbe4ec'; ctx.beginPath(); ctx.moveTo(-10, -11); ctx.quadraticCurveTo(1, -14, 13, -26); ctx.lineTo(11, -13); ctx.quadraticCurveTo(0, -8, -10, -9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#b8c2cb'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(-10, -13); ctx.quadraticCurveTo(0, -20, 14, -27); ctx.stroke();
      ctx.fillStyle = '#161b22'; ctx.beginPath(); ctx.moveTo(-10, -9); ctx.quadraticCurveTo(0, -9, 10, -14); ctx.lineTo(11, -10); ctx.quadraticCurveTo(0, -5, -9, -5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#202328'; ctx.beginPath(); ctx.moveTo(8, -11); ctx.quadraticCurveTo(15, -8, 23, -6); ctx.quadraticCurveTo(20, -2, 4, -5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#080b10'; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.strokeStyle = '#dcb759'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.quadraticCurveTo(5, -9, 10, -11); ctx.stroke();
      // Gold emblem on the forward-facing panel above the peak.
      ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.ellipse(9, -17, 1.8, 2.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      return;
    }
    // Wide peaked naval cap, not a rounded helmet with a central lamp.
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath(); ctx.moveTo(-12, -10); ctx.quadraticCurveTo(-16, -18, -6, -19);
    ctx.quadraticCurveTo(3, -21, 12, -17); ctx.quadraticCurveTo(16, -14, 10, -10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#b7c7d8'; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.fillStyle = '#10233d'; ctx.beginPath(); ctx.roundRect(-10, -11, 21, 4, 1); ctx.fill();
    ctx.fillStyle = '#080e19'; ctx.beginPath(); ctx.moveTo(-4, -7); ctx.quadraticCurveTo(7, -2, 15, -7); ctx.quadraticCurveTo(6, -10, -4, -7); ctx.fill();
    ctx.strokeStyle = '#dcb759'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(9, -8); ctx.stroke();
    // Anchor and laurel retained around the small gold front emblem.
    ctx.beginPath(); ctx.moveTo(2, -16); ctx.lineTo(2, -11); ctx.moveTo(0, -14); ctx.lineTo(4, -14);
    ctx.moveTo(-1, -13); ctx.quadraticCurveTo(2, -9, 5, -13);
    ctx.moveTo(-3, -15); ctx.quadraticCurveTo(-5, -12, -1, -11);
    ctx.moveTo(7, -15); ctx.quadraticCurveTo(9, -12, 5, -11); ctx.stroke();
    ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.arc(2, -15, 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
    return;
  }
  if (frontFacing) {
    // Frontal fedora: a centered crown sits inside the brim's rear ellipse;
    // the curved front lip overlaps its base, giving the hat depth, not tilt.
    ctx.translate(0, -7); ctx.scale(0.86, 0.86); ctx.translate(0, 7);
    const outline = darkMode ? '#94a3b8' : '#64748b';
    ctx.fillStyle = darkMode ? '#cbd5e1' : '#101115';
    ctx.beginPath(); ctx.ellipse(0, -7, 17, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 0.65; ctx.stroke();
    ctx.fillStyle = darkMode ? '#f8fafc' : '#24262b';
    ctx.beginPath(); ctx.moveTo(-11, -8); ctx.lineTo(-9, -20);
    ctx.quadraticCurveTo(-6, -23, 0, -20.5);
    ctx.quadraticCurveTo(6, -23, 9, -20);
    ctx.lineTo(11, -8); ctx.quadraticCurveTo(0, -5, -11, -8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = outline; ctx.stroke();
    // Recessed center crease and shaded side panels describe the crown volume.
    ctx.fillStyle = darkMode ? '#cbd5e1' : '#101115';
    ctx.beginPath(); ctx.moveTo(-7, -20);
    ctx.quadraticCurveTo(0, -17, 7, -20);
    ctx.quadraticCurveTo(0, -15.5, -7, -20); ctx.fill();
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(side * 9, -20); ctx.lineTo(side * 11, -8);
      ctx.lineTo(side * 7.5, -8); ctx.lineTo(side * 6.5, -17); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = darkMode ? '#111318' : '#f8fafc';
    ctx.beginPath(); ctx.moveTo(-10.5, -12);
    ctx.quadraticCurveTo(0, -9.5, 10.5, -12); ctx.lineTo(11, -8.5);
    ctx.quadraticCurveTo(0, -6, -11, -8.5); ctx.closePath(); ctx.fill();
    // Front of the brim is lower than its rear, but stays above the eyes.
    ctx.fillStyle = darkMode ? '#e2e8f0' : '#111318';
    ctx.beginPath(); ctx.moveTo(-17, -7);
    ctx.quadraticCurveTo(0, -5, 17, -7);
    ctx.quadraticCurveTo(14, -2.5, 0, -2.5);
    ctx.quadraticCurveTo(-14, -2.5, -17, -7); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.restore();
    return;
  }
  // Fedora: broad brim, pinched sides and a recessed crown, not a bowler dome.
  // Match the logo's slight forward tilt while keeping the hat anchored to the head.
  // Both crown ends are level; the forward rise comes only from the tilt.
  ctx.translate(0, -7); ctx.rotate(-0.12); ctx.scale(0.86, 0.86); ctx.translate(0, 7);
  const hatColor = darkMode ? '#f8fafc' : '#111318';
  const hatBandColor = darkMode ? '#111318' : '#ffffff';
  ctx.fillStyle = hatColor;
  ctx.beginPath(); ctx.ellipse(1, -7, 20, 4.5, -0.06, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = darkMode ? '#e2e8f0' : '#24262b';
  ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-8, -21);
  ctx.quadraticCurveTo(-4, -22, 0, -20); ctx.quadraticCurveTo(4, -22, 9, -21);
  ctx.lineTo(11, -8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = darkMode ? '#cbd5e1' : '#101115';
  ctx.beginPath(); ctx.moveTo(-6, -21); ctx.quadraticCurveTo(0, -18, 8, -21);
  ctx.quadraticCurveTo(1, -17, -6, -21); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.85;
  ctx.beginPath(); ctx.moveTo(-6, -21); ctx.quadraticCurveTo(0, -19, 8, -21); ctx.stroke();
  ctx.fillStyle = hatBandColor;
  ctx.beginPath(); ctx.moveTo(-9, -11); ctx.quadraticCurveTo(0, -9, 9, -11);
  ctx.lineTo(10, -8); ctx.quadraticCurveTo(0, -6, -9, -8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(-9, -9); ctx.quadraticCurveTo(0, -7, 10, -9); ctx.stroke();
  // Small ribbon fold on the visible right side.
  ctx.fillStyle = '#303239';
  ctx.beginPath(); ctx.moveTo(4, -10); ctx.lineTo(7, -11); ctx.lineTo(8, -8); ctx.lineTo(4, -8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#080a0e'; ctx.fillRect(5.5, -10.5, 1.2, 2.8);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-15, -7); ctx.quadraticCurveTo(1, -3, 16, -7); ctx.stroke();
  ctx.restore();
};

// Shared rounded right-profile head for running and seated poses.
export const drawHumanHead = (ctx: CanvasRenderingContext2D, hat = true, darkMode = false): void => {
  ctx.save();
  // Overlap both the jaw and shirt/shoulders, including scaled seated poses.
  // Draw behind the face so the chin keeps its rounded profile.
  ctx.fillStyle = '#eab28e'; ctx.fillRect(-2, 4, 5, 10);
  ctx.fillStyle = '#fed7aa';
  ctx.beginPath(); ctx.moveTo(-7, -4); ctx.bezierCurveTo(-7, -12, 5, -13, 7, -5);
  ctx.quadraticCurveTo(7, -2, 8.5, 0); ctx.quadraticCurveTo(9, 1.5, 7, 2);
  ctx.bezierCurveTo(8, 10, -2, 11, -5, 5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#eab28e'; ctx.beginPath(); ctx.ellipse(-4, 1, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#17202c'; ctx.beginPath(); ctx.arc(5, -3, 1.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ad735c'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(4, 6); ctx.quadraticCurveTo(6, 7, 7, 5); ctx.stroke();
  if (hat) drawCharacterHat(ctx, false, false, darkMode);
  ctx.restore();
};

// Front-facing meme pose; feet are at the local origin.
export const drawFallingCharacter = (ctx: CanvasRenderingContext2D, frame: number, apeHead = false, companion = false, darkMode = false, hat = true): void => {
  ctx.save();
  const raisedSide = Math.floor(frame / 10) % 2 === 0 ? -1 : 1;
  const skin = apeHead ? '#d6a573' : '#efb58f';
  const body = companion ? '#754526' : '#27374e';
  ctx.lineCap = 'round';
  ctx.strokeStyle = body; ctx.lineWidth = 7;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * 5, -17);
    ctx.lineTo(side * (8 + Math.sin(frame * 0.2) * 2), -2); ctx.stroke();
  }
  ctx.fillStyle = body;
  ctx.beginPath();
  if (apeHead || companion) {
    ctx.ellipse(0, -28, 12, 16, 0, 0, Math.PI * 2);
  } else {
    // Match the tapered, front-facing Home suit rather than a round belly.
    ctx.moveTo(-8, -40); ctx.quadraticCurveTo(0, -44, 8, -40);
    ctx.lineTo(10, -19); ctx.quadraticCurveTo(0, -14, -10, -19); ctx.closePath();
  }
  ctx.fill();
  if (!companion) {
    ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(-5, -41); ctx.lineTo(5, -41); ctx.lineTo(0, -24); ctx.fill();
    ctx.fillStyle = '#ef4444'; ctx.fillRect(-1.5, -37, 3, 11);
    if (!apeHead) {
      ctx.strokeStyle = '#42536b'; ctx.lineWidth = 0.7;
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(side * 6, -39); ctx.lineTo(side * 4, -30);
        ctx.lineTo(side * 8, -28); ctx.lineTo(side * 2, -19); ctx.stroke();
      }
    }
  }
  for (const side of [-1, 1]) {
    const handY = side === raisedSide ? -47 : -29;
    ctx.strokeStyle = body; ctx.lineWidth = companion ? 8 : 6;
    ctx.beginPath(); ctx.moveTo(side * 10, -37); ctx.lineTo(side * 20, -27); ctx.lineTo(side * 24, handY + 3); ctx.stroke();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.roundRect(side * 24 - 4, handY, 8, 8, 2); ctx.fill();
    // Folded fingers and one clearly extended middle finger.
    ctx.beginPath(); ctx.roundRect(side * 24 - 1.3, handY - 9, 2.6, 12, 1.2); ctx.fill();
    ctx.strokeStyle = apeHead ? '#8a5936' : '#c78667'; ctx.lineWidth = 0.7;
    for (const offset of [-2, 1, 3]) { ctx.beginPath(); ctx.moveTo(side * 24 + offset, handY + 3); ctx.lineTo(side * 24 + offset, handY + 6); ctx.stroke(); }
  }
  if (apeHead) {
    ctx.fillStyle = '#754526';
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * 10, -51, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(0, -52, 10, 11, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (!apeHead) {
    ctx.fillStyle = '#eab28e'; ctx.fillRect(-3, -44, 6, 5);
    ctx.strokeStyle = '#eab28e'; ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(side * 9, -50, 1.5, 2.5, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.fillStyle = apeHead ? skin : '#fed7aa';
  ctx.beginPath(); ctx.ellipse(0, -50, apeHead ? 8 : 9, apeHead ? 9 : 10.5, 0, 0, Math.PI * 2); ctx.fill();
  if (apeHead) {
    ctx.fillStyle = '#111827';
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * 3.5, -53, 1.5, 0, Math.PI * 2); ctx.fill(); }
  } else {
    // Home face at gameplay scale; both eyes remain below the hat brim.
    ctx.fillStyle = '#17202c';
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.arc(side * 3.4, -51.5, 1.1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#d49570'; ctx.lineWidth = 0.75;
    ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(-1.1, -47); ctx.lineTo(0.75, -47); ctx.stroke();
  }
  ctx.strokeStyle = '#70442d'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-4, -46); ctx.quadraticCurveTo(0, -43, 4, -46); ctx.stroke();
  if (!companion) {
    // The hero is bald during the fall; his belongings tumble to opposite sides.
    const time = Math.max(0, frame);
    if (!apeHead && hat) {
      ctx.save(); ctx.translate(-14 - time * 2.2, -61 - time * 3.2);
      ctx.rotate(-time * 0.09); drawCharacterHat(ctx, false, false, darkMode); ctx.restore();
    }
    ctx.save(); ctx.translate(27 + time * 2.5, -31 - time * 2.4);
    ctx.rotate(time * 0.11); ctx.scale(0.34, 0.34);
    drawBriefcase(ctx, darkMode); ctx.restore();
  }
  ctx.restore();
};

export const drawApeHead = (ctx: CanvasRenderingContext2D, hat = true): void => {
  ctx.save();
  // A short fur-covered neck joins the head to either the suit or ape torso.
  ctx.fillStyle = '#754526'; ctx.fillRect(-3, 6, 6, 8);
  ctx.fillStyle = '#754526';
  ctx.beginPath(); ctx.ellipse(0, 0, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#432918'; ctx.beginPath(); ctx.arc(-7, 0, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#bb8554'; ctx.beginPath(); ctx.arc(-7, 0, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d6a573';
  ctx.beginPath(); ctx.ellipse(4, 2, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#432918'; ctx.beginPath(); ctx.ellipse(9, 1, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(4, -3, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(5, -3, 1.3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#432918'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(1, -6); ctx.lineTo(7, -5); ctx.moveTo(4, 5); ctx.quadraticCurveTo(8, 7, 11, 4); ctx.stroke();
  if (hat) drawCharacterHat(ctx, true);
  ctx.restore();
};

export const drawApeAsset = (ctx: CanvasRenderingContext2D, phase = 0, seated = false, throwTimer = 0, throwDirection = 1, airborne = false, holdingBag = false, whaleRider = false): void => {
  ctx.save();
  if (airborne && !seated) { ctx.rotate(Math.sin(phase) * 0.1); ctx.scale(1.04, 0.94); }
  const bob = seated ? 0 : Math.abs(Math.sin(phase)) * 1.5;
  const limb = (near: boolean, arm: boolean) => {
    if (whaleRider && arm) {
      if (near && throwTimer > 0) {
        // Only the foreground/right hand releases its grip. Blend back to
        // the same palm position as the holding pose when the throw ends.
        const reach = Math.min(1, throwTimer / 8);
        const handX = 27 + (2 + throwDirection * 28 - 27) * reach;
        const handY = 3 - 18 * reach;
        ctx.strokeStyle = '#754526'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(2, -14);
        ctx.lineTo(13 + throwDirection * 4 * reach, -6 - 7 * reach);
        ctx.lineTo(handX, handY); ctx.stroke();
        ctx.fillStyle = '#d6a573';
        ctx.beginPath(); ctx.ellipse(handX, handY, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
        return { x: handX, y: handY };
      }
      ctx.save(); ctx.translate(0, 11);
      drawWhaleRiderArm(ctx, near, near ? '#754526' : '#4e301d', near ? '#d6a573' : '#a7774d', 6);
      ctx.restore();
      return { x: near ? 27 : 23, y: near ? 3 : 1 };
    }
    const swing = seated ? 0 : Math.sin(phase + (near ? 0 : Math.PI)) * (arm ? -11 : 9);
    const rootX = near ? 2 : -2;
    const rootY = arm ? -8 : 11;
    const throwing = near && arm && throwTimer > 0 && !holdingBag;
    const reach = Math.min(1, throwTimer / 8);
    const endX = holdingBag && arm ? (near ? 23 : 15) : throwing ? rootX + throwDirection * 28 * reach : seated ? (arm ? 17 : 12) : rootX + swing + (arm ? 7 : 0);
    const endY = holdingBag && arm ? 9 : throwing ? -15 + (1 - reach) * 18 : seated ? (arm ? 3 : 18) : (arm ? 17 : 25) - Math.max(0, swing) * (arm ? 0.25 : 0.45);
    ctx.strokeStyle = near ? '#754526' : '#4e301d';
    ctx.lineWidth = arm ? 7 : 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(rootX, rootY - bob);
    ctx.lineTo(throwing ? rootX + throwDirection * 13 * reach : rootX + swing * 0.45 + (arm ? -3 : 5), throwing ? -13 : arm ? 5 - bob : 18 - bob);
    ctx.lineTo(endX, endY); ctx.stroke();
    ctx.fillStyle = near ? '#d6a573' : '#a7774d';
    ctx.beginPath(); ctx.ellipse(endX + (arm ? 0 : 2), endY, arm ? 4 : 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#754526'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(endX, endY); ctx.lineTo(endX + 3, endY + 1); ctx.stroke();
    return { x: endX, y: endY };
  };
  // Left limbs are behind the torso; the visible right limbs render last.
  if (!whaleRider) limb(false, false);
  limb(false, true);
  ctx.fillStyle = '#754526'; ctx.strokeStyle = '#432918'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, -bob, whaleRider ? 8 : 11, 17, -0.18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#bb8554';
  ctx.beginPath(); ctx.ellipse(5, 1 - bob, 5, 11, -0.15, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(4, -23 - bob); ctx.scale(1.15, 1.15); drawApeHead(ctx); ctx.restore();
  if (whaleRider) {
    ctx.save(); ctx.translate(0, 11);
    drawWhaleRiderLeg(ctx, true, '#754526', '#d6a573', 8);
    ctx.restore();
  } else limb(true, false);
  const hand = limb(true, true);
  if (holdingBag) {
    drawPickupAsset(ctx, { type: 'bag', x: 0, y: 0, taken: false }, 20, 15);
  } else if (throwTimer > 0) {
    ctx.strokeStyle = `rgba(253, 224, 71, ${Math.min(0.8, throwTimer / 15)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hand.x - throwDirection * 10, hand.y + 8);
    ctx.quadraticCurveTo(hand.x, hand.y - 12, hand.x + throwDirection * 15, hand.y - 3); ctx.stroke();
  } else if (!seated) {
    ctx.save(); ctx.translate(hand.x, hand.y); ctx.scale(0.65, 0.65);
    drawPickupAsset(ctx, { type: 'banana', x: 0, y: 0, taken: false }, 3, 0);
    ctx.restore();
  }
  ctx.restore();
};

export const drawPickupAsset = (ctx: CanvasRenderingContext2D, d: Pickup, x: number, y: number, frame = 0, darkMode = false, coinLetter: 'M' | 'B' = 'M'): void => {
  if (d.type === 'fedora') {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.7, 0.7);
    drawSpinningFedora(ctx, -frame * 0.07 + d.x * 0.01, darkMode);
    ctx.restore();
    return;
  }
  if (d.type === 'printer') {
    ctx.save(); ctx.translate(x, y);
    ctx.rotate(d.rotation ?? 0);
    ctx.scale(0.85, 0.85);
    // Chunky retro desktop printer, with a paper feed and projecting cash tray.
    ctx.fillStyle = '#8c9985'; ctx.beginPath(); ctx.roundRect(-16, -15, 32, 9, 2); ctx.fill();
    ctx.fillStyle = '#fff8df'; ctx.fillRect(-10, -25, 19, 14);
    ctx.strokeStyle = '#c6cbb4'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-7, -21); ctx.lineTo(6, -21); ctx.moveTo(-7, -18); ctx.lineTo(3, -18); ctx.stroke();
    ctx.fillStyle = '#f0e6c9'; ctx.beginPath(); ctx.moveTo(-19, -7); ctx.lineTo(-14, -14); ctx.lineTo(16, -14); ctx.lineTo(21, -6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c8bea4'; ctx.beginPath(); ctx.roundRect(-19, -7, 40, 23, 3); ctx.fill();
    ctx.fillStyle = '#a1977f'; ctx.fillRect(15, -5, 6, 18);
    ctx.fillStyle = '#26352e'; ctx.fillRect(-14, 1, 24, 5);
    ctx.fillStyle = '#7c8874'; ctx.beginPath(); ctx.moveTo(-14, 6); ctx.lineTo(10, 6); ctx.lineTo(15, 20); ctx.lineTo(-19, 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#86efac'; ctx.beginPath(); ctx.moveTo(-11, 4); ctx.lineTo(7, 4); ctx.lineTo(9, 18); ctx.lineTo(-14, 18); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#15803d'; ctx.strokeRect(-8, 7, 13, 8);
    ctx.fillStyle = '#15803d'; ctx.beginPath(); ctx.ellipse(-1, 11, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#334155'; ctx.fillRect(12, -4, 4, 3);
    ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(14, -2.5, 1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8b816b'; ctx.beginPath(); ctx.moveTo(-15, -3); ctx.lineTo(-8, -3); ctx.moveTo(-15, -1); ctx.lineTo(-8, -1); ctx.stroke();
    ctx.restore(); return;
  }
  if (d.type === 'bell') {
    ctx.save(); ctx.translate(x, y);
    ctx.rotate(Math.sin(frame * 0.065) * 0.12);
    ctx.strokeStyle = `rgba(250, 204, 21, ${0.2 + (Math.sin(frame * 0.07) + 1) * 0.12})`;
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 23 + Math.sin(frame * 0.07) * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(0, 9, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#92400e'; ctx.fillRect(-13, 6, 26, 3);
    const brass = ctx.createLinearGradient(-12, 0, 12, 0);
    brass.addColorStop(0, '#a16207'); brass.addColorStop(0.45, '#fef08a'); brass.addColorStop(1, '#ca8a04');
    ctx.fillStyle = brass;
    ctx.beginPath(); ctx.moveTo(-13, 6); ctx.quadraticCurveTo(-8, 2, -8, -6); ctx.quadraticCurveTo(-8, -14, 0, -14); ctx.quadraticCurveTo(8, -14, 8, -6); ctx.quadraticCurveTo(8, 2, 13, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#facc15'; ctx.fillRect(-2, -12, 4, 4);
    ctx.strokeStyle = '#fef3c7'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(16, -9); ctx.lineTo(21, -13); ctx.moveTo(-16, -9); ctx.lineTo(-21, -13); ctx.stroke();
    ctx.restore(); return;
  }
  if (d.type === 'diamond') {
    ctx.save(); ctx.translate(x, y);
    ctx.globalAlpha *= 0.72;
    const angle = frame * 0.025 + d.x * 0.02;
    const project = (px: number, py: number, pz: number) => {
      const rx = px * Math.cos(angle) + pz * Math.sin(angle);
      const depth = -px * Math.sin(angle) + pz * Math.cos(angle);
      return { x: rx * 0.9, y: (py + depth * 0.28) * 0.9, depth };
    };
    const top = Array.from({ length: 8 }, (_, i) => project(Math.cos(i * Math.PI / 4) * 7, -11, Math.sin(i * Math.PI / 4) * 7));
    const rim = Array.from({ length: 8 }, (_, i) => project(Math.cos(i * Math.PI / 4) * 14, -3, Math.sin(i * Math.PI / 4) * 14));
    const tip = project(0, 16, 0);
    const faces = rim.flatMap((point, i) => {
      const next = (i + 1) % 8;
      return [
        { points: [top[i], top[next], rim[next], point], shade: 52 + Math.cos(i * Math.PI / 4 + angle) * 20 },
        { points: [point, rim[next], tip], shade: 43 + Math.cos(i * Math.PI / 4 + angle) * 18 },
      ];
    });
    faces.push({ points: top, shade: 88 });
    faces.sort((a, b) => a.points.reduce((sum, p) => sum + p.depth, 0) / a.points.length - b.points.reduce((sum, p) => sum + p.depth, 0) / b.points.length);
    for (const face of faces) {
      ctx.fillStyle = `hsl(197, 90%, ${face.shade}%)`;
      ctx.strokeStyle = 'rgba(215,245,255,0.45)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(face.points[0].x, face.points[0].y);
      for (const point of face.points.slice(1)) ctx.lineTo(point.x, point.y);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    const shine = 0.25 + Math.max(0, Math.sin(frame * 0.09 + d.x)) * 0.65;
    ctx.strokeStyle = `rgba(255,255,255,${shine})`; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(1, -9); ctx.moveTo(-3, -13); ctx.lineTo(-3, -5); ctx.stroke();
    ctx.restore(); return;
  }
  if (d.type === 'tender') {
    const phase = frame * 0.065 + d.x * 0.03;
    ctx.save(); ctx.translate(x, y + (d.vy === undefined ? Math.sin(phase) * 2 : 0)); ctx.scale(0.70, 0.70);
    if (d.vy !== undefined) ctx.rotate(d.rotation ?? 0);
    else if (frame > 0) ctx.rotate(phase);
    drawChickenTender(ctx);
    const shine = 0.35 + 0.65 * Math.max(0, Math.sin(frame * 0.12 + d.x * 0.03));
    ctx.strokeStyle = `rgba(255,235,150,${shine})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(2, -10);
    ctx.moveTo(-3, -15); ctx.lineTo(-3, -5); ctx.stroke();
    ctx.restore();
    return;
  }
  if (frame > 0 && d.type === 'banana') {
    const phase = frame * 0.065 + d.x * 0.03;
    ctx.save(); ctx.translate(x, y + Math.sin(phase) * 2);
    if (d.type === 'banana') ctx.rotate(phase);
    else ctx.scale(0.22 + Math.abs(Math.cos(phase)) * 0.78, 1);
    drawPickupAsset(ctx, d, 0, 0, 0);
    ctx.restore();
    const shine = Math.max(0, Math.sin(phase * 1.7));
    if (shine > 0.75) {
      ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${(shine - 0.75) * 2.5})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 5, y - 8); ctx.lineTo(x + 13, y - 8); ctx.moveTo(x + 9, y - 12); ctx.lineTo(x + 9, y - 4); ctx.stroke(); ctx.restore();
    }
    return;
  }
  if (d.type === 'bag' || d.type === 'banana') {
    ctx.save(); ctx.translate(x, y);
    if (d.type === 'bag') {
      ctx.fillStyle = '#b98b54';
      ctx.beginPath(); ctx.moveTo(-5, -12); ctx.lineTo(5, -12);
      ctx.bezierCurveTo(6, -3, 17, 10, 7, 14);
      ctx.lineTo(-7, 14); ctx.bezierCurveTo(-17, 10, -6, -3, -5, -12); ctx.fill();
      ctx.strokeStyle = '#654321'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-7, -6); ctx.lineTo(7, -6); ctx.stroke();
      ctx.strokeStyle = '#997044'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-4, -1); ctx.quadraticCurveTo(-7, 7, -4, 11);
      ctx.moveTo(4, 0); ctx.quadraticCurveTo(7, 8, 4, 12); ctx.stroke();
    } else {
      ctx.scale(0.78, 0.78);
      const peel = ctx.createLinearGradient(-9, -10, 9, 12);
      peel.addColorStop(0, '#fff1a6'); peel.addColorStop(0.45, '#f7c548'); peel.addColorStop(1, '#b77913');
      // Reference silhouette: full lower belly, pale concave inner edge,
      // short dark tip at left and upright green stem at right.
      ctx.beginPath(); ctx.moveTo(-16, -5);
      ctx.bezierCurveTo(-7, 0, 6, 4, 14, -9);
      ctx.bezierCurveTo(19, 6, 8, 14, -2, 12);
      ctx.bezierCurveTo(-10, 11, -15, 4, -16, -5);
      ctx.closePath(); ctx.fillStyle = peel; ctx.fill();
      ctx.strokeStyle = '#805113'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#fff2aa';
      ctx.beginPath(); ctx.moveTo(-15, -5);
      ctx.bezierCurveTo(-6, 0, 6, 4, 14, -9);
      ctx.lineTo(14, -3); ctx.bezierCurveTo(5, 8, -6, 4, -14, -1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#fff0a0'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(-12, 2); ctx.bezierCurveTo(-5, 11, 7, 13, 13, 3); ctx.stroke();
      ctx.fillStyle = '#fffbea';
      ctx.beginPath(); ctx.ellipse(5, 7, 3, 1, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#748c36'; ctx.beginPath(); ctx.moveTo(12, -8); ctx.lineTo(13, -16); ctx.lineTo(16, -16); ctx.lineTo(15, -8); ctx.fill();
      ctx.fillStyle = '#bed279'; ctx.fillRect(13.5, -15, 1.2, 5);
      ctx.strokeStyle = '#66522c'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-16, -5); ctx.lineTo(-14, -6); ctx.stroke();
    }
    ctx.restore(); return;
  }
      if (d.type === 'coin') {
        ctx.save();
        ctx.translate(x, y);

        const gold = ctx.createLinearGradient(-9, -10, 9, 10);
        gold.addColorStop(0, '#fff1a6');
        gold.addColorStop(0.45, '#f7c548');
        gold.addColorStop(1, '#b77913');
        ctx.fillStyle = '#805113';
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = gold;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff0a0';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#98600f';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(coinLetter, 0, 0.5);
        // Moving reflection across the face, without rotating or scaling the coin.
        const sweep = ((frame * 0.35 + d.x * 0.15) % 40) - 20;
        ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.clip();
        const reflection = ctx.createLinearGradient(sweep - 4, 0, sweep + 4, 0);
        reflection.addColorStop(0, 'rgba(255,255,255,0)');
        reflection.addColorStop(0.5, 'rgba(255,255,255,0.45)');
        reflection.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = reflection; ctx.fillRect(sweep - 4, -11, 8, 22); ctx.restore();

        ctx.restore();

      } else if (d.type === 'banknote') {
        // ULTRA-RARE BANKNOTES: STACK OF $100 CASH BILLS
        ctx.save();
        const floatBob = Math.sin(frame * 0.12 + d.x * 0.08) * 4.5;
        ctx.translate(x, y + floatBob);

        // Radiant emerald money aura
        const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
        aura.addColorStop(0, 'rgba(16, 185, 129, 0.65)');
        aura.addColorStop(0.6, 'rgba(52, 211, 153, 0.25)');
        aura.addColorStop(1, 'rgba(16, 185, 129, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();

        // 3D Stack of Banknotes
        // Shadow/bottom layer
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(-11, -5, 22, 13);

        // Mid banknote layer
        ctx.fillStyle = '#047857';
        ctx.fillRect(-12, -7, 22, 13);

        // Top crisp green $100 bill
        ctx.fillStyle = '#10b981';
        ctx.fillRect(-13, -9, 22, 13);
        ctx.strokeStyle = '#a7f3d0';
        ctx.lineWidth = 1;
        ctx.strokeRect(-13, -9, 22, 13);

        // Inner currency frame
        ctx.strokeStyle = '#065f46';
        ctx.strokeRect(-11, -7, 18, 9);

        // Golden paper strap around the stack
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-4, -9, 6, 13);
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-4, -9, 6, 13);

        // Dollar sign
        ctx.fillStyle = '#064e3b';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', -1, -2.5);

        // Sparkle glints
        const flare = Math.sin(frame * 0.2 + d.x * 0.1);
        if (flare > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(8, -8, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

      } else {
        // DIAMOND
        ctx.save();
        const floatBob = Math.sin(frame * 0.09 + d.x * 0.05) * 4.5;
        ctx.translate(x, y + floatBob);

        const aura = ctx.createRadialGradient(0, 0, 3, 0, 0, 22);
        aura.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
        aura.addColorStop(0.7, 'rgba(129, 140, 248, 0.25)');
        aura.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f0fdfa';
        ctx.beginPath();
        ctx.moveTo(-6, -5);
        ctx.lineTo(6, -5);
        ctx.lineTo(0, -14);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(-6, -5);
        ctx.lineTo(-13, -2);
        ctx.lineTo(0, -14);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#7dd3fc';
        ctx.beginPath();
        ctx.moveTo(6, -5);
        ctx.lineTo(13, -2);
        ctx.lineTo(0, -14);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.lineTo(-13, -2);
        ctx.lineTo(0, -5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#0369a1';
        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.lineTo(13, -2);
        ctx.lineTo(0, -5);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }
};

export const drawSwanAsset = (ctx: CanvasRenderingContext2D, s: Swan, white = false, darkMode = false): void => {
      if (s.kind === 'hawk') {
        ctx.save(); ctx.scale(0.8, 0.8);
        ctx.rotate(Math.sin(s.phase) * 0.025);
        const flap = Math.sin(s.phase) * 0.65;
        // Far wing and rounded, individually banded tail feathers.
        ctx.save(); ctx.translate(4, -3); ctx.rotate(-flap * 0.7);
        ctx.fillStyle = '#6d4935'; ctx.beginPath(); ctx.ellipse(12, -13, 9, 21, 0.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 ? '#9b7451' : '#765039';
          ctx.beginPath(); ctx.ellipse(21, 1 + i * 2, 13, 2.6, 0.15 + i * 0.04, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#50382c'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(25, i * 2); ctx.lineTo(24, 4 + i * 2); ctx.stroke();
        }
        const plumage = ctx.createLinearGradient(-10, -12, 9, 13);
        plumage.addColorStop(0, '#c29a6a'); plumage.addColorStop(0.45, '#936541'); plumage.addColorStop(1, '#563c2e');
        ctx.fillStyle = plumage; ctx.beginPath(); ctx.ellipse(0, 0, 18, 11, -0.08, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e5c9a0'; ctx.beginPath(); ctx.ellipse(-5, 5, 12, 7, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#a77b50'; ctx.lineWidth = 1.2;
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-11 + i * 4, 4); ctx.quadraticCurveTo(-10 + i * 4, 7, -8 + i * 4, 8); ctx.stroke(); }
        // Near wing hinges at the shoulder; primary feathers follow the flap.
        ctx.save(); ctx.translate(1, -3); ctx.rotate(flap);
        ctx.fillStyle = plumage; ctx.beginPath(); ctx.moveTo(-7, 1); ctx.bezierCurveTo(-8, -17, 4, -27, 14, -25); ctx.bezierCurveTo(21, -19, 13, -3, 6, 5); ctx.closePath(); ctx.fill();
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = i % 2 ? '#684733' : '#80583d';
          ctx.beginPath(); ctx.ellipse(7 + i * 2.6, -16 + i * 2, 2.8, 12 - i, 0.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = '#c49b6b'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-3, -3); ctx.quadraticCurveTo(1, -16, 11, -20); ctx.stroke(); ctx.restore();
        ctx.fillStyle = '#bb9365'; ctx.beginPath(); ctx.ellipse(-15, -6, 9, 8, -0.15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f0d5ac'; ctx.beginPath(); ctx.ellipse(-18, -2, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d8a334'; ctx.beginPath(); ctx.moveTo(-21, -5); ctx.quadraticCurveTo(-31, -5, -30, 1); ctx.quadraticCurveTo(-27, -1, -23, 1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#34302a'; ctx.beginPath(); ctx.moveTo(-29, -2); ctx.quadraticCurveTo(-33, 0, -29, 3); ctx.lineTo(-27, -1); ctx.fill();
        // Hawk carries the same chicken tender that it drops, held in its beak.
        if (!s.lootRolled) {
          ctx.save(); ctx.translate(-31, 2); ctx.rotate(0.18); ctx.scale(0.34, 0.34); drawChickenTender(ctx); ctx.restore();
        }
        ctx.fillStyle = '#f4c34d'; ctx.beginPath(); ctx.ellipse(-18, -8, 3, 2.7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#171b22'; ctx.beginPath(); ctx.arc(-19, -8, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-19.5, -8.8, 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#684733'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-22, -11); ctx.quadraticCurveTo(-17, -12, -14, -9); ctx.stroke();
        for (let hat = 0; hat < (s.fedoraHats ?? 0); hat++) {
          ctx.save(); ctx.translate(-17, -13 - hat * 10); ctx.scale(0.52, 0.52);
          drawCharacterHat(ctx, false, false, darkMode); ctx.restore();
        }
        ctx.restore(); return;
      }
      if (s.kind === 'white') {
        ctx.save();
        ctx.scale(1, -1);
        drawSwanAsset(ctx, { ...s, kind: 'swan', fedoraHats: 0 }, true, darkMode);
        ctx.restore();
        for (let hat = 0; hat < (s.fedoraHats ?? 0); hat++) {
          ctx.save(); ctx.translate(-13, 10 - hat * 6.4); ctx.scale(0.32, 0.32);
          drawCharacterHat(ctx, false, false, darkMode); ctx.restore();
        }
        return;
      }
      if (s.kind === 'pigeon') {
        ctx.save();
        ctx.rotate(s.isCharging ? -0.12 : Math.sin(s.phase) * 0.05);
        const feathers = ctx.createLinearGradient(-18, -18, 18, 20);
        feathers.addColorStop(0, '#cbd5e1'); feathers.addColorStop(1, '#64748b');
        // A single rounded body/tail silhouette avoids a pasted-on triangular join.
        ctx.fillStyle = feathers; ctx.beginPath(); ctx.moveTo(0, -20);
        ctx.bezierCurveTo(12, -20, 17, -9, 22, -2);
        ctx.bezierCurveTo(25, 2, 31, 6, 31, 10);
        ctx.quadraticCurveTo(30, 14, 25, 13);
        ctx.quadraticCurveTo(20, 12, 16, 15);
        ctx.bezierCurveTo(3, 28, -21, 20, -21, 1);
        ctx.bezierCurveTo(-21, -11, -12, -20, 0, -20); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#64748b'; ctx.lineWidth = 0.8;
        for (let feather = 0; feather < 3; feather++) {
          ctx.beginPath(); ctx.moveTo(17 + feather, 2 + feather * 3);
          ctx.quadraticCurveTo(23, 6 + feather * 2, 29 - feather, 10 + feather); ctx.stroke();
        }
        ctx.fillStyle = '#dbe4ec'; ctx.beginPath(); ctx.ellipse(-4, 9, 15, 11, -0.15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#648c85'; ctx.beginPath(); ctx.ellipse(-11, -7, 9, 6, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#a5b4c3'; ctx.beginPath(); ctx.arc(-13, -12, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e7b784'; ctx.beginPath(); ctx.moveTo(-20, -11); ctx.lineTo(-28, -7); ctx.lineTo(-20, -5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-16, -14, 4, 5, -0.15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(-18, -13, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-20, -20); ctx.lineTo(-12, -19); ctx.stroke();
        ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.moveTo(9, 3); ctx.quadraticCurveTo(0, -15 - Math.sin(s.phase) * 17, -10, -3); ctx.quadraticCurveTo(-6, 13, 9, 3); ctx.fill();
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(-4, -5); ctx.moveTo(5, -2); ctx.lineTo(0, -8); ctx.stroke();
        ctx.strokeStyle = '#d99a78'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-4, 19); ctx.lineTo(-6, 24); ctx.lineTo(-10, 24); ctx.moveTo(5, 20); ctx.lineTo(6, 24); ctx.lineTo(10, 24); ctx.stroke();
        for (let hat = 0; hat < (s.fedoraHats ?? 0); hat++) {
          ctx.save(); ctx.translate(-13, -18 - hat * 10); ctx.scale(0.52, 0.52);
          drawCharacterHat(ctx, false, false, darkMode); ctx.restore();
        }
        ctx.restore();
        return;
      }
      ctx.save();
      // Compact bird proportion relative to human
      ctx.scale(0.40, 0.40);
      const feathers = white ? '#f1f5f9' : '#090d16';
      const wing = white ? '#cbd5e1' : '#1e293b';

      if (s.isCharging) {
        // --- APPROACH / DIVE LUNGE POSTURE (RUSHING TOWARD THE PLAYER) ---
        ctx.fillStyle = feathers;
        ctx.beginPath();
        ctx.moveTo(26, 2);
        ctx.quadraticCurveTo(10, 14, -14, 8);
        ctx.quadraticCurveTo(-26, 2, -14, -6);
        ctx.quadraticCurveTo(6, -14, 26, 2);
        ctx.fill();

        // Stretched horizontal dart neck aiming directly at player
        ctx.strokeStyle = feathers;
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-10, 4);
        ctx.lineTo(-46, 2);
        ctx.stroke();

        // Head
        ctx.fillStyle = feathers;
        ctx.beginPath();
        ctx.ellipse(-46, 2, 7, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Sharp coral beak dart
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(-52, 0);
        ctx.lineTo(-68, 2);
        ctx.lineTo(-52, 4);
        ctx.closePath();
        ctx.fill();

        // Piercing flared red eye
        ctx.fillStyle = '#ff0033';
        ctx.beginPath();
        ctx.arc(-48, 1, 3.0, 0, Math.PI * 2);
        ctx.fill();

        // Wings swept back tightly in dive
        ctx.fillStyle = wing;
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(26, -18);
        ctx.lineTo(16, 6);
        ctx.closePath();
        ctx.fill();

        // Red & white speed streak lines trailing behind
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(32, 0);
        ctx.lineTo(56, 0);
        ctx.moveTo(26, -8);
        ctx.lineTo(48, -8);
        ctx.moveTo(24, 8);
        ctx.lineTo(44, 8);
        ctx.stroke();

      } else {
        // Normal swan cruise
        ctx.fillStyle = feathers;
        ctx.beginPath();
        ctx.moveTo(28, 4);
        ctx.quadraticCurveTo(12, 19, -16, 11);
        ctx.quadraticCurveTo(-34, 4, -18, -10);
        ctx.quadraticCurveTo(8, -19, 28, 4);
        ctx.fill();

        ctx.strokeStyle = feathers;
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-16, 3);
        ctx.bezierCurveTo(-42, -9, -15, -34, -32, -38);
        ctx.stroke();

        ctx.fillStyle = feathers;
        ctx.beginPath();
        ctx.ellipse(-33, -38, 8, 5.5, -0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(-38, -40);
        ctx.lineTo(-52, -36);
        ctx.lineTo(-38, -34);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ff0033';
        ctx.beginPath();
        ctx.arc(-34, -39, 2.2, 0, Math.PI * 2);
        ctx.fill();

        const wingFlap = -28 - Math.sin(s.phase) * 16;
        ctx.fillStyle = wing;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.quadraticCurveTo(2, wingFlap - 14, 32, wingFlap);
        ctx.lineTo(16, -5);
        ctx.closePath();
        ctx.fill();
      }
      for (let hat = 0; hat < (s.fedoraHats ?? 0); hat++) {
        ctx.save(); ctx.translate(s.isCharging ? -46 : -33, (s.isCharging ? -4 : -44) - hat * 16); ctx.scale(0.8, 0.8);
        drawCharacterHat(ctx, false, false, darkMode); ctx.restore();
      }
      ctx.restore();
      if (!s.lootRolled && !s.dead && !s.dying) {
        ctx.save();
        const beakX = (s.isCharging ? -68 : -52) * 0.4;
        const beakY = (s.isCharging ? 2 : -36) * 0.4;
        ctx.translate(beakX, beakY + 12);
        drawPickupAsset(ctx, { type: 'bag', x: 0, y: 0, taken: false }, 0, 0);
        ctx.restore();
      }

};
