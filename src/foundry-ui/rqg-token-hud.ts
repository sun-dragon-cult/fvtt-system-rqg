import { systemId } from "../system/config";
import { localize } from "../system/util";

/** GM-only "Request Resistance Roll" button on the Token HUD, gated by a client setting. */
export class RqgTokenHud {
  static init() {
    Hooks.on("renderTokenHUD", RqgTokenHud.onRenderTokenHUD);
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
    // No data-action - AppV2 would warn about an unregistered handler; the click listener drives it.
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
