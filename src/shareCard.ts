// Initial canvas size; rendering adopts the loaded artwork's native dimensions.
export const SHARE_CARD_WIDTH = 1254;
export const SHARE_CARD_HEIGHT = 1254;

export const formatShareScore = (score: number): string =>
  Math.max(0, Math.round(Number.isFinite(score) ? score : 0)).toLocaleString('en-US');

export function shareCardBackground(theme: 'light' | 'dark', baseUrl: string): string {
  return `${baseUrl}images/${theme === 'dark' ? 'score-back-inverted.webp' : 'score-back.webp'}`;
}

export function drawShareCard(ctx: CanvasRenderingContext2D, score: number, background: HTMLImageElement, theme: 'light' | 'dark' = 'light'): void {
  const width = background.naturalWidth;
  const height = background.naturalHeight;
  ctx.canvas.width = width;
  ctx.canvas.height = height;
  ctx.save();
  ctx.drawImage(background, 0, 0, width, height);

  // The new day/night illustrations have different native dimensions and lids.
  // Keep both lines inside the blue panel, clear of the rim and hinges.
  const centerX = width * (theme === 'dark' ? 0.71 : 0.70);
  const artworkScale = Math.min(width, height) / 1254;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#f8fafc';
  ctx.font = `700 ${32 * artworkScale}px "Space Grotesk", sans-serif`;
  ctx.fillText('BEST SCORE', centerX, height * (theme === 'dark' ? 0.405 : 0.414));

  const fullScore = formatShareScore(score);
  // A single line remains legible up to a safe integer; avoid microscopic type
  // for extreme values while leaving the full score in the accessible label/link.
  const value = fullScore.length > 24 ? Math.max(0, score).toExponential(3) : fullScore;
  const maxWidth = width * 0.34;
  const baseFontSize = 72 * artworkScale;
  ctx.font = `700 ${baseFontSize}px "Space Grotesk", sans-serif`;
  const fontSize = Math.max(32 * artworkScale, Math.min(baseFontSize, baseFontSize * maxWidth / Math.max(1, ctx.measureText(value).width)));
  ctx.font = `700 ${fontSize}px "Space Grotesk", sans-serif`;
  ctx.fillStyle = theme === 'dark' ? '#08795c' : '#54d3ac';
  ctx.fillText(value, centerX, height * (theme === 'dark' ? 0.462 : 0.472), maxWidth);
  ctx.restore();
}