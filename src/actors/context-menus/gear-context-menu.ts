import { RqgActorSheet } from "../rqgActorSheet";
import { RqgActor } from "../rqgActor";
import { getRequiredDomDataset, hasOwnProperty, localize, RqgError } from "../../system/util";
import { ContextMenuRunes } from "./contextMenuRunes";
import { RqgItem } from "../../items/rqgItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export const gearMenuOptions = (actor: RqgActor): ContextMenu.Item[] => [
  {
    name: localize("RQG.ContextMenu.SetAsNotCarried"),
    icon: ContextMenuRunes.SetNotCarried,
    condition: () => true,
    callback: async (): Promise<void> => {
      ui.notifications?.info("TODO set as not carried");
    },
  },
  {
    name: localize("RQG.ContextMenu.SetAsCarried"),
    icon: ContextMenuRunes.SetCarried,
    condition: () => true,
    callback: async (): Promise<void> => {
      ui.notifications?.info("TODO set as carried");
    },
  },
  {
    name: localize("RQG.ContextMenu.SetAsEquipped"),
    icon: ContextMenuRunes.SetEquipped,
    condition: () => true,
    callback: async (): Promise<void> => {
      ui.notifications?.info("TODO set as equipped");
    },
  },
  {
    name: localize("RQG.ContextMenu.SplitIntoNewLocation"),
    icon: ContextMenuRunes.Split,
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
    name: localize("RQG.ContextMenu.EditItem", {
      itemType: RqgItem.localizeItemTypeName(ItemTypeEnum.Gear),
    }),
    icon: ContextMenuRunes.Edit,
    condition: () => true,
    callback: (el: JQuery): void => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      if (!item) {
        const msg = localize("RQG.ContextMenu.Notification.CantEditGearError", {
          itemId: itemId,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      item.sheet?.render(true);
    },
  },
  {
    name: localize("RQG.ContextMenu.DeleteItem", {
      itemType: RqgItem.localizeItemTypeName(ItemTypeEnum.Gear),
    }),
    icon: ContextMenuRunes.Delete,
    condition: () => true,
    callback: (el: JQuery): void => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
