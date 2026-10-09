import { systemId } from "../config";
import { guardSpellBehaviour, spellBehaviourForEffect } from "./spell-behaviour";

/** Remove the token of a summoned creature, which stays only while its summoning lasts (RBM p.90). */
async function removeSummonedToken(effect: ActiveEffect): Promise<void> {
  const actor = effect.parent;
  if (!effect.getFlag(systemId, "summoning") || !(actor instanceof Actor) || !actor.isToken) {
    return;
  }
  const token = actor.token;
  // Deleting the token itself also takes its effects with it
  if (token?.id && token.parent?.tokens.has(token.id)) {
    await token.delete();
  }
}

async function endSpellEffect(effect: ActiveEffect): Promise<void> {
  if (!game.users?.activeGM?.isSelf) {
    return;
  }
  const onEnd = spellBehaviourForEffect(effect)?.onEnd;
  if (onEnd) {
    await guardSpellBehaviour(effect.name ?? "", () => onEnd({ effect }));
  }
  await removeSummonedToken(effect);
}

/**
 * End a spell effect once when it expires or is deleted (e.g. by Dispel Magic): run its spell's
 * `onEnd` and remove the token it summoned. Deleting an already expired effect doesn't end it
 * again. Runs on the active GM's client, which marks expiry.
 */
export function initSpellEnd(): void {
  Hooks.on(
    "updateActiveEffect",
    (effect: ActiveEffect, changed: any, _options: unknown, _userId: string) => {
      if (changed.duration?.expired === true) {
        void endSpellEffect(effect);
      }
    },
  );
  Hooks.on("deleteActiveEffect", (effect: ActiveEffect, _options: unknown, _userId: string) => {
    if (!(effect as any).duration?.expired) {
      void endSpellEffect(effect);
    }
  });
}
