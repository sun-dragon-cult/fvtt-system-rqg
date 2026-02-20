import chalk from "chalk";
import { config } from "./buildPacks.ts";
import fs from "fs";
import path from "path";

/**
 * Escape any special regex characters.
 */
export function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

export function setProperty(object: any, key: string, value: unknown) {
  let target = object;
  let changed = false;

  // Convert the key to an object reference if it contains dot notation
  if (key.indexOf(".") !== -1) {
    const parts = key.split(".");
    if (parts.length === 0) {
      return false;
    }
    key = parts.pop()!;
    target = parts.reduce((o: any, i: string) => {
      // eslint-disable-next-line no-prototype-builtins
      if (!o.hasOwnProperty(i)) {
        o[i] = {};
      }
      return o[i];
    }, object);
  }

  // Update the target
  if (target[key] !== value) {
    changed = true;
    target[key] = value;
  }

  // Return changed status
  return changed;
}

export function tryCatch<T>(
  valueFn: () => T,
  catchFn?: (e: unknown) => T | undefined,
): T | undefined {
  try {
    return valueFn();
  } catch (e: unknown) {
    if (catchFn) {
      return catchFn(e);
    }
  }
  return undefined;
}

export function tryOrThrow<T>(valueFn: () => T, catchFn: (e: unknown) => never): T {
  try {
    return valueFn();
  } catch (e: unknown) {
    catchFn(e);
  }
}

export function isObject(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

export function doTranslation(lang: string, untranslated: unknown[]): unknown[] {
  const dictionary = getDictionary(lang);

  return untranslated.map((d) => {
    const translated = JSON.stringify(d).replace(
      /\$\{\{ ?([\w\-.]+) ?}}\$/g, // search for content keys inside ${{ }}$
      function (match: string, key: string) {
        const translation = lookup(dictionary, key);
        if (translation == null) {
          console.error(chalk.red(match, "translation key missing in language", lang));
        }
        return translation ?? match;
      },
    );

    return tryCatch(
      () => JSON.parse(translated),
      (e: any) => {
        console.error(chalk.red(`Unable to parse translated JSON ${translated}\n\n${e.message}`));
      },
    );
  });
}

/**
 * Translate a key given a dictionary.
 * @return {string} translated text
 */
function lookup(dict: any, key: string): string {
  const keyParts = key.split(".");

  const value = keyParts.reduce(function (acc, keyPart) {
    return acc[keyPart];
  }, dict);

  return value;
}

function getDictionary(lang: string): any {
  return config.translationsFileNames.reduce((dict: any, filename: string) => {
    dict[filename] = JSON.parse(
      fs.readFileSync(path.join(config.i18nDir, lang, `${filename}.json`), "utf8"),
    );
    return dict;
  }, {});
}
