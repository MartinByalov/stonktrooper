// Left-facing biped gait: planted foot travels backwards, recovery lifts forwards.
export function animalWalkPose(phase: number, near: boolean, tuck = 0, charging = false) {
  const cycle = phase + (near ? 0 : Math.PI);
  // Both femurs originate inside the same pelvis, not on opposite body edges.
  const hip = { x: near ? 0 : -2, y: -22 };
  const foot = {
    x: hip.x + Math.cos(cycle) * (charging ? 6 : 4.5) * (1 - tuck * .7),
    y: -2 - Math.max(0, Math.sin(cycle)) * 3 * (1 - tuck) - tuck * 9,
  };
  const upper = 10.5, lower = 10.5;
  const dx = foot.x - hip.x, dy = foot.y - hip.y;
  const distance = Math.hypot(dx, dy);
  const along = distance / 2;
  const bend = Math.sqrt(Math.max(0, upper * upper - along * along));
  const knee = { x: hip.x + dx / 2 - dy / distance * bend, y: hip.y + dy / 2 + dx / distance * bend };
  return { hip, knee, foot, upper, lower };
}