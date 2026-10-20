import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { build } from 'vite';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'build/itch');
const archive = resolve(root, 'build/stonktrooper-itch.zip');
assert.equal(process.platform, 'win32', 'This ZIP packaging command requires Windows PowerShell.');
await build({ root, base: './', build: { outDir: output, emptyOutDir: true } });
const files = [];
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await inspect(path);
    else files.push({ path: relative(output, path).replaceAll('\\', '/'), size: (await stat(path)).size });
  }
}
await inspect(output);
assert.ok(files.some(file => file.path === 'index.html'), 'index.html at archive root');
assert.ok(files.length <= 1000, 'itch.io extracted file count limit');
assert.ok(files.every(file => file.path.length <= 240 && file.size <= 200 * 1024 * 1024), 'itch.io per-file limits');
assert.ok(files.reduce((total, file) => total + file.size, 0) <= 500 * 1024 * 1024, 'itch.io extracted size limit');
const html = await readFile(resolve(output, 'index.html'), 'utf8');
assert.ok(!/(?:src|href)=["']\/(?!\/)/.test(html), 'No root-absolute HTML resource paths');
const quote = value => `'${value.replaceAll("'", "''")}'`;
const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
  `$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; ` +
  `if (Test-Path -LiteralPath ${quote(archive)}) { Remove-Item -LiteralPath ${quote(archive)} }; ` +
  `[System.IO.Compression.ZipFile]::CreateFromDirectory(${quote(output)}, ${quote(archive)}); ` +
  `$zip=[System.IO.Compression.ZipFile]::OpenRead(${quote(archive)}); ` +
  `try { if (-not ($zip.Entries | Where-Object { $_.FullName -eq 'index.html' })) { throw 'Missing root index.html' }; ` +
  `if ($zip.Entries.Count -ne ${files.length}) { throw 'ZIP entry count mismatch' } } finally { $zip.Dispose() }`,
], { stdio: 'inherit' });
assert.equal(result.status, 0, result.error?.message ?? 'ZIP packaging succeeded');
console.log(`Ready: ${archive} (${files.length} files, ${((await stat(archive)).size / 1024 / 1024).toFixed(2)} MB)`);