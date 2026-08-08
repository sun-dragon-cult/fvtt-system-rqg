import { evaluateImprovementGate } from "./evaluate-improvement-gate";
import type { ImprovementRequest, ImprovementResolution } from "./improvement-roll.types";

import Roll = foundry.dice.Roll;

/**
 * Domain-agnostic improvement mechanics: roll the gate (when the source has one), decide the
 * outcome with the adapter's comparator policy, and roll the gain. Applying the gain and showing
 * the chat card are the caller's job.
 */
export async function resolveImprovement(
  request: ImprovementRequest,
): Promise<ImprovementResolution> {
  let gateRoll: Roll | undefined;
  let succeeded = true;

  if (request.gate) {
    gateRoll = new Roll(request.gate.formula);
    await gateRoll.evaluate();
    succeeded = evaluateImprovementGate(request.gate, gateRoll.total);
  }

  let gainRoll: Roll | undefined;
  let gain = 0;

  if (succeeded) {
    gainRoll = new Roll(request.gain.formula);
    await gainRoll.evaluate();
    gain = Number(gainRoll.total) || 0;
  }

  return {
    result: {
      request,
      succeeded,
      gateTotal: gateRoll?.total,
      gain,
      previousValue: request.currentValue,
      newValue: request.currentValue + gain,
    },
    gateRoll,
    gainRoll,
  };
}
