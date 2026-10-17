// Browser game module for animalRenderer.
import { drawBaseballBat } from './batRenderer';
import { drawCharacterHat } from './assetRenderer';
import type { Animal } from './types';
import { applyWhaleSwim } from './whaleRider';

export const ANIMAL_HEIGHT = 60;
export const ANIMAL_CENTER = 30;
export const animalHeight = (animal: Animal): number => animal.mount === 'whale' ? 115 : animal.mount ? 94 : ANIMAL_HEIGHT;

// Shared face geometry for upright characters and their four-legged mount variants.
export const drawAnimalHead = (ctx: CanvasRenderingContext2D, type: 'bear' | 'bull', charging = false, darkMode = false): void => {
  const bear = type === 'bear';
  ctx.save();
  ctx.fillStyle = bear ? '#784c28' : '#883a24';
  ctx.beginPath(); ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
  if (bear) {
    ctx.beginPath(); ctx.arc(-8, -8, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b48a60'; ctx.beginPath(); ctx.arc(-8, -8, 2, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.strokeStyle = darkMode ? '#fef3c7' : '#000000'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-7, -6); ctx.quadraticCurveTo(-17, -9, -15, -16);
    ctx.moveTo(6, -6); ctx.quadraticCurveTo(15, -10, 11, -16); ctx.stroke();
  }
  ctx.fillStyle = bear ? '#b48a60' : '#b86242';
  ctx.beginPath(); ctx.ellipse(-10, 4, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#090d16'; ctx.fillRect(-18, 1, 4, 3);
  ctx.fillStyle = charging ? '#ff0033' : '#ffffff'; ctx.fillRect(-8, -3, 3, 3);
  if (charging) {
    ctx.fillStyle = '#dc2626'; ctx.fillRect(-14, 5, 8, 4);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-13, 5, 2, 2);
  }
  ctx.restore();
};

const drawDyingAnimal = (ctx: CanvasRenderingContext2D, animal: Animal, darkMode: boolean): void => {
  const bear = animal.type === 'bear';
  const fur = bear ? '#784c28' : '#883a24';
  const muzzle = bear ? '#b48a60' : '#b86242';
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = fur; ctx.lineWidth = 9;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * 6, -22);
    ctx.lineTo(side * 11, -12); ctx.lineTo(side * 14, -3); ctx.stroke();
    ctx.fillStyle = '#1e1b18'; ctx.fillRect(side * 14 - 5, -4, 10, 4);
  }
  ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(0, -36, 17, 19, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = muzzle; ctx.beginPath(); ctx.ellipse(0, -34, 9, 12, 0, 0, Math.PI * 2); ctx.fill();
  for (const side of [-1, 1]) {
    const handY = -65;
    ctx.strokeStyle = fur; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(side * 13, -45); ctx.lineTo(side * 24, -54); ctx.lineTo(side * 29, handY + 4); ctx.stroke();
    ctx.fillStyle = muzzle;
    ctx.beginPath(); ctx.roundRect(side * 29 - 5, handY, 10, 9, 3); ctx.fill();
    // One extended central finger above the closed fist, readable while spinning.
    ctx.beginPath(); ctx.roundRect(side * 29 - 2, handY - 13, 4, 16, 2); ctx.fill();
    ctx.strokeStyle = fur; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(side * 29 - 2, handY - 13, 4, 16, 2); ctx.stroke();
    ctx.strokeStyle = fur; ctx.lineWidth = 0.8;
    for (const offset of [-3, 1, 3]) {
      ctx.beginPath(); ctx.moveTo(side * 29 + offset, handY + 4); ctx.lineTo(side * 29 + offset, handY + 7); ctx.stroke();
    }
  }
  ctx.fillStyle = fur;
  ctx.beginPath(); ctx.ellipse(0, -55, 13, 12, 0, 0, Math.PI * 2); ctx.fill();
  for (const side of [-1, 1]) {
    if (bear) {
      ctx.beginPath(); ctx.arc(side * 10, -65, 4, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = darkMode ? '#fef3c7' : '#000000'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(side * 9, -62); ctx.quadraticCurveTo(side * 20, -65, side * 16, -74); ctx.stroke();
    }
  }
  ctx.fillStyle = muzzle; ctx.beginPath(); ctx.ellipse(0, -51, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#090d16'; ctx.beginPath(); ctx.ellipse(0, -53, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#090d16'; ctx.lineWidth = 1.5;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * 6 - 2, -60); ctx.lineTo(side * 6 + 2, -56);
    ctx.moveTo(side * 6 + 2, -60); ctx.lineTo(side * 6 - 2, -56); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-4, -47); ctx.quadraticCurveTo(0, -44, 4, -47); ctx.stroke();
  ctx.restore();
};

// Left profile faces the runner; far limbs render first, near left arm last.
export const drawAnimalCharacter = (ctx: CanvasRenderingContext2D, animal: Animal, loweredBat = false, seated = false, darkMode = false, previewBatForward = false, whaleRider = false, whaleSwimApplied = false): void => {
  // Falling/death pose always takes precedence over mounts and weapon attacks.
  if (animal.dying && animal.type !== 'whale') {
    drawDyingAnimal(ctx, animal, darkMode);
    return;
  }
  if (animal.mount) {
    if (animal.mount === 'whale') {
      ctx.save();
      // Move rider and whale together so the seat stays on the animated back.
      ctx.translate(0, -Math.max(0, Math.sin(animal.phase)) * 11);
      ctx.rotate(Math.sin(animal.phase) * 0.11);
      drawAnimalCharacter(ctx, { ...animal, type: 'whale', mount: undefined, fedoraHats: animal.mountFedoraHats, phase: 0, jumpAmount: 0 }, false, false, darkMode);
      ctx.translate(0, -55);
      drawAnimalCharacter(ctx, { ...animal, mount: undefined }, loweredBat, true, darkMode, previewBatForward, true);
      ctx.restore();
      return;
    }
    ctx.save();
    const fur = animal.mount === 'bear' ? '#784c28' : '#883a24';
    const dark = animal.mount === 'bear' ? '#5c3a21' : '#632515';
    const tuck = Math.min(1, (animal.jumpAmount ?? 0) / 25);
    ctx.lineCap = 'round';
    for (const near of [false, true]) {
      if (near) {
        ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(0, -29, 31, 16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(-28, animal.isCharging ? -34 : -37);
        if (animal.isCharging) ctx.rotate(-0.2);
        drawAnimalHead(ctx, animal.mount, animal.isCharging, darkMode);
        for (let hat = 0; hat < (animal.mountFedoraHats ?? 0); hat++) {
          ctx.save(); ctx.translate(0, -7 - hat * 10); ctx.scale(0.65, 0.65);
          drawCharacterHat(ctx, false, false, darkMode); ctx.restore();
        }
        ctx.restore();
        ctx.strokeStyle = fur; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(27, -31); ctx.quadraticCurveTo(43, -25, 36, -14); ctx.stroke();
      }
      for (const side of [-1, 1]) {
        const swing = Math.sin(animal.phase + (near ? 0 : Math.PI) + side) * 7 * (1 - tuck);
        ctx.strokeStyle = near ? fur : dark; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(side * 20, -26); ctx.lineTo(side * 20 + swing, -13); ctx.lineTo(side * 20 - swing, -3 - tuck * 10); ctx.stroke();
      }
    }
    ctx.translate(2, -38);
    drawAnimalCharacter(ctx, { ...animal, mount: undefined }, loweredBat, true, darkMode, previewBatForward);
    ctx.restore();
    return;
  }
  if (animal.type === 'whale') {
    ctx.save();
    const leap = Math.min(1, (animal.jumpAmount ?? 0) / 40);
    ctx.rotate(-leap * 0.12);
    ctx.scale(1 + leap * 0.04, 1 - leap * 0.06);
    if (!whaleSwimApplied) applyWhaleSwim(ctx, animal.phase);
    const skin = ctx.createLinearGradient(0, -57, 0, -4);
    skin.addColorStop(0, '#688baf'); skin.addColorStop(0.45, '#344c73'); skin.addColorStop(1, '#172b48');
    ctx.fillStyle = skin;
    ctx.beginPath();
    // Sperm-whale silhouette: tall blunt forehead, long lower jaw, narrow tail stock.
    ctx.moveTo(-47, -20);
    ctx.bezierCurveTo(-49, -32, -50, -51, -43, -56);
    ctx.bezierCurveTo(-29, -63, -7, -58, 7, -46);
    ctx.bezierCurveTo(20, -37, 30, -31, 44, -29);
    ctx.bezierCurveTo(32, -22, 22, -14, 5, -9);
    ctx.bezierCurveTo(-18, -1, -43, -8, -47, -20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1e4b6b'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#a6bdca';
    ctx.beginPath();
    ctx.moveTo(-44, -19); ctx.quadraticCurveTo(-12, -21, 27, -19);
    ctx.quadraticCurveTo(-8, 3, -37, -11); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#344c73';
    ctx.beginPath();
    ctx.moveTo(33, -30);
    ctx.quadraticCurveTo(55, -35, 65, -48 + Math.sin(animal.phase) * 5);
    ctx.quadraticCurveTo(72, -32, 56, -27);
    ctx.quadraticCurveTo(74, -23, 68, -12);
    ctx.quadraticCurveTo(48, -17, 33, -30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(-22, -30, 4.5, 3, -0.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath(); ctx.arc(-24, -30, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-24.5, -31, 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1e4b6b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-45, -20); ctx.quadraticCurveTo(-23, -17, 5, -20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-28, -36); ctx.quadraticCurveTo(-22, -39, -16, -34); ctx.stroke();
    // Pleated throat, near flipper, dorsal fin and blowhole.
    ctx.strokeStyle = '#5c9fb9'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(-29 + i * 7, -18); ctx.quadraticCurveTo(-22 + i * 7, -9, -8 + i * 7, -12); ctx.stroke();
    }
    ctx.fillStyle = '#235c83';
    ctx.beginPath(); ctx.moveTo(3, -22); ctx.quadraticCurveTo(30, -7, 18, 1); ctx.quadraticCurveTo(5, -1, -2, -16); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, -42); ctx.quadraticCurveTo(19, -50, 26, -34); ctx.fill();
    ctx.fillStyle = '#16394c'; ctx.beginPath(); ctx.ellipse(-35, -56, 3, 1.5, -0.2, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < (animal.fedoraHats ?? 0); i++) {
      // Tilt each stacked hat around its resting point on the whale's head.
      ctx.save(); ctx.translate(-26, -51 - i * 12); ctx.rotate(-0.1); ctx.scale(0.85, 0.85);
      drawCharacterHat(ctx, false, false, darkMode);
      ctx.restore();
    }
    ctx.restore();
    return;
  }
  const bear = animal.type === 'bear';
  const fur = bear ? '#784c28' : '#883a24';
  const darkFur = bear ? '#5c3a21' : '#632515';
  const muzzle = bear ? '#b48a60' : '#b86242';
  const tuck = seated ? 0 : Math.min(1, (animal.jumpAmount ?? 0) / 25);
  const stride = Math.sin(animal.phase) * (1 - tuck * 0.7);
  const bob = Math.abs(Math.cos(animal.phase)) * 1.5;
  const attack = animal.attackTimer ?? 0;
  const attacking = !bear && attack > 0;
  const handX = bear ? -18 : attacking ? -17 : -4 - stride * 8;
  const handY = bear ? -34 + Math.sin(animal.phase * 1.5) * 11 : attacking ? -40 : -27 - bob;
  ctx.save();
  // Lower the hips onto the whale's back, not just the tips of long legs.
  if (whaleRider) ctx.translate(0, 20);
  ctx.lineCap = 'round';

  // Whale riders sit with short thighs pointing forward and bent knees.
  // The ordinary walking and four-legged mount poses remain unchanged.
  for (const side of [-1, 1]) {
    if (whaleRider) {
      const far = side === -1;
      const kneeX = far ? -15 : -19;
      const kneeY = far ? -23 : -20;
      const footX = far ? -12 : -16;
      const footY = far ? -10 : -6;
      ctx.strokeStyle = far ? darkFur : fur;
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(side * 3, -26); ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, footY - 3); ctx.stroke();
      ctx.fillStyle = '#1e1b18';
      ctx.fillRect(footX - 7, footY - 4, 10, 4);
      continue;
    }
    const swing = seated ? 0 : stride * side * (animal.isCharging ? 9 : 6);
    ctx.strokeStyle = side === -1 ? darkFur : fur;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(side * 2, -22);
    ctx.lineTo(side * 2 + swing * 0.5 - 2 + (seated ? side * 9 : 0), -12 - tuck * 4);
    ctx.lineTo(side * 2 + swing + (seated ? side * 13 : 0), -3 - tuck * 10);
    ctx.stroke();
    ctx.fillStyle = '#1e1b18';
    ctx.fillRect(side * 2 + swing - 7 + (seated ? side * 13 : 0), -4 - tuck * 10, 10, 4);
  }

  // Back arm swings opposite the front arm.
  ctx.strokeStyle = darkFur;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-4, -43 - bob);
  ctx.lineTo(2 + stride * 5, -34 - bob);
  ctx.lineTo(2 + stride * 8, -26 - bob);
  ctx.stroke();

  // Vertical torso and belly: not the old horizontal quadruped silhouette.
  const bodyShade = ctx.createLinearGradient(-13, 0, 13, 0);
  bodyShade.addColorStop(0, darkFur);
  bodyShade.addColorStop(0.5, fur);
  bodyShade.addColorStop(1, darkFur);
  ctx.fillStyle = bodyShade;
  ctx.beginPath();
  ctx.ellipse(-2, -35, 13, 18, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // Broad deltoid and chest, tapering to a smaller waist in side profile.
  ctx.beginPath();
  ctx.ellipse(-5, -43, 12, 10, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = muzzle;
  ctx.beginPath();
  ctx.ellipse(-7, -33, 4, 11, -0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(-5, -51);
  drawAnimalHead(ctx, animal.type, animal.isCharging, darkMode);
  for (let hat = 0; hat < (animal.fedoraHats ?? 0); hat++) {
    ctx.save(); ctx.translate(0, -7 - hat * 10); ctx.scale(0.7, 0.7);
    drawCharacterHat(ctx, false, false, darkMode); ctx.restore();
  }
  ctx.restore();

  ctx.strokeStyle = fur;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-4, -43);
  ctx.lineTo(attacking ? -18 : -4 - stride * 5, -35 - bob);
  ctx.lineTo(handX, handY);
  ctx.stroke();
  ctx.fillStyle = darkFur;
  ctx.beginPath();
  ctx.arc(handX, handY, 4, 0, Math.PI * 2);
  ctx.fill();
  if (bear) {
    // Chainsaw is held in the near hand, with its guide bar facing the runner.
    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(Math.sin(animal.phase * 1.5) * 0.18);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 3;
    ctx.strokeRect(-7, -9, 13, 10);
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(-10, 0, 23, 15);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(4, 3, 7, 9);
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(-43, 3, 35, 9, 4);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let tooth = 0; tooth < 7; tooth++) {
      const x = -40 + tooth * 4;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(x, 1, 2, 3);
      ctx.fillRect(x + 1, 11, 2, 3);
    }
    ctx.restore();
  } else {
    // Raised wind-up, then a fast leftward strike, followed by recovery.
    const angle = attack > 10 ? 0.7 : attack >= 5 ? 0.7 - (11 - attack) / 6 * 2.8 : -2.1;
    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(previewBatForward ? -Math.PI / 2 + 0.2 : loweredBat ? Math.PI - 0.25 : attacking ? angle : -0.3 + Math.sin(animal.phase * 1.5) * 0.65);
    drawBaseballBat(ctx);
    ctx.restore();
  }
  ctx.restore();
};