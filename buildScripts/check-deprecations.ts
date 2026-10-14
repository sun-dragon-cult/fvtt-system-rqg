import fs from "fs";
import path from "path";
import process from "process";
import { pathToFileURL } from "url";

/**
 * Fail a release that still contains deprecations due for removal: every `warnDeprecated` call
 * (src/system/deprecation.ts) states `until: "x.y.z"`, and releasing x.y.z or later with it still
 * in the code is an error.
 *
 *   tsx buildScripts/check-deprecations.ts <version>   (a leading "v" is ignored)
 */

const UNTIL_PATTERN = /until:\s*"(\d+\.\d+\.\d+)"/g;

export type DueDeprecation = { file: string; line: number; until: string };

/** Compare two x.y.z versions; prerelease suffixes ("-beta.1") are ignored. */
export function compareVersions(a: string, b: string): number {
  const parts = (v: string) =>
    v
      .replace(/^v/, "")
      .split("-")[0]!
      .split(".")
      .map((n) => Number(n) || 0);
  const [pa, pb] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

/** The deprecations in `source` whose `until` is at or before `version`. */
export function findDueDeprecations(
  file: string,
  source: string,
  version: string,
): DueDeprecation[] {
  return source
    .split("\n")
    .flatMap((text, index) =>
      [...text.matchAll(UNTIL_PATTERN)]
        .filter((match) => compareVersions(version, match[1]!) >= 0)
        .map((match) => ({ file, line: index + 1, until: match[1]! })),
    );
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(full);
    }
    return entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts") ? [full] : [];
  });
}

function main(): void {
  const version = process.argv[2];
  if (!version) {
    console.error("Usage: tsx buildScripts/check-deprecations.ts <version>");
    process.exit(2);
  }
  const due = sourceFiles(path.resolve(process.cwd(), "src")).flatMap((file) =>
    findDueDeprecations(path.relative(process.cwd(), file), fs.readFileSync(file, "utf8"), version),
  );
  if (due.length) {
    console.error(`Deprecations due for removal in ${version}:`);
    due.forEach((d) => console.error(`  ${d.file}:${d.line} (until ${d.until})`));
    process.exit(1);
  }
  console.log(`No deprecations due for removal in ${version}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
