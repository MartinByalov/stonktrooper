import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { drawPickupAsset, drawApeHead, drawSwanAsset } from './assetRenderer';
import { FEDORA_DURATION, FEDORA_MAX_THROWS, FEDORA_WINDUP, addFedoraTime, weaponHatCount, fedoraArmPose, fedoraHit, fedoraHitsMount, separateFedoraMount, stepFlyingFedora, type FlyingFedora } from './fedoraBoomerang';
import { drawSpinningFedora } from './fedoraRenderer';
import { drawAnimalCharacter } from './animalRenderer';
import { drawDumpster } from './dumpsterRenderer';
import type { Animal, Candle, Swan } from './types';

test('pickup uses a volumetric rotating brim, crown and band in both themes', () => {
  for (const darkMode of [false, true]) {
    const fills: string[] = [], scales: number[][] = [], rotations: number[] = [];
    const paths: { color: string; points: number[][] }[] = [];
    let points: number[][] = [], fillStyle = '';
    const ctx = new Proxy({}, {
      get: (_, key) => key === 'fill' ? () => { fills.push(fillStyle); paths.push({ color: fillStyle, points: [...points] }); }
        : key === 'rotate' ? (angle: number) => rotations.push(angle)
        : key === 'scale' ? (sx: number, sy: number) => scales.push([sx, sy])
        : key === 'beginPath' ? () => { points = []; }
        : key === 'moveTo' || key === 'lineTo' ? (x: number, y: number) => { points.push([x, y]); }
        : () => {},
      set: (_, key, value) => { if (key === 'fillStyle') fillStyle = value as string; return true; },
    }) as CanvasRenderingContext2D;
    drawPickupAsset(ctx, { type: 'fedora', x: 10, y: 300, taken: false }, 10, 300, 0, darkMode);
    assert(fills.includes(darkMode ? '#f8fafc' : '#111318'));
    assert(fills.includes(darkMode ? '#111318' : '#ffffff'));
    assert(paths.some(path => path.points.length === 4 && path.color === (darkMode ? '#cbd5e1' : '#080a0e')));
    assert.deepEqual(scales, [[0.7, 0.7]]);
    assert.equal(rotations.length, 0);
  }
});

test('fedora pickup rotates in the opposite direction without changing the flying fedora', () => {
  const top = (draw: (ctx: CanvasRenderingContext2D) => void) => {
    const tops: number[][][] = [];
    let points: number[][] = [], color = '';
    const ctx = new Proxy({}, {
      get: (_, key) => key === 'beginPath' ? () => { points = []; }
        : key === 'moveTo' || key === 'lineTo' ? (x: number, y: number) => { points.push([x, y]); }
          : key === 'fill' ? () => { if (color === '#24262b' && points.length === 32) tops.push(points); }
            : () => {},
      set: (_, key, value) => { if (key === 'fillStyle') color = value as string; return true; },
    }) as CanvasRenderingContext2D;
    draw(ctx);
    return tops[0];
  };
  const pickup = top(ctx => drawPickupAsset(ctx, { type: 'fedora', x: 0, y: 0, taken: false }, 0, 0, 10));
  // The pickup's 0.7 scale applies to its projected 3D crown as well.
  const reversed = top(ctx => { ctx.save(); ctx.scale(0.7, 0.7); drawSpinningFedora(ctx, -0.7, false); ctx.restore(); });
  const forward = top(ctx => { ctx.save(); ctx.scale(0.7, 0.7); drawSpinningFedora(ctx, 0.7, false); ctx.restore(); });
  assert(pickup && reversed);
  for (let i = 0; i < pickup.length; i++) {
    assert(Math.abs(pickup[i][0] - reversed[i][0]) < 1e-10);
    assert(Math.abs(pickup[i][1] - reversed[i][1]) < 1e-10);
  }
  assert.notDeepEqual(pickup, forward);
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /drawSpinningFedora\(ctx, g\.flyingFedora\.angle, theme === 'dark'\)/);
});

test('3D rotation moves ribbon and shading but keeps full brim width at quarter turns', () => {
  const draw = (angle: number) => {
    const paths: { color: string; points: number[][] }[] = [];
    let color = '', points: number[][] = [];
    const ctx = new Proxy({}, {
      get: (_, key) => key === 'beginPath' ? () => { points = []; }
        : key === 'moveTo' || key === 'lineTo' ? (x: number, y: number) => { points.push([x, y]); }
        : key === 'fill' ? () => { paths.push({ color, points: [...points] }); }
        : () => {},
      set: (_, key, value) => { if (key === 'fillStyle') color = value as string; return true; },
    }) as CanvasRenderingContext2D;
    drawSpinningFedora(ctx, angle, false);
    const brim = paths.filter(path => path.color === '#111318' || path.color === '#080a0e');
    const xs = brim.flatMap(path => path.points.map(point => point[0]));
    return { width: Math.max(...xs) - Math.min(...xs), paths };
  };
  const front = draw(0), side = draw(-Math.PI / 2), back = draw(Math.PI / 2);
  assert(front.width > 35 && side.width > 25 && back.width > 25);
  assert.notDeepEqual(front.paths, side.paths);
  assert.notDeepEqual(side.paths, back.paths);
  assert(side.paths.filter(path => path.color === '#ffffff').length > back.paths.filter(path => path.color === '#ffffff').length);
});

test('spinning fedora has a shallow, level crown beneath its tilt at every rotation', () => {
  for (const darkMode of [false, true]) for (const angle of [0, -Math.PI / 2, Math.PI / 2]) {
    const paths: { color: string; points: number[][] }[] = [];
    let color = '', points: number[][] = [];
    const ctx = new Proxy({}, {
      get: (_, key) => key === 'beginPath' ? () => { points = []; }
        : key === 'moveTo' || key === 'lineTo' ? (x: number, y: number) => { points.push([x, y]); }
          : key === 'fill' ? () => { paths.push({ color, points: [...points] }); }
            : () => {},
      set: (_, key, value) => { if (key === 'fillStyle') color = value as string; return true; },
    }) as CanvasRenderingContext2D;
    drawSpinningFedora(ctx, angle, darkMode);
    const top = paths.find(path => path.points.length === 32 && path.color === (darkMode ? '#ffffff' : '#24262b'));
    assert(top);
    top.points.forEach(([x, y], i) => {
      const a = i * Math.PI * 2 / 32;
      const depth = -Math.cos(a) * 8 * Math.sin(angle) + Math.sin(a) * 5.5 * Math.cos(angle);
      const untiltedY = -x * Math.sin(-0.12) + y * Math.cos(-0.12);
      assert(Math.abs(untiltedY - depth * 0.34 + 10) < 1e-9);
    });
  }
});

test('weapon time accumulates and the extra hat remains available after the last throw', () => {
  assert.equal(addFedoraTime(0), FEDORA_DURATION);
  assert.equal(addFedoraTime(250), 250 + FEDORA_DURATION);
  assert.equal(addFedoraTime(addFedoraTime(250)), 250 + 2 * FEDORA_DURATION);
  assert.equal(weaponHatCount(0), 0);
  assert.equal(weaponHatCount(1), 1);
  assert.equal(weaponHatCount(FEDORA_DURATION), 1);
  assert.equal(weaponHatCount(FEDORA_DURATION + 1), 2);
  assert.equal(weaponHatCount(250 + 2 * FEDORA_DURATION), 3);
  // The last throw sets the throw count to zero, but does not end the timer.
  assert.equal(weaponHatCount(FEDORA_DURATION - 1), 1);
});

test('Hawk clown wears collected fedora as a visual effect without dressing the monkey passengers', () => {
  for (const darkMode of [false, true]) {
    const draw = (fedoraHats: number) => {
      const brimPositions: { x: number; y: number; scale: number }[] = [];
      let brimCount = 0;
      let color = '';
      let x = 0, y = 0, scale = 1;
      const stack: { x: number; y: number; scale: number }[] = [];
      const ctx = new Proxy({}, {
        get: (_, key) => key === 'save' ? () => { stack.push({ x, y, scale }); }
          : key === 'restore' ? () => { ({ x, y, scale } = stack.pop()!); }
          : key === 'translate' ? (dx: number, dy: number) => { x += dx * scale; y += dy * scale; }
          : key === 'scale' ? (sx: number) => { if (sx === 0.65) brimPositions.push({ x, y, scale: sx }); scale *= sx; }
          : key === 'fill' ? () => { if (color === (darkMode ? '#f8fafc' : '#111318')) brimCount++; }
          : () => {},
        set: (_, key, value) => { if (key === 'fillStyle') color = value as string; return true; },
      }) as CanvasRenderingContext2D;
      drawDumpster(ctx, 2, 0, fedoraHats, darkMode);
      return { brimPositions, brimCount };
    };
    assert.deepEqual(draw(0), { brimPositions: [], brimCount: 0 });
    assert.deepEqual(draw(3), { brimPositions: [
      { x: 6, y: -50, scale: 0.65 },
      { x: 6, y: -60, scale: 0.65 },
      { x: 6, y: -70, scale: 0.65 },
    ], brimCount: 3 });
  }
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /if \(g\.hawkTimer > 0 && g\.p\.rocketTimer <= 0\) \{\s*drawDumpster\(ctx, g\.apes\.length, g\.p\.ph, weaponHatCount\(g\.fedoraTimer, g\.fedoraWindup, !!g\.flyingFedora\), theme === 'dark',/);
  assert.match(game, /if \(g\.currentState !== 'play' \|\| g\.falling \|\| g\.hawkTimer > 0 [^\n]*\) return;/);
});

test('white and black spinning fedoras each use the opposite solid band color', () => {
  for (const darkMode of [false, true]) {
    const fills: string[] = [];
    let fillStyle = '';
    const ctx = new Proxy({}, {
      get: (_, key) => key === 'fill' ? () => fills.push(fillStyle) : () => {},
      set: (_, key, value) => { if (key === 'fillStyle') fillStyle = value as string; return true; },
    }) as CanvasRenderingContext2D;
    drawSpinningFedora(ctx, -Math.PI / 2, darkMode);
    assert(fills.includes(darkMode ? '#f8fafc' : '#111318'));
    assert(fills.includes(darkMode ? '#111318' : '#ffffff'));
  }
});

test('throwing arm stays low while running and swings sideways from behind to forward', () => {
  const idle = fedoraArmPose(0);
  const start = fedoraArmPose(FEDORA_WINDUP);
  const middle = fedoraArmPose(FEDORA_WINDUP / 2);
  const release = fedoraArmPose(1);
  assert(idle.handY > -31 && idle.elbowY > -31);
  assert(start.handX < idle.handX);
  assert(middle.handX > start.handX && middle.handX < release.handX);
  assert(release.handX > 25);
  assert([start, middle, release].every(pose => pose.handY > -31 && pose.elbowY > -31));
});

test('weapon fedora leaves the head during windup and flight and returns when caught', () => {
  assert.equal(weaponHatCount(0), 0);
  assert.equal(weaponHatCount(FEDORA_DURATION), 1);
  assert.equal(weaponHatCount(FEDORA_DURATION, FEDORA_WINDUP), 0);
  assert.equal(weaponHatCount(FEDORA_DURATION, 0, true), 0);
  assert.equal(weaponHatCount(FEDORA_DURATION, 0, false), 1);
  assert.equal(weaponHatCount(0, 0, false), 0);
  assert.equal(weaponHatCount(FEDORA_DURATION * 2, FEDORA_WINDUP), 1);
  assert.equal(weaponHatCount(FEDORA_DURATION * 2, 0, true), 1);
  assert.equal(weaponHatCount(FEDORA_DURATION * 2, 0, false), 2);
});

test('monkey replaces its captain cap with the weapon fedora at head level', () => {
  const capFills = (wearCaptainCap: boolean) => {
    const fills: string[] = [];
    let color = '';
    const ctx = new Proxy({}, {
      get: (_, key) => key === 'fill' ? () => fills.push(color) : () => {},
      set: (_, key, value) => { if (key === 'fillStyle') color = value as string; return true; },
    }) as CanvasRenderingContext2D;
    drawApeHead(ctx, wearCaptainCap);
    return fills.filter(fill => fill === '#f8fafc').length;
  };
  assert.equal(capFills(true), 1);
  assert.equal(capFills(false), 0);
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.match(game, /if \(g\.apeTimer > 0\) \{\s*ctx\.save\(\); ctx\.translate\(3, -42\); ctx\.scale\(0\.8, 0\.8\); drawApeHead\(ctx, g\.fedoraTimer <= 0\)/);
  assert.match(game, /ctx\.translate\(3, \(g\.apeTimer > 0 \? -42 : -50\) - i \* 11\); ctx\.scale\(0\.8, 0\.8\);\s*drawCharacterHat\(ctx, false, false, theme === 'dark'\)/);
});

test('hat follows graph, turns at right edge, spins and returns to moving player', () => {
  const candles = Array.from({ length: 180 }, (_, i) => ({ top: i < 50 ? 200 : 260 } as Candle));
  const hat: FlyingFedora = { x: 120, y: 168, angle: 0, returning: false };
  let turned = false, caught = false, followedHigherTrack = false;
  for (let frame = 0; frame < 100; frame++) {
    const playerX = 100 + frame * 2;
    caught = stepFlyingFedora(hat, playerX, candles, 9, 650);
    if (hat.x > 500 && hat.x < 600 && hat.y > 205) followedHigherTrack = true;
    if (hat.returning) turned = true;
    assert(hat.x <= 650 - 18);
    if (caught) break;
  }
  assert(turned);
  assert(caught);
  assert(hat.angle > 0);
  assert(followedHigherTrack);
  assert(Math.abs(hat.y - 168) < 33);
});

test('fedora decorates every bird and unmounted animal on half of impacts, stacking hats', () => {
  for (const type of ['whale', 'bull', 'bear'] as const) {
    const animal: Animal = { type, x: 120, y: 130, feet: 160, phase: 0, dead: false };
    assert.equal(fedoraHit(animal, 0), 'hat');
    assert.equal(fedoraHit(animal, 0.4999), 'hat');
    assert.equal(fedoraHit(animal, 0.5), 'kill');
    assert.equal(animal.fedoraHats, 2);
    assert.equal(animal.dead, false);
  }
  for (const kind of ['swan', 'white', 'pigeon', 'hawk'] as const) {
    const bird: Swan = { kind, x: 120, y: 130, baseY: 130, phase: 0, dead: false };
    assert.equal(fedoraHit(bird, 0), 'hat');
    assert.equal(fedoraHit(bird, 0.49), 'hat');
    assert.equal(fedoraHit(bird, 0.5), 'kill');
    assert.equal(bird.fedoraHats, 2);
    assert.equal(bird.dead, false);
  }
});

test('mounted fedora impacts decorate rider or mount independently', () => {
  for (const mount of ['bull', 'bear', 'whale'] as const) {
    const animal: Animal = { type: mount === 'bull' ? 'bear' : 'bull', mount, x: 120, y: 130, feet: 160, phase: 0, dead: false };
    assert.equal(fedoraHitsMount(animal, 65, 5), true);
    assert.equal(fedoraHitsMount(animal, 5, 65), false);
    assert.equal(fedoraHit(animal, 0.1, true), 'hat');
    assert.equal(fedoraHit(animal, 0.2), 'hat');
    assert.equal(animal.mountFedoraHats, 1);
    assert.equal(animal.fedoraHats, 1);
  }
});

test('a lethal mount hit separates a surviving rider and preserves each hat stack', () => {
  for (const mount of ['bull', 'bear', 'whale'] as const) {
    const animal: Animal = { type: 'bull', mount, x: 120, y: 130, feet: 160, phase: 0, dead: false,
      fedoraHats: 2, mountFedoraHats: 3 };
    const rider = separateFedoraMount(animal);
    assert.equal(rider.type, 'bull');
    assert.equal(rider.mount, undefined);
    assert.equal(rider.fedoraHats, 2);
    assert.equal(animal.type, mount);
    assert.equal(animal.mount, undefined);
    assert.equal(animal.fedoraHats, 3);
    assert.equal(animal.mountFedoraHats, undefined);
  }
});

test('fedora hats render separately on riders, mounts and every bird type', () => {
  const hatFills = (draw: (ctx: CanvasRenderingContext2D) => void, darkMode: boolean) => {
    let color = '', count = 0;
    const ctx = new Proxy({}, {
      get: (_, key) => key === 'createLinearGradient' || key === 'createRadialGradient'
        ? () => ({ addColorStop() {} })
        : key === 'fill' ? () => { if (color === (darkMode ? '#f8fafc' : '#111318')) count++; }
          : () => {},
      set: (_, key, value) => { if (key === 'fillStyle') color = value as string; return true; },
    }) as CanvasRenderingContext2D;
    draw(ctx);
    return count;
  };
  for (const darkMode of [false, true]) {
    for (const mount of ['bull', 'bear', 'whale'] as const) {
      const animal: Animal = { type: mount === 'bull' ? 'bear' : 'bull', mount,
        x: 120, y: 130, feet: 160, phase: 0, dead: false, fedoraHats: 1, mountFedoraHats: 2 };
      const draw = (ctx: CanvasRenderingContext2D) => drawAnimalCharacter(ctx, animal, false, false, darkMode);
      assert.equal(hatFills(draw, darkMode) - hatFills(ctx => drawAnimalCharacter(ctx, { ...animal, mountFedoraHats: 0 }, false, false, darkMode), darkMode), 2);
      assert.equal(hatFills(draw, darkMode) - hatFills(ctx => drawAnimalCharacter(ctx, { ...animal, fedoraHats: 0 }, false, false, darkMode), darkMode), 1);
    }
    for (const kind of ['swan', 'white', 'pigeon', 'hawk'] as const) {
      const bird: Swan = { kind, x: 120, y: 130, baseY: 130, phase: 0, dead: false, fedoraHats: 2 };
      assert.equal(hatFills(ctx => drawSwanAsset(ctx, bird, false, darkMode), darkMode)
        - hatFills(ctx => drawSwanAsset(ctx, { ...bird, fedoraHats: 0 }, false, darkMode), darkMode), 2);
    }
  }
});

test('whale rendering stacks gently tilted hats per successful fedora hit in both themes', () => {
  const whale: Animal = { type: 'whale', x: 120, y: 130, feet: 160, phase: 0, dead: false, fedoraHats: 2 };
  for (const darkMode of [false, true]) {
    const translations: number[][] = [], fills: string[] = [], rotations: number[] = [];
    let color = '';
    const ctx = new Proxy({}, {
      get: (_, key) => key === 'translate' ? (x: number, y: number) => translations.push([x, y])
        : key === 'rotate' ? (angle: number) => rotations.push(angle)
        : key === 'createLinearGradient' ? () => ({ addColorStop: () => {} })
        : key === 'fill' ? () => fills.push(color)
        : () => {},
      set: (_, key, value) => { if (key === 'fillStyle') color = value as string; return true; },
    }) as CanvasRenderingContext2D;
    drawAnimalCharacter(ctx, whale, false, false, darkMode);
    assert(translations.some(([x, y]) => x === -26 && y === -51));
    assert(translations.some(([x, y]) => x === -26 && y === -63));
    assert.equal(fills.filter(fill => fill === (darkMode ? '#f8fafc' : '#111318')).length, 2);
    assert.equal(rotations.filter(angle => angle === -0.1).length, 2);
    assert.equal(rotations.filter(angle => angle === -0.12).length, 2);
  }
});

test('pickup, stack, windup, attack and theme-aware Live Feed timer are wired in gameplay', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  assert.equal(FEDORA_DURATION, 600);
  assert.equal(FEDORA_MAX_THROWS, 3);
  assert.equal(FEDORA_WINDUP, 10);
  assert.match(game, /type: 'fedora', taken: false/);
  assert.match(game, /g\.fedoraTimer = addFedoraTime\(g\.fedoraTimer\);\s*g\.fedoraCount = FEDORA_MAX_THROWS/);
  assert.match(game, /if \(g\.fedoraTimer > 0 && g\.fedoraCount > 0\)/);
  assert.match(game, /g\.fedoraCount--/);
  assert.match(game, /g\.fedoraWindup = FEDORA_WINDUP/);
  assert.match(game, /g\.flyingFedora = \{[^\n]+returning: false \};\s*sound\.playFedoraThrow\(\)/);
  assert.match(game, /if \(g\.flyingFedora\) \{\s*sound\.playFedoraFly\(\)/);
  assert.match(game, /fedoraHit\(enemy, Math\.random\(\), mountHit\) === 'hat'\) \{\s*sound\.playFedoraHit\(\)/);
  assert.match(game, /sound\.playFedoraHit\(\);\s*\}\s*if \(caught\)/);
  assert.match(game, /stepFlyingFedora\(hat, g\.p\.x, g\.C, CW, g\.cx \+ W - AX\)/);
  assert.match(game, /drawSpinningFedora\(ctx, g\.flyingFedora\.angle, theme === 'dark'\)/);
  assert.match(game, /ctx\.translate\(g\.flyingFedora\.x - g\.cx, g\.flyingFedora\.y - g\.cy\);\s*ctx\.scale\(0\.7, 0\.7\);\s*drawSpinningFedora/);
  assert.match(game, /const arm = fedoraArmPose\(g\.fedoraWindup\)/);
  assert.match(game, /if \(caught\) g\.flyingFedora = null/);
  assert.match(game, /hat\.hitTargets\?\.has\(enemy\)/);
  assert.match(game, /fedoraHit\(enemy, Math\.random\(\), mountHit\) === 'hat'/);
  assert.match(game, /if \('type' in enemy && mountHit\) g\.animals\.push\(separateFedoraMount\(enemy\)\)/);
  assert.match(game, /if \('type' in enemy && enemy\.mount && !mountHit\) \{/);
  assert.match(game, /for \(let i = 0; i < weaponHatCount\(g\.fedoraTimer, g\.fedoraWindup, !!g\.flyingFedora\); i\+\+\)/);
  assert.match(game, /drawApeHead\(ctx, g\.fedoraTimer <= 0\);[\s\S]*?for \(let i = 0; i < weaponHatCount\(g\.fedoraTimer, g\.fedoraWindup, !!g\.flyingFedora\); i\+\+\) \{\s*\/\/[^\n]*\n\s*ctx\.save\(\); ctx\.translate\(3, \(g\.apeTimer > 0 \? -42 : -50\) - i \* 11\)/);
  assert.match(game, /theme === 'dark' \? '#ffffff' : '#05070a'/);
  assert.match(game, /W \* Math\.min\(1, g\.fedoraTimer \/ FEDORA_DURATION\)/);
});