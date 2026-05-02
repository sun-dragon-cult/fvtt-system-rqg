import type { RqgContextMenuEntry } from "../../foundryUi/RqgContextMenu";
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
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import type { GearItem } from "@item-model/gearDataModel.ts";

export const gearMenuOptions = (actor: RqgActor): RqgContextMenuEntry[] => [
  {
    label: localize("RQG.ContextMenu.SetAsNotCarried"),
    icon: contextMenuRunes.SetNotCarried,
    visible: () => true,
    onClick: async (_event: Event, el: HTMLElement): Promise<void> => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as GearItem | undefined;
      await item?.update({ system: { equippedStatus: "notCarried" } }, {});
    },
  },
  {
    label: localize("RQG.ContextMenu.SetAsCarried"),
    icon: contextMenuRunes.SetCarried,
    visible: () => true,
    onClick: async (_event: Event, el: HTMLElement): Promise<void> => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as GearItem | undefined;
      await item?.update({ system: { equippedStatus: "carried" } }, {});
    },
  },
  {
    label: localize("RQG.ContextMenu.SetAsEquipped"),
    icon: contextMenuRunes.SetEquipped,
    visible: () => true,
    onClick: async (_event: Event, el: HTMLElement): Promise<void> => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as GearItem | undefined;
      await item?.update({ system: { equippedStatus: "equipped" } }, {});
    },
  },
  {
    label: localize("RQG.ContextMenu.SplitIntoNewLocation"),
    icon: contextMenuRunes.Split,
    visible: (el: HTMLElement): boolean => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as GearItem | undefined;
      return (
        hasOwnProperty(item?.system, "physicalItemType") &&
        item?.system.physicalItemType !== "unique"
      );
    },
    onClick: async (): Promise<void> => {
      ui.notifications?.info("TODO Split into new location");
    },
  },
  {
    label: localize("RQG.ContextMenu.EditItem", {
      itemType: localizeItemType(ItemTypeEnum.Gear),
    }),
    icon: contextMenuRunes.Edit,
    visible: () => true,
    onClick: (_event: Event, el: HTMLElement): void => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as GearItem | undefined;
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
    label: localize("RQG.ContextMenu.DeleteItem", {
      itemType: localizeItemType(ItemTypeEnum.Gear),
    }),
    icon: contextMenuRunes.Delete,
    visible: () => true,
    onClick: (_event: Event, el: HTMLElement): void => {
      const itemId = getRequiredDomDataset(el, "item-id");
      void RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
