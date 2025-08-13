import { RqgCombatTracker } from "./RqgCombatTracker";

export class RqgCombat extends Combat {
  public static init() {
    CONFIG.Combat.documentClass = RqgCombat;
    CONFIG.ui.combat = RqgCombatTracker;
    CONFIG.Combat.initiative = {
      formula: null,
      decimals: 0,
    };
  }

  /**
   * Reset all combatant SR, remove duplicate combatants and set the turn back to zero
   */
  async resetAll({ updateTurn = true } = {}): Promise<any> {
    const currentId = this.combatant?.id;
    const tokenIds = new Set(); // --- RQG code
    const combatantIdsToDelete = []; // --- RQG code
    for (const c of this.combatants) {
      c.updateSource({ initiative: null });

      // --- start RQG code --- find duplicated combatants
      if (tokenIds.has(c.tokenId)) {
        // There is more than one token connected to this combatant
        combatantIdsToDelete.push(c.id ?? "");
      } else {
        tokenIds.add(c.tokenId);
      }
      // --- end RQG code ---
    }
    const update: any = { combatants: this.combatants.toObject() };
    if (updateTurn && currentId) {
      update.turn = this.turns.findIndex((t) => t.id === currentId);
    }
    await this.update(update, { turnEvents: false, diff: false });
    await this.deleteEmbeddedDocuments("Combatant", combatantIdsToDelete);
    // --- RQG code
  }

  _sortCombatants(a: Combatant, b: Combatant): number {
    const ia = Number.isNumeric(a.initiative) ? a.initiative : Infinity;
    const ib = Number.isNumeric(b.initiative) ? b.initiative : Infinity;
    const ci = ia - ib;
    if (!isNaN(ci) && ci !== 0) {
      return ci; // Sort on lowest Strike Rank (initiative)
    }

    if (!a.actor || !b.actor) {
      const a2 = a?.actor ?? { id: "zzz" };
      const b2 = b?.actor ?? { id: "zzz" };
      // If either of the combatants are not linked to an actor, put them last
      // TODO Need to somehow mark / show that the combatant doesn't have an actor
      return a2.id!.localeCompare(b2.id!);
    }

    const actorADex = a.actor.system.characteristics.dexterity.value ?? 0;
    const actorBDex = b.actor.system.characteristics.dexterity.value ?? 0;
    const cDex = actorBDex - actorADex;
    // TODO Need to mark somehow that the DEX is equal so that the attacks actually occur simultaneously
    if (cDex !== 0) {
      return cDex; // Sort on highest DEX
    }

    if (!a.token || !b.token) {
      const a2 = a?.token ?? { id: "zzz" };
      const b2 = b?.token ?? { id: "zzz" };
      // If either of the combatants are not linked to a token, put them last
      // TODO Need to somehow mark / show that the combatant doesn't have a token
      return a2.id!.localeCompare(b2.id!);
    }

    const [an, bn] = [a.token.name || "", b.token.name || ""];
    const cn = an.localeCompare(bn);
    if (cn !== 0) {
      return cn; // Sort on name
    }

    return a.id!.localeCompare(b.id!); // Unlikely fallback if both initiative, dex and name is the same
  }
}
