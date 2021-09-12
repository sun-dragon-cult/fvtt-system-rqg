import { RqgCombatTracker } from "./RqgCombatTracker";
import { requireValue } from "../system/util";

export class RqgCombat extends Combat {
  public static init() {
    CONFIG.Combat.documentClass = RqgCombat;
    CONFIG.ui.combat = RqgCombatTracker;
    CONFIG.Combat.initiative = {
      formula: null,
      decimals: 0,
    };
  }

  _sortCombatants(a: Combatant, b: Combatant): number {
    requireValue(a.token, "Sort (a) missing token");
    requireValue(a.token.name, "Sort (a) missing token name", a, b);
    requireValue(b.token, "Sort (b) missing token");
    requireValue(b.token.name, "Sort (b) missing token name", a, b);

    const ia = Number.isNumeric(a.initiative) ? a.initiative : 9999;
    const ib = Number.isNumeric(b.initiative) ? b.initiative : 9999;
    const ci = ia - ib;
    if (ci !== 0) {
      return ci; // Sort on lowest initiative
    }

    requireValue(a.actor, "Sort (a) missing actor (for DEX tie break)");
    requireValue(b.actor, "Sort (b) missing actor (for DEX tie break)");
    const actorADex = a.actor.data.data.characteristics.dexterity.value;
    const actorBDex = b.actor.data.data.characteristics.dexterity.value;
    const cDex = actorBDex - actorADex;
    if (cDex !== 0) {
      return cDex; // Sort on highest DEX
    }

    const [an, bn] = [a.token.name || "", b.token.name || ""];
    const cn = an.localeCompare(bn);
    if (cn !== 0) {
      return cn; // Sort on name
    }

    return a.id!.localeCompare(b.id!); // Unlikely fallback if both initiative, dex and name is the same
  }
}
