/**
 * Field-family mode contracts for routed changes (#920).
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

export type NormalizedChangeType =
  "add" | "subtract" | "multiply" | "downgrade" | "upgrade" | "override" | "custom";

/** Legacy numeric `change.mode` -> v14 string type. */
const LEGACY_MODE_TO_TYPE: Record<number, NormalizedChangeType> = {
  0: "custom",
  1: "multiply",
  2: "add",
  3: "downgrade",
  4: "upgrade",
  5: "override",
};

const KNOWN_TYPES = new Set<NormalizedChangeType>([
  "add",
  "subtract",
  "multiply",
  "downgrade",
  "upgrade",
  "override",
  "custom",
]);

/**
 * Read a change's application type, tolerating both the v14 string `type` and the legacy numeric
 * `mode`. Defaults to `"add"` (Foundry's own default) when neither is usable.
 */
export function normalizeChangeType(change: {
  type?: unknown;
  mode?: unknown;
}): NormalizedChangeType {
  if (typeof change.type === "string") {
    if (KNOWN_TYPES.has(change.type as NormalizedChangeType)) {
      return change.type as NormalizedChangeType;
    }
    if (change.type.startsWith("custom.")) {
      return "custom";
    }
  }
  if (typeof change.mode === "number" && change.mode in LEGACY_MODE_TO_TYPE) {
    return LEGACY_MODE_TO_TYPE[change.mode]!;
  }
  return "add";
}

export type FieldModeContractResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: "pad-multiply-noop" | "pad-override-discards-stacking";
      readonly detail: Readonly<Record<string, string>>;
    };

/** True when `systemPath` targets a `system.effect.add.*` pad. */
export function isPadPath(systemPath: string): boolean {
  return systemPath.startsWith(PAD_PATH_PREFIX);
}

/**
 * Check whether `changeType` is meaningful against `systemPath`. Only pads are constrained; every
 * other path returns `{ ok: true }` so native Foundry behaviour is preserved.
 */
export function checkFieldModeContract(
  systemPath: string,
  changeType: NormalizedChangeType,
): FieldModeContractResult {
  if (!isPadPath(systemPath)) {
    return { ok: true };
  }
  if (changeType === "multiply") {
    return { ok: false, reason: "pad-multiply-noop", detail: { systemPath } };
  }
  if (changeType === "override") {
    return { ok: false, reason: "pad-override-discards-stacking", detail: { systemPath } };
  }
  return { ok: true };
}
