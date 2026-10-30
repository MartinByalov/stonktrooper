// Browser game module for assetRenderer.
import type { Pickup, Swan } from './types';
import { drawChickenTender } from './tenderRenderer';
import { drawSpinningFedora } from './fedoraRenderer';
import { hatMetrics, hatItemPose, hatBirdGrip } from './hatPose';
import { HEAD_HAT_CONTACTS, PAPER_HEAD_BOUNDS, headHatContact, hatArtworkContact, hatContactContext, type HatHead } from './hatContact';
import { drawPigeonWing } from './pigeonWingRenderer';
export { hatMetrics } from './hatPose';
import { drawWhaleRiderArm, drawWhaleRiderLeg } from './whaleRider';
import { skinColors } from './modelColors';
import { drawNovelHat, drawEquippedBag, drawSuitPreview, drawShoe, suitShirtColor } from './cosmeticModels';

// Shared equipped weapon artwork for pickups and outbound/returning shots.
export function drawSpinningEquippedHat(ctx: CanvasRenderingContext2D, angle: number, darkMode: boolean, hatSkin = 'hats-classic'): void {
  if (hatSkin === 'hats-classic') { drawSpinningFedora(ctx, angle, darkMode); return; }
  if (['hats-gold','hats-ocean','hats-orchid'].includes(hatSkin)) {
    drawSpinningFedora(ctx,angle,darkMode,skinColors(hatSkin,darkMode));return;
  }
  ctx.save();
  const pose=hatItemPose(hatSkin,angle);
  ctx.translate(0,pose.bob);ctx.rotate(pose.angle);
  ctx.translate(0,-hatMetrics(hatSkin).centerY);
  drawHatArtwork(ctx, false, false, darkMode, hatSkin, angle);
  ctx.restore();
}

import { drawBlinkingEye } from './eyeAnimation';

export const APE_SCALE = 0.6;

export const briefcaseColors = (darkMode = false, skin = 'suitcase-classic') => ({
  body: skinColors(skin, darkMode)[0],
  outline: darkMode ? '#cbd5e1' : '#1e293b',
  handle: skinColors(skin, darkMode)[0],
  clasp: skinColors(skin, darkMode)[1],
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

// Raw artwork is also used for flying hats and beak cargo: no head fit there.
export const drawHatArtwork = (ctx: CanvasRenderingContext2D, captain: boolean, frontFacing = false, darkMode = false, skin = 'hats-classic', phase = 0, showPropeller = true, showPaperEyes = true): void => {
  if (!captain && drawNovelHat(ctx, skin, darkMode, frontFacing, phase, showPropeller, showPaperEyes)) return;
  ctx.save();
  const custom = skin !== 'hats-classic' ? skinColors(skin, darkMode) : null;
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
      // Tuck the peak root into the band rather than outlining a separate plate.
      // Only its exposed curved edges are stroked; the band covers the joint.
      ctx.fillStyle = '#202328'; ctx.beginPath(); ctx.moveTo(8, -11); ctx.quadraticCurveTo(15, -8, 23, -6); ctx.quadraticCurveTo(20, -2, 4, -8); ctx.fill();
      ctx.strokeStyle = '#080b10'; ctx.lineWidth = 0.6; ctx.stroke();
      // Continuous wrap follows the crown base and overlaps the visor root.
      // Keep the underside unchanged so the existing rigid head fit still seats.
      ctx.fillStyle = '#161b22'; ctx.beginPath(); ctx.moveTo(-10, -9); ctx.quadraticCurveTo(0, -8, 11, -13); ctx.lineTo(11, -10); ctx.quadraticCurveTo(0, -5, -9, -5); ctx.closePath(); ctx.fill();
      // Gold ribbon wraps the entire visible band, following its curvature.
      // Both edges interpolate the black band's contours, keeping black trim
      // above and below without a floating end at the middle of the cap.
      ctx.fillStyle = '#dcb759';
      ctx.beginPath(); ctx.moveTo(-9.65, -7.6);
      ctx.quadraticCurveTo(0, -6.95, 11, -11.95);
      ctx.lineTo(11, -11.05);
      ctx.quadraticCurveTo(0, -6.05, -9.35, -6.4);
      ctx.closePath(); ctx.fill();
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
    ctx.fillStyle = '#dcb759'; ctx.fillRect(-10, -9.6, 21, 1.1);
    ctx.strokeStyle = '#dcb759'; ctx.lineWidth = 0.9;
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
    ctx.fillStyle = custom?.[0] ?? (darkMode ? '#cbd5e1' : '#101115');
    ctx.beginPath(); ctx.ellipse(0, -7, 17, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 0.65; ctx.stroke();
    ctx.fillStyle = custom?.[0] ?? (darkMode ? '#f8fafc' : '#24262b');
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
    ctx.fillStyle = custom?.[1] ?? (darkMode ? '#111318' : '#f8fafc');
    ctx.beginPath(); ctx.moveTo(-10.5, -12);
    ctx.quadraticCurveTo(0, -9.5, 10.5, -12); ctx.lineTo(11, -8.5);
    ctx.quadraticCurveTo(0, -6, -11, -8.5); ctx.closePath(); ctx.fill();
    // Front of the brim is lower than its rear, but stays above the eyes.
    ctx.fillStyle = custom?.[0] ?? (darkMode ? '#e2e8f0' : '#111318');
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
  const hatColor = custom?.[0] ?? (darkMode ? '#f8fafc' : '#111318');
  const hatBandColor = custom?.[1] ?? (darkMode ? '#111318' : '#ffffff');
  ctx.fillStyle = hatColor;
  ctx.beginPath(); ctx.ellipse(1, -7, 20, 4.5, -0.06, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = custom?.[0] ?? (darkMode ? '#e2e8f0' : '#24262b');
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

export function drawHeadHat(ctx: CanvasRenderingContext2D, head: HatHead, captain = false, dark = false, skin = 'hats-classic', phase = 0, stack = 0, front = false, showPropeller = true): void {
  const contact=headHatContact(head,captain,skin);
  const fedora = !captain && ['hats-classic','hats-gold','hats-ocean','hats-orchid'].includes(skin);
  // Ape hats and naval caps are rigid: anatomy determines placement and
  // uniform size, never local bending of the brim, band or crown.
  const fitted=hatContactContext(ctx,hatArtworkContact(skin,captain,front),contact,stack*hatMetrics(skin).stackHeight*contact.height,!captain && !fedora && head !== 'ape');
  ctx.save();
  try {
    const paper = !captain && skin==='hats-paper';
    if (paper) {
      const bounds=PAPER_HEAD_BOUNDS[head];
      const lift=stack*hatMetrics(skin).stackHeight*contact.height;
      // Fit the unmodified bag artwork around the entire head. Keep the torn
      // lower edge below the chin, rather than sizing a bag like a narrow brim.
      // At its narrowest the artwork spans x=-8.8..9.6; y=-26.8..10.6.
      const sx=(bounds.right-bounds.left)/18.4;
      const sy=(bounds.bottom-bounds.top)/37.4;
      ctx.save();
      // Anatomy supplies the local profile. Existing caller mirrors still apply
      // to both head and bag (including bosses and reversed movement poses).
      const facing=contact.facing;
      ctx.translate(facing===-1 ? bounds.right-8.8*sx : bounds.left+8.8*sx,bounds.top+26.8*sy-lift);
      ctx.scale(sx*facing,sy);
      drawHatArtwork(ctx,false,false,dark,skin,phase,showPropeller,true);
      ctx.restore();
    } else if (fedora && head === 'human') {
      // Restore the original human artwork without re-fitting or flattening it.
      ctx.translate(0,-stack*hatMetrics(skin).stackHeight);
      drawHatArtwork(ctx,false,front,dark,skin,phase,showPropeller,true);
    } else drawHatArtwork(fitted,captain,front,dark,skin,phase,showPropeller,true);
  } finally { ctx.restore(); }
}

// Existing human callers share the same anatomy instead of duplicating fits.
export const drawCharacterHat = (ctx: CanvasRenderingContext2D, captain: boolean, frontFacing = false, darkMode = false, skin = 'hats-classic', phase = 0, showPropeller = true): void => {
  drawHeadHat(ctx,'human',captain,darkMode,skin,phase,0,frontFacing,showPropeller);
};

// Shared rounded right-profile head for running and seated poses.
export const drawHumanHead = (ctx: CanvasRenderingContext2D, hat = true, darkMode = false, hatSkin = 'hats-classic', phase = 0, showPropeller = true): void => {
  ctx.save();
  // Overlap both the jaw and shirt/shoulders, including scaled seated poses.
  // Draw behind the face so the chin keeps its rounded profile.
  // Same skin and tapered base as the bare torso. Clothing simply covers the
  // lower neck; Swim Shady does not need to repaint a separate skin contour.
  ctx.fillStyle = '#fed7aa';
  // The cervical column sits beneath the ear/back of the jaw, not the chin.
  // Keep the face/hat origin fixed; move the neck itself back into the shoulder.
  ctx.beginPath(); ctx.moveTo(-3.25,3); ctx.lineTo(1.25,3);
  ctx.quadraticCurveTo(.65,7,1.65,10.8);
  ctx.quadraticCurveTo(1.45,11.4,.75,11.75);
  ctx.quadraticCurveTo(-1.25,11.8,-3.5,10);
  ctx.quadraticCurveTo(-3.25,9,-3.25,3);ctx.closePath();ctx.fill();
  ctx.beginPath(); ctx.moveTo(-7, -4); ctx.bezierCurveTo(-7, -12, 5, -13, 7, -5);
  ctx.quadraticCurveTo(6.8,-2.5,8.3,-.8); ctx.quadraticCurveTo(8.8,.2,6.7,.7);
  ctx.lineTo(6.5,3); ctx.quadraticCurveTo(6.2,6.4,2.8,6.5);
  ctx.quadraticCurveTo(-3,6.6,-5,2.8); ctx.closePath(); ctx.fill();
  // One near ear/eye: keep the jaw compact instead of stretching the face down.
  ctx.fillStyle = '#eab28e'; ctx.beginPath(); ctx.ellipse(-3.8,-.3,1.6,2.2,-.1,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#c78667'; ctx.lineWidth=.5;
  ctx.beginPath(); ctx.moveTo(-4.2,-1.2); ctx.quadraticCurveTo(-2.6,-1.4,-3.5,.8); ctx.stroke();
  drawBlinkingEye(ctx,4.8,-3,()=>{ctx.fillStyle = '#17202c'; ctx.beginPath(); ctx.arc(4.8,-3, .85,0,Math.PI*2); ctx.fill();});
  ctx.strokeStyle='#70442d'; ctx.lineWidth=.65;
  ctx.beginPath(); ctx.moveTo(3.6,-5); ctx.lineTo(5.5,-4.7); ctx.stroke();
  ctx.strokeStyle = '#ad735c'; ctx.lineWidth = .65;
  ctx.beginPath(); ctx.moveTo(4.7,3); ctx.quadraticCurveTo(5.8,3.5,6.7,2.8); ctx.stroke();
  if (hat) drawCharacterHat(ctx, false, false, darkMode, hatSkin, phase, showPropeller);
  ctx.restore();
};

// Front-facing meme pose; feet are at the local origin.
export const drawFallingCharacter = (ctx: CanvasRenderingContext2D, frame: number, apeHead = false, companion = false, darkMode = false, hat = true, hatSkin = 'hats-classic', suitcaseSkin = 'suitcase-classic', suitSkin = 'suits-classic', shoeSkin = 'shoes-classic'): void => {
  ctx.save();
  const raisedSide = Math.floor(frame / 10) % 2 === 0 ? -1 : 1;
  const skin = apeHead ? '#d6a573' : '#efb58f';
  const [suitBody, tie] = skinColors(suitSkin, darkMode);
  const body = companion ? '#754526' : suitBody;
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
    ctx.fillStyle = suitShirtColor(suitSkin,darkMode); ctx.beginPath(); ctx.moveTo(-5, -41); ctx.lineTo(5, -41); ctx.lineTo(0, -24); ctx.fill();
    ctx.fillStyle = tie; ctx.fillRect(-1.5, -37, 3, 11);
    if (!apeHead) {
      ctx.strokeStyle = '#42536b'; ctx.lineWidth = 0.7;
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(side * 6, -39); ctx.lineTo(side * 4, -30);
        ctx.lineTo(side * 8, -28); ctx.lineTo(side * 2, -19); ctx.stroke();
      }
    }
  }
  if (!companion) {
    // Reuse the complete garment, including special shoulders, shirt and patterns.
    ctx.save(); ctx.translate(0, -22); ctx.scale(.65, .62); drawSuitPreview(ctx, suitSkin, darkMode); ctx.restore();
    for (const side of [-1, 1]) drawShoe(ctx, shoeSkin, darkMode, side * (8 + Math.sin(frame * .2) * 2) - 4, -2, 9);
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
    for (const side of [-1, 1]) drawBlinkingEye(ctx,side*3.5,-53,()=>{ctx.beginPath(); ctx.arc(side * 3.5, -53, 1.5, 0, Math.PI * 2); ctx.fill();},1);
  } else {
    // Home face at gameplay scale; both eyes remain below the hat brim.
    ctx.fillStyle = '#17202c';
    for (const side of [-1, 1]) {
      drawBlinkingEye(ctx,side*3.4,-51.5,()=>{ctx.beginPath(); ctx.arc(side * 3.4, -51.5, 1.1, 0, Math.PI * 2); ctx.fill();});
    }
    ctx.strokeStyle = '#d49570'; ctx.lineWidth = 0.75;
    ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(-1.1, -47); ctx.lineTo(0.75, -47); ctx.stroke();
  }
  ctx.strokeStyle = '#70442d'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-4, -46); ctx.quadraticCurveTo(0, -43, 4, -46); ctx.stroke();
  if (!companion) {
    // The hero is bald during the fall; his belongings tumble to opposite sides.
    const time = Math.max(0, frame);
    if (hat) {
      ctx.save(); ctx.translate(-14 - time * 2.2, -61 - time * 3.2);
      ctx.rotate(-time * 0.09); drawHatArtwork(ctx, false, false, darkMode, hatSkin, frame / 60); ctx.restore();
    }
    ctx.save(); ctx.translate(27 + time * 2.5, -31 - time * 2.4);
    ctx.rotate(time * 0.11); ctx.translate(-8, -7);
    drawEquippedBag(ctx, suitcaseSkin, darkMode); ctx.restore();
  }
  ctx.restore();
};

export function drawApeHat(ctx: CanvasRenderingContext2D, captain = false, dark = false, skin = 'hats-classic', phase = 0, showPropeller = true): void {
  drawHeadHat(ctx,'ape',captain,dark,skin,phase,0,false,showPropeller);
}

export const drawApeHead = (ctx: CanvasRenderingContext2D, hat = true): void => {
  ctx.save();
  // A short fur-covered neck joins the head to either the suit or ape torso.
  ctx.fillStyle = '#754526'; ctx.beginPath();ctx.moveTo(-3.25,3);
  ctx.quadraticCurveTo(-2.5,8,-3,10.5);ctx.quadraticCurveTo(-1,12,2.5,11.75);
  ctx.quadraticCurveTo(1,8,2.5,5);ctx.closePath();ctx.fill();
  ctx.fillStyle = '#754526';
  ctx.beginPath(); ctx.ellipse(0, 0, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#432918'; ctx.beginPath(); ctx.arc(-7, 0, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#bb8554'; ctx.beginPath(); ctx.arc(-7, 0, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d6a573';
  ctx.beginPath(); ctx.ellipse(4, 2, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#432918'; ctx.beginPath(); ctx.ellipse(9, 1, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  drawBlinkingEye(ctx,4,-3,()=>{
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(4, -3, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(5, -3, 1.3, 0, Math.PI * 2); ctx.fill();
  },1);
  ctx.strokeStyle = '#432918'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(1, -6); ctx.lineTo(7, -5); ctx.moveTo(4, 5); ctx.quadraticCurveTo(8, 7, 11, 4); ctx.stroke();
  if (hat) drawApeHat(ctx, true);
  ctx.restore();
};

export const drawApeAsset = (ctx: CanvasRenderingContext2D, phase = 0, seated = false, throwTimer = 0, throwDirection = 1, airborne = false, holdingBag = false, whaleRider = false, frogRider = false): void => {
  ctx.save();
  if (airborne && !seated) { ctx.rotate(Math.sin(phase) * 0.1); ctx.scale(1.04, 0.94); }
  const bob = seated ? 0 : Math.abs(Math.sin(phase)) * 1.5;
  const limb = (near: boolean, arm: boolean) => {
    if (whaleRider && arm) {
      const gripX=frogRider?(near?19:16):(near?23:19);
      const gripY=frogRider?(near?11:9):(near?1:-1);
      if (near && throwTimer > 0) {
        // Only the foreground/right hand releases its grip. Blend back to
        // the same palm position as the holding pose when the throw ends.
        const reach = Math.min(1, throwTimer / 8);
        const handX = gripX + (2 + throwDirection * 28 - gripX) * reach;
        const handY = gripY + (-15 - gripY) * reach;
        ctx.strokeStyle = '#754526'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(2, -14);
        ctx.lineTo((frogRider?6:11) + throwDirection * 4 * reach, (frogRider?3:-7) + (-13-(frogRider?3:-7))*reach);
        ctx.lineTo(handX, handY); ctx.stroke();
        ctx.fillStyle = '#d6a573';
        ctx.beginPath(); ctx.ellipse(handX, handY, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
        return { x: handX, y: handY };
      }
      ctx.save(); ctx.translate(0, 11);
      drawWhaleRiderArm(ctx, near, near ? '#754526' : '#4e301d', near ? '#d6a573' : '#a7774d', 6, frogRider);
      ctx.restore();
      return { x: gripX, y: gripY };
    }
    const swing = seated ? 0 : Math.sin(phase + (near ? 0 : Math.PI)) * (arm ? -11 : 9);
    const rootX = near ? 2 : -2;
    const rootY = arm ? -8 : 11;
    const throwing = near && arm && throwTimer > 0 && !holdingBag;
    const reach = Math.min(1, throwTimer / 8);
    const endX = holdingBag && arm ? (near ? 23 : 15) : throwing ? rootX + throwDirection * 28 * reach : seated ? (arm ? 17 : 12) : rootX + swing + (arm ? 7 : 0);
    const endY = holdingBag && arm ? 9 : throwing ? -15 + (1 - reach) * 18 : seated ? (arm ? 3 : 18) : (arm ? 17 : 25) - Math.max(0, swing) * (arm ? 0.25 : 0.45);
    ctx.strokeStyle = near ? '#754526' : '#4e301d';
    ctx.lineWidth = arm ? 7 : 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
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

export const drawPickupAsset = (ctx: CanvasRenderingContext2D, d: Pickup, x: number, y: number, frame = 0, darkMode = false, coinLetter: 'M' | 'B' = 'M', decorated = true, hatSkin = 'hats-classic'): void => {
  if (d.type === 'fedora') {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.7, 0.7);
    drawSpinningEquippedHat(ctx, -frame * 0.07 + d.x * 0.01, darkMode, hatSkin);
    ctx.restore();
    return;
  }
  if (d.type === 'printer') {
    ctx.save(); ctx.translate(x, y);
    ctx.rotate(d.rotation ?? 0);
    ctx.scale(0.85, 0.85);
    // Chunky retro desktop printer, with a paper feed and projecting cash tray.
    ctx.fillStyle = darkMode ? '#64748b' : '#8c9985'; ctx.beginPath(); ctx.roundRect(-16, -15, 32, 9, 2); ctx.fill();
    ctx.fillStyle = '#fff8df'; ctx.fillRect(-10, -25, 19, 14);
    ctx.strokeStyle = '#c6cbb4'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-7, -21); ctx.lineTo(6, -21); ctx.moveTo(-7, -18); ctx.lineTo(3, -18); ctx.stroke();
    ctx.fillStyle = '#f0e6c9'; ctx.beginPath(); ctx.moveTo(-19, -7); ctx.lineTo(-14, -14); ctx.lineTo(16, -14); ctx.lineTo(21, -6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = darkMode ? '#94a3b8' : '#c8bea4'; ctx.beginPath(); ctx.roundRect(-19, -7, 40, 23, 3); ctx.fill();
    ctx.fillStyle = darkMode ? '#475569' : '#a1977f'; ctx.fillRect(15, -5, 6, 18);
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
    if (decorated) {
      ctx.strokeStyle = `rgba(250, 204, 21, ${0.2 + (Math.sin(frame * 0.07) + 1) * 0.12})`;
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 23 + Math.sin(frame * 0.07) * 3, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(0, 9, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#92400e'; ctx.fillRect(-13, 6, 26, 3);
    const brass = ctx.createLinearGradient(-12, 0, 12, 0);
    brass.addColorStop(0, '#a16207'); brass.addColorStop(0.45, '#fef08a'); brass.addColorStop(1, '#ca8a04');
    ctx.fillStyle = brass;
    ctx.beginPath(); ctx.moveTo(-13, 6); ctx.quadraticCurveTo(-8, 2, -8, -6); ctx.quadraticCurveTo(-8, -14, 0, -14); ctx.quadraticCurveTo(8, -14, 8, -6); ctx.quadraticCurveTo(8, 2, 13, 6); ctx.closePath(); ctx.fill();
    if (decorated) {
      ctx.strokeStyle = '#fef3c7'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(16, -9); ctx.lineTo(21, -13); ctx.moveTo(-16, -9); ctx.lineTo(-21, -13); ctx.stroke();
    }
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
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        const letterMetrics = ctx.measureText(coinLetter);
        const letterX = (letterMetrics.actualBoundingBoxLeft - letterMetrics.actualBoundingBoxRight) / 2;
        const letterY = (letterMetrics.actualBoundingBoxAscent - letterMetrics.actualBoundingBoxDescent) / 2;
        ctx.fillText(coinLetter, letterX, letterY);
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

export function drawStolenBirdHat(ctx: CanvasRenderingContext2D, s: Swan, darkMode = false, hatSkin = 'hats-classic'): void {
  if (!s.stolenHat) return;
  ctx.save();
  if (s.kind === 'hawk') { ctx.scale(.8,.8); ctx.rotate(Math.sin(s.phase)*.025); ctx.translate(-30, 0); }
  else if (s.kind === 'pigeon') { ctx.rotate(s.isCharging ? -.12 : Math.sin(s.phase)*.05); ctx.translate(-26,-7); }
  else { ctx.scale(.4,s.kind==='white'?-.4:.4); ctx.translate(s.isCharging?-65:-50,s.isCharging?2:-36); }
  // Pin the actual visor/rim to the beak, including backwards-cap artwork.
  const grip = hatBirdGrip(hatSkin,s.stolenHat==='captain');
  const scale = s.kind === 'hawk' || s.kind === 'pigeon' ? .75 : 1.5;
  ctx.rotate(-.7);ctx.scale(grip.facing*scale,scale);ctx.translate(-grip.x,-grip.y);
  drawHatArtwork(ctx,s.stolenHat==='captain',false,darkMode,hatSkin,s.phase);
  ctx.restore();
}

export const drawSwanAsset = (ctx: CanvasRenderingContext2D, s: Swan, white = false, darkMode = false, hatSkin = 'hats-classic'): void => {
  drawBirdAsset(ctx,s,white,darkMode,hatSkin);
  drawStolenBirdHat(ctx,s,darkMode,hatSkin);
};

const drawBirdAsset = (ctx: CanvasRenderingContext2D, s: Swan, white = false, darkMode = false, hatSkin = 'hats-classic'): void => {
      if (s.kind === 'hawk') {
        ctx.save(); ctx.scale(0.8, 0.8);
        ctx.rotate(Math.sin(s.phase) * 0.025);
        const flap = Math.sin(s.phase) * 0.65;
        // Far wing and rounded, individually banded tail feathers.
        ctx.save(); ctx.translate(4, -3); ctx.rotate(-flap * 0.7);
        ctx.fillStyle = '#6d4935'; ctx.beginPath(); ctx.ellipse(12, -13, 9, 21, 0.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.save(); ctx.translate(10, 2); ctx.rotate(Math.sin(s.phase * .8) * .09); ctx.translate(-10, -2);
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 ? '#9b7451' : '#765039';
          ctx.beginPath(); ctx.ellipse(21, 1 + i * 2, 13, 2.6, 0.15 + i * 0.04, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#50382c'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(25, i * 2); ctx.lineTo(24, 4 + i * 2); ctx.stroke();
        }
        ctx.restore();
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
        // Hawk carries the same chicken tender that it drops, held in its beak.
        if (!s.lootRolled && !s.stolenHat) {
          ctx.save(); ctx.translate(-31, 2); ctx.rotate(0.18); ctx.scale(0.34, 0.34); drawChickenTender(ctx); ctx.restore();
        }
        drawBlinkingEye(ctx,-18,-8,()=>{
        ctx.fillStyle = '#f4c34d'; ctx.beginPath(); ctx.ellipse(-18, -8, 3, 2.7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#171b22'; ctx.beginPath(); ctx.arc(-19, -8, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-19.5, -8.8, 0.6, 0, Math.PI * 2); ctx.fill();
        },3);
        ctx.strokeStyle = '#684733'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-22, -11); ctx.quadraticCurveTo(-17, -12, -14, -9); ctx.stroke();
        for (let hat = 0; hat < (s.fedoraHats ?? 0); hat++) {
          drawHeadHat(ctx,'hawk',false,darkMode,hatSkin,s.phase,hat,false,hat === (s.fedoraHats ?? 0)-1);
        }
        ctx.restore(); return;
      }
      if (s.kind === 'white') {
        ctx.save();
        ctx.scale(1, -1);
        drawBirdAsset(ctx, { ...s, kind: 'swan' }, true, darkMode, hatSkin);
        ctx.restore();
        return;
      }
      if (s.kind === 'pigeon') {
        ctx.save();
        ctx.rotate(s.isCharging ? -0.12 : Math.sin(s.phase) * 0.05);
        drawPigeonWing(ctx, s.phase, false);
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
        drawBlinkingEye(ctx,-16,-14,()=>{
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-16, -14, 4, 5, -0.15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(-18, -13, 1.8, 0, Math.PI * 2); ctx.fill();
        },4);
        ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-20, -20); ctx.lineTo(-12, -19); ctx.stroke();
        drawPigeonWing(ctx, s.phase, true);
        ctx.strokeStyle = '#d99a78'; ctx.lineWidth = 2;
        for (const near of s.cargo ? [] : [false, true]) {
          const hip = near ? { x: 5, y: 20 } : { x: -4, y: 19 };
          ctx.save(); ctx.translate(hip.x, hip.y);
          ctx.rotate(Math.sin(s.phase * .9 + (near ? Math.PI : 0)) * .12);
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.lineTo(near ? 1 : -2, near ? 4 : 5);
          ctx.lineTo(near ? 5 : -6, near ? 4 : 5); ctx.stroke(); ctx.restore();
        }
        for (let hat = 0; hat < (s.fedoraHats ?? 0); hat++) {
          drawHeadHat(ctx,'pigeon',false,darkMode,hatSkin,s.phase,hat,false,hat === (s.fedoraHats ?? 0)-1);
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
        drawBlinkingEye(ctx,-48,1,()=>{ctx.beginPath();ctx.arc(-48, 1, 3, 0, Math.PI * 2);ctx.fill();},5);

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
        drawBlinkingEye(ctx,-34,-39,()=>{ctx.beginPath();ctx.arc(-34, -39, 2.2, 0, Math.PI * 2);ctx.fill();},5);

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
        drawHeadHat(ctx,s.isCharging?'swanCharging':'swan',false,darkMode,hatSkin,s.phase,hat,false,hat === (s.fedoraHats ?? 0)-1);
      }
      ctx.restore();
      if (!s.lootRolled && !s.stolenHat && !s.dead && !s.dying) {
        ctx.save();
        const beakX = (s.isCharging ? -68 : -52) * 0.4;
        const beakY = (s.isCharging ? 2 : -36) * 0.4;
        ctx.translate(beakX, beakY + 12);
        drawPickupAsset(ctx, { type: 'bag', x: 0, y: 0, taken: false }, 0, 0);
        ctx.restore();
      }

};
