import { isValidRqidString } from "../../system/api/rqid-validation";
import type { ParseRoutedKeyResult } from "./routed-key.types";

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
 *
 * The selector is everything between `@` and the first `:`; the system path is the rest. A regex
 * selector therefore cannot contain `:` (issue #920), which this split enforces for free.
 */
export function parseRoutedKey(key: unknown): ParseRoutedKeyResult {
  if (typeof key !== "string" || !key.startsWith(ROUTED_PREFIX)) {
    return NOT_ROUTED;
  }

  const body = key.slice(ROUTED_PREFIX.length);
  const separatorIndex = body.indexOf(":");
  if (separatorIndex === -1) {
    return { routed: true, error: { reason: "missing-path", detail: { key } } };
  }

  const selectorRaw = body.slice(0, separatorIndex);
  const systemPath = body.slice(separatorIndex + 1);

  if (!systemPath.startsWith(SYSTEM_PATH_PREFIX)) {
    return { routed: true, error: { reason: "path-not-system", detail: { key, systemPath } } };
  }

  if (selectorRaw === ITEM_LOCAL_SELECTOR) {
    return { routed: true, selector: { kind: "item-local" }, systemPath };
  }

  if (selectorRaw === "") {
    return { routed: true, error: { reason: "empty-selector", detail: { key } } };
  }

  if (selectorRaw.startsWith(REGEX_SELECTOR_PREFIX)) {
    const pattern = selectorRaw.slice(REGEX_SELECTOR_PREFIX.length);
    if (pattern === "") {
      return { routed: true, error: { reason: "empty-regex", detail: { key } } };
    }
    try {
      // validate the pattern compiles; the resolver builds its own RegExp later
      RegExp(pattern);
    } catch (e) {
      return {
        routed: true,
        error: {
          reason: "invalid-regex",
          detail: { key, pattern, message: e instanceof Error ? e.message : String(e) },
        },
      };
    }
    return { routed: true, selector: { kind: "regex", pattern }, systemPath };
  }

  if (!isValidRqidString(selectorRaw)) {
    return { routed: true, error: { reason: "invalid-rqid", detail: { key, rqid: selectorRaw } } };
  }

  return { routed: true, selector: { kind: "rqid", rqid: selectorRaw }, systemPath };
}
