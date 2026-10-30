// Logical scene coordinates stay independent of presentation/export resolution.
export const GUIDE_SCENE_WIDTH = 360;
export const GUIDE_SCENE_HEIGHT = 220;

export function guideCanvasSize(displayWidth: number, pixelRatio = 1) {
  const width = Number.isFinite(displayWidth) && displayWidth > 0 ? displayWidth : GUIDE_SCENE_WIDTH;
  const ratio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  // Integer scene multiples preserve the exact aspect ratio at every density.
  const scale = Math.max(4, Math.min(12, Math.ceil(width * ratio / GUIDE_SCENE_WIDTH)));
  return { width: GUIDE_SCENE_WIDTH * scale, height: GUIDE_SCENE_HEIGHT * scale, scale };
}