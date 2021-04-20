import Combatant = Combat.Combatant;
import { logBug } from "./util";

export class RqgCombat {
  public static init() {
    // @ts-ignore
    Combat.prototype._sortCombatants = sortCombatants;
    // @ts-ignore
    CombatTracker.prototype._getEntryContextOptions = getEntryContextOptions;
    Hooks.on("renderCombatTracker", renderCombatTracker);
    CONFIG.Combat.initiative = {
      formula: null,
      decimals: 0,
    };
    Hooks.on("updateCombatant", async (combat: Combat, combatant: Combatant, diff: any) => {
      if (!game.user?.isGM) return;
      if ("defeated" in diff) {
        let updates = combat.combatants
          .filter((c) => !!c.tokenId && c.tokenId === combatant.tokenId && c._id !== combatant._id)
          .map((c) => {
            return { _id: c._id, defeated: diff.defeated };
          }) as any;
        await combat.updateCombatant(updates);
      }
    });
  }
}

function renderCombatTracker(app: any, html: any, data: any) {
  const currentCombat = data.combats[data.currentIndex - 1];
  if (currentCombat) {
    html.find(".combatant").each(async (i: number, el: HTMLElement) => {
      const combId = el.dataset.combatantId;
      const combatant = currentCombat.data.combatants.find((c: Combatant) => c._id === combId);
      if (!combatant.initiative) {
        const attributes = combatant.actor.data.data.attributes;
        // TODO How to know primary weapon SR?
        await currentCombat.setInitiative(
          combId,
          attributes.dexStrikeRank + attributes.sizStrikeRank
        );
      }
      const readOnly = combatant.actor.owner ? "" : "readonly";
      const initDiv = el.getElementsByClassName("token-initiative")[0];
      initDiv.innerHTML = `<input type="number" min="1" max="12" value="${combatant.initiative}" ${readOnly}>`;

      initDiv.addEventListener("change", async (e) => {
        const inputElement = e.target as HTMLInputElement;
        const combatantId = (inputElement.closest("[data-combatant-id]") as HTMLElement)?.dataset
          .combatantId;
        if (combatantId) {
          await currentCombat.setInitiative(combatantId, Number(inputElement.value));
        } else {
          logBug("Couldn't find combatant when setting initiative", true);
        }
      });
    });
  }
}

function sortCombatants(a: any, b: any): any {
  const ia = Number.isNumeric(a.initiative) ? a.initiative : 9999;
  const ib = Number.isNumeric(b.initiative) ? b.initiative : 9999;
  let ci = ia - ib;
  if (ci !== 0) return ci;
  let [an, bn] = [a.token?.name || "", b.token?.name || ""];
  let cn = an.localeCompare(bn);
  if (cn !== 0) return cn;
  return a.tokenId - b.tokenId;
}

function getEntryContextOptions(this: CombatTracker): ContextMenu.Item[] {
  const combat = this.combat;
  if (!combat) {
    logBug("Couldn't find combat", true);
    return [];
  }
  return [
    {
      name: "Duplicate Combatant",
      icon: '<i class="far fa-copy fa-fw"></i>',
      callback: async (li: JQuery) => {
        const combatant = await combat.getCombatant(li.data("combatant-id"));
        await combat.createCombatant(combatant);
      },
    },
    {
      name: "COMBAT.CombatantUpdate",
      icon: '<i class="fas fa-edit"></i>',
      callback: this._onConfigureCombatant.bind(this),
    },
    {
      name: "COMBAT.CombatantRemove",
      icon: '<i class="fas fa-skull"></i>',
      callback: (li: JQuery) => combat.deleteCombatant(li.data("combatant-id")),
    },
  ];
}
