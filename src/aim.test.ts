// Regression checks for aim.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { aimedVelocity, pointerToWorld, plotViewY } from './aim';
import { createBossArena, throwBossCase } from './boxingRules';

test('mouse aim supports all directions and preserves projectile speed', () => {
  for (const target of [{ x: -20, y: 0 }, { x: 0, y: -20 }, { x: 15, y: 20 }]) {
    const velocity = aimedVelocity({ x: 0, y: 0 }, target, 12);
    assert(Math.abs(Math.hypot(velocity.x, velocity.y) - 12) < 0.001);
    assert.equal(Math.sign(velocity.x), Math.sign(target.x));
    assert.equal(Math.sign(velocity.y), Math.sign(target.y));
  }
  assert.deepEqual(aimedVelocity({ x: 1, y: 1 }, { x: 1, y: 1 }, 12), { x: 12, y: 0 });
});

test('pointer mapping accounts for canvas scaling and camera offset', () => {
  assert.deepEqual(pointerToWorld({ x: 490, y: 230 }, { left: 10, top: 20, width: 960, height: 420 }, 1920, 840, { x: 300, y: -100 }), { x: 1260, y: 320 });
});

test('inverted plot reflects only the chart and maps mouse aim back to world coordinates', () => {
  for (const y of [44, 100, 420, 700, 828]) {
    assert.equal(plotViewY(y, false, 44, 828), y);
    assert.equal(plotViewY(y, true, 44, 828), 872 - y);
    assert.equal(plotViewY(plotViewY(y, true, 44, 828), true, 44, 828), y);
  }
  // Head above feet in world space appears below feet after reflection.
  assert(plotViewY(350, true, 44, 828) > plotViewY(400, true, 44, 828));
});

test('Pigeon can exit inverted and the header can toggle the same persistent view', () => {
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(game, /g\.printerExitInverted = Math\.random\(\) < 0\.5/);
  const exitChoice = game.match(/g\.printerExitInverted = (Math\.random\(\) < 0\.5)/)![1];
  const chooseExit = new Function('Math', `return ${exitChoice};`) as (math: { random: () => number }) => boolean;
  assert.equal(chooseExit({ random: () => 0 }), true);
  assert.equal(chooseExit({ random: () => 0.499999 }), true);
  assert.equal(chooseExit({ random: () => 0.5 }), false);
  assert.equal(chooseExit({ random: () => 0.999999 }), false);
  assert.equal(Array.from({ length: 1000 }, (_, i) => chooseExit({ random: () => i / 1000 })).filter(Boolean).length, 500);
  const activation = game.slice(game.indexOf('const activatePrinter ='), game.indexOf('const awardEnemy ='));
  assert.match(activation, /g\.invertedView = g\.printerExitInverted/);
  assert.doesNotMatch(game, /forcedPrinterExit/);
  assert.doesNotMatch(game, /g\.printerProgress >= g\.printerEndX - 360/);
  const hawk = game.slice(game.indexOf('const activateHawk ='), game.indexOf('const activatePrinter ='));
  assert.match(hawk, /if \(g\.printerTimer > 0\) g\.invertedView = g\.printerExitInverted/);
  assert.match(hawk, /g\.printerExitInverted = g\.invertedView/);
  const boxing = game.slice(game.indexOf("if (state === 'boxing' && !bossTrack.current && g.p)"));
  assert.match(boxing, /g\.invertedView = false; g\.printerExitInverted = false/);
  assert.match(game, /g\.invertedView = g\.printerExitInverted/);
  assert.match(game, /g\.invertedView = !g\.invertedView/);
  assert.match(game, /g\.invertedView = false; g\.printerExitInverted = false/);
  assert.match(game, /whiteSwan \? \{ \.\.\.s, kind: 'white' \} : s/);
  assert.equal((game.match(/aimRef\.current\.y = g\.cy \+ plotViewY/g) ?? []).length, 2);
  assert.match(app, /aria-label="Toggle inverted chart view" disabled=\{state === 'boxing'\}/);
  assert.match(app, /invertedRequest=\{invertedRequest\}/);
});

test('boss throw aims upward and left and cannot fire while holding a bag', () => {
  const arena = createBossArena();
  arena.aim = { x: 0, y: 0 };
  assert(throwBossCase(arena));
  assert.equal(arena.player.facing, -1);
  assert(arena.cases[0].vx < 0 && arena.cases[0].vy < 0);
  arena.player.throwTimer = 0;
  arena.bagTimer = 100;
  assert(!throwBossCase(arena));
});