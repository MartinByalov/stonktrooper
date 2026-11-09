// A modest on-foot perk; special movement modes keep their own speed balance.
export const runnerShoeSpeedMultiplier = (shoes: string, specialMovement = false): number =>
  shoes === 'shoes-moon' && !specialMovement ? 1.06 : 1;