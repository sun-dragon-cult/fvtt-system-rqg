import { RqgActorSheet } from "../rqgActorSheet";
import { RqgActor } from "../rqgActor";
import { getGame, getRequiredDomDataset, hasOwnProperty, RqgError } from "../../system/util";

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
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      return (
        hasOwnProperty(item?.data.data, "physicalItemType") &&
        item?.data.data.physicalItemType !== "unique"
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
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery): void => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      if (!item) {
        const msg = `Couldn't find gear with itemId [${itemId}] on actor ${actor.name} to edit item from the gear context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      item.sheet?.render(true);
    },
  },
  {
    name: "Drop",
    icon: '<i class="fas fa-trash"></i>',
    condition: () => true,
    callback: (el: JQuery): void => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
