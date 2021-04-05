import { RqgActorSheet } from "../rqgActorSheet";
import { getDomDataset, logBug } from "../../system/util";
import { RqgActor } from "../rqgActor";

export const hitLocationMenuOptions = (actor: RqgActor): ContextMenu.Item[] => [
  {
    name: "Edit",
    icon: '<i class="fas fa-edit"></i>',
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = itemId && actor.getOwnedItem(itemId);
      if (item && item.sheet) {
        item.sheet.render(true);
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to edit hitLocation item from the health context menu.`
        );
      }
    },
  },
  {
    name: "Delete",
    icon: '<i class="fas fa-trash"></i>',
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      if (itemId) {
        RqgActorSheet.confirmItemDelete(actor, itemId);
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to delete hitLocation item from the health context menu.`
        );
      }
    },
  },
];
