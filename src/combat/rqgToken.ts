import { initializeAllCharacteristics } from "../actors/context-menus/characteristic-context-menu";
import { getCombatantsSharingToken } from "./combatant-utils";

import Token = foundry.canvas.placeables.Token;
import { assertDocumentSubType } from "../system/util";
import { ActorTypeEnum, type CharacterActor } from "../data-model/actor-data/rqgActorData";

export class RqgToken extends Token {
  static init() {
    CONFIG.Token.objectClass = RqgToken;
  }

  override _onHoverIn(event: any, options: any): void {
    super._onHoverIn(event, options);
    if (this.combatant) {
      getCombatantsSharingToken(this.combatant).forEach((combatant) => {
        // @ts-expect-error _isTokenVisible is private & combatant type issue
        ui.combat?.hoverCombatant(combatant, ui.combat._isTokenVisible(this));
      });
    }
  }

  override _onHoverOut(event: any) {
    super._onHoverOut(event);
    if (this.combatant) {
      getCombatantsSharingToken(this.combatant).forEach((combatant: Combatant) => {
        if (typeof combatant.id === "string") {
          // @ts-expect-error combatatnt type issue
          ui.combat?.hoverCombatant(combatant, false);
        }
      });
    }
  }

  protected override _onCreate(data: any, options: any, userId: string): void {
    super._onCreate(data, options, userId);
    this.actor?.updateTokenEffectFromHealth();
    assertDocumentSubType<CharacterActor>(
      this.actor,
      ActorTypeEnum.Character,
      "Expected CharacterActor on Token creation",
    );
    if (userId === game.user?.id) {
      if (!this.document.actorLink) {
        if (this.actor) {
          void initializeAllCharacteristics(this.actor);
        }
      }
    }
  }
}
