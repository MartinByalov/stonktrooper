import { useLayoutEffect, useRef } from 'react';
import { drawHumanHead } from './assetRenderer';
import { drawProfileBackLayers } from './profileLayers';
import { drawNearBriefcaseArm, drawSuitDetails, drawSuitCollar, drawRunnerLeg, drawFarRunnerArm } from './cosmeticModels';
import { drawPet } from './petRenderer';
import { petPose, petAnimationPhase } from './petPose';
import { drawMount } from './mountRenderer';
import { mountPreviewPose } from './mountPose';
import { drawMountedPreview } from './mountRiderRenderer';

// Standard on-foot runner, feet fixed at (0, 0) while the market moves past.
export function MenuRunner({ theme, scale, animationsEnabled, hatSkin = 'hats-classic', suitcaseSkin = 'suitcase-classic', suitSkin = 'suits-classic', shoeSkin = 'shoes-classic', petSkin, mountSkin, bottomPadding = 0, topPadding = 0, petSurface }: { theme: 'light' | 'dark'; scale: number; animationsEnabled: boolean; hatSkin?: string; suitcaseSkin?: string; suitSkin?: string; shoeSkin?: string; petSkin?: string; mountSkin?: string; bottomPadding?: number; topPadding?: number; petSurface?: { current: ((offset: number) => number) | null } }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = mountSkin || petSkin ? 136 : 72;
    element.width = Math.ceil(width * scale * dpr);
    element.height = Math.ceil((88 + topPadding + bottomPadding) * scale * dpr);
    const ctx = element.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    const animate = animationsEnabled && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const draw = (now: number) => {
    ctx.resetTransform();
    ctx.clearRect(0, 0, element.width, element.height);
    const stride = animate ? Math.sin(now * 0.009) : 0;
    ctx.scale(scale * dpr, scale * dpr);
    ctx.translate(mountSkin || petSkin ? 88 : 24, 84+topPadding);
    const ride=mountPreviewPose(animate?now/1000:0);
    if (petSkin && !mountSkin) {
      const petPhase = petAnimationPhase(animate ? now / 1000 : 0,petSkin);
      const pose = petPose('normal', petPhase, false, petSkin, true);
      const terrainY=petSurface?.current?.(pose.x) ?? 0;
      ctx.save(); ctx.translate(pose.x, pose.y+terrainY); ctx.scale(pose.scale, pose.scale);
      drawPet(ctx, petSkin, theme === 'dark', petPhase, false, animate, true); ctx.restore();
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineCap = 'round';
    if (mountSkin) {
      ctx.translate(0,ride.y);
      if(mountSkin==='mounts-wednesday') {
        ctx.translate(0,-20);ctx.rotate(ride.pitch);ctx.translate(0,20);
      }
      // The default mount shows the same animal as its Exchange card at this moment.
      const kinds=['whale','bull','bear'] as const;
      const kind=mountSkin==='mounts-classic'&&animate?kinds[Math.floor(now/2500)%kinds.length]:'whale';
      drawMountedPreview(ctx,{
        suit:suitSkin,shoes:shoeSkin,bag:suitcaseSkin,hat:hatSkin,pet:petSkin,
        dark:theme==='dark',phase:ride.phase,seconds:animate?now/1000:0,
        airborne:ride.airborne,velocity:ride.velocity,animate,mount:mountSkin,kind,
      },()=>{
        ctx.save();ctx.scale(-.65,.65);
        drawMount(ctx,mountSkin,kind,theme==='dark',ride.phase,ride.airborne,ride.velocity);ctx.restore();
      });
      if(animate)frame=requestAnimationFrame(draw);
      return;
    }
    const drawLeg = (front: boolean) => {
      drawRunnerLeg(ctx,suitSkin,shoeSkin,theme==='dark',stride,front,false,animate?now/1000:0);
    };
    drawProfileBackLayers(
      () => drawFarRunnerArm(ctx,suitSkin,theme==='dark',mountSkin?0:stride,suitcaseSkin),
      () => {drawLeg(false);drawLeg(true);},
    );
    drawSuitDetails(ctx, suitSkin, theme === 'dark', animate ? now * .009 : 0);
    ctx.save(); ctx.translate(3, -42); ctx.scale(0.8, 0.8); drawHumanHead(ctx, true, theme === 'dark', hatSkin, animate ? now / 1000 : 0); ctx.restore();
    // Finish clothing before the foreground arm; never repaint fabric over it.
    drawSuitCollar(ctx, suitSkin, theme === 'dark', animate ? now * .009 : 0);
    drawNearBriefcaseArm(ctx, suitSkin, suitcaseSkin, theme === 'dark', mountSkin?0:stride);
    if (animate) frame = requestAnimationFrame(draw);
    };
    // Parent chart effects publish the terrain sampler after this pass; one deferred paint anchors it.
    draw(performance.now());
    if (!animate) frame=requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [theme, scale, animationsEnabled, hatSkin, suitcaseSkin, suitSkin, shoeSkin, petSkin, mountSkin, bottomPadding, topPadding, petSurface]);
  return <canvas ref={canvas} className="menu-runner" data-pet={mountSkin?undefined:petSkin} data-lap-pet={mountSkin?petSkin:undefined} data-mount={mountSkin} style={{ width: (mountSkin || petSkin ? 136 : 72) * scale, height: (88 + topPadding + bottomPadding) * scale }} />;
}