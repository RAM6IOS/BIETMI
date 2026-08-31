#!/usr/bin/env node
/**
 * Design token guard.
 *
 * Scans `src` (excluding `src/components/ui` and `src/index.css`) and fails
 * when it finds raw semantic color classes (indigo-*, green-*, red-*, ...).
 * Forces contributors to use `src/components/ui/` components and the semantic
 * tokens defined in docs/DESIGN_SYSTEM.md instead.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import process from 'node:process';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = join(ROOT, 'src');
const EXCLUDE_DIRS = new Set([join(SRC, 'components', 'ui')]);
const EXCLUDE_FILES = new Set([join(SRC, 'index.css')]);

// Semantic color families that must not be used as raw utilities outside ui/.
// gray-* is intentionally allowed (neutral text/borders remain laid out by ui kit).
const FORBIDDEN = [
  'indigo', 'green', 'red', 'blue', 'purple', 'amber', 'emerald',
  'pink', 'rose', 'orange', 'lime', 'teal', 'cyan', 'sky', 'violet',
  'fuchsia', 'slate', 'zinc', 'neutral', 'stone',
];

const UTILITY = '(?:bg|text|border|ring|from|to|via|fill|stroke|accent|shadow|divide|placeholder|decoration|outline|caret|border-b|border-t)';
const COLOR_RE = new RegExp(`${UTILITY}-(${FORBIDDEN.join('|')})-(\\d{1,3})|(?:^|[\\s'"])(${FORBIDDEN.join('|')})-(\\d{1,3})`);

function collectFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (EXCLUDE_DIRS.has(full)) continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      collectFiles(full, acc);
    } else if (/\.(tsx|ts|css)$/.test(entry) && !EXCLUDE_FILES.has(full)) {
      acc.push(full);
    }
  }
  return acc;
}

let failed = false;

for (const file of collectFiles(SRC)) {
  const content = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file);
  content.split('\n').forEach((line, i) => {
    const m = line.match(COLOR_RE);
    if (m) {
      failed = true;
      console.error(
        `${rel}:${i + 1}: raw semantic color "${m[0].trim()}" is forbidden here. ` +
          'Use src/components/ui/ components and semantic tokens (primary/success/danger/surface).',
      );
    }
  });
}

if (failed) {
  console.error('\nDesign token check failed. See docs/DESIGN_SYSTEM.md.');
  process.exit(1);
}

console.log('Design token check passed.');
