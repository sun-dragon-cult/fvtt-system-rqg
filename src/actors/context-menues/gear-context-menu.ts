import { RqgActorSheet } from "../rqgActorSheet";
import { RqgActor } from "../rqgActor";
import { getDomDataset, hasOwnProperty, logBug } from "../../system/util";

export const gearMenuOptions = (actor: RqgActor): ContextMenu.Item[] => [
  {
    name: "Set as not carried",
    icon: '<i class="fas fa-book-open"></i>',
    condition: () => true,
    callback: async (): Promise<void> => {
      ui.notifications?.info("TODO set as not carried");
    },
  },
  {
    name: "Set as carried",
    icon: '<i class="fas fa-book-open"></i>',
    condition: () => true,
    callback: async (): Promise<void> => {
      ui.notifications?.info("TODO set as carried");
    },
  },
  {
    name: "Set as equipped",
    icon: '<i class="fas fa-book-open"></i>',
    condition: () => true,
    callback: async (): Promise<void> => {
      ui.notifications?.info("TODO set as equipped");
    },
  },
  {
    name: "Split into new location",
    icon: '<i class="fas fa-book-open"></i>',
    condition: (el: JQuery): boolean => {
      const itemId = getDomDataset(el, "item-id");
      const item = actor.getOwnedItem(itemId);
      return (
        hasOwnProperty(item.data.data, "physicalItemType") &&
        item.data.data.physicalItemType !== "unique"
      );
    },
    callback: async (): Promise<void> => {
      ui.notifications?.info("TODO Split into new location");
    },
  },
  {
    name: "View Description",
    icon: '<i class="fas fa-book-open"></i>',
    condition: () => true,
    callback: async (): Promise<void> => {
      ui.notifications?.info("TODO View Description");
    },
  },
  {
    name: "Edit",
    icon: '<i class="fas fa-edit"></i>',
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery): void => {
      const itemId = getDomDataset(el, "item-id");
      const item = actor.getOwnedItem(itemId);
      if (item) {
        item.sheet?.render(true);
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to edit item from the gear context menu.`
        );
      }
    },
  },
  {
    name: "Drop",
    icon: '<i class="fas fa-trash"></i>',
    condition: () => true,
    callback: (el: JQuery): void => {
      const itemId = getDomDataset(el, "item-id");
      if (itemId) {
        RqgActorSheet.confirmItemDelete(actor, itemId);
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to drop gear from the gear context menu.`
        );
      }
    },
  },
];
