import { getCombatantsSharingToken } from "./combatant-utils";
import { getDomDataset, getRequiredDomDataset, localize } from "../system/util";
import { templatePaths } from "../system/loadHandlebarsTemplates";

import CombatTracker = foundry.applications.sidebar.tabs.CombatTracker;

export class RqgCombatTracker extends CombatTracker {
  static init() {
    Hooks.on("ready", () => {
      // one listener for sidebar combat & popped out combat
      document.addEventListener("change", RqgCombatTracker.editSRHandler);
    });
  }

  /** @override */
  static override PARTS = {
    header: {
      template: templatePaths.combatHeader,
    },
    tracker: {
      template: templatePaths.combatTracker,
    },
    footer: {
      template: "templates/sidebar/tabs/combat/footer.hbs",
    },
  };

  override async _onToggleDefeatedStatus(combatant: Combatant.Stored): Promise<void> {
    const isDefeated = !combatant.isDefeated;

    // --- start RQG code --- replace the updating to update all combatants sharing a token
    const combatantsSharingToken = getCombatantsSharingToken(combatant);
    const combat = combatant.parent;
    const updates = combatantsSharingToken.map((combatant) => ({
      _id: combatant.id,
      defeated: isDefeated,
    }));
    combat?.updateEmbeddedDocuments("Combatant", updates);
    // --- end RQG code ---

    const defeatedId = CONFIG.specialStatusEffects.DEFEATED;
    // @ts-expect-error toggleStatusEffect
    await combat.actor?.toggleStatusEffect(defeatedId, { overlay: true, active: isDefeated });
  }

  // CombatTracker - Add a Duplicate Combatant option
  override _getEntryContextOptions(): ContextMenu.Entry<HTMLElement>[] {
    const getCombatant = (li: HTMLElement) =>
      this.viewed?.combatants.get(li.dataset["combatantId"] ?? "");
    return [
      {
        name: localize("RQG.Foundry.CombatTracker.DuplicateCombatant"),
        icon: '<i class="far fa-copy fa-fw"></i>',
        condition: () => game.user?.isGM ?? false,
        callback: async (li: HTMLElement) => {
          const combatant = getCombatant(li);
          if (combatant) {
            await this.viewed!.createEmbeddedDocuments("Combatant", [combatant]);
          }
        },
      },
      {
        name: localize("COMBAT.CombatantUpdate"),
        icon: '<i class="fa-solid fa-pen-to-square"></i>',
        condition: () => game.user?.isGM ?? false,
        callback: (li: HTMLElement) =>
          // @ts-expect-error render
          getCombatant(li)?.sheet?.render({
            force: true,
            position: {
              top: Math.min(li.offsetTop, window.innerHeight - 350),
              left: window.innerWidth - 720,
            },
          }),
      },
      {
        name: "COMBAT.CombatantClear",
        icon: '<i class="fa-solid fa-arrow-rotate-left"></i>',
        condition: (li: HTMLElement) =>
          (game.user?.isGM && Number.isFinite(getCombatant(li)?.initiative)) ?? false,
        callback: async (li: HTMLElement) => {
          const combatant = getCombatant(li);
          if (combatant) {
            await combatant?.update({ initiative: null });
          }
        },
      },
      {
        name: "COMBAT.CombatantClearMovementHistory",
        icon: '<i class="fa-solid fa-shoe-prints"></i>',
        condition: (li: HTMLElement) =>
          (game.user?.isGM && (getCombatant(li)?.token?.movementHistory.length ?? 0) > 0) ?? false,
        callback: async (li: HTMLElement) => {
          const combatant = getCombatant(li);
          if (!combatant) {
            return;
          }
          // @ts-expect-error movementHistory
          await combatant.clearMovementHistory();
          ui.notifications?.info("COMBAT.CombatantMovementHistoryCleared", {
            // @ts-expect-error format
            format: { name: combatant.token?.name },
          });
        },
      },
      {
        name: "COMBAT.CombatantRemove",
        icon: '<i class="fa-solid fa-trash"></i>',
        condition: () => game.user?.isGM ?? false,
        callback: (li: HTMLElement) => getCombatant(li)?.delete(),
      },
      {
        name: localize("RQG.Foundry.CombatTracker.RemoveAllDuplicates"),
        icon: '<i class="fa-solid fa-trash"></i>',
        condition: () => game.user?.isGM ?? false,
        callback: async (li: HTMLElement) => {
          const combatant = getCombatant(li);
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

  // Open the tokenActor instead of the actor
  override _onCombatantMouseDown(event: PointerEvent, target: HTMLElement): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) {
      return;
    }
    const { combatantId } = target?.dataset ?? {};
    const combatant = this.viewed?.combatants.get(combatantId ?? "");
    if (!combatant || !game.user) {
      return;
    }
    if (event.type === "dblclick") {
      if (combatant.actor?.testUserPermission(game.user, "OBSERVER")) {
        combatant.token?.actor?.sheet?.render(true); // --- RQG code --- open the token actor instead of the combatant actor
      }
      return;
    }
    const token = combatant.token?.object;
    if (!token) {
      return;
    }
    const controlled = token.control({ releaseOthers: true });
    if (controlled) {
      void canvas?.animatePan(token.center);
    }
  }

  public static async editSRHandler(inputEvent: Event): Promise<void> {
    const changedInput = inputEvent.target as HTMLInputElement;
    const isSRInput = getDomDataset(changedInput, "strike-rank");
    if (isSRInput == undefined) {
      return;
    }

    const combatantId = getRequiredDomDataset(changedInput, "combatant-id");
    const combatant = game.combats?.active?.combatants.get(combatantId);
    const inputValue = Number(changedInput.value);
    const newSR = inputValue < 1 || inputValue > 12 ? null : inputValue;

    await combatant?.parent?.setInitiative(combatantId, newSR!); // setInitiative can handle null - fake !
  }
}
