import { RqgActorSheet } from "../rqgActorSheet";
import { RqgActor } from "../rqgActor";
import {
  getRequiredDomDataset,
  hasOwnProperty,
  localize,
  localizeItemType,
  RqgError,
} from "../../system/util";
import { contextMenuRunes } from "./contextMenuRunes";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export const gearMenuOptions = (actor: RqgActor): ContextMenu.Item[] => [
  {
    name: localize("RQG.ContextMenu.SetAsNotCarried"),
    icon: contextMenuRunes.SetNotCarried,
    condition: () => true,
    callback: async (el): Promise<void> => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      await item?.update({ "system.equippedStatus": "notCarried" }, {});
    },
  },
  {
    name: localize("RQG.ContextMenu.SetAsCarried"),
    icon: contextMenuRunes.SetCarried,
    condition: () => true,
    callback: async (el): Promise<void> => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      await item?.update({ "system.equippedStatus": "carried" }, {});
    },
  },
  {
    name: localize("RQG.ContextMenu.SetAsEquipped"),
    icon: contextMenuRunes.SetEquipped,
    condition: () => true,
    callback: async (el): Promise<void> => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      await item?.update({ "system.equippedStatus": "equipped" }, {});
    },
  },
  {
    name: localize("RQG.ContextMenu.SplitIntoNewLocation"),
    icon: contextMenuRunes.Split,
    condition: (el: JQuery): boolean => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      return (
        hasOwnProperty(item?.system, "physicalItemType") &&
        item?.system.physicalItemType !== "unique"
      );
    },
    callback: async (): Promise<void> => {
      ui.notifications?.info("TODO Split into new location");
    },
  },
  {
    name: localize("RQG.ContextMenu.EditItem", {
      itemType: localizeItemType(ItemTypeEnum.Gear),
    }),
    icon: contextMenuRunes.Edit,
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
      itemType: localizeItemType(ItemTypeEnum.Gear),
    }),
    icon: contextMenuRunes.Delete,
    condition: () => true,
    callback: (el: JQuery): void => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
