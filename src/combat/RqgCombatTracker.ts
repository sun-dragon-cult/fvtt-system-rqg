import { getCombatantsSharingToken } from "./combatant-utils";
import { getGame, getGameUser, getRequiredDomDataset, localize } from "../system/util";

export class RqgCombatTracker extends CombatTracker {
  static init() {
    Hooks.on("renderCombatTracker", renderCombatTracker);
  }

  async _onToggleDefeatedStatus(combatant: Combatant): Promise<void> {
    // @ts-expect-errors isDefeated
    const isDefeated = !combatant.isDefeated;
    const otherCombatantsSharingToken = getCombatantsSharingToken(combatant);
    await super._onToggleDefeatedStatus(combatant);
    for (const cb of otherCombatantsSharingToken) {
      await cb.update({ defeated: isDefeated });
    }
  }

  // CombatTracker - Add a Duplicate Combatant option
  _getEntryContextOptions(): ContextMenu.Item[] {
    return [
      {
        name: localize("RQG.Foundry.CombatTracker.DuplicateCombatant"),
        icon: '<i class="far fa-copy fa-fw"></i>',
        callback: async (li: JQuery) => {
          const combatant = this.viewed?.combatants.get(li.data("combatant-id"));
          if (combatant) {
            // @ts-expect-error combatant
            await this.viewed!.createEmbeddedDocuments("Combatant", [combatant]);
          }
        },
      },
      {
        name: localize("RQG.Foundry.CombatTracker.UpdateCombatant"),
        icon: '<i class="fas fa-edit fa-fw"></i>',
        callback: this._onConfigureCombatant.bind(this),
      },
      {
        name: localize("RQG.Foundry.CombatTracker.RemoveCombatant"),
        icon: '<i class="fas fa-trash fa-fw"></i>',
        callback: (li: JQuery) => {
          const combatant = this.viewed?.combatants.get(li.data("combatant-id"));
          if (combatant) {
            return combatant.delete();
          }
        },
      },
      {
        name: localize("RQG.Foundry.CombatTracker.RemoveAllDuplicates"),
        icon: '<i class="fas fa-trash fa-fw"></i>',
        callback: async (li: JQuery) => {
          const combatant = this.viewed?.combatants.get(li.data("combatant-id"));
          if (combatant) {
            const combatantIds = getCombatantsSharingToken(combatant).map((c: any) => c.id);
            if (combatantIds.length > 1) {
              const indexToKeep = combatantIds.indexOf(combatant.id);
              combatantIds.splice(indexToKeep, 1); // Keep the selected combatant
              await combatant.parent?.deleteEmbeddedDocuments("Combatant", combatantIds);
            }
          }
        },
      },
    ];
  }
}

// Called from the renderCombatTracker Hook
export function renderCombatTracker(app: RqgCombatTracker, html: any, data: any): void {
  const currentCombat = data.combats[data.currentIndex - 1] as Combat | undefined;
  if (currentCombat) {
    // Rerender actorSheets to update the SR display there
    getGame()
      .scenes?.active?.tokens.filter((t) =>
        // @ts-expect-errors DOCUMENT_OWNERSHIP_LEVELS
        t.testUserPermission(getGameUser(), CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED),
      )
      .forEach((t) => t.actor?.sheet?.render());

    html.find("[data-control=rollAll]").remove();
    html.find("[data-control=rollNPC]").remove();

    html.find(".combatant").each(async (i: number, el: HTMLElement) => {
      const combId = getRequiredDomDataset(el, "combatant-id");
      const combatant = currentCombat.combatants.find((c: Combatant) => c.id === combId);
      if (!combatant?.actor) {
        ui.notifications?.warn(
          localize("RQG.Foundry.CombatTracker.CombatantWithoutActor", {
            combatantName: combatant?.name ?? localize("RQG.Foundry.CombatTracker.UnknownName"),
          }),
        );
      }
      const readOnly = combatant?.actor?.isOwner ? "" : "readonly";
      const initDiv = el.getElementsByClassName("token-initiative")[0];
      const valueString = combatant?.initiative ? `value=${combatant.initiative}` : "";
      initDiv.innerHTML = `<input type="number" min="1" max="12" ${valueString} ${readOnly}>`;

      initDiv.addEventListener("change", async (e: Event) => {
        const inputElement = e.target as HTMLInputElement;
        const combatantId = getRequiredDomDataset(el, "combatant-id");
        await currentCombat.setInitiative(combatantId, Number(inputElement.value));
      });
    });
  }
}
