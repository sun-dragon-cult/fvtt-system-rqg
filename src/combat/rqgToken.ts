import { getGame } from "../system/util";
import { initializeAllCharacteristics } from "../actors/context-menus/characteristic-context-menu";
import { getCombatantsSharingToken } from "./combatant-utils";

export class RqgToken extends Token {
  static init() {
    // @ts-expect-error config
    CONFIG.Token.objectClass = RqgToken;
  }

  _onHoverIn(event: any, options: any): void {
    super._onHoverIn(event, options);
    if (this.combatant) {
      getCombatantsSharingToken(this.combatant).forEach((combatant: Combatant) => {
        // @ts-expect-error hoverCombatant
        ui.combat?.hoverCombatant(combatant, ui.combat._isTokenVisible(this));
      });
    }
  }

  _onHoverOut(event: any) {
    super._onHoverOut(event);
    if (this.combatant) {
      getCombatantsSharingToken(this.combatant).forEach((combatant: Combatant) => {
        // @ts-expect-error hoverCombatant
        ui.combat?.hoverCombatant(combatant, false);
      });
    }
  }

  // @ts-expect-error _onCreate
  protected _onCreate(data: any, options: any, userId: string): void {
    // @ts-expect-error 3 parameters
    super._onCreate(data, options, userId);
    this.actor?.updateTokenEffectFromHealth();
    if (userId === getGame().user?.id) {
      //@ts-expect-error actorLink
      if (!this.document.actorLink) {
        if (this.actor) {
          void initializeAllCharacteristics(this.actor);
        }
      }
    }
  }
}
