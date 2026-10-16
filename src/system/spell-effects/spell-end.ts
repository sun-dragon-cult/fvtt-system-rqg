import { systemId } from "../config";
import { spellBehaviorForEffect, spellRqidOfEffect } from "./spell-behavior";
import { removeSummonedToken } from "./summon";
import { removeSpellArea } from "./spell-area";

/** Only the active GM's client ends effects, and only spell effects, summonings and areas need it. */
function needsEnding(effect: ActiveEffect): boolean {
  return (
    !!game.users?.activeGM?.isSelf &&
    (!!spellRqidOfEffect(effect) ||
      !!effect.getFlag(systemId, "summoning") ||
      !!effect.getFlag(systemId, "spellArea"))
  );
}

async function endSpellEffect(effect: ActiveEffect): Promise<void> {
  await spellBehaviorForEffect(effect)?.onEnd?.({ effect });
  await removeSummonedToken(effect);
  await removeSpellArea(effect);
}

/**
 * End a spell effect once when it expires or is deleted (e.g. by Dispel Magic): run its spell's
 * `onEnd` and remove the token it summoned. Deleting an already expired effect doesn't end it
 * again. Runs on the active GM's client, which marks expiry.
 */
export function initSpellEnd(): void {
  Hooks.on("updateActiveEffect", (effect: ActiveEffect, changed: any) => {
    if (changed.duration?.expired === true && needsEnding(effect)) {
      void endSpellEffect(effect);
    }
  });
  Hooks.on("deleteActiveEffect", (effect: ActiveEffect) => {
    if (!(effect as any).duration?.expired && needsEnding(effect)) {
      void endSpellEffect(effect);
    }
  });
}
