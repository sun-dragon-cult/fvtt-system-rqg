import { initializeAllCharacteristics } from "../actors/context-menus/characteristic-context-menu";
import { getCombatantsSharingToken } from "./combatant-utils";

import Token = foundry.canvas.placeables.Token;
import { isDocumentSubType } from "../system/util";
import { ActorTypeEnum, type CharacterActor } from "../data-model/actor-data/rqg-actor-data";

export class RqgToken extends Token {
  static init() {
    CONFIG.Token.objectClass = RqgToken;
    Hooks.on("createToken", RqgToken.onCreateToken);
  }

  override _onHoverIn(event: Canvas.Event.Pointer, options?: PlaceableObject.HoverInOptions): void {
    super._onHoverIn(event, options);
    if (this.combatant) {
      getCombatantsSharingToken(this.combatant).forEach((combatant) => {
        if (typeof combatant.id === "string") {
          // @ts-expect-error _isTokenVisible is private & combatant type issue
          ui.combat?.hoverCombatant(combatant, ui.combat._isTokenVisible(this));
        }
      });
    }
  }

  override _onHoverOut(event: Canvas.Event.Pointer) {
    super._onHoverOut(event);
    if (this.combatant) {
      getCombatantsSharingToken(this.combatant).forEach((combatant: Combatant) => {
        if (typeof combatant.id === "string") {
          // @ts-expect-error combatant type issue
          ui.combat?.hoverCombatant(combatant, false);
        }
      });
    }
  }

  /** Runs on every client regardless of open scene, so only the creating user sets the token up. */
  static async onCreateToken(
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
}
