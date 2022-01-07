import { RqgActorSheet } from "../rqgActorSheet";
import { getDomDataset, getGame, getRequiredDomDataset, RqgError } from "../../system/util";
import { RqgActor } from "../rqgActor";
import { ContextMenuRunes } from "./contextMenuRunes";

export const hitLocationMenuOptions = (actor: RqgActor): ContextMenu.Item[] => [
  {
    name: "Edit",
    icon: ContextMenuRunes.Edit,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = itemId && actor.items.get(itemId);
      if (!item || !item.sheet) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${actor.name} to edit hitLocation item from the health context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      item.sheet.render(true);
    },
  },
  {
    name: "Delete",
    icon: ContextMenuRunes.Delete,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
