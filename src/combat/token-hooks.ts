import { initializeAllCharacteristics } from "../actors/context-menus/characteristic-context-menu";
import { getCombatantsSharingToken } from "./combatant-utils";
import { isDocumentSubType } from "../system/util";
import { ActorTypeEnum, type CharacterActor } from "../data-model/actor-data/rqg-actor-data";

export function initTokenHooks(): void {
  Hooks.on("createToken", onCreateToken);
  Hooks.on("hoverToken", onHoverToken);
}

/** Highlight every combatant sharing the token, not just the one core finds. */
export function onHoverToken(token: Token.Implementation, hovered: boolean): void {
  if (!token.combatant) {
    return;
  }
  for (const combatant of getCombatantsSharingToken(token.combatant)) {
    if (typeof combatant.id === "string") {
      // @ts-expect-error _isTokenVisible is private & combatant type issue
      ui.combat?.hoverCombatant(combatant, hovered && ui.combat._isTokenVisible(token));
    }
  }
}

/** Runs on every client regardless of open scene, so only the creating user sets the token up. */
export async function onCreateToken(
  document: TokenDocument,
  _options: TokenDocument.Database.OnCreateOptions,
  userId: string,
): Promise<void> {
  if (userId !== game.user?.id) {
    return;
  }
  const actor = document.actor;
  if (!isDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character)) {
    return;
  }
  await actor.updateTokenEffectFromHealth();
  if (!document.actorLink) {
    await initializeAllCharacteristics(actor);
  }
}
