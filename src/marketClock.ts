// Fictional market minutes, not wall-clock time. Each session has 390 candles.
export function marketClockLabel(index: number): string {
  const day = Math.floor(Math.max(0, index) / 390) + 1;
  const minute = index < 0 ? 570 + index : 570 + index % 390;
  const normalized = ((minute % 1440) + 1440) % 1440;
  const time = `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
  return day > 1 ? `D${day} ${time}` : time;
}

export function marketClockStep(candlePixels: number, labelPixels: number): number {
  return Math.max(5, Math.ceil(labelPixels / Math.max(1, candlePixels) / 5) * 5);
}