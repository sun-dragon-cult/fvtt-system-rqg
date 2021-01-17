export class RqgCombat {
  public static init() {
    Combat.prototype._sortCombatants = sortCombatants;
    CombatTracker.prototype._getEntryContextOptions = getEntryContextOptions;
    Hooks.on("renderCombatTracker", renderCombatTracker);
    // @ts-ignore
    CONFIG.Combat.initiative = {
      formula: null,
      decimals: 0,
    };
    Hooks.on("updateCombatant", (combat, combatant, diff) => {
      if (!game.user.isGM) return;
      if ("defeated" in diff) {
        let updates = combat.combatants
          .filter((c) => !!c.tokenId && c.tokenId === combatant.tokenId && c._id !== combatant._id)
          .map((c) => {
            return { _id: c._id, defeated: diff.defeated };
          });
        combat.updateCombatant(updates);
      }
    });
  }
}

function renderCombatTracker(app, html, data) {
  const currentCombat = data.combats[data.currentIndex - 1];
  html.find(".combatant").each(async (i, el) => {
    const combId = el.dataset.combatantId;
    const combatant = currentCombat.data.combatants.find((c) => c._id === combId);
    if (!combatant.initiative) {
      const attributes = combatant.actor.data.data.attributes;
      // TODO How to know primary weapon SR?
      await currentCombat.setInitiative(
        combId,
        attributes.dexStrikeRank + attributes.sizStrikeRank
      );
    }
    const initDiv = el.getElementsByClassName("token-initiative")[0];
    initDiv.innerHTML = `<input type="number" min="1" max="12" value="${combatant.initiative}" style="color:white">`;

    initDiv.addEventListener("change", async (e) => {
      const inputElement = e.target;
      const combatantId = inputElement.closest("[data-combatant-id]").dataset.combatantId;
      await currentCombat.setInitiative(combatantId, inputElement.value);
    });
  });
}

function sortCombatants(a, b) {
  // @ts-ignore 0.7
  const ia = Number.isNumeric(a.initiative) ? a.initiative : 9999;
  // @ts-ignore 0.7
  const ib = Number.isNumeric(b.initiative) ? b.initiative : 9999;
  let ci = ia - ib;
  if (ci !== 0) return ci;
  let [an, bn] = [a.token?.name || "", b.token?.name || ""];
  let cn = an.localeCompare(bn);
  if (cn !== 0) return cn;
  return a.tokenId - b.tokenId;
}

function getEntryContextOptions() {
  return [
    {
      name: "Duplicate Combatant",
      icon: '<i class="far fa-copy fa-fw"></i>',
      callback: async (li) => {
        const combatant = await this.combat.getCombatant(li.data("combatant-id"));
        await this.combat.createCombatant(combatant);
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
      callback: (li) => this.combat.deleteCombatant(li.data("combatant-id")),
    },
  ];
}
