import { SKINS, skinColors } from './progression';

export interface CandleGlyph { open: number; close: number; high: number; low: number; bullish: boolean }
export function candleGlyph(id: string, open: number, close: number, high: number, low: number, previousOpen = open, previousClose = close): CandleGlyph {
  if (SKINS.find(s => s.id === id)?.chart === 'heikin-ashi') {
    const o = (previousOpen + previousClose) / 2, c = (open + close + high + low) / 4;
    return { open: o, close: c, high: Math.min(high, o, c), low: Math.max(low, o, c), bullish: c < o };
  }
  return { open, close, high, low, bullish: close < open };
}

// Visual chart skins; terrain tops/gaps remain the gameplay authority.
export function drawCandleDesign(ctx: CanvasRenderingContext2D, id: string, dark: boolean, x: number, width: number, glyph: CandleGlyph): void {
  const type = SKINS.find(s => s.id === id)?.chart;
  const colors = skinColors(id, dark), color = colors[glyph.bullish ? 0 : 1];
  const top = Math.min(glyph.open, glyph.close), height = Math.max(1, Math.abs(glyph.close - glyph.open));
  ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 1;
  if (type === 'renko') {
    const count = Math.max(1, Math.ceil(height / width));
    for (let i = 0; i < count; i++) ctx.fillRect(x, top + i * width, width, Math.max(1, Math.min(width, height - i * width) - 1));
  } else {
    ctx.beginPath(); ctx.moveTo(x + width / 2, glyph.high); ctx.lineTo(x + width / 2, glyph.low); ctx.stroke();
    if (type === 'ohlc') {
      ctx.beginPath(); ctx.moveTo(x, glyph.open); ctx.lineTo(x + width / 2, glyph.open);
      ctx.moveTo(x + width / 2, glyph.close); ctx.lineTo(x + width, glyph.close); ctx.stroke();
    } else if (type === 'hollow' && glyph.bullish) ctx.strokeRect(x + .5, top + .5, Math.max(1, width - 1), Math.max(1, height - 1));
    else ctx.fillRect(x, top, width, height);
  }
  ctx.restore();
}