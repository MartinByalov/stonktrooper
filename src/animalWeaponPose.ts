// Both hands are attached in weapon-local space, so neither grip slides in a swing.
export function bullGripShoulder(phase: number, near: boolean) {
  // Left profile: shoulders project almost onto each other, not across a frontal chest.
  return { x: near ? -2 : -5, y: -43 - Math.abs(Math.cos(phase)) * 1.5 + (near ? 0 : -1.5) };
}

export function animalWeaponPose(bear: boolean, phase: number, attack: number, lowered = false, previewForward = false) {
  const attacking = !bear && attack > 0;
  const bob = Math.abs(Math.cos(phase)) * 1.5;
  // Keep the grips in front of the chest, not inside the torso in side profile.
  const x = bear ? -24 : attacking ? -23 : -15.5 - Math.sin(phase) * 1.2;
  const y = bear ? -31 - bob : attacking ? -39 : -26 - bob * .3;
  const swing = attack > 10 ? .7 : attack >= 5 ? .7 - (11 - attack) / 6 * 2.8 : -2.1;
  // Walking: the bat lifts on every step and taps back onto the ground.
  const stepLift = Math.abs(Math.sin(phase)) * .14;
  const angle = bear ? Math.sin(phase * 1.5) * .18 : previewForward ? -Math.PI / 2 + .2 : lowered ? -2.4 : attacking ? swing : -2.4 + stepLift;
  const point = (px: number, py: number) => ({ x: x + px * Math.cos(angle) - py * Math.sin(angle), y: y + px * Math.sin(angle) + py * Math.cos(angle) });
  // Adjacent stacked fists wrap the same handle, rather than holding its ends.
  // The near wrist overlaps in profile while both knuckles follow the bat axis.
  return { x, y, angle, far: point(bear ? -7 : 0, bear ? -7 : -9), near: point(bear ? 15 : 0, bear ? 6 : -2) };
}