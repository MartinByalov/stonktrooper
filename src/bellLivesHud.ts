import { drawLifeHeart } from './lifeHeart';
// Fit the bird-drop artwork to the strip without changing its proportions.
export function drawBellLives(ctx: CanvasRenderingContext2D, lives: number, width: number, height: number, iconSize: number, dark = false) {
  const size = Math.max(1, Math.min(iconSize, (width - 22) / 3, height - 8));
  const count = Math.max(0, Math.min(3, Math.floor(lives)));
  for (let index = 0; index < 3; index++) {
    ctx.save(); ctx.translate(width / 2 + (index - 1) * (size + 3), height / 2);
    ctx.scale(size / 24, size / 24); ctx.translate(0, 1);
    drawLifeHeart(ctx, dark, index < count); ctx.restore();
  }
}
