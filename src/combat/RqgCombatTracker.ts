import { getCombatantsSharingToken } from "./combatant-utils";
import { getRequiredDomDataset, localize } from "../system/util";

export class RqgCombatTracker extends CombatTracker {
  static init() {
    Hooks.on("renderCombatTracker", renderCombatTracker);
  }

  async _onToggleDefeatedStatus(combatant: Combatant): Promise<void> {
    let isDefeated = !combatant.data.defeated;
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
            // @ts-ignore
            this.viewed!.createEmbeddedDocuments("Combatant", [combatant.data]);
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
        callback: (li: JQuery) => {
          const combatant = this.viewed?.combatants.get(li.data("combatant-id"));
          if (combatant) {
            getCombatantsSharingToken(combatant).forEach((c: any) => c.delete());
            return true;
          }
        },
      },
    ];
  }
}

// Called from the renderCombatTracker Hook
export function renderCombatTracker(app: any, html: any, data: any): void {
  const currentCombat = data.combats[data.currentIndex - 1];
  if (currentCombat) {
    html.find(".combatant").each(async (i: number, el: HTMLElement) => {
      const combId = getRequiredDomDataset($(el as HTMLElement), "combatant-id");
      const combatant = currentCombat.data.combatants.find((c: Combatant) => c.id === combId);
      if (!combatant.actor) {
        ui.notifications?.warn(
          `The combatant [${combatant.name}] references an actor that no longer exists within the world`
        );
      }
      const readOnly = combatant.actor?.isOwner ? "" : "readonly";
      const initDiv = el.getElementsByClassName("token-initiative")[0];
      initDiv.innerHTML = `<input type="number" min="1" max="12" value="${combatant.initiative}" ${readOnly}>`;

      initDiv.addEventListener("change", async (e) => {
        const inputElement = e.target as HTMLInputElement;
        const combatantId = getRequiredDomDataset($(el as HTMLElement), "combatant-id");
        await currentCombat.setInitiative(combatantId, Number(inputElement.value));
      });
    });
  }
}
