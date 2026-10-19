#!/usr/bin/env node
/**
 * Copy licensed player cutouts from design/players into web/public/players
 * so Next.js can serve them without a second committed copy.
 *
 * Why a copy script, not a committed duplicate: design/players/ is the
 * license source of truth (plus CREDITS.md). predev/prebuild copy into
 * public/. A check mode compares names so the copies cannot silently drift.
 *
 * Also copies the gitignored JR meme from local-assets into web/public/local
 * when that file exists on this machine. Never commit either destination.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const repoRoot = join(webRoot, '..');
const sourceDir = join(repoRoot, 'design', 'players');
const destDir = join(webRoot, 'public', 'players');
const localDestDir = join(webRoot, 'public', 'local');
const localSources = [
  process.env.CHALK_LOCAL_ASSETS,
  join(repoRoot, 'local-assets'),
  '/home/sidvish/Documents/Work/Personal/synthio-take-home/local-assets',
].filter(Boolean);

const check = process.argv.includes('--check');

function listMatching(dir, predicate) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(predicate).sort();
}

const sourceFiles = listMatching(
  sourceDir,
  (name) => name.endsWith('.png') || name === 'CREDITS.md'
);

if (check) {
  const destFiles = listMatching(destDir, (name) => name.endsWith('.png') || name === 'CREDITS.md');
  const missing = sourceFiles.filter((name) => !destFiles.includes(name));
  if (missing.length > 0) {
    console.error(`[sync-players] public/players is missing: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log(`[sync-players] check ok (${destFiles.length} files)`);
  process.exit(0);
}

if (!existsSync(sourceDir)) {
  console.error(`[sync-players] missing ${sourceDir}`);
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
for (const name of sourceFiles) {
  copyFileSync(join(sourceDir, name), join(destDir, name));
}
writeFileSync(join(destDir, '.gitkeep'), '');

let localCopied = [];
mkdirSync(localDestDir, { recursive: true });
writeFileSync(join(localDestDir, '.gitkeep'), '');
for (const candidate of localSources) {
  if (!existsSync(candidate)) continue;
  const files = listMatching(
    candidate,
    (name) => name === 'lebron-jr-cutout.png' || name === 'lebron-jr.jpg'
  );
  for (const name of files) {
    copyFileSync(join(candidate, name), join(localDestDir, name));
  }
  if (files.length > 0) {
    localCopied = files;
    break;
  }
}

console.log(`[sync-players] players: ${sourceFiles.length} files -> ${destDir}`);
console.log(
  localCopied.length > 0
    ? `[sync-players] local meme: ${localCopied.join(', ')} -> ${localDestDir}`
    : '[sync-players] local meme missing; JR card will use the text fallback'
);
