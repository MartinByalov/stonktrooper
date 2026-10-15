// Browser game module for birdCargo.
import type { Animal, Candle } from './types';

export function randomBirdCargo(random = Math.random): Animal['type'] | undefined {
  if (random() >= 0.22) return undefined;
  return (['bull', 'bear', 'whale'] as const)[Math.floor(random() * 3)];
}

export function canReleaseBirdCargo(x: number, cameraX: number, playerX: number, width: number, candleWidth: number, candles: Candle[], releaseRatio: number): boolean {
  const screenX = x - cameraX;
  return screenX >= width * 0.55 && screenX <= width * releaseRatio
    && x - playerX >= 420 && !!candles[Math.floor(x / candleWidth)]
    && !candles[Math.floor(x / candleWidth)].hole;
}