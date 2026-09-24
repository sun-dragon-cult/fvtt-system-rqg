import { isValidRqidString, toRqidString } from "../../system/api/rqid-validation";
import type { ParseRoutedKeyResult, RoutedKeyBodyResult } from "./routed-key.types";

// the common case by far - a native (non-@) key - so hand back one shared object
const NOT_ROUTED: ParseRoutedKeyResult = { routed: false };

const ROUTED_PREFIX = "@";
const ITEM_LOCAL_SELECTOR = ".";
const REGEX_SELECTOR_PREFIX = "~";
const SYSTEM_PATH_PREFIX = "system.";

/**
 * Parse an Active Effect change key.
 *
 * Returns `{ routed: false }` for every key that does not start with `@` - those are native
 * Foundry keys and must be left exactly as-is. For `@` keys, returns either a parsed
 * `{ selector, systemPath }` or a structured `{ error }` (never throws).
 */
export function parseRoutedKey(key: unknown): ParseRoutedKeyResult {
  if (typeof key !== "string" || !key.startsWith(ROUTED_PREFIX)) {
    return NOT_ROUTED;
  }
  return { routed: true, ...parseRoutedKeyBody(key.slice(ROUTED_PREFIX.length)) };
}

/**
 * Parse the part of a routed key after `@`. Separate from {@link parseRoutedKey} so the deprecated
 * un-prefixed syntax can be parsed without synthesising a `@` it would then have to strip back out.
 *
 * The selector is everything up to the first `:`; the system path is the rest. A regex selector
 * therefore cannot contain `:` (issue #920), which this split enforces for free.
 */
export function parseRoutedKeyBody(body: string): RoutedKeyBodyResult {
  const separatorIndex = body.indexOf(":");
  if (separatorIndex === -1) {
    return { error: { reason: "missing-path", selectorRaw: body } };
  }

  const selectorRaw = body.slice(0, separatorIndex);
  const systemPath = body.slice(separatorIndex + 1);

  if (!systemPath.startsWith(SYSTEM_PATH_PREFIX)) {
    return { error: { reason: "path-not-system", selectorRaw, detail: { systemPath } } };
  }

  if (selectorRaw === ITEM_LOCAL_SELECTOR) {
    return { selector: { kind: "item-local" }, systemPath };
  }

  if (selectorRaw === "") {
    return { error: { reason: "empty-selector", selectorRaw } };
  }

  if (selectorRaw.startsWith(REGEX_SELECTOR_PREFIX)) {
    const pattern = selectorRaw.slice(REGEX_SELECTOR_PREFIX.length);
    if (pattern === "") {
      return { error: { reason: "empty-regex", selectorRaw } };
    }
    try {
      // validate the pattern compiles; the resolver builds its own RegExp later
      RegExp(pattern);
    } catch (e) {
      return {
        error: {
          reason: "invalid-regex",
          selectorRaw,
          detail: { pattern, message: e instanceof Error ? e.message : String(e) },
        },
      };
    }
    return { selector: { kind: "regex", pattern }, systemPath };
  }

  // `toRqidString` also rejects legacy weapon-skill-reference rqids, which the lookup cannot use
  const rqid = toRqidString(selectorRaw);
  if (rqid === undefined) {
    return { error: { reason: "invalid-rqid", selectorRaw, detail: { rqid: selectorRaw } } };
  }

  return { selector: { kind: "rqid", rqid }, systemPath };
}

/**
 * Whether a selector was *meant* as a routed one, for telling a mistyped RQG key apart from another
 * package's key. Deliberately broader than the parser's own rqid test: `isValidRqidString` also
 * accepts legacy weapon-skill-reference rqids, so those still earn a warning rather than silence.
 */
export function isRoutedSelectorShaped(selectorRaw: string): boolean {
  return selectorRaw.startsWith(REGEX_SELECTOR_PREFIX) || isValidRqidString(selectorRaw);
}
