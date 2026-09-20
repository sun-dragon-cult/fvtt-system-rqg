/**
 * Field-family mode contract for routed changes (#920).
 *
 * `system.effect.add.*` paths are "pads": zero-initialised, non-persisted delta accumulators that
 * are folded into a derived value in `prepareDerivedData` (see character-data-model.ts). Foundry
 * applies effects once, so a pad exists only where the real value depends on other AE-modifiable
 * inputs and therefore cannot itself be an AE target.
 *
 * On a zero-initialised delta:
 *   - `add` / `subtract`  -> stack additively                 (correct)
 *   - `upgrade`           -> `max(current, delta)`            (correct; RQG "only the higher takes effect")
 *   - `downgrade`         -> `min(current, delta)`            (coherent, marginal)
 *   - `multiply`          -> `0 * n = 0`                       (always a silent no-op)
 *   - `override`          -> sets the delta, discarding other effects' stacking
 *
 * Every non-pad path is unrestricted - native Foundry mode behaviour.
 */

const PAD_PATH_PREFIX = "system.effect.add.";

/** A routed change whose mode does not make sense against the target field. */
export type FieldModeViolation = "pad-multiply-noop" | "pad-override-discards-stacking";

/** True when `systemPath` targets a `system.effect.add.*` pad. */
export function isPadPath(systemPath: string): boolean {
  return systemPath.startsWith(PAD_PATH_PREFIX);
}

/**
 * Check whether a change of type `changeType` (the canonical v14 `change.type` string) is
 * meaningful against `systemPath`. Returns the violation, or `null` when the change is fine.
 * Only pads are constrained; every other path returns `null` so native Foundry behaviour is kept.
 */
export function checkFieldModeContract(
  systemPath: string,
  changeType: string,
): FieldModeViolation | null {
  if (!isPadPath(systemPath)) {
    return null;
  }
  if (changeType === "multiply") {
    return "pad-multiply-noop";
  }
  if (changeType === "override") {
    return "pad-override-discards-stacking";
  }
  return null;
}

/**
 * The change types core implements as a `DataField#applyChange` branch, i.e. everything in
 * `CONST.ACTIVE_EFFECT_CHANGE_TYPES` except `custom`.
 *
 * Listed here rather than read from `CONST` so the check works in unit tests (which do not mock
 * the Foundry globals) and so adding a type is a deliberate edit - a routed change whose type has
 * no branch falls through to `DataField#_applyChangeCustom`, which is not a no-op: it returns
 * `undefined`, `DataField#applyChange` then cleans that to the field's *initial* value, and
 * `applyChangeField` writes it. A skill would silently reset to 0.
 */
const NATIVE_CHANGE_TYPES: ReadonlySet<string> = new Set([
  "add",
  "subtract",
  "multiply",
  "override",
  "upgrade",
  "downgrade",
]);

/** True when `changeType` is a change type core can apply to a DataField on its own. */
export function isNativeChangeType(changeType: string): boolean {
  return NATIVE_CHANGE_TYPES.has(changeType);
}
