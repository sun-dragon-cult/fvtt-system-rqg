import type { RoutedKeyErrorReason, RoutedTargetErrorReason } from "./routed-key.types";

export type RoutedKeyWarningReason =
  | RoutedKeyErrorReason
  | RoutedTargetErrorReason
  // the resolved target document has no field at the routed system path (PR b's own check -
  // parsing and target resolution can't detect this, only the actual item schema can)
  | "field-not-found"
  // a routed key still on CUSTOM mode - applied as ADD, but the mode should be changed
  | "custom-mode-on-routed-key"
  // a legacy key that still works through the deprecating shim, pending the #920 migration
  | "legacy-syntax-deprecated"
  // a change type that is neither native nor CUSTOM - applying it would reset the field (see below)
  | "unsupported-change-type";

const I18N_PREFIX = "RQG.Foundry.ActiveEffect.RoutedKey.";

/**
 * The i18n suffix for every routed-key warning reason. A `Record` so a missing reason is a compile
 * error, and spelled out literally (not case-transformed) so the i18n audit sees the real key.
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
  "field-not-found": "FieldNotFound",
  "custom-mode-on-routed-key": "CustomModeOnRoutedKey",
  "legacy-syntax-deprecated": "LegacySyntaxDeprecated",
  "unsupported-change-type": "UnsupportedChangeType",
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
 * Warns once per (effect uuid, routed key, reason) instead of on every data-preparation cycle.
 * Keyed on the routed key rather than a row index, so reordering an effect's changes is harmless.
 * One instance lives for the client session - `applyChange` is static, so there is no prep-pass
 * boundary to hook.
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
