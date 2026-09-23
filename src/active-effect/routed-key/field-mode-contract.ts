/**
 * Field-family mode contract, for routed and direct changes alike (#920).
 *
 * `system.effect.add.*` paths are "pads": zero-initialised, non-persisted delta accumulators that
 * are folded into a derived value in `prepareDerivedData` (see character-data-model.ts). Foundry
 * applies effects once, so a pad exists only where the real value depends on other AE-modifiable
 * inputs and therefore cannot itself be an AE target.
 *
 * Changes apply in priority order (defaults: multiply 10, add/subtract 20, downgrade 30, upgrade 40,
 * override 50), so each mode sees whatever the pad has accumulated so far:
 *   - `add` / `subtract`  -> stack additively                 (correct)
 *   - `upgrade`           -> `max(current, delta)`            (a floor; RQG "only the higher takes effect")
 *   - `downgrade`         -> `min(current, delta)`            (a cap on the accumulated bonus)
 *   - `multiply`          -> `0 * n = 0`                       (silent no-op at its default priority)
 *   - `override`          -> sets the delta, discarding other effects' stacking
 *
 * Every non-pad path is unrestricted - native Foundry mode behaviour.
 */

const PAD_PATH_PREFIX = "system.effect.add.";

/** A change whose mode does not make sense against the target field. */
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
