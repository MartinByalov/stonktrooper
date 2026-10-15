// Browser game module for swanBag.
export const swanBagPose = (charging = false, white = false) => {
  const direction = white ? -1 : 1;
  return { x: (charging ? -68 : -52) * 0.4, y: ((charging ? 2 : -36) * 0.4 + 12) * direction, direction };
};