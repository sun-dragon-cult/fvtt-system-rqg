import type { RoutedKeyErrorReason, RoutedTargetErrorReason } from "./routed-key.types";
import type { FieldModeContractResult } from "./field-mode-contract";

export type RoutedKeyWarningReason =
  | RoutedKeyErrorReason
  | RoutedTargetErrorReason
  | Extract<FieldModeContractResult, { ok: false }>["reason"];

/**
 * Every warning reason a routed key can produce. The `Record<RoutedKeyWarningReason, true>` type
 * makes omitting a reason a compile error, so the i18n audit
 * (buildScripts/i18n-dynamic-key-map.ts) - which derives its locale keys from this - can never
 * silently miss one.
 */
const ROUTED_KEY_WARNING_REASONS: Record<RoutedKeyWarningReason, true> = {
  "missing-path": true,
  "empty-selector": true,
  "path-not-system": true,
  "empty-regex": true,
  "invalid-regex": true,
  "invalid-rqid": true,
  "item-local-outside-item": true,
  "no-match": true,
  "pad-multiply-noop": true,
  "pad-override-discards-stacking": true,
};

export const ALL_ROUTED_KEY_WARNING_REASONS = Object.keys(
  ROUTED_KEY_WARNING_REASONS,
) as RoutedKeyWarningReason[];

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
