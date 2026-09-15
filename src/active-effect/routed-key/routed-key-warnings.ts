import type { RoutedKeyErrorReason, RoutedTargetErrorReason } from "./routed-key.types";
import type { FieldModeViolation } from "./field-mode-contract";

export type RoutedKeyWarningReason =
  | RoutedKeyErrorReason
  | RoutedTargetErrorReason
  | FieldModeViolation
  // the resolved target document has no field at the routed system path (PR b's own check -
  // parsing and target resolution can't detect this, only the actual item schema can)
  | "field-not-found"
  // a routed key still on CUSTOM mode - applied as ADD, but the mode should be changed
  | "custom-mode-on-routed-key"
  // a legacy (un-prefixed) CUSTOM-mode key that is not a valid routed key even with `@` prepended
  | "legacy-key-unparseable"
  // a legacy key that still works through the deprecating shim, pending the #920 migration
  | "legacy-syntax-deprecated";

const I18N_PREFIX = "RQG.Foundry.ActiveEffect.RoutedKey.";

/**
 * The i18n suffix for every routed-key warning reason.
 *
 * A `Record<RoutedKeyWarningReason, string>` so omitting a reason is a compile error, and the
 * suffix is written out literally (not derived by a case transform) so the i18n audit, which
 * builds its locale keys from `Object.values(...)` in buildScripts/i18n-dynamic-key-map.ts,
 * checks the exact string that has to exist in uiContent.json.
 */
const REASON_I18N_SUFFIX: Record<RoutedKeyWarningReason, string> = {
  "missing-path": "MissingPath",
  "empty-selector": "EmptySelector",
  "path-not-system": "PathNotSystem",
  "empty-regex": "EmptyRegex",
  "invalid-regex": "InvalidRegex",
  "invalid-rqid": "InvalidRqid",
  "item-local-outside-item": "ItemLocalOutsideItem",
  "no-match": "NoMatch",
  "pad-multiply-noop": "PadMultiplyNoop",
  "pad-override-discards-stacking": "PadOverrideDiscardsStacking",
  "field-not-found": "FieldNotFound",
  "custom-mode-on-routed-key": "CustomModeOnRoutedKey",
  "legacy-key-unparseable": "LegacyKeyUnparseable",
  "legacy-syntax-deprecated": "LegacySyntaxDeprecated",
};

/** i18n suffixes for the audit map (buildScripts/i18n-dynamic-key-map.ts). */
export const ROUTED_KEY_WARNING_I18N_SUFFIXES: readonly string[] =
  Object.values(REASON_I18N_SUFFIX);

/** Every routed-key warning reason (keys of the suffix map, so it stays in sync). */
export const ALL_ROUTED_KEY_WARNING_REASONS = Object.keys(
  REASON_I18N_SUFFIX,
) as RoutedKeyWarningReason[];

/** i18n key for a routed-key warning reason, e.g. `RQG.Foundry.ActiveEffect.RoutedKey.NoMatch`. */
export function routedKeyWarningI18nKey(reason: RoutedKeyWarningReason): string {
  return `${I18N_PREFIX}${REASON_I18N_SUFFIX[reason]}`;
}

/**
 * Tracks which routed-key change rows have already produced a warning, so a misconfigured key
 * warns once rather than on every data-preparation cycle (#920: "warn once per effect row").
 *
 * Identity is (effect uuid, routed key, reason) - not a row index - so reordering an effect's
 * changes does not lose or duplicate a warning.
 *
 * `RqgActiveEffect` holds one instance for the life of the client session rather than one per
 * data-preparation pass: `applyChange` is static and core drives the prep loop, so there is no
 * pass boundary to hook. The trade-off is deliberate - a GM who dismisses the toast will not see
 * it again until reload, which is preferable to re-warning on every prep cycle (several per
 * item update). Entries are short strings and only accumulate for genuinely broken content.
 */
export class RoutedKeyWarningTracker {
  readonly #seen = new Set<string>();

  /** Returns true the first time a given key+reason is seen, false afterwards. */
  shouldWarn(
    effectUuid: string | undefined,
    changeKey: string,
    reason: RoutedKeyWarningReason,
  ): boolean {
    const seenKey = `${effectUuid ?? "?"} ${changeKey} ${reason}`;
    if (this.#seen.has(seenKey)) {
      return false;
    }
    this.#seen.add(seenKey);
    return true;
  }
}
