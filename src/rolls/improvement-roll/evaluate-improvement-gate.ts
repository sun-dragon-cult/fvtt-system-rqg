import type { ImprovementGateSpec } from "./improvement-roll.types";

/**
 * Decides whether an improvement gate roll succeeded, honouring the comparator direction the
 * domain adapter asked for.
 *
 * @param gate the gate policy supplied by the domain adapter
 * @param total the modified total of the gate roll
 * @param naturalTotal the unmodified total of the gate roll's first die
 */
export function evaluateImprovementGate(
  gate: ImprovementGateSpec,
  total: number | undefined,
  naturalTotal?: number | undefined,
): boolean {
  if (total == null || !Number.isFinite(total)) {
    return false;
  }

  if (gate.comparator === "roll-under") {
    return total <= gate.threshold;
  }

  if (gate.naturalHundredAlwaysSucceeds && naturalTotal === 100) {
    return true;
  }

  return total > gate.threshold;
}
