// Browser game module for printerTrack.
import type { Candle } from './types';

export interface PrinterTurn { x: number; angle: number; radius: number }

// Fixed spatial exit in world coordinates. The attached strand joins its
// source; the opposite strand peels away and ends. With a fixed Inverted view,
// these are visibly the upper continuing boundary and lower ending boundary.
export function endingPrinterCandle(source: Candle, x: number, startX: number, endX: number, turns: PrinterTurn[], strand: 1 | -1): Candle {
  const twisted = twistPrinterCandle(source, x, startX, turns, strand);
  const t = Math.max(0, Math.min(1, (x - (endX - 360)) / 360));
  const blend = t * t * (3 - 2 * t);
  const target = strand === 1 ? 0 : -450;
  const shift = (twisted.top - source.top) * (1 - blend) + target * blend;
  return { ...twisted, o: source.o + shift, c: source.c + shift, top: source.top + shift,
    bot: source.bot + shift, h: source.h + shift, l: source.l + shift };
}

// Bridge source gaps without touching the saved normal-run chart or using its
// gap sentinel heights. All printer consumers use the same replacement candle.
export function printerSourceCandle(candles: Candle[], index: number): Candle | undefined {
  const source = candles[index];
  if (!source?.hole) return source;
  let left = index - 1, right = index + 1;
  while (left >= 0 && (!candles[left] || candles[left].hole)) left--;
  while (right < candles.length && (!candles[right] || candles[right].hole)) right++;
  const a = candles[left], b = candles[right];
  if (!a && !b) return { o: 300, c: 306, top: 300, bot: 306, h: 297, l: 310, v: 0.5, k: 'Candle' };
  const template = a ?? b!;
  const t = a && b ? (index - left) / (right - left) : 0;
  const top = a && b ? a.top + (b.top - a.top) * t : template.top;
  const body = 4 + index % 7;
  const green = index % 2 === 0;
  return { ...template, hole: false, sp: false, doubleJumpBarrier: false,
    top, bot: top + body, o: green ? top + body : top, c: green ? top : top + body,
    h: top - 2 - index % 3, l: top + body + 3, k: 'Candle' };
}

// After the final crossing the two strands only separate. Once the runner
// stands upright on strand 1 and no crossing lies ahead, it may leave the
// printer (and jump) instead of waiting for the mode timer.
export const PRINTER_UPRIGHT_SEPARATION = 90;
export function printerPastLastCrossing(sourceAt: (x: number) => Candle | undefined, x: number, startX: number, endX: number, turns: PrinterTurn[], step: number): boolean {
  if (x >= endX) return true;
  for (let probe = x; probe <= endX; probe += step) {
    const source = sourceAt(probe);
    if (!source) continue;
    const a = endingPrinterCandle(source, probe, startX, endX, turns, 1);
    const b = endingPrinterCandle(source, probe, startX, endX, turns, -1);
    if (a.top - b.top < PRINTER_UPRIGHT_SEPARATION) return false;
  }
  return true;
}

export const PRINTER_CLEARANCE = 78;

export const rightEdgeSpawnX = (cameraX: number, viewportWidth: number, margin = 120): number =>
  cameraX + viewportWidth + margin;

// Flip the local profile before applying its attachment rotation. This keeps
// the head facing the travel direction on both floor and inverted ceiling.
export const printerProfileFlip = (rotation: number): 1 | -1 => Math.cos(rotation) < 0 ? -1 : 1;

export function printerEnemyPose(a: Candle, b: Candle, height: number) {
  const pose = printerCrossingPose(a, b);
  return { feet: pose.y, rotation: -pose.rotation,
    centerY: pose.y - Math.cos(pose.rotation) * height / 2 };
}

// The same strand changes from a floor to a ceiling at an intersection.
// Blend the attachment side near the crossing, rather than deforming candles.
export function printerCrossingPose(a: Candle, b: Candle) {
  const separation = a.top - b.top;
  const side = Math.max(-1, Math.min(1, separation / PRINTER_UPRIGHT_SEPARATION));
  const rotation = Math.acos(side);
  const attachment = a.top + (a.bot - a.top) * (1 - side) / 2;
  return { y: attachment, rotation, inverted: separation < 0 };
}

// Static stacked graphs: separation includes the entire upper candle wick.
export function printerCorridorCandle(source: Candle, x: number, startX: number, turns: PrinterTurn[], strand: 1 | -1): Candle {
  const lower = twistPrinterCandle(source, x, startX, turns, 1);
  if (strand === 1) return lower;
  const spread = Math.abs(lower.top - source.top) * 1.4;
  const shift = lower.top - PRINTER_CLEARANCE - spread - source.l;
  return { ...source, hole: false, sp: false, doubleJumpBarrier: false,
    o: source.o + shift, c: source.c + shift, top: source.top + shift,
    bot: source.bot + shift, h: source.h + shift, l: source.l + shift };
}

// Place an ordinary upright candle on a strand without rotating its OHLC shape.
export function printerLoopCandle(source: Candle, progress: number, startX: number, baseY: number, turns: PrinterTurn[], strand: 1 | -1) {
  const pose = printerLoopPose(progress, startX, baseY, turns, strand);
  const shift = pose.y - source.top;
  return { x: pose.x, candle: { ...source, o: source.o + shift, c: source.c + shift,
    top: source.top + shift, bot: source.bot + shift, h: source.h + shift, l: source.l + shift } };
}

// A parametric track can turn back in X, unlike a height-at-X graph. This is
// what permits a real loop and an inverted runner, without animating the track.
export function printerLoopPose(progress: number, startX: number, baseY: number, turns: PrinterTurn[], strand: 1 | -1 = 1, inset = 0) {
  const position = Math.max(0, progress - startX);
  const right = turns.findIndex(turn => turn.x > position);
  const a = turns[Math.max(0, right - 1)], b = turns[right] ?? a;
  const length = b.x - a.x || 1;
  const t = Math.max(0, Math.min(1, (position - a.x) / length));
  const angle = a.angle + (b.angle - a.angle) * t;
  const radius = a.radius + (b.radius - a.radius) * t;
  const phase = angle + (strand === 1 ? 0 : Math.PI);
  const r = Math.max(30, radius - inset);
  const angularSpeed = (b.angle - a.angle) / length;
  const radialSpeed = (b.radius - a.radius) / length;
  const dx = 1 - radialSpeed * Math.sin(phase) - r * Math.cos(phase) * angularSpeed;
  const dy = radialSpeed * Math.cos(phase) - r * Math.sin(phase) * angularSpeed;
  return { x: progress - Math.sin(phase) * r, y: baseY + Math.cos(phase) * r,
    rotation: Math.atan2(dy, dx) };
}

export function extendPrinterTurns(turns: PrinterTurn[], x: number, random = Math.random): void {
  if (!turns.length) turns.push({ x: 0, angle: 0, radius: 110 + random() * 100 });
  while (turns.at(-1)!.x < x + 400) {
    const previous = turns.at(-1)!;
    turns.push({ x: previous.x + 260 + random() * 520,
      angle: previous.angle + Math.PI * (1.8 + random() * 0.4), radius: 180 + random() * 100 });
  }
}

// A projected twist of the original chart, not a replacement sinusoidal price path.
export function twistPrinterCandle(source: Candle, x: number, startX: number, turns: PrinterTurn[], strand: 1 | -1): Candle {
  const position = Math.max(0, x - startX);
  const right = turns.findIndex(turn => turn.x > position);
  const a = turns[Math.max(0, right - 1)];
  const b = turns[right] ?? a;
  const t = Math.max(0, Math.min(1, (position - a.x) / (b.x - a.x || 1)));
  const smooth = t * t * (3 - 2 * t);
  const angle = a.angle + (b.angle - a.angle) * smooth;
  const radius = a.radius + (b.radius - a.radius) * smooth;
  // Geometry depends only on the original chart and world position, never on
  // time or player proximity. Crossings remain fixed as the camera scrolls.
  const shift = strand * Math.sin(angle) * radius;
  return { ...source, hole: false, sp: false, doubleJumpBarrier: false,
    o: source.o + shift, c: source.c + shift, top: source.top + shift,
    bot: source.bot + shift, h: source.h + shift, l: source.l + shift };
}

export const printerCeilingCandle = (upper: Candle, floor: number, height = 68): Candle => {
  const shift = Math.min(0, floor - height - upper.l);
  return { ...upper, o: upper.o + shift, c: upper.c + shift, top: upper.top + shift,
    bot: upper.bot + shift, h: upper.h + shift, l: upper.l + shift };
};

// Use the whole character footprint, not interpolated candle centres. This
// prevents the feet/body intersecting a taller neighbouring candle on slopes.
export const printerFloorAt = (candles: Candle[], x: number, width: number, fallback: number): number => {
  const first = Math.max(0, Math.floor((x - 12) / width));
  const last = Math.min(candles.length - 1, Math.floor((x + 12) / width));
  let floor = Infinity;
  for (let i = first; i <= last; i++) {
    if (candles[i] && !candles[i].hole) floor = Math.min(floor, candles[i].top);
  }
  return Number.isFinite(floor) ? floor : fallback;
};