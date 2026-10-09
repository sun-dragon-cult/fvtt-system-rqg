import { systemId } from "../config";
import { spellBehaviourForEffect } from "./spell-behaviour";
import { removeSummonedToken } from "./summon";

/** Only the active GM's client ends effects, and only spell effects and summonings need it. */
function needsEnding(effect: ActiveEffect): boolean {
  return (
    !!game.users?.activeGM?.isSelf &&
    (!!(effect.system as any)?.spell?.spellRqid || !!effect.getFlag(systemId, "summoning"))
  );
}

async function endSpellEffect(effect: ActiveEffect): Promise<void> {
  await spellBehaviourForEffect(effect)?.onEnd?.({ effect });
  await removeSummonedToken(effect);
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
