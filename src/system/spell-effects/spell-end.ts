import { systemId } from "../config";
import { spellBehaviorForEffect, spellRqidOfEffect } from "./spell-behavior";
import { removeSummonedToken } from "./summon";
import { removeSpellArea } from "./spell-area";
import { splitFromProjectileIdFlag } from "../../data-model/shared/rqg-document-flags";

/** Only the active GM's client ends effects, and only spell effects, summonings and areas need it. */
function needsEnding(effect: ActiveEffect): boolean {
  return (
    !!game.users?.activeGM?.isSelf &&
    (!!spellRqidOfEffect(effect) || !!effect.getFlag(systemId, "summoning"))
  );
}

/** True when it deleted the effect's area, which then takes the effect with it. */
async function endSpellEffect(effect: ActiveEffect): Promise<boolean> {
  await spellBehaviorForEffect(effect)?.onEnd?.({ effect });
  await removeSummonedToken(effect);
  return removeSpellArea(effect);
}

/** A missile split off its stack, whose spent spells go back to the stack with it. */
function isOnSplitOffMissile(effect: ActiveEffect): boolean {
  const parent = effect.parent;
  return parent instanceof Item && !!parent.getFlag(systemId, splitFromProjectileIdFlag);
}

/**
 * Foundry only tracks the expiry of active effects, so a spell effect suspended while its item was
 * unequipped (RBM p.6: the duration runs anyway) can come back after its time is up. Same rule as
 * Foundry's registry on a time advance, so an effect ending at a combat turn still waits for it.
 */
function isOverdueOnReenable(effect: ActiveEffect, changed: { disabled?: unknown }): boolean {
  return (
    changed.disabled === false &&
    !effect.duration.expired &&
    effect.duration.remaining <= 0 &&
    effect.isExpiryEvent("updateWorldTime", {})
  );
}

/**
 * End a spell effect once when it expires or is deleted (e.g. by Dispel Magic): run its spell's
 * `onEnd` and remove the token it summoned. An expired spell effect is then deleted, which doesn't
 * end it again. Runs on the active GM's client, which marks expiry.
 */
export function initSpellEnd(): void {
  Hooks.on("updateActiveEffect", async (effect: ActiveEffect, changed: any) => {
    if (changed.duration?.expired === true && needsEnding(effect)) {
      const areaDeleted = await endSpellEffect(effect);
      // spelled-projectile deletes a split-off missile's spells along with the missile
      if (spellRqidOfEffect(effect) && !areaDeleted && !isOnSplitOffMissile(effect)) {
        await effect.delete();
      }
    } else if (isOverdueOnReenable(effect, changed) && needsEnding(effect)) {
      await effect.update({ duration: { expired: true } });
    }
  });
  Hooks.on("deleteActiveEffect", (effect: ActiveEffect) => {
    if (!(effect as any).duration?.expired && needsEnding(effect)) {
      void endSpellEffect(effect);
    }
  });
}
