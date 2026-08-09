import type { ImprovementGateSpec } from "./improvement-roll.types";

/**
 * Decides whether an improvement gate roll succeeded, honouring the comparator direction the
 * domain adapter asked for.
 *
 * `total` is always a plain, unmodified 1d100 result: every improvement gate (like every other
 * percentile-check roll in this system - AbilityRoll, CharacteristicRoll, SpiritMagicRoll,
 * RuneMagicRoll) folds modifiers into the target rather than into the roll formula, so there is
 * no separate "natural" value to track - the roll IS the natural value.
 *
 * @param gate the gate policy supplied by the domain adapter
 * @param total the (unmodified) total of the gate roll
 */
export function evaluateImprovementGate(
  gate: ImprovementGateSpec,
  total: number | undefined,
): boolean {
  if (total == null || !Number.isFinite(total)) {
    return false;
  }

  if (gate.comparator === "roll-under") {
    return total <= gate.threshold;
  }

  if (gate.naturalHundredAlwaysSucceeds && total === 100) {
    return true;
  }

  return total > gate.threshold;
}
