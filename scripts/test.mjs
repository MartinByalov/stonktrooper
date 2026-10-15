// Discover regression tests consistently on Windows and Linux.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const source = new URL('../src/', import.meta.url);
const tests = readdirSync(source).filter(name => name.endsWith('.test.ts')).sort()
  .map(name => fileURLToPath(new URL(name, source)));
if (!tests.length) throw new Error('No regression tests found.');
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...tests], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);