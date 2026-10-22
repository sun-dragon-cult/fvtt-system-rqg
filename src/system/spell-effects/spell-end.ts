import { systemId } from "../config";
import { isAreaAnchor, spellBehaviorForEffect, spellRqidOfEffect } from "./spell-behavior";
import { removeSummonedToken } from "./summon";
import { removeSpellArea } from "./spell-area";

/** Only the active GM's client ends effects, and only spell effects, summonings and areas need it. */
function needsEnding(effect: ActiveEffect): boolean {
  return (
    !!game.users?.activeGM?.isSelf &&
    (!!spellRqidOfEffect(effect) || !!effect.getFlag(systemId, "summoning"))
  );
}

async function endSpellEffect(effect: ActiveEffect): Promise<void> {
  await spellBehaviorForEffect(effect)?.onEnd?.({ effect });
  await removeSummonedToken(effect);
  await removeSpellArea(effect);
}

/**
 * End a spell effect once when it expires or is deleted (e.g. by Dispel Magic): run its spell's
 * `onEnd` and remove the token it summoned. An expired spell effect is then deleted, which doesn't
 * end it again. Runs on the active GM's client, which marks expiry.
 */
export function initSpellEnd(): void {
  Hooks.on("updateActiveEffect", async (effect: ActiveEffect, changed: any) => {
    if (changed.duration?.expired === true && needsEnding(effect)) {
      await endSpellEffect(effect);
      // An area's caster effect goes with its Region, which removeSpellArea deleted
      if (spellRqidOfEffect(effect) && !isAreaAnchor(effect)) {
        await effect.delete();
      }
    }
  });
  Hooks.on("deleteActiveEffect", (effect: ActiveEffect) => {
    if (!(effect as any).duration?.expired && needsEnding(effect)) {
      void endSpellEffect(effect);
    }
  });
}
