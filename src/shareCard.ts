// Initial canvas size; rendering adopts the loaded artwork's native dimensions.
export const SHARE_CARD_WIDTH = 1254;
export const SHARE_CARD_HEIGHT = 1254;

export const formatShareScore = (score: number): string =>
  Math.max(0, Math.round(Number.isFinite(score) ? score : 0)).toLocaleString('en-US');

export function shareCardBackground(theme: 'light' | 'dark', baseUrl: string): string {
  return `${baseUrl}images/${theme === 'dark' ? 'score-back-inverted.png' : 'score-back.png'}`;
}

export function drawShareCard(ctx: CanvasRenderingContext2D, score: number, background: HTMLImageElement, _theme: 'light' | 'dark' = 'light'): void {
  const width = background.naturalWidth;
  const height = background.naturalHeight;
  ctx.canvas.width = width;
  ctx.canvas.height = height;
  ctx.save();
  ctx.drawImage(background, 0, 0, width, height);

  // Both replacement illustrations share the same inner-lid position.
  // Center the two-line score block inside it, rather than on the whole card.
  const centerX = width * 0.652;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 28px "Space Grotesk", sans-serif';
  ctx.fillText('BEST SCORE', centerX, height * 0.315);

  const fullScore = formatShareScore(score);
  // A single line remains legible up to a safe integer; avoid microscopic type
  // for extreme values while leaving the full score in the accessible label/link.
  const value = fullScore.length > 24 ? Math.max(0, score).toExponential(3) : fullScore;
  const maxWidth = width * 0.27;
  ctx.font = '700 86px "Space Grotesk", sans-serif';
  const fontSize = Math.max(32, Math.min(86, 86 * maxWidth / Math.max(1, ctx.measureText(value).width)));
  ctx.font = `700 ${fontSize}px "Space Grotesk", sans-serif`;
  ctx.fillStyle = '#54d3ac';
  ctx.fillText(value, centerX, height * 0.38, maxWidth);
  ctx.restore();
}