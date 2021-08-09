import { getCombatantsSharingToken } from "./combatant-utils";

export class RqgToken extends Token {
  static init() {
    // @ts-ignore
    CONFIG.Token.objectClass = RqgToken;
  }

  _onHoverIn(event: any, options: any): void {
    super._onHoverIn(event, options);
    // @ts-ignore
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
    // @ts-ignore
    const combatant = this.combatant;
    if (combatant) {
      const tracker = document.getElementById("combat-tracker") as any;
      getCombatantsSharingToken(combatant).forEach((cb: any) => {
        const li = tracker.querySelector(`.combatant[data-combatant-id="${cb.id}"]`);
        if (li) li.classList.remove("hover");
      });
    }
  }
}
