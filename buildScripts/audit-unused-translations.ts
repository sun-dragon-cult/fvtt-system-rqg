import fs from "fs";
import path from "path";
import process from "process";
import { dynamicKeyMap } from "./i18n-dynamic-key-map";

const DEFAULT_LANG = "en";
const DEFAULT_I18N_DIR = path.resolve(process.cwd(), "static", "i18n");
const DEFAULT_SOURCE_DIRS = ["src", "test", "tests", "buildScripts"];
const DEFAULT_SOURCE_EXTENSIONS = new Set([".ts", ".hbs", ".scss", ".js", ".mjs", ".cjs"]);

type Options = {
  failOnUnused: boolean;
  json: boolean;
  lang: string;
  sourceDirs: string[];
  verbose: boolean;
  write: boolean;
};

type AuditReport = {
  dynamicKeysExpanded: number;
  filesScanned: number;
  keysScanned: number;
  lang: string;
  localeFilesScanned: string[];
  missingDynamicKeys: string[];
  missingDynamicKeysCount: number;
  missingLiteralKeys: string[];
  missingLiteralKeysCount: number;
  removedKeys: string[];
  removedKeysCount: number;
  sourceDirs: string[];
  unusedKeys: string[];
  unusedKeysCount: number;
};

type LocaleKeyEntry = {
  filePath: string;
  key: string;
  objectPath: string[];
};

type InternalAuditReport = AuditReport & {
  unusedEntries: LocaleKeyEntry[];
};

function parseArgs(argv: string[]): Options {
  const options: Options = {
    failOnUnused: false,
    json: false,
    lang: DEFAULT_LANG,
    sourceDirs: [...DEFAULT_SOURCE_DIRS],
    verbose: false,
    write: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--") {
      break;
    }

    switch (arg) {
      case "--fail-on-unused":
        options.failOnUnused = true;
        break;
      case "--json":
        options.json = true;
        break;
      case "--verbose":
        options.verbose = true;
        break;
      case "--write":
        options.write = true;
        break;
      case "--lang": {
        const value = argv[i + 1];
        if (!value) {
          throw new Error("Missing value after --lang");
        }
        options.lang = value;
        i += 1;
        break;
      }
      case "--source-dir": {
        const value = argv[i + 1];
        if (!value) {
          throw new Error("Missing value after --source-dir");
        }
        options.sourceDirs.push(value);
        i += 1;
        break;
      }
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  options.sourceDirs = [...new Set(options.sourceDirs)];
  return options;
}

function printHelp(): void {
  console.log(`Usage: pnpm i18n:audit-unused [options]

Options:
  --lang <code>           Locale folder to scan under static/i18n (default: en)
  --source-dir <path>     Add an extra source directory to scan
  --fail-on-unused        Exit with code 1 when unused keys are found
  --write                 Remove unused keys from locale files
  --json                  Print the report as JSON
  --verbose               Print detected dynamic prefixes
  --help, -h              Show this help message`);
}

function walkFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }

    if (DEFAULT_SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function collectTranslationEntries(
  value: unknown,
  filePath: string,
  prefix = "",
  objectPath: string[] = [],
): LocaleKeyEntry[] {
  if (typeof value === "string") {
    return prefix ? [{ filePath, key: prefix, objectPath }] : [];
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const keys: LocaleKeyEntry[] = [];
  for (const [childKey, childValue] of Object.entries(value)) {
    const nextPrefix = prefix ? `${prefix}.${childKey}` : childKey;
    keys.push(
      ...collectTranslationEntries(childValue, filePath, nextPrefix, [...objectPath, childKey]),
    );
  }
  return keys;
}

function getLocaleFiles(lang: string): string[] {
  const langDir = path.join(DEFAULT_I18N_DIR, lang);
  if (!fs.existsSync(langDir)) {
    throw new Error(`Locale directory does not exist: ${langDir}`);
  }

  return fs
    .readdirSync(langDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(langDir, entry.name))
    .sort();
}

/**
 * Expand the dynamic key map into the full set of keys that are reachable at
 * runtime via dynamic concatenation. This is exact — no heuristic needed.
 */
function expandDynamicKeys(): Set<string> {
  const keys = new Set<string>();
  for (const [prefix, suffixes] of Object.entries(dynamicKeyMap)) {
    for (const suffix of suffixes) {
      keys.add(`${prefix}${suffix}`);
    }
  }
  return keys;
}

/**
 * Extract all literal RQG.* translation keys referenced in source code.
 * Matches quoted strings like "RQG.Foo.Bar" or 'RQG.Foo.Bar' in any context
 * (localize calls, settings registration, template helpers, etc.).
 */
function extractLiteralKeysFromSource(corpus: string): Set<string> {
  const keys = new Set<string>();
  // Match "RQG.<dotted.path>" or 'RQG.<dotted.path>' — captures the key
  const pattern = /["'`](RQG\.[A-Za-z0-9]+(?:\.[A-Za-z0-9_-]+)+)["'`]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(corpus)) !== null) {
    keys.add(match[1]!);
  }
  return keys;
}

/**
 * Find literal RQG keys used in source that do NOT exist in the locale file.
 * These are keys the code references but the locale doesn't provide a translation for.
 */
function findMissingLiteralKeys(
  literalKeys: Set<string>,
  localeKeys: Set<string>,
  dynamicKeys: Set<string>,
): string[] {
  const missing: string[] = [];
  for (const key of literalKeys) {
    // Skip keys that are in the locale or are part of the dynamic expansion
    if (!localeKeys.has(key) && !dynamicKeys.has(key)) {
      missing.push(key);
    }
  }
  return missing.sort();
}

/**
 * Find dynamic keys from the map that do NOT have a corresponding locale entry.
 * These are translation keys that code expects but the locale file doesn't provide.
 */
function findMissingDynamicKeys(localeKeys: Set<string>): string[] {
  const missing: string[] = [];
  for (const [prefix, suffixes] of Object.entries(dynamicKeyMap)) {
    for (const suffix of suffixes) {
      const key = `${prefix}${suffix}`;
      if (!localeKeys.has(key)) {
        missing.push(key);
      }
    }
  }
  return missing.sort();
}

function buildReport(options: Options): InternalAuditReport {
  const localeFiles = getLocaleFiles(options.lang);
  const translationEntries = localeFiles.flatMap((filePath) => {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
    return collectTranslationEntries(parsed, filePath);
  });

  const localeKeySet = new Set(translationEntries.map((entry) => entry.key));

  const sourceFiles = options.sourceDirs.flatMap((dirName) =>
    walkFiles(path.resolve(process.cwd(), dirName)),
  );
  const uniqueSourceFiles = [...new Set(sourceFiles)].sort();
  const sourceTexts = uniqueSourceFiles.map((filePath) => fs.readFileSync(filePath, "utf8"));
  const corpus = sourceTexts.join("\n");

  // Expand dynamic keys from the exhaustive map
  const dynamicKeys = expandDynamicKeys();

  // A key is "used" if it appears literally in source OR is in the expanded dynamic key set
  const unusedEntries = translationEntries
    .filter(
      (entry) =>
        entry.key.startsWith("RQG.") && !corpus.includes(entry.key) && !dynamicKeys.has(entry.key),
    )
    .sort((a, b) => a.key.localeCompare(b.key));

  const unusedKeys = unusedEntries.map((entry) => entry.key);

  // Also report dynamic keys that are expected but missing from locale
  const missingDynamicKeys = findMissingDynamicKeys(localeKeySet);

  // Find literal RQG keys in source that have no locale entry.
  // Exclude audit tooling and test files — they contain example/mock keys.
  const LITERAL_KEY_EXCLUDED_PATTERNS = [
    /audit-unused-translations\./,
    /i18n-dynamic-key-map\./,
    /\.test\./,
    /\.spec\./,
  ];
  const literalKeySourceTexts = uniqueSourceFiles
    .filter((fp) => !LITERAL_KEY_EXCLUDED_PATTERNS.some((pat) => pat.test(fp)))
    .map((fp) => fs.readFileSync(fp, "utf8"));
  const literalKeyCorpus = literalKeySourceTexts.join("\n");
  const literalKeys = extractLiteralKeysFromSource(literalKeyCorpus);
  const missingLiteralKeys = findMissingLiteralKeys(literalKeys, localeKeySet, dynamicKeys);

  return {
    dynamicKeysExpanded: dynamicKeys.size,
    filesScanned: uniqueSourceFiles.length,
    keysScanned: translationEntries.filter((entry) => entry.key.startsWith("RQG.")).length,
    lang: options.lang,
    localeFilesScanned: localeFiles.map((filePath) => path.relative(process.cwd(), filePath)),
    missingDynamicKeys,
    missingDynamicKeysCount: missingDynamicKeys.length,
    missingLiteralKeys,
    missingLiteralKeysCount: missingLiteralKeys.length,
    removedKeys: [],
    removedKeysCount: 0,
    sourceDirs: options.sourceDirs,
    unusedEntries,
    unusedKeys,
    unusedKeysCount: unusedKeys.length,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deleteObjectPath(object: Record<string, unknown>, objectPath: string[]): boolean {
  const [head, ...tail] = objectPath;
  if (!head || !(head in object)) {
    return false;
  }

  if (tail.length === 0) {
    delete object[head];
    return true;
  }

  const child = object[head];
  if (!isRecord(child)) {
    return false;
  }

  const deleted = deleteObjectPath(child, tail);
  if (deleted && Object.keys(child).length === 0) {
    delete object[head];
  }
  return deleted;
}

function applyRemovals(entries: LocaleKeyEntry[]): string[] {
  const entriesByFile = new Map<string, LocaleKeyEntry[]>();

  for (const entry of entries) {
    const fileEntries = entriesByFile.get(entry.filePath) ?? [];
    fileEntries.push(entry);
    entriesByFile.set(entry.filePath, fileEntries);
  }

  const removedKeys: string[] = [];

  for (const [filePath, fileEntries] of entriesByFile) {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
    for (const entry of fileEntries) {
      if (deleteObjectPath(parsed, entry.objectPath)) {
        removedKeys.push(entry.key);
      }
    }

    fs.writeFileSync(filePath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  }

  return removedKeys.sort();
}

function toPublicReport(
  report: InternalAuditReport,
  removedKeys: string[] = report.removedKeys,
): AuditReport {
  return {
    dynamicKeysExpanded: report.dynamicKeysExpanded,
    filesScanned: report.filesScanned,
    keysScanned: report.keysScanned,
    lang: report.lang,
    localeFilesScanned: report.localeFilesScanned,
    missingDynamicKeys: report.missingDynamicKeys,
    missingDynamicKeysCount: report.missingDynamicKeysCount,
    missingLiteralKeys: report.missingLiteralKeys,
    missingLiteralKeysCount: report.missingLiteralKeysCount,
    removedKeys,
    removedKeysCount: removedKeys.length,
    sourceDirs: report.sourceDirs,
    unusedKeys: report.unusedKeys,
    unusedKeysCount: report.unusedKeysCount,
  };
}

function printTextReport(report: AuditReport, options: Options): void {
  console.log(`Locale: ${report.lang}`);
  console.log(`Locale files: ${report.localeFilesScanned.join(", ") || "(none)"}`);
  console.log(`Source dirs: ${report.sourceDirs.join(", ")}`);
  console.log(`Source files scanned: ${report.filesScanned}`);
  console.log(`RQG translation keys scanned: ${report.keysScanned}`);
  console.log(`Dynamic keys expanded from map: ${report.dynamicKeysExpanded}`);
  console.log(`Unused keys: ${report.unusedKeysCount}`);
  console.log(`Missing dynamic keys (in map but not in locale): ${report.missingDynamicKeysCount}`);
  console.log(
    `Missing literal keys (in source but not in locale): ${report.missingLiteralKeysCount}`,
  );

  if (report.removedKeysCount > 0) {
    console.log(`Removed keys: ${report.removedKeysCount}`);
  }

  if (report.unusedKeysCount > 0) {
    console.log("\nUnused keys:");
    for (const key of report.unusedKeys) {
      console.log(`- ${key}`);
    }
  }

  if (report.missingDynamicKeysCount > 0) {
    console.log("\nMissing dynamic keys (expected by code but not in locale):");
    for (const key of report.missingDynamicKeys) {
      console.log(`- ${key}`);
    }
  }

  if (report.missingLiteralKeysCount > 0) {
    console.log("\nMissing literal keys (referenced in source but not in locale):");
    for (const key of report.missingLiteralKeys) {
      console.log(`- ${key}`);
    }
  }

  if (report.removedKeysCount > 0) {
    console.log("\nRemoved keys:");
    for (const key of report.removedKeys) {
      console.log(`- ${key}`);
    }
  }

  if (options.verbose) {
    console.log("\nDynamic key map prefixes:");
    for (const prefix of Object.keys(dynamicKeyMap).sort()) {
      const count = dynamicKeyMap[prefix]?.length ?? 0;
      console.log(`- ${prefix} (${count} values)`);
    }
  }
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const report = buildReport(options);
  const removedKeys = options.write ? applyRemovals(report.unusedEntries) : [];
  const finalReport = options.write
    ? toPublicReport(buildReport(options), removedKeys)
    : toPublicReport(report);

  if (options.json) {
    console.log(JSON.stringify(finalReport, null, 2));
  } else {
    printTextReport(finalReport, options);
  }

  if (
    options.failOnUnused &&
    (finalReport.unusedKeysCount > 0 ||
      finalReport.missingDynamicKeysCount > 0 ||
      finalReport.missingLiteralKeysCount > 0)
  ) {
    process.exitCode = 1;
  }
}

main();
