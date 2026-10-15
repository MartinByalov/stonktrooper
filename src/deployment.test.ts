// Protect static assets and Pages deployment configuration from regressions.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('all public image references respect the Vite deployment base', () => {
  assert.match(read('../index.html'), /href="%BASE_URL%images\/tab-icon\.png/);
  for (const file of ['App.tsx', 'MenuHero.tsx', 'ShareDD.tsx']) {
    const source = read(`./${file}`);
    assert.match(source, /import\.meta\.env\.BASE_URL/);
    assert.doesNotMatch(source, /["'`]\/images\//);
  }
  assert.match(read('./App.tsx'), /theme === 'dark' \? 'logo-inverted\.png' : 'logo\.png'/);
  for (const image of ['logo.png', 'logo-inverted.png', 'tab-icon.png', 'tab-icon-inverted.png', 'menu-hero.png', 'menu-hero-inverted.png']) {
    assert(existsSync(new URL(`../public/images/${image}`, import.meta.url)), image);
  }
});

test('Pages validates the project and deploys only the generated site', () => {
  const workflow = read('../.github/workflows/pages.yml');
  for (const command of ['npm ci', 'npm run lint', 'npm test', 'npm run build']) {
    assert(workflow.includes(command), command);
  }
  assert.match(workflow, /PAGES_BASE_PATH:.*steps\.pages\.outputs\.base_path/);
  assert.match(workflow, /path: dist/);
  assert.match(read('../vite.config.ts'), /base: process\.env\.PAGES_BASE_PATH/);
  const manifest = JSON.parse(read('../package.json'));
  const lock = JSON.parse(read('../package-lock.json'));
  assert.equal(lock.packages[''].name, manifest.name);
  assert.deepEqual(lock.packages[''].dependencies, manifest.dependencies);
  assert.deepEqual(lock.packages[''].devDependencies, manifest.devDependencies);
});