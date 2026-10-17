// Hysteresis allows another upward swipe without lifting the captured finger.
export function joystickSwipe(upwardDistance: number, radius: number, latched: boolean) {
  const threshold = Math.max(12, radius * 0.6);
  const jump = !latched && upwardDistance >= threshold;
  return { jump, latched: upwardDistance <= threshold / 3 ? false : latched || jump };
}