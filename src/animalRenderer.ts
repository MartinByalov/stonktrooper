import { animalWeaponPose, bullGripShoulder } from './animalWeaponPose';
import { animalWalkPose } from './animalWalkPose';
import { drawAnimalTail } from './animalTailRenderer';
import { drawBlinkingEye } from './eyeAnimation';
import { whaleFlipperPose, quadrupedLegPose } from './mountPose';
// Browser game module for animalRenderer.
import { drawBaseballBat } from './batRenderer';
import { drawHeadHat } from './assetRenderer';
import type { Animal } from './types';
import { applyWhaleSwim } from './whaleRider';

export const ANIMAL_HEIGHT = 60;
export const ANIMAL_CENTER = 30;
export const animalHeight = (animal: Animal): number => animal.mount === 'whale' ? 115 : animal.mount ? 94 : ANIMAL_HEIGHT;

// Shared face geometry for upright characters and their four-legged mount variants.
export const drawAnimalHead = (ctx: CanvasRenderingContext2D, type: 'bear' | 'bull', charging = false, darkMode = false, drawHats?: () => void, coverHead = false): void => {
  const bear = type === 'bear';
  ctx.save();
  // Left-facing profile: the far attachment is smaller and behind the skull.
  // Mirroring the whole mount preserves this depth order for the hero's ride.
  if (bear) {
    ctx.fillStyle = '#5c3a21';
    ctx.beginPath(); ctx.ellipse(-5, -9, 3, 3.5, -.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#98704b';
    ctx.beginPath(); ctx.ellipse(-5, -9.5, 1.4, 1.8, -.2, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = darkMode ? '#bbae89' : '#a39474';
    ctx.beginPath(); ctx.moveTo(-5, -6); ctx.quadraticCurveTo(-12, -11, -9, -18);
    ctx.quadraticCurveTo(-8, -12, -1, -9); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = bear ? '#784c28' : '#883a24';
  ctx.beginPath(); ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
  // The hat rests on the skull; the near ear/horn emerges in front of it.
  if (!coverHead) drawHats?.();
  if (bear) {
    ctx.fillStyle = '#784c28';
    ctx.beginPath(); ctx.ellipse(5, -8, 4, 4.5, .15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b48a60'; ctx.beginPath(); ctx.ellipse(5, -8, 2, 2.5, .15, 0, Math.PI * 2); ctx.fill();
  } else {
    // Near horn roots in the temple, not at the opposite end of a frontal rack.
    ctx.fillStyle = darkMode ? '#fef3c7' : '#e8d9b5';
    // Original upright horn silhouette; hats must fit the head, not reshape it.
    ctx.beginPath(); ctx.moveTo(7, -4); ctx.quadraticCurveTo(13, -10, 9, -20);
    ctx.quadraticCurveTo(10, -12, 4, -8); ctx.lineTo(7, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#883a24';
    ctx.beginPath(); ctx.ellipse(8, -4, 3, 2, -.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = bear ? '#b48a60' : '#b86242';
  ctx.beginPath(); ctx.ellipse(-10, 4, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#090d16';
  ctx.beginPath(); ctx.arc(-16, 2.5, 2, 0, Math.PI * 2); ctx.fill();
  drawBlinkingEye(ctx,-6.5,-1.5,()=>{
    ctx.fillStyle = charging ? '#ff0033' : '#ffffff';
    ctx.beginPath(); ctx.arc(-6.5, -1.5, 1.5, 0, Math.PI * 2); ctx.fill();
  },bear?6:7);
  // Profile mouth follows the muzzle, shared by upright and mounted animals.
  ctx.save(); ctx.translate(-10, 6.5); ctx.rotate(-.12);
  const mouthWidth = charging ? 4 : 2.3;
  const mouthHeight = charging ? 2.8 : 1.4;
  ctx.fillStyle = '#351719';
  ctx.beginPath(); ctx.ellipse(0, 0, mouthWidth, mouthHeight, 0, 0, Math.PI * 2); ctx.fill();
  ctx.clip();
  if (charging) {
    // Lower tongue stays inside the opening; the ivory tooth hangs from the upper lip.
    ctx.fillStyle = '#c84b50';
    ctx.beginPath(); ctx.ellipse(.7, 2.1, 2.6, 1.1, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#fff4de';
  ctx.beginPath(); ctx.roundRect(-2.3, -mouthHeight-.2, charging ? 2 : 1.4, charging ? 2.2 : 1.2, .45); ctx.fill();
  ctx.restore();
  if (coverHead) drawHats?.();
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

// Shared bear/bull mount model for enemy riders and the mounted hero.
export function drawAnimalMount(ctx: CanvasRenderingContext2D, animal: Animal, darkMode = false, mountPreview = false, hatSkin = 'hats-classic', captain = false): void {
  const kind = animal.mount;
  if (kind !== 'bear' && kind !== 'bull') return;
  ctx.save();
  const fur = kind === 'bear' ? '#784c28' : '#883a24';
  const dark = kind === 'bear' ? '#5c3a21' : '#632515';
  const tuck = Math.min(1, (animal.jumpAmount ?? 0) / 25);
  ctx.lineCap = 'round';
  for (const near of [false, true]) {
    if (near) {
      drawAnimalTail(ctx, kind === 'bear', animal.phase, 28, -31);
      ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(0, -29, 31, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(-28, animal.isCharging ? -34 : -37);
      if (animal.isCharging) ctx.rotate(-0.2);
      drawAnimalHead(ctx, kind, animal.isCharging, darkMode, () => {
        if (captain) {
          drawHeadHat(ctx,kind,true,darkMode);
        }
        for (let hat = 0; hat < (animal.mountFedoraHats ?? 0); hat++) {
          drawHeadHat(ctx,kind,false,darkMode,hatSkin,animal.phase,hat,false,hat === (animal.mountFedoraHats ?? 0)-1);
        }
      }, hatSkin === 'hats-paper' && (animal.mountFedoraHats ?? 0) > 0);
      ctx.restore();
    }
    for (const side of [-1, 1]) {
      const leg = quadrupedLegPose(animal.phase, near, side === -1, tuck > 0, kind, tuck);
      const color = near ? fur : dark;
      // Tapered connected limbs, with independent fore/hind joint directions.
      ctx.strokeStyle = color; ctx.lineWidth = kind === 'bear' ? 9 : 8;
      ctx.beginPath(); ctx.moveTo(leg.hip.x, leg.hip.y); ctx.lineTo(leg.joint.x, leg.joint.y); ctx.stroke();
      ctx.lineWidth = kind === 'bear' ? 6 : 5;
      ctx.beginPath(); ctx.moveTo(leg.joint.x, leg.joint.y); ctx.lineTo(leg.foot.x, leg.foot.y); ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(leg.joint.x, leg.joint.y, 3.5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      // Broad plantigrade bear paws versus compact, split bull hooves.
      ctx.fillStyle = kind === 'bear' ? (near ? '#49301e' : '#382519') : '#292321';
      ctx.beginPath(); ctx.ellipse(leg.foot.x - 2, leg.foot.y, kind === 'bear' ? 6 : 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = kind === 'bear' ? '#c9b599' : '#72645a'; ctx.lineWidth = 1;
      if (kind === 'bear') {
        for (const toe of [-1.5, 0, 1.5]) {
          ctx.beginPath(); ctx.moveTo(leg.foot.x - 6, leg.foot.y + toe); ctx.lineTo(leg.foot.x - 7.5, leg.foot.y + toe); ctx.stroke();
        }
      } else {
        ctx.beginPath(); ctx.moveTo(leg.foot.x - 3, leg.foot.y); ctx.lineTo(leg.foot.x - 3, leg.foot.y + 2); ctx.stroke();
      }
    }
  }
  ctx.restore();
}

// Left profile faces the runner; far limbs render first, near left arm last.
export const drawAnimalCharacter = (ctx: CanvasRenderingContext2D, animal: Animal, loweredBat = false, seated = false, darkMode = false, previewBatForward = false, whaleRider = false, whaleSwimApplied = false, mountPreview = false, hatSkin = 'hats-classic'): void => {
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
      drawAnimalCharacter(ctx, { ...animal, type: 'whale', mount: undefined, fedoraHats: animal.mountFedoraHats, phase: 0, jumpAmount: 0 }, false, false, darkMode, false, false, false, false, hatSkin);
      ctx.translate(0, -55);
      drawAnimalCharacter(ctx, { ...animal, mount: undefined }, loweredBat, true, darkMode, previewBatForward, true, false, false, hatSkin);
      ctx.restore();
      return;
    }
    ctx.save();
    drawAnimalMount(ctx, animal, darkMode, mountPreview, hatSkin);
    ctx.translate(2, -38);
    drawAnimalCharacter(ctx, { ...animal, mount: undefined }, loweredBat, true, darkMode, previewBatForward, false, false, false, hatSkin);
    ctx.restore();
    return;
  }
  if (animal.type === 'whale') {
    ctx.save();
    const leap = Math.min(1, (animal.jumpAmount ?? 0) / 40);
    ctx.rotate(-leap * 0.12);
    ctx.scale(1 + leap * 0.04, 1 - leap * 0.06);
    if (!whaleSwimApplied) applyWhaleSwim(ctx, animal.phase);
    const fins=whaleFlipperPose(animal.phase,(animal.jumpAmount??0)>0);
    // Far flipper is occluded by the body, but its moving tip remains visible.
    {
      ctx.save();ctx.translate(-8,-24);ctx.rotate(fins.far);
      ctx.fillStyle='#234a68';ctx.beginPath();ctx.moveTo(0,0);
      ctx.bezierCurveTo(10,2,24,14,20,21);
      ctx.quadraticCurveTo(11,23,0,0);ctx.fill();ctx.restore();
    }
    const skin = ctx.createLinearGradient(0, -57, 0, -4);
    skin.addColorStop(0, '#688baf'); skin.addColorStop(0.45, '#344c73'); skin.addColorStop(1, '#172b48');
    ctx.fillStyle = skin;
    ctx.beginPath();
    // Sperm-whale silhouette: tall blunt forehead, long lower jaw, narrow tail stock.
    ctx.moveTo(-47, -20);
    ctx.bezierCurveTo(-49, -32, -50, -51, -43, -56);
    ctx.bezierCurveTo(-29, -63, -7, -58, 7, -46);
    // Dorsal fin, tail stock and flukes belong to one continuous skin contour.
    ctx.quadraticCurveTo(12,-42,16,-44);
    ctx.quadraticCurveTo(21,-44,26,-34);
    ctx.quadraticCurveTo(40,-29,49,-34);
    ctx.quadraticCurveTo(59,-39,65,-48 + Math.sin(animal.phase)*5);
    ctx.quadraticCurveTo(72,-32,56,-27);
    ctx.quadraticCurveTo(74,-23,68,-12);
    ctx.quadraticCurveTo(53,-15,43,-25);
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
    drawBlinkingEye(ctx,-22,-30,()=>{
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(-22, -30, 4.5, 3, -0.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath(); ctx.arc(-24, -30, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-24.5, -31, 0.7, 0, Math.PI * 2); ctx.fill();
    },8);
    ctx.strokeStyle = '#1e4b6b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-45, -20); ctx.quadraticCurveTo(-23, -17, 5, -20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-28, -36); ctx.quadraticCurveTo(-22, -39, -16, -34); ctx.stroke();
    // Pleated throat, near flipper, dorsal fin and blowhole.
    ctx.strokeStyle = '#5c9fb9'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(-29 + i * 7, -18); ctx.quadraticCurveTo(-22 + i * 7, -9, -8 + i * 7, -12); ctx.stroke();
    }
    // Fade the near flipper's broad root into the body; no closing seam at its base.
    ctx.save();ctx.translate(-5,-25);ctx.rotate(fins.near);ctx.translate(5,25);
    const flipper = ctx.createLinearGradient(0,-25,16,1);
    flipper.addColorStop(0,'#344c7300'); flipper.addColorStop(.35,'#344c73'); flipper.addColorStop(1,'#235c83');
    ctx.fillStyle = flipper;
    ctx.beginPath(); ctx.moveTo(-5,-25);
    ctx.bezierCurveTo(5,-25,9,-17,16,-10);
    ctx.quadraticCurveTo(26,-1,18,1);
    ctx.quadraticCurveTo(5,-1,-2,-16); ctx.quadraticCurveTo(-3,-21,-5,-25);
    ctx.closePath(); ctx.fill();ctx.restore();
    ctx.fillStyle = '#16394c'; ctx.beginPath(); ctx.ellipse(-35, -56, 3, 1.5, -0.2, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < (animal.fedoraHats ?? 0); i++) {
      drawHeadHat(ctx,'whale',false,darkMode,hatSkin,animal.phase,i,false,i === (animal.fedoraHats ?? 0)-1);
    }
    ctx.restore();
    return;
  }
  const bear = animal.type === 'bear';
  const fur = bear ? '#784c28' : '#883a24';
  const darkFur = bear ? '#5c3a21' : '#632515';
  const muzzle = bear ? '#b48a60' : '#b86242';
  const tuck = seated ? 0 : Math.min(1, (animal.jumpAmount ?? 0) / 25);
  const bob = Math.abs(Math.cos(animal.phase)) * 1.5;
  const attack = animal.attackTimer ?? 0;
  const weapon = animalWeaponPose(bear, animal.phase, attack, loweredBat, previewBatForward);
  const drawGripArm = (near: boolean) => {
    const hand = near ? weapon.near : weapon.far;
    const shoulder = bear ? { x: near ? 0 : -9, y: -43 - bob + (near ? 1 : -1) } : bullGripShoulder(animal.phase, near);
    ctx.strokeStyle = near ? fur : darkFur; ctx.lineWidth = near ? 9 : 7;
    ctx.beginPath(); ctx.moveTo(shoulder.x, shoulder.y);
    if (bear) {
      // Keep the visible left elbow compact instead of extending below the waist.
      ctx.lineTo((shoulder.x + hand.x) / 2 + (near ? 3 : -3), Math.max(shoulder.y, hand.y) + (near ? 3 : 4));
    } else {
      // Carry the lowered bat with extended arms; only bend during a swing.
      const dx = hand.x - shoulder.x, dy = hand.y - shoulder.y;
      const distance = Math.hypot(dx, dy);
      const length = near ? 16.5 : 19;
      const bend = attack > 0 && !loweredBat ? Math.sqrt(Math.max(0, length * length - distance * distance / 4)) : 0;
      ctx.lineTo(shoulder.x + dx / 2 + dy / distance * bend, shoulder.y + dy / 2 - dx / distance * bend);
    }
    ctx.lineTo(hand.x, hand.y); ctx.stroke();
  };
  ctx.save();
  // Lower the hips onto the whale's back, not just the tips of long legs.
  if (whaleRider) ctx.translate(0, 20);
  ctx.lineCap = 'round';
  // Thick bent limbs must not use the canvas default miter join: it creates
  // triangular spikes at recovering knees and elbows beside the rump.
  ctx.lineJoin = 'round';

  // Left-facing profile: the tail grows from the rear hip, behind the body.
  drawAnimalTail(ctx, bear, animal.phase, 8, -26);

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
    if (!seated) {
      const leg = animalWalkPose(animal.phase, side === 1, tuck, animal.isCharging);
      ctx.strokeStyle = side === -1 ? darkFur : fur; ctx.lineWidth = side === -1 ? 8 : 9;
      ctx.beginPath(); ctx.moveTo(leg.hip.x, leg.hip.y);
      ctx.lineTo(leg.knee.x, leg.knee.y); ctx.lineTo(leg.foot.x, leg.foot.y); ctx.stroke();
      ctx.fillStyle = '#1e1b18';
      ctx.beginPath(); ctx.ellipse(leg.foot.x - 2, leg.foot.y, 6, 2, 0, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    const swing = 0;
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

  // Far arm stays behind the torso while holding the second weapon grip.
  drawGripArm(false);

  // Vertical torso and belly: not the old horizontal quadruped silhouette.
  const bodyShade = ctx.createLinearGradient(-13, 0, 13, 0);
  bodyShade.addColorStop(0, darkFur);
  bodyShade.addColorStop(0.5, fur);
  bodyShade.addColorStop(1, darkFur);
  ctx.fillStyle = bodyShade;
  // One continuous back/rump/abdomen silhouette, not overlapping torso and
  // pelvis ovals. The lower edge masks both thigh roots throughout the gait;
  // the rear contour tapers into the hip instead of protruding as a separate lobe.
  ctx.beginPath(); ctx.moveTo(-7, -51);
  ctx.bezierCurveTo(4, -53, 11, -44, 11, -35);
  ctx.bezierCurveTo(11, -28, 10, -22, 7, -19);
  ctx.bezierCurveTo(4, -16, -3, -16, -7, -19);
  ctx.bezierCurveTo(-12, -22, -15, -29, -15, -36);
  ctx.bezierCurveTo(-15, -43, -13, -49, -7, -51);
  ctx.closePath(); ctx.fill();
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
  drawAnimalHead(ctx, animal.type, animal.isCharging, darkMode, () => {
    for (let hat = 0; hat < (animal.fedoraHats ?? 0); hat++) {
      drawHeadHat(ctx,bear?'bear':'bull',false,darkMode,hatSkin,animal.phase,hat,false,hat === (animal.fedoraHats ?? 0)-1);
    }
  }, hatSkin === 'hats-paper' && (animal.fedoraHats ?? 0) > 0);
  ctx.restore();

  if (bear) {
    // Front wrap handle and rear trigger grip are held by separate hands.
    ctx.save();
    ctx.translate(weapon.x, weapon.y);
    ctx.rotate(weapon.angle);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 3;
    ctx.strokeRect(-7, -9, 13, 10);
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(-10, 0, 23, 15);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(4, 3, 7, 9);
    // Rear trigger handle is separate from the forward wrap-around handle.
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 3;
    ctx.strokeRect(10, 1, 10, 10);
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
    ctx.save();
    ctx.translate(weapon.x, weapon.y);
    ctx.rotate(weapon.angle);
    drawBaseballBat(ctx);
    ctx.restore();
  }
  // Far wrist emerges from behind the weapon; the near forearm crosses in front.
  for (const near of [false, true]) {
    if (near) drawGripArm(true);
    const hand = near ? weapon.near : weapon.far;
    ctx.save(); ctx.translate(hand.x, hand.y); ctx.rotate(weapon.angle);
    ctx.fillStyle = near ? fur : darkFur;
    ctx.beginPath(); ctx.ellipse(0, 0, near ? 4.2 : 3.5, near ? 3.2 : 2.8, 0, 0, Math.PI * 2); ctx.fill();
    if (!bear) {
      // Thumb curls across the grip; the fingers encircle it, not float beside it.
      ctx.fillStyle = near ? fur : darkFur;
      ctx.beginPath(); ctx.ellipse(-2.3, -1.8, 2.2, 1.7, -.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = muzzle; ctx.lineWidth = .7;
    ctx.beginPath(); ctx.moveTo(-2, -.8); ctx.lineTo(2, -.8); ctx.moveTo(-2, 1); ctx.lineTo(2, 1); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
};