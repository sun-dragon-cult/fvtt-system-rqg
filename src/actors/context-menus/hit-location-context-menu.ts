import { RqgActorSheet } from "../rqgActorSheet";
import {
  getDomDataset,
  getRequiredDomDataset,
  localize,
  localizeItemType,
  RqgError,
} from "../../system/util";
import { RqgActor } from "../rqgActor";
import { contextMenuRunes } from "./contextMenuRunes";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export const hitLocationMenuOptions = (actor: RqgActor): ContextMenu.Item[] => [
  {
    name: localize("RQG.ContextMenu.EditItem", {
      itemType: localizeItemType(ItemTypeEnum.HitLocation),
    }),
    icon: contextMenuRunes.Edit,
    condition: (el: JQuery) => !!getDomDataset(el, "item-id"),
    callback: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = itemId && actor.items.get(itemId);
      if (!item || !item.sheet) {
        const msg = localize("RQG.ContextMenu.CantEditHitLocationError", {
          itemId: itemId,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      item.sheet.render(true);
    },
  },
  {
    name: localize("RQG.ContextMenu.DeleteItem", {
      itemType: localizeItemType(ItemTypeEnum.HitLocation),
    }),
    icon: contextMenuRunes.Delete,
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
