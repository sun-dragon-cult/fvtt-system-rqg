import type { RqgContextMenuEntry } from "./rqg-context-menu";

import ActorDirectory = foundry.applications.sidebar.tabs.ActorDirectory;
import ContextMenu = foundry.applications.ux.ContextMenu;

/** Actors sidebar plus a GM-only "Request Resistance Roll" context-menu entry. */
export class RqgActorDirectory<
  RenderContext extends ActorDirectory.RenderContext = ActorDirectory.RenderContext,
  Configuration extends ActorDirectory.Configuration = ActorDirectory.Configuration,
  RenderOptions extends ActorDirectory.RenderOptions = ActorDirectory.RenderOptions,
> extends ActorDirectory<RenderContext, Configuration, RenderOptions> {
  static init() {
    CONFIG.ui.actors = RqgActorDirectory;
  }

  override _getEntryContextOptions(): ContextMenu.Entry<HTMLElement>[] {
    const entries = super._getEntryContextOptions() as unknown as RqgContextMenuEntry[];
    entries.push({
      label: "RQG.Game.RequestResistanceRoll",
      icon: '<i class="fa-solid fa-scale-unbalanced fa-fw"></i>',
      visible: () => game.user?.isGM ?? false,
      onClick: async (_event: Event, li: HTMLElement) => {
        const actorId = li.dataset["entryId"];
        const actor = actorId ? game.actors?.get(actorId) : undefined;
        if (!actor?.uuid) {
          return;
        }
        const { openResistanceRequest } =
          await import("../applications/resistance-roll-dialog/open-resistance-request");
        await openResistanceRequest(actor.uuid);
      },
    });
    return entries as unknown as ContextMenu.Entry<HTMLElement>[];
  }
}
