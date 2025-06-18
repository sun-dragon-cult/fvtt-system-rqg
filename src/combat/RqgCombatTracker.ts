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
    const getCombatant = (li: HTMLElement) =>
      this.viewed?.combatants.get(li.dataset.combatantId ?? "");
    return [
      {
        name: localize("RQG.Foundry.CombatTracker.DuplicateCombatant"),
        icon: '<i class="far fa-copy fa-fw"></i>',
        condition: () => getGameUser().isGM,
        // @ts-expect-error html, not jquery
        callback: async (li: HTMLElement) => {
          const combatant = getCombatant(li);
          if (combatant) {
            // @ts-expect-error combatant
            await this.viewed!.createEmbeddedDocuments("Combatant", [combatant]);
          }
        },
      },
      {
        name: localize("COMBAT.CombatantUpdate"),
        icon: '<i class="fa-solid fa-pen-to-square"></i>',
        condition: () => getGameUser().isGM,
        // @ts-expect-error html, not jquery
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
        name: "COMBAT.CombatantRemove",
        icon: '<i class="fa-solid fa-trash"></i>',
        condition: () => getGameUser().isGM,
        // @ts-expect-error html, not jquery
        callback: (li: HTMLElement) => getCombatant(li)?.delete(),
      },
      {
        name: localize("RQG.Foundry.CombatTracker.RemoveAllDuplicates"),
        icon: '<i class="fa-solid fa-trash"></i>',
        condition: () => getGameUser().isGM,
        // @ts-expect-error html, not jquery
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
  // @ts-expect-error number of arguments
  _onCombatantMouseDown(event, target) {
    if (event.target instanceof HTMLInputElement) {
      return;
    }
    const { combatantId } = target?.dataset ?? {};
    const combatant = this.viewed?.combatants.get(combatantId);
    if (!combatant) {
      return;
    }
    if (event.type === "dblclick") {
      if (combatant.actor?.testUserPermission(getGameUser(), "OBSERVER")) {
        combatant.token?.actor?.sheet?.render(true);
      }
      return;
    }
    const token = combatant.token?.object;
    if (!token) {
      return;
    }
    const controlled = token.control({ releaseOthers: true });
    if (controlled) {
      canvas?.animatePan(token.center);
    }
  }
}

// Called from the renderCombatTracker Hook, it's not really a User, but something that contains the user it seems
function renderCombatTracker(app: RqgCombatTracker, html: HTMLElement, user: User): void {
  const currentCombat = app.viewed;

  if (currentCombat) {
    // Rerender actorSheets to update the SR display there
    getGame()
      .scenes?.current?.tokens.filter((t) =>
        // @ts-expect-errors DOCUMENT_OWNERSHIP_LEVELS
        t.testUserPermission(user.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED),
      )
      .forEach((t) => t.actor?.sheet?.render());

    html.querySelector('button[data-tooltip="COMBAT.RollAll"]')?.remove();
    html.querySelector('button[data-tooltip="COMBAT.RollNPC"]')?.remove();

    html.querySelectorAll(".combatant").forEach((el: Element) => {
      const combId = getRequiredDomDataset(el, "combatant-id");
      const combatant = currentCombat.combatants.find((c: Combatant) => c.id === combId);
      if (!combatant?.actor) {
        ui.notifications?.warn(
          localize("RQG.Foundry.CombatTracker.CombatantWithoutActor", {
            combatantName: combatant?.name ?? localize("RQG.Foundry.CombatTracker.UnknownName"),
          }),
        );
      }
      const readOnly = combatant?.isOwner ? "" : "readonly";
      const initDiv = el.getElementsByClassName("token-initiative")[0];
      const valueString = combatant?.initiative ? `value=${combatant.initiative}` : "";
      const ariaLabel = localize("RQG.Actor.Attributes.StrikeRank");
      initDiv.innerHTML = `<input type="number" inputmode="numeric" min="1" max="12" ${valueString} aria-label="${ariaLabel}" ${readOnly}>`;
    });
  }
}
