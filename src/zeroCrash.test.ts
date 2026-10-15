// Regression checks for zeroCrash.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { zeroCrashCamera, zeroCrashComplete } from './zeroCrash';

test('crash follows the falling candle until its opening reaches the top and lasts at least 2.5 seconds', () => {
  const top = 600, tape = 40;
  let camera = 100, feet = top, velocity = 2, endedAt = 0;
  for (let frame = 1; frame <= 600; frame++) {
    velocity = Math.min(12, velocity + 0.35);
    feet += velocity;
    const previous = camera;
    camera = zeroCrashCamera(camera, feet, top, 840, tape);
    assert(camera >= previous && camera <= top - tape);
    if (zeroCrashComplete(frame, top, camera, tape)) { endedAt = frame; break; }
  }
  assert(endedAt >= 150 && endedAt < 600);
  assert(top - camera <= tape + 2);
  assert(!zeroCrashComplete(149, top, top - tape, tape));
});