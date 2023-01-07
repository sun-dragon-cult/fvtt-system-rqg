//@ts-nocheck
import { DocumentModificationOptions } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs";
import { TokenDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/tokenData";
import { PropertiesToSource } from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";
import { getGame } from "../system/util";
import { initializeAllCharacteristics } from "../actors/context-menus/characteristic-context-menu";
import { getCombatantsSharingToken } from "./combatant-utils";

export class RqgToken extends Token {
  static init() {
    CONFIG.Token.objectClass = RqgToken;
  }

  _onHoverIn(event: any, options: any): void {
    super._onHoverIn(event, options);
    const combatant = this.combatant;
    if (combatant) {
      const tracker = document.getElementById("combat-tracker") as any;
      getCombatantsSharingToken(combatant).forEach((cb: any) => {
        const li = tracker.querySelector(`.combatant[data-combatant-id="${cb.id}"]`);
        if (li) li.classList.add("hover");
      });
    }
  }

  _onHoverOut(event: any) {
    super._onHoverOut(event);
    const combatant = this.combatant;
    if (combatant) {
      const tracker = document.getElementById("combat-tracker") as any;
      getCombatantsSharingToken(combatant).forEach((cb: any) => {
        const li = tracker.querySelector(`.combatant[data-combatant-id="${cb.id}"]`);
        if (li) li.classList.remove("hover");
      });
    }
  }

  //TODO: When upgrading @league-of-foundry-developers/foundry-vtt-types
  //we can remove the ts-nocheck at the top of this file.
  //In the meantime this allows us to get the userId which is now the third
  //parameter.  We need it to ensure that we don't initialize the unlinked
  //Actor for every logged in user.
  protected _onCreate(
    options: PropertiesToSource<TokenDataProperties>,
    docModOptions: DocumentModificationOptions,
    userId: string
  ): void {
    super._onCreate(options, docModOptions);
    if (userId === getGame().user?.id) {
      //@ts-ignore actorLink
      if (!this.document.actorLink) {
        console.log("UNLINKED ACTOR");
        if (this.actor) {
          initializeAllCharacteristics(this.actor, false);
        }
      }
    }
  }
}
