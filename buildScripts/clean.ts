/**
 * Native replacement for `rimraf`. Removes the given paths, expanding glob
 * patterns, recursively and without error if a path doesn't exist.
 *
 * Usage: tsx buildScripts/clean.ts <path-or-glob> [<path-or-glob> ...]
 */
import { globSync, rmSync } from "node:fs";

const patterns = process.argv.slice(2);

if (patterns.length === 0) {
  console.error("Usage: tsx buildScripts/clean.ts <path-or-glob> [<path-or-glob> ...]");
  process.exit(1);
}

for (const pattern of patterns) {
  const targets = globSync(pattern);
  for (const target of targets) {
    rmSync(target, { recursive: true, force: true });
  }
}
