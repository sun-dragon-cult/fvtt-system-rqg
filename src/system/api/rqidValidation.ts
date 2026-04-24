import type { RqidString } from "./rqidApi";

const ITEM_SUBTYPES = [
  "skill",
  "armor",
  "rune",
  "passion",
  "rune-magic",
  "weapon",
  "gear",
  "hit-location",
  "cult",
  "homeland",
  "occupation",
  "spirit-magic",
] as const;

const NON_ITEM_RQID_PREFIX_PATTERN = "(?:a|c|je|jp|m|p|rt|s)";
const DOC_RQID_PATTERN = `(?:${NON_ITEM_RQID_PREFIX_PATTERN}\\.[^.]*\\.[^.]+|i\\.(${ITEM_SUBTYPES.join("|")})\\.[^.]+)`;

const ITEM_PATTERN = new RegExp(`^i\\.(${ITEM_SUBTYPES.join("|")})\\.[^.]+$`);
const NON_ITEM_PATTERN = new RegExp(`^${NON_ITEM_RQID_PREFIX_PATTERN}\\.[^.]*\\.[^.]+$`);
const EMBEDDED_PATTERN = new RegExp(`^${DOC_RQID_PATTERN}\\.${DOC_RQID_PATTERN}$`);

export function isValidRqidString(value: unknown): value is RqidString;
export function isValidRqidString(
  value: unknown,
  options: { allowEmpty: true },
): value is RqidString | "";
export function isValidRqidString(value: unknown, options: { allowEmpty?: boolean } = {}): boolean {
  if (typeof value !== "string") {
    return false;
  }
  if (value === "") {
    return options.allowEmpty === true;
  }

  return !!(
    value.match(ITEM_PATTERN) ||
    value.match(NON_ITEM_PATTERN) ||
    value.match(EMBEDDED_PATTERN)
  );
}

/**
 * Normalize any value to a valid RqidString or undefined.
 * Empty string and invalid values are treated as "not set".
 */
export function toRqidString(value: unknown): RqidString | undefined {
  return isValidRqidString(value) ? value : undefined;
}
