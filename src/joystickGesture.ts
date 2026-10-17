// Hysteresis allows another upward swipe without lifting the captured finger.
export function joystickSwipe(upwardDistance: number, radius: number, latched: boolean, horizontalDistance = 0) {
  const threshold = Math.max(12, radius * 0.6);
  // Count upper diagonals by their full travel, without turning sideways jitter into jumps.
  const travel = upwardDistance > 0 && upwardDistance >= Math.abs(horizontalDistance) * 0.35
    ? Math.hypot(upwardDistance, horizontalDistance) : upwardDistance;
  const jump = !latched && travel >= threshold;
  return { jump, latched: travel <= threshold / 3 ? false : latched || jump };
}