import {
  guardSpellBehaviour,
  spellBehaviourForEffect,
  type SpellEndScope,
} from "./spell-behaviour";

async function runOnEnd(effect: ActiveEffect): Promise<void> {
  if (!game.users?.activeGM?.isSelf) {
    return;
  }
  const behaviour = await spellBehaviourForEffect(effect);
  await guardSpellBehaviour(effect.name ?? "", () => behaviour?.onEnd?.({ effect }));
}

/**
 * Remove the token of a summoned creature, for the `onEnd` of a summoning spell: it stays only
 * while its summoning lasts (RBM p.90). Deleting the token also takes its effects with it.
 */
export async function removeSummonedToken({ effect }: SpellEndScope): Promise<void> {
  const actor = effect.parent;
  if (!(actor instanceof Actor) || !actor.isToken) {
    return;
  }
  const token = actor.token;
  if (token?.id && token.parent?.tokens.has(token.id)) {
    await token.delete();
  }
}

/**
 * Run a spell's `onEnd` when one of its effects expires or is deleted (e.g. by Dispel Magic), once:
 * deleting an already expired effect doesn't end it again. Runs on the active GM's client, which
 * marks expiry.
 */
export function initSpellEnd(): void {
  Hooks.on(
    "updateActiveEffect",
    (effect: ActiveEffect, changed: any, _options: unknown, _userId: string) => {
      if (changed.duration?.expired === true) {
        void runOnEnd(effect);
      }
    },
  );
  Hooks.on("deleteActiveEffect", (effect: ActiveEffect, _options: unknown, _userId: string) => {
    if (!(effect as any).duration?.expired) {
      void runOnEnd(effect);
    }
  });
}
