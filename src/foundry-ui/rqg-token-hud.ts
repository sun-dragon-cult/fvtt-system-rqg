import { systemId } from "../system/config";
import { localize } from "../system/util";
import { spellEffectHudEntries, type SpellEffectHudEntry } from "./token-hud-spell-effects";

/**
 * Token HUD additions: the applied spell effects at the top of the status effect palette, and a
 * GM-only "Request Resistance Roll" button gated by a client setting.
 */
export class RqgTokenHud {
  static init() {
    Hooks.on("renderTokenHUD", RqgTokenHud.addSpellEffects);
    Hooks.on("renderTokenHUD", RqgTokenHud.onRenderTokenHUD);
  }

  /** Spell effects have their own icons, often generic, so the palette names them on hover. */
  private static addSpellEffects(hud: foundry.applications.hud.TokenHUD, element: HTMLElement) {
    const actor = hud.document?.actor;
    const palette = element.querySelector<HTMLElement>(".palette.status-effects");
    if (!actor || !palette) {
      return;
    }
    const entries = spellEffectHudEntries(actor.allApplicableEffects() as any, actor);
    if (!entries.length) {
      return;
    }

    // Players see what's on their token; only the GM opens or removes a spell effect.
    const isGM = !!game.user?.isGM;
    const icons = entries.map((entry) => {
      const icon = document.createElement("img");
      icon.className = [
        "effect-control",
        "rqg-spell-effect",
        entry.active ? "active" : "",
        isGM ? "" : "read-only",
      ].filterJoin(" ");
      icon.src = entry.img;
      icon.dataset["tooltipHtml"] = RqgTokenHud.spellEffectTooltip(entry, isGM);
      if (!isGM) {
        return icon;
      }
      // Not a core data-action, so these drive their own listeners, like the resistance button.
      icon.addEventListener("click", async (event) => {
        event.preventDefault();
        const effect = (await fromUuid(entry.uuid)) as ActiveEffect.Implementation | null;
        if (effect) {
          void new foundry.applications.sheets.ActiveEffectConfig({ document: effect }).render({
            force: true,
          });
        }
      });
      icon.addEventListener("contextmenu", async (event) => {
        event.preventDefault();
        const effect = (await fromUuid(entry.uuid)) as ActiveEffect | null;
        if (!effect) {
          return;
        }
        const confirmed = await foundry.applications.api.DialogV2.confirm({
          window: {
            title: localize("RQG.TokenHud.RemoveSpellEffectTitle", { effectName: entry.name }),
          },
          content: `<p>${foundry.utils.escapeHTML(
            localize("RQG.TokenHud.RemoveSpellEffectContent", { effectName: entry.name }),
          )}</p>`,
          yes: { action: "confirm", label: "RQG.Dialog.Common.btnConfirm", icon: "fas fa-check" },
          no: {
            action: "cancel",
            label: "RQG.Dialog.Common.btnCancel",
            icon: "fas fa-times",
            default: true,
          },
        });
        if (!confirmed) {
          return;
        }
        await effect.delete();
        void hud.render();
      });
      return icon;
    });
    const divider = document.createElement("hr");
    divider.className = "rqg-spell-effects-divider";
    palette.prepend(...icons, divider);
  }

  private static spellEffectTooltip(entry: SpellEffectHudEntry, isGM: boolean): string {
    const escape = foundry.utils.escapeHTML;
    return [
      `<strong>${escape(entry.name)}</strong>`,
      entry.itemName
        ? escape(localize("RQG.TokenHud.SpellEffectOn", { itemName: entry.itemName }))
        : "",
      entry.remaining
        ? escape(localize("RQG.TokenHud.SpellEffectRemaining", { remaining: entry.remaining }))
        : "",
      isGM ? escape(localize("RQG.TokenHud.SpellEffectControls")) : "",
    ]
      .filter((line) => !!line)
      .join("<br>");
  }

  private static onRenderTokenHUD(
    hud: foundry.applications.hud.TokenHUD,
    element: HTMLElement,
  ): void {
    if (!game.user?.isGM || !game.settings?.get(systemId, "showResistanceRequestTokenHudButton")) {
      return;
    }
    const leftColumn = element.querySelector<HTMLElement>(".col.left");
    const tokenUuid = hud.document?.uuid;
    if (!leftColumn || !tokenUuid) {
      return;
    }

    const label = localize("RQG.Game.RequestResistanceRoll");
    // Injected via the render hook, so it drives its own click listener rather than the HUD's data-action map.
    const button = document.createElement("button");
    button.type = "button";
    button.className = "control-icon";
    button.setAttribute("data-tooltip", label);
    button.setAttribute("aria-label", label);
    button.innerHTML = '<i class="fa-solid fa-scale-unbalanced" inert></i>';
    button.addEventListener("click", async () => {
      const { openResistanceRequest } =
        await import("../applications/resistance-roll-dialog/open-resistance-request");
      await openResistanceRequest(tokenUuid);
    });
    leftColumn.appendChild(button);
  }
}
