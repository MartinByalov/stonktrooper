import { drawHeadHat } from './assetRenderer';
import type { HatHead } from './hatContact';

// Called inside each boss's head transform so hats follow neck extension,
// leaning, facing and attack rotation rather than floating above the body.
export function drawBossHats(ctx: CanvasRenderingContext2D, count: number, skin: string, dark: boolean, head: HatHead, x: number, y: number): void {
  ctx.save(); ctx.translate(x, y);
  for (let i = 0; i < count; i++) {
    drawHeadHat(ctx,head,false,dark,skin,0,i,false,i === count-1);
  }
  ctx.restore();
}