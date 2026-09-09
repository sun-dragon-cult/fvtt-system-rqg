import type { RoutedKeyErrorReason, RoutedTargetErrorReason } from "./routed-key.types";
import type { FieldModeContractResult } from "./field-mode-contract";

export type RoutedKeyWarningReason =
  | RoutedKeyErrorReason
  | RoutedTargetErrorReason
  | Extract<FieldModeContractResult, { ok: false }>["reason"];

/**
 * Every warning reason a routed key can produce. Kept exhaustive so the i18n audit
 * (buildScripts/i18n-dynamic-key-map.ts) can derive the locale keys from it.
 */
export const ALL_ROUTED_KEY_WARNING_REASONS: readonly RoutedKeyWarningReason[] = [
  "missing-path",
  "empty-selector",
  "path-not-system",
  "empty-regex",
  "invalid-regex",
  "invalid-rqid",
  "item-local-outside-item",
  "no-match",
  "pad-multiply-noop",
  "pad-override-discards-stacking",
];

const I18N_PREFIX = "RQG.Foundry.ActiveEffect.RoutedKey.";

/** `"no-match"` -> `"NoMatch"`. */
export function routedKeyWarningI18nSuffix(reason: RoutedKeyWarningReason): string {
  return reason
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** i18n key for a routed-key warning reason, e.g. `RQG.Foundry.ActiveEffect.RoutedKey.NoMatch`. */
export function routedKeyWarningI18nKey(reason: RoutedKeyWarningReason): string {
  return `${I18N_PREFIX}${routedKeyWarningI18nSuffix(reason)}`;
}

/**
 * Tracks which (effect, change) rows have already produced a warning, so a misconfigured routed
 * key warns once rather than on every data-preparation cycle (#920: "warn once per effect row").
 */
export class RoutedKeyWarningTracker {
  readonly #seen = new Set<string>();

  /** Returns true the first time a given row+reason is seen, false afterwards. */
  shouldWarn(
    effectUuid: string | undefined,
    changeIndex: number,
    reason: RoutedKeyWarningReason,
  ): boolean {
    const key = `${effectUuid ?? "?"}#${changeIndex}#${reason}`;
    if (this.#seen.has(key)) {
      return false;
    }
    this.#seen.add(key);
    return true;
  }

  /** Forget all recorded warnings (e.g. after a migration fixes the underlying keys). */
  reset(): void {
    this.#seen.clear();
  }
}
