import { RqgCombatTracker } from "./RqgCombatTracker";

export class RqgCombat extends Combat {
  public static init() {
    // @ts-ignore
    CONFIG.Combat.documentClass = RqgCombat;
    CONFIG.ui.combat = RqgCombatTracker;
    CONFIG.Combat.initiative = {
      formula: null,
      decimals: 0,
    };
  }

  _sortCombatants(a: any, b: any): any {
    const ia = Number.isNumeric(a.initiative) ? a.initiative : 9999;
    const ib = Number.isNumeric(b.initiative) ? b.initiative : 9999;
    let ci = ia - ib;
    if (ci !== 0) return ci;
    let [an, bn] = [a.token?.name || "", b.token?.name || ""];
    let cn = an.localeCompare(bn);
    if (cn !== 0) return cn;
    return a.tokenId - b.tokenId;
  }
}
