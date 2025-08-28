import { initializeAllCharacteristics } from "../actors/context-menus/characteristic-context-menu";
import { getCombatantsSharingToken } from "./combatant-utils";

export class RqgToken extends foundry.canvas.placeables.Token {
  static init() {
    CONFIG.Token.objectClass = RqgToken;
  }

  override _onHoverIn(event: any, options: any): void {
    super._onHoverIn(event, options);
    if (this.combatant) {
      getCombatantsSharingToken(this.combatant).forEach((combatant) => {
        ui.combat?.hoverCombatant(combatant, ui.combat._isTokenVisible(this));
      });
    }
  }

  override _onHoverOut(event: any) {
    super._onHoverOut(event);
    if (this.combatant) {
      getCombatantsSharingToken(this.combatant).forEach((combatant: Combatant) => {
        ui.combat?.hoverCombatant(combatant, false);
      });
    }
  }

  protected override _onCreate(data: any, options: any, userId: string): void {
    super._onCreate(data, options, userId);
    this.actor?.updateTokenEffectFromHealth();
    if (userId === game.user?.id) {
      if (!this.document.actorLink) {
        if (this.actor) {
          void initializeAllCharacteristics(this.actor);
        }
      }
    }
  }
}
