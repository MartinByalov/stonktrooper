// Browser game module for characterPose.
export const briefcaseArmPose = (airborne: boolean, velocity: number, stride: number) => {
  if (!airborne) return {
    elbowX: 3 - stride * 4, elbowY: -21,
    handX: 3 - stride * 9, handY: -12 - stride * 1.5, angle: -stride * 0.18,
  };
  const lift = Math.min(1, Math.max(0, -velocity) / 12);
  // Upper arm trails behind the shoulder; forearm folds upward at the elbow.
  return {
    elbowX: -4 - lift * 2, elbowY: -17 + lift,
    handX: -2 - lift * 2, handY: -19 - lift * 3, angle: -0.12 - lift * 0.12,
  };
};