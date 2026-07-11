import type { RqgContextMenuEntry } from "../../foundry-ui/rqg-context-menu";
import { confirmActorItemDelete } from "../confirm-item-delete-dialog";
import { RqgActor } from "../rqg-actor";
import {
  getRequiredDomDataset,
  hasOwnProperty,
  localize,
  localizeItemType,
  RqgError,
} from "../../system/util";
import { contextMenuRunes } from "./context-menu-runes";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { GearItem } from "@item-model/gear-data-model.ts";

export const gearMenuOptions = (actor: RqgActor): RqgContextMenuEntry[] => [
  {
    label: "RQG.ContextMenu.SetAsNotCarried",
    icon: contextMenuRunes.SetNotCarried,
    visible: () => true,
    onClick: async (_event: Event, el: HTMLElement): Promise<void> => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as GearItem | undefined;
      await item?.update({ system: { equippedStatus: "notCarried" } }, {});
    },
  },
  {
    label: "RQG.ContextMenu.SetAsCarried",
    icon: contextMenuRunes.SetCarried,
    visible: () => true,
    onClick: async (_event: Event, el: HTMLElement): Promise<void> => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as GearItem | undefined;
      await item?.update({ system: { equippedStatus: "carried" } }, {});
    },
  },
  {
    label: "RQG.ContextMenu.SetAsEquipped",
    icon: contextMenuRunes.SetEquipped,
    visible: () => true,
    onClick: async (_event: Event, el: HTMLElement): Promise<void> => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as GearItem | undefined;
      await item?.update({ system: { equippedStatus: "equipped" } }, {});
    },
  },
  {
    label: "RQG.ContextMenu.SplitIntoNewLocation",
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
      void confirmActorItemDelete(actor, itemId);
    },
  },
];
