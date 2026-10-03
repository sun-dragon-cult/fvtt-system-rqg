import { systemId } from "../config";

/** Remove the token of a summoned creature whose effect flagged removeTokenWhenEnded has ended. */
async function removeSummonedToken(effect: ActiveEffect): Promise<void> {
  const actor = effect.parent;
  if (
    !game.users?.activeGM?.isSelf ||
    !effect.getFlag(systemId, "removeTokenWhenEnded") ||
    !(actor instanceof Actor) ||
    !actor.isToken
  ) {
    return;
  }
  const token = actor.token;
  // Deleting the token itself also takes its effects with it
  if (token?.id && token.parent?.tokens.has(token.id)) {
    await token.delete();
  }
}

/**
 * A summoned creature stays only while its summoning lasts (RBM p.90), so its token goes when the
 * effect expires or is removed (e.g. by Dispel Magic). Runs on the active GM's client, which marks
 * expiry and may delete tokens.
 */
export function initSummonedTokens(): void {
  Hooks.on(
    "updateActiveEffect",
    (effect: ActiveEffect, changed: any, _options: unknown, _userId: string) => {
      if (changed.duration?.expired === true) {
        void removeSummonedToken(effect);
      }
    },
  );
  Hooks.on("deleteActiveEffect", (effect: ActiveEffect, _options: unknown, _userId: string) => {
    void removeSummonedToken(effect);
  });
}
