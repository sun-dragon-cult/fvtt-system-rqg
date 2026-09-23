/**
 * Field-family mode contract, for routed and direct changes alike (#920).
 *
 * `system.effect.add.*` paths are "pads": zero-initialised, non-persisted delta accumulators that
 * are folded into a derived value in `prepareDerivedData` (see character-data-model.ts). Foundry
 * applies effects once, so a pad exists only where the real value depends on other AE-modifiable
 * inputs and therefore cannot itself be an AE target.
 *
 * On a zero-initialised delta:
 *   - `add` / `subtract`  -> stack additively                 (correct)
 *   - `upgrade`           -> `max(current, delta)`            (correct for a bonus; RQG "only the higher takes effect")
 *   - `downgrade`         -> `min(current, delta)`            (correct for a penalty; only the worst takes effect)
 *   - `upgrade` < 0 / `downgrade` > 0 -> compared against 0     (always a silent no-op)
 *   - `multiply`          -> `0 * n = 0`                       (always a silent no-op)
 *   - `override`          -> sets the delta, discarding other effects' stacking
 *
 * Every non-pad path is unrestricted - native Foundry mode behaviour.
 */

const PAD_PATH_PREFIX = "system.effect.add.";

/** A change whose mode does not make sense against the target field. */
export type FieldModeViolation =
  "pad-multiply-noop" | "pad-override-discards-stacking" | "pad-bound-wrong-sign-noop";

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
  value?: unknown,
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
  // a formula's sign is unknown until it is resolved, so only literal numbers are checked
  const literal = toLiteralNumber(value);
  if (
    literal !== undefined &&
    ((changeType === "upgrade" && literal < 0) || (changeType === "downgrade" && literal > 0))
  ) {
    return "pad-bound-wrong-sign-noop";
  }
  return null;
}

function toLiteralNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
