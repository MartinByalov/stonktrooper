// Browser game module for track.
import type { Candle, Animal } from './types';

// Rocket smoothing must never leave the pilot inside a tall candle; use the whole footprint.
export function rocketTrackPose(candles: Candle[], x: number, width: number, y: number) {
  let ceiling = Infinity;
  const first = Math.max(0, Math.floor((x - 7) / width));
  const last = Math.min(candles.length - 1, Math.floor((x + 7) / width));
  for (let i = first; i <= last; i++) {
    if (candles[i] && !candles[i].hole) ceiling = Math.min(ceiling, candles[i].top);
  }
  const target = trackHeightAt(candles, x, width, y);
  return { y: Math.min(y + (target - y) * 0.25, ceiling), solid: Number.isFinite(ceiling) };
}

export const animalFallsInGap = (animal: Pick<Animal, 'type' | 'mount' | 'x'>, candles: Candle[], candleWidth: number): boolean =>
  animal.type !== 'whale' && !animal.mount && !!candles[Math.floor(animal.x / candleWidth)]?.hole;

// Ground enemies leap between the solid candle centres bordering each gap.
export const animalTrackHeightAt = (type: Animal['type'], candles: Candle[], x: number, candleWidth: number, fallback: number): number => {
  const base = trackHeightAt(candles, x, candleWidth, fallback);
  const position = x / candleWidth - 0.5;
  let left = Math.floor(position);
  let right = Math.ceil(position);
  while (left >= 0 && candles[left]?.hole) left--;
  while (right < candles.length && candles[right]?.hole) right++;
  if (!candles[left] || !candles[right] || right - left <= 1) return base;
  const progress = Math.max(0, Math.min(1, (position - left) / (right - left)));
  const height = Math.min(100, 35 + (right - left - 1) * 5);
  return base - 4 * height * progress * (1 - progress);
};

// The pet has its own footprint on the same candle bodies; never interpolate through a tall body.
export function petTrackHeightAt(candles: Candle[], x: number, candleWidth: number, fallback: number): number {
  // Every companion leaps between solid candle centres across a gap, with no species-specific clock.
  const position=x/candleWidth-.5;
  let left=Math.floor(position),right=Math.ceil(position);
  while(left>=0&&candles[left]?.hole)left--;
  while(right<candles.length&&candles[right]?.hole)right++;
  const before=candles[left],after=candles[right];
  let jumpFloor=Infinity;
  if(before&&!before.hole&&after&&!after.hole&&right-left>1) {
    const t=Math.max(0,Math.min(1,(position-left)/(right-left)));
    const height=Math.min(90,28+(right-left-1)*6);
    jumpFloor=before.top*(1-t)+after.top*t-4*height*t*(1-t);
  }
  let floor = Infinity;
  const first = Math.max(0,Math.floor((x-3)/candleWidth));
  const last = Math.min(candles.length-1,Math.floor((x+3)/candleWidth));
  for (let i=first;i<=last;i++) {
    const candle=candles[i];
    if (candle && !candle.hole) floor=Math.min(floor,candle.top);
  }
  return Math.min(jumpFloor,Number.isFinite(floor) ? floor : trackHeightAt(candles,x,candleWidth,fallback));
}

// Home's SVG market uses the game's foot anchor; position is the hero's fractional candle index.
export function menuPetSurfaceOffset(tops: number[], position: number, offset: number, scale: number, spacing: number): number {
  if (!tops.length || scale<=0 || spacing<=0) return 0;
  const sample=(i: number)=>tops[((i%tops.length)+tops.length)%tops.length];
  const index=Math.floor(position), fraction=position-index;
  const hero=sample(index)*(1-fraction)+sample(index+1)*fraction;
  const petPosition=position+offset*scale/spacing;
  const radius=3*scale/spacing;
  let floor=Infinity;
  for(let i=Math.floor(petPosition-radius+.5);i<=Math.floor(petPosition+radius+.5);i++) floor=Math.min(floor,sample(i));
  return (floor-hero)/scale;
}

// Sample the candle tops, bridging missing candles without using gap sentinel values.
export const trackHeightAt = (candles: Candle[], x: number, candleWidth: number, fallback: number): number => {
  const position = x / candleWidth - 0.5;
  let left = Math.min(candles.length - 1, Math.floor(position));
  let right = Math.max(0, Math.ceil(position));
  while (left >= 0 && (!candles[left] || candles[left].hole)) left--;
  while (right < candles.length && (!candles[right] || candles[right].hole)) right++;
  const before = candles[left];
  const after = candles[right];
  if (!before) return after?.top ?? fallback;
  if (!after) return before.top;
  if (left === right) return before.top;
  const fraction = Math.max(0, Math.min(1, (position - left) / (right - left)));
  return before.top + (after.top - before.top) * fraction;
};