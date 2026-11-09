// Broad, non-periodic delays with a minimum spacing; a random source makes tests reproducible.
export function randomDelay(minimum: number, mean: number, random = Math.random): number {
  const roll = Math.max(0, Math.min(1 - Number.EPSILON, random()));
  const tail = Math.min(4, -Math.log(1 - roll));
  return Math.floor(minimum + Math.max(0, mean - minimum) * tail);
}