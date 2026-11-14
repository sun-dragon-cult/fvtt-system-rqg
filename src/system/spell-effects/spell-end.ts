import { systemId } from "../config";
import { spellBehaviorForEffect, spellRqidOfEffect } from "./spell-behavior";
import { holdsOf, releaseHeld } from "./spell-anchor";
import { splitFromProjectileIdFlag } from "../../data-model/shared/rqg-document-flags";

/** Only the active GM's client ends effects, and only spell effects and what they hold need it. */
function needsEnding(effect: ActiveEffect): boolean {
  return (
    !!game.users?.activeGM?.isSelf && (!!spellRqidOfEffect(effect) || holdsOf(effect).length > 0)
  );
}

/** True when it deleted what the effect held, whose deletion then takes the effect with it. */
async function endSpellEffect(effect: ActiveEffect): Promise<boolean> {
  await spellBehaviorForEffect(effect)?.onEnd?.({ effect });
  return releaseHeld(effect);
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
 * `onEnd` and delete what it held, e.g. a spell area's Region or a summoned token. An expired spell
 * effect is then deleted, which doesn't end it again. Runs on the active GM's client, which marks
 * expiry.
 */
export function initSpellEnd(): void {
  Hooks.on("updateActiveEffect", async (effect: ActiveEffect, changed: any) => {
    if (changed.duration?.expired === true && needsEnding(effect)) {
      const heldDeleted = await endSpellEffect(effect);
      // spelled-projectile deletes a split-off missile's spells along with the missile
      if (spellRqidOfEffect(effect) && !heldDeleted && !isOnSplitOffMissile(effect)) {
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
