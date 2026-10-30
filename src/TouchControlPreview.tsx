import { useEffect, useRef, type CSSProperties } from 'react';
import { JUMP_ZONE_FRACTION as HERO_ZONE_FRACTION } from './touchInput';
import { drawHumanHead, drawCharacterHat, drawSpinningEquippedHat } from './assetRenderer';
import { drawAnimalCharacter } from './animalRenderer';
import { fedoraArmPose, stepFlyingFedora, FEDORA_WINDUP, type FlyingFedora } from './fedoraBoomerang';
import type { Candle } from './types';

import { drawEquippedBag, drawFarRunnerArm, drawRunnerLeg, drawSuitDetails, drawSuitCollar, drawNearBriefcaseArm, drawJointedSuitArm } from './cosmeticModels';
import { actionArmPose } from './characterPose';
import { skinColors } from './modelColors';
import { hatMetrics } from './hatPose';
import { guideCanvasSize } from './guideCanvas';

export type TouchControl = 'jump' | 'double-jump' | 'shoot' | 'hat-weapon';

export const GUIDE_PLOT_WIDTH = 360;
export const GUIDE_WIDTH = 360;
export const GUIDE_HERO_X = GUIDE_PLOT_WIDTH * HERO_ZONE_FRACTION;
export const GUIDE_CYCLE = 216;
const fedoraReleasePose = () => fedoraArmPose(.000001);
export function guideTapFrames(action: TouchControl): readonly number[] {
  return action === 'double-jump' ? [42, 70] : action === 'hat-weapon' ? [42, 110] : [42];
}

export function guideInputPose(action: TouchControl, frame: number) {
  const tick = ((frame % GUIDE_CYCLE) + GUIDE_CYCLE) % GUIDE_CYCLE;
  const taps = guideTapFrames(action);
  const age = Math.min(...taps.map(tap => (tick - tap + GUIDE_CYCLE) % GUIDE_CYCLE));
  const until = Math.min(...taps.map(tap => (tap - tick + GUIDE_CYCLE) % GUIDE_CYCLE));
  const press = age < 3 ? 1 : age < 9 ? 1 - (age - 3) / 6 : until < 6 ? 1 - until / 6 : 0;
  return { y: press === 1 ? 0 : -7 * (1 - press), scale: 1 - press * .07,
    ringOpacity: age < 12 ? 1 - age / 12 : 0, ringScale: .6 + Math.min(age, 12) / 12 * .9 };
}

export function guideHatFlight(tick: number): FlyingFedora | null {
  if (tick < 42 + FEDORA_WINDUP) return null;
  const release = fedoraReleasePose();
  const hat: FlyingFedora = { x: GUIDE_HERO_X + release.handX, y: 176 + release.handY, angle: 0, returning: false };
  const candles = Array.from({ length: 40 }, () => ({ top: 176, hole: false } as Candle));
  for (let frame = 42 + FEDORA_WINDUP; frame <= tick; frame++) {
    if (stepFlyingFedora(hat, GUIDE_HERO_X, candles, 9, 320)) return null;
  }
  return hat;
}

// Two deterministic outcomes, separated so the first return is readable.
export function guideHatEncounter(tick: number) {
  const second = tick >= 110;
  const local = second ? tick - 110 + 42 : tick;
  const impact = second ? 60 : 56;
  const windup = local >= 42 && local < 52 ? 52 - local : 0;
  const release = fedoraReleasePose();
  let hat: FlyingFedora | null = local >= 52 ? { x: GUIDE_HERO_X + release.handX, y: 176 + release.handY, angle: 0, returning: false } : null;
  const candles = Array.from({ length: 40 }, () => ({ top: 176, hole: false } as Candle));
  if (hat) for (let step = 52; step <= local; step++) {
    if (second && step >= impact) { hat = null; break; }
    if (stepFlyingFedora(hat, GUIDE_HERO_X, candles, 9, 320)) { hat = null; break; }
    if (!second && step === impact) hat.returning = true;
  }
  return { hat, windup, killed: tick >= 56, deathFrame: tick - 56, decorated: second && local >= impact, onHead: !hat && !windup && !(second && local >= impact) };
}

// Keep the held hat at the same head-local stack position until the hand
// reaches it, then carry its brim above the palm instead of centering it there.
export function guideHeldHatPose(windup: number) {
  const hand = fedoraArmPose(windup);
  const grab = Math.max(0, Math.min(1, (1 - windup / FEDORA_WINDUP) / .4));
  const headY = -42 - hatMetrics('hats-classic').stackHeight * .8;
  return { x: 3 + (hand.handX - 3) * grab, y: headY + (hand.handY + 5 - headY) * grab };
}

// Silent scripted gameplay, using the actual chart, runner and projectile artwork.
export function drawControlGameplay(ctx: CanvasRenderingContext2D, action: TouchControl, frame: number, dark: boolean) {
  const tick = Math.floor(frame) % GUIDE_CYCLE;
  const shooting = action === 'shoot' || action === 'hat-weapon';
  const hatWeapon = action === 'hat-weapon';
  const encounter = guideHatEncounter(tick);
  const hat = hatWeapon ? encounter.hat : null;
  const windup = hatWeapon ? encounter.windup : 0;
  let y = 0, vy = 0;
  for (let i = 0; i <= tick; i++) {
    if (!shooting && guideTapFrames(action).includes(i)) vy = -9.2;
    vy += .52; y = Math.min(0, y + vy);
    if (y === 0) vy = 0;
  }
  const phase = frame * .15, stride = Math.sin(phase), air = y < 0;
  const shot = action === 'shoot' && tick >= 42 && tick < 80;
  ctx.clearRect(0, 0, 360, 220);
  ctx.fillStyle = dark ? '#0c1522' : '#f8fafc'; ctx.fillRect(0, 0, 360, 220);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 360, 220); ctx.clip();
  ctx.strokeStyle = dark ? '#253348' : '#dce3eb'; ctx.lineWidth = 1;
  for (let line = 20; line < 220; line += 40) { ctx.beginPath(); ctx.moveTo(0, line); ctx.lineTo(360, line); ctx.stroke(); }
  const scroll = tick * 2;
  for (let i = -1; i < 46; i++) {
    const x = i * 18 - scroll;
    if (action === 'jump' && i >= 10 && i <= 12) continue;
    const low = 190 + Math.sin(i * 1.71) * 8;
    const top = 176 + (Math.sin(i * .57) * 2);
    ctx.fillStyle = ctx.strokeStyle = skinColors('candles-classic', dark)[i % 3 ? 0 : 1];
    ctx.beginPath(); ctx.moveTo(x + 7.5, top - 4 - (i % 4) * 2); ctx.lineTo(x + 7.5, low + 8); ctx.stroke();
    ctx.fillRect(x, top, 15, low - top);
    ctx.fillStyle = i % 3 ? '#54d3ac55' : '#ff646755'; ctx.fillRect(x, 217 - i % 5 * 2, 15, 3 + i % 5 * 2);
    if (action === 'double-jump' && i >= 7 && i <= 12) {
      // Same full-height, translucent candle-column highlight as live gameplay.
      ctx.fillStyle = dark ? '#ffe89b26' : '#edd57935';
      ctx.fillRect(x, 0, 18, 220);
    }
  }
  ctx.save(); ctx.translate(GUIDE_HERO_X, 176 + y);
  drawFarRunnerArm(ctx, 'suits-classic', dark, stride);
  for (const front of [false, true]) drawRunnerLeg(ctx, 'suits-classic', 'shoes-classic', dark, stride, front, air, phase);
  drawSuitDetails(ctx, 'suits-classic', dark, phase);
  ctx.save(); ctx.translate(3, -42); ctx.scale(.8, .8); drawHumanHead(ctx, true, dark);
  if (hatWeapon && encounter.onHead) { ctx.translate(0, -hatMetrics('hats-classic').stackHeight); drawCharacterHat(ctx, false, false, dark); }
  ctx.restore();
  drawSuitCollar(ctx, 'suits-classic', dark, phase, air, vy);
  if (hatWeapon && windup > 0) {
    const pose = fedoraArmPose(windup);
    const arm = actionArmPose(true, { x: pose.handX, y: pose.handY });
    drawJointedSuitArm(ctx, 'suits-classic', dark, arm.shoulder, arm.elbow, arm.hand, 5, 4);
    if (windup) {
      const held = guideHeldHatPose(windup);
      ctx.save(); ctx.translate(held.x, held.y); ctx.scale(.8, .8); drawCharacterHat(ctx, false, false, dark); ctx.restore();
    }
    ctx.fillStyle = '#fed7aa'; ctx.beginPath();
    ctx.ellipse(arm.hand.x, arm.hand.y, 1.8, 2.25, 0, 0, Math.PI * 2); ctx.fill();
  } else if (hatWeapon) {
    drawNearBriefcaseArm(ctx, 'suits-classic', 'suitcase-classic', dark, stride, air, vy, false);
  } else if (shot) {
    const arm = actionArmPose(true, { x: 18, y: -28 });
    drawJointedSuitArm(ctx, 'suits-classic', dark, arm.shoulder, arm.elbow, arm.hand, 5, 4);
  }
  else drawNearBriefcaseArm(ctx, 'suits-classic', 'suitcase-classic', dark, stride, air, vy);
  ctx.restore();
  if (hat) {
    ctx.save(); ctx.translate(hat.x, hat.y); ctx.scale(.7, .7);
    drawSpinningEquippedHat(ctx, hat.angle, dark); ctx.restore();
  }
  if (hatWeapon) {
    for (const [index, x] of [215, 295].entries()) {
      const dying = index === 0 && encounter.killed;
      if (dying && encounter.deathFrame >= 30) continue;
      ctx.save(); ctx.translate(x, 176);
      if (dying) {
        ctx.translate(encounter.deathFrame * 1.4, -encounter.deathFrame * 2);
        ctx.rotate(encounter.deathFrame * .22); ctx.globalAlpha = 1 - encounter.deathFrame / 30;
      }
      drawAnimalCharacter(ctx, { type: index === 0 ? 'bull' : 'bear', x: 0, y: 0, feet: 0, phase, dead: false, fedoraHats: index === 1 && encounter.decorated ? 1 : 0 }, true, false, dark);
      ctx.restore();
    }
  }
  if (action === 'shoot') {
    ctx.save(); ctx.translate(256, 176);
    const hit = tick >= 55 && tick < 85;
    if (hit) { ctx.translate((tick - 55) * 2, -(tick - 55) * 2); ctx.rotate((tick - 55) * .22); ctx.globalAlpha = 1 - (tick - 55) / 30; }
    if (tick < 85 || tick > 150) drawAnimalCharacter(ctx, { type: 'bull', x: 0, y: 0, feet: 0, phase, dead: false }, true, false, dark);
    ctx.restore();
  }
  if (shot && tick < 55) {
    const elapsed = tick - 42;
    ctx.save(); ctx.translate(GUIDE_HERO_X + 18 + elapsed * 11.5, 148 + elapsed * elapsed * .025);
    ctx.rotate(elapsed * .38); ctx.translate(-8, -7); drawEquippedBag(ctx, 'suitcase-classic', dark); ctx.restore();
  }
  ctx.restore();
}

export function TouchControlPreview({ action, theme = 'light', candleSkin = 'candles-classic' }: { action: TouchControl; theme?: 'light' | 'dark'; candleSkin?: string }) {
  const [sleeveColor] = skinColors(candleSkin, theme === 'dark');
  const canvas = useRef<HTMLCanvasElement>(null);
  const hand = useRef<SVGGElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext('2d');
    if (!element || !ctx) return;
    let request = 0, last = -Infinity;
    const start = performance.now();
    const resize = () => {
      const size = guideCanvasSize(element.getBoundingClientRect().width, window.devicePixelRatio);
      if (element.width === size.width && element.height === size.height) return;
      element.width = size.width;
      element.height = size.height;
      ctx.setTransform(size.scale, 0, 0, size.scale, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      last = -Infinity;
      // Also repaint static/reduced-motion previews after the buffer is reset.
      drawControlGameplay(ctx, action, 50, theme === 'dark');
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    window.addEventListener('resize', resize);
    const render = (now: number) => {
      const moving = !matchMedia('(prefers-reduced-motion: reduce)').matches && !canvas.current?.closest('[data-animations="false"]');
      if (moving) request = requestAnimationFrame(render);
      if (moving && now - last < 1000 / 30) return;
      last = now;
      const frame = moving ? (now - start) * .06 : 50;
      drawControlGameplay(ctx, action, frame, theme === 'dark');
      const input = guideInputPose(action, frame);
      hand.current?.setAttribute('transform', `translate(0 ${input.y}) scale(${input.scale})`);
      ring.current?.setAttribute('opacity', String(moving ? input.ringOpacity : 0));
      ring.current?.setAttribute('transform', `scale(${input.ringScale})`);
    };
    render(start);
    return () => {
      cancelAnimationFrame(request);
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [action, theme]);
  return <div className="touch-control-preview" data-action={action}
    style={{ '--touch-zone-boundary': `var(--guide-artwork-divider, ${GUIDE_HERO_X / GUIDE_WIDTH * 100}%)` } as CSSProperties}>
    <canvas ref={canvas} width={360} height={220} role="img" aria-label={`${action} gameplay demonstration`} />
    <div className="touch-zone-highlight" aria-hidden="true" />
    <div className="touch-aligned-divider" aria-hidden="true" />
    <svg className="touch-input-overlay" viewBox="0 0 360 220" aria-hidden="true">
      <g transform={`translate(${action === 'shoot' || action === 'hat-weapon' ? 226 : GUIDE_HERO_X / 2} 82)`}>
        <circle ref={ring} className="touch-tap-ring" r="10" opacity="0" />
        <g transform="scale(.6)">
        <g ref={hand} className="touch-demo-hand" fill="#ffffff" stroke="#334155" strokeWidth="1.7" strokeLinejoin="round">
          <path d="M-4 21V0C-4-6 4-6 4 0V14V8C4 3 11 3 11 8V15V11C11 6 18 6 18 11V17V15C18 10 25 11 25 16V27C25 36 20 40 12 40H8C3 40 0 36-3 32L-12 22C-16 17-10 12-6 17Z" />
          <path className="touch-demo-sleeve" d="M1.5 38H21V47H1.5Z" fill={sleeveColor} />
        </g>
        </g>
      </g>
    </svg>
  </div>;
}